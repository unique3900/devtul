import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        success: false,
        status: 400,
        message: "Email and password are required" 
      }, { status: 400 });
    }

    // Get database connection
    const database = await getDb();

    // Find user by email with organizations and payment info
    const user = await database.user.findUnique({
      where: { email },
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

    if (!user || !user.password) {
      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Invalid email or password" 
      }, { status: 401 });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json({ 
        success: false,
        status: 423,
        message: "Account is locked due to too many failed login attempts. Please try again later." 
      }, { status: 423 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Account is deactivated. Please contact support." 
      }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await database.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: { increment: 1 },
          lockedUntil: user.loginAttempts >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : undefined // Lock for 30 minutes after 5 failed attempts
        }
      });

      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Invalid email or password" 
      }, { status: 401 });
    }

    // Get primary organization and payment info
    const primaryOrg = user.organizationMemberships[0]?.organization;
    const subscription = primaryOrg?.organizationSubscriptions[0];

    // Update last login time and reset login attempts
    await database.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        loginAttempts: 0
      }
    });

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
      message: "Login successful",
      data: {
        user: userData
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Login error:", error);
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred during login. Please try again later." 
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

    return NextResponse.json({
      success: true,
      status: 200,
      message: "Session retrieved successfully",
      data: {
        user: session.user,
        refreshTokenExpiry: session.refreshTokenExpiry
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Session retrieval error:", error);
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred. Please try again later." 
    }, { status: 500 });
  }
} 