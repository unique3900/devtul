import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyJWTToken } from "@/lib/auth";

// Import db only when needed to avoid build-time issues
let db: any = null;

async function getDb() {
  if (!db) {
    try {
      const { default: prisma } = await import("@/db");
      db = prisma;
    } catch (error) {
      console.error("Failed to import database:", error);
      throw new Error("Database connection failed");
    }
  }
  return db;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ 
        success: false,
        status: 400,
        message: "Refresh token is required" 
      }, { status: 400 });
    }

    // Get database connection
    const database = await getDb();

    // Find user by refresh token
    const user = await database.user.findFirst({
      where: { 
        refreshToken: refreshToken,
        refreshTokenExpiry: {
          gt: new Date() // Token must not be expired
        }
      },
      include: {
        organizationMemberships: {
          include: {
            organization: {
              include: {
                organizationSubscriptions: {
                  where: {
                    status: "Active"
                  },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Invalid or expired refresh token" 
      }, { status: 401 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Account is deactivated" 
      }, { status: 401 });
    }

    // Generate new refresh token
    const newRefreshToken = require('crypto').randomBytes(64).toString('hex');
    const newRefreshTokenExpiry = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

    // Update user with new refresh token
    await database.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExpiry: newRefreshTokenExpiry
      }
    });

    // Get primary organization and payment info
    const primaryOrg = user.organizationMemberships[0]?.organization;
    const subscription = primaryOrg?.organizationSubscriptions[0];

    const userData = {
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      organizations: user.organizationMemberships.map(membership => ({
        id: membership.organization.id,
        name: membership.organization.name,
        role: membership.role,
        slug: membership.organization.slug,
        accountType: membership.organization.accountType,
        subscriptionStatus: membership.organization.organizationSubscriptions[0]?.status || null
      })),
      primaryOrganization: primaryOrg ? {
        id: primaryOrg.id,
        name: primaryOrg.name,
        accountType: primaryOrg.accountType,
        subscriptionStatus: subscription?.status || null
      } : null
    };

    return NextResponse.json({
      success: true,
      status: 200,
      message: "Token refreshed successfully",
      data: {
        user: userData,
        refreshToken: newRefreshToken,
        refreshTokenExpiry: newRefreshTokenExpiry.getTime()
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Token refresh error:", error);
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred while refreshing token. Please try again later." 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Not authenticated" 
      }, { status: 401 });
    }

    // Get database connection
    const database = await getDb();

    // Get fresh user data from database
    const user = await database.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizationMemberships: {
          include: {
            organization: {
              include: {
                organizationSubscriptions: {
                  where: {
                    status: "Active"
                  },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false,
        status: 404,
        message: "User not found" 
      }, { status: 404 });
    }

    // Get primary organization and payment info
    const primaryOrg = user.organizationMemberships[0]?.organization;
    const subscription = primaryOrg?.organizationSubscriptions[0];

    const userData = {
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      organizations: user.organizationMemberships.map(membership => ({
        id: membership.organization.id,
        name: membership.organization.name,
        role: membership.role,
        slug: membership.organization.slug,
        accountType: membership.organization.accountType,
        subscriptionStatus: membership.organization.organizationSubscriptions[0]?.status || null
      })),
      primaryOrganization: primaryOrg ? {
        id: primaryOrg.id,
        name: primaryOrg.name,
        accountType: primaryOrg.accountType,
        subscriptionStatus: subscription?.status || null
      } : null
    };

    return NextResponse.json({
      success: true,
      status: 200,
      message: "Fresh session data retrieved successfully",
      data: {
        user: userData,
        refreshTokenExpiry: user.refreshTokenExpiry?.getTime() || null
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Session refresh error:", error);
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred while retrieving session data. Please try again later." 
    }, { status: 500 });
  }
} 