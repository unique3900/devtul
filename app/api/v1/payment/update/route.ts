import { NextRequest, NextResponse } from "next/server";
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
    // Get current session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Not authenticated" 
      }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, accountType, subscriptionData } = body;

    if (!organizationId || !accountType) {
      return NextResponse.json({ 
        success: false,
        status: 400,
        message: "Organization ID and account type are required" 
      }, { status: 400 });
    }

    // Get database connection
    const database = await getDb();

    // Check if user has permission to update this organization
    const membership = await database.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organizationId,
        role: { in: ["Owner", "Admin"] }
      }
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false,
        status: 403,
        message: "You don't have permission to update this organization's payment settings" 
      }, { status: 403 });
    }

    // Update organization account type and subscription in a transaction
    const result = await database.$transaction(async (tx: any) => {
      // Update organization account type
      const updatedOrganization = await tx.organization.update({
        where: { id: organizationId },
        data: { accountType }
      });

      // Update or create subscription based on account type
      if (accountType === "Premium" || accountType === "Enterprise") {
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1); // 1 year from now
        
        // Check if subscription already exists
        const existingSubscription = await tx.organizationSubscription.findFirst({
          where: { organizationId }
        });

        if (existingSubscription) {
          // Update existing subscription
          await tx.organizationSubscription.update({
            where: { id: existingSubscription.id },
            data: {
              status: "Active",
              currentPeriodEnd: subscriptionEndDate,
              seats: accountType === "Premium" ? 5 : 50, // Premium: 5 seats, Enterprise: 50 seats
              ...subscriptionData
            }
          });
        } else {
          // Create new subscription
          await tx.organizationSubscription.create({
            data: {
              organizationId,
              planId: accountType === "Premium" ? "premium-plan" : "enterprise-plan",
              status: "Active",
              currentPeriodStart: new Date(),
              currentPeriodEnd: subscriptionEndDate,
              seats: accountType === "Premium" ? 5 : 50,
              usedSeats: 1, // Current user
              ...subscriptionData
            }
          });
        }
      } else if (accountType === "Free") {
        // Cancel existing subscription for Free accounts
        await tx.organizationSubscription.updateMany({
          where: { organizationId },
          data: { 
            status: "Canceled",
            canceledAt: new Date()
          }
        });
      }

      return updatedOrganization;
    });

    return NextResponse.json({
      success: true,
      status: 200,
      message: "Payment settings updated successfully",
      data: {
        organization: {
          id: result.id,
          name: result.name,
          accountType: result.accountType
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Payment update error:", error);
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred while updating payment settings. Please try again later." 
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

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ 
        success: false,
        status: 400,
        message: "Organization ID is required" 
      }, { status: 400 });
    }

    // Get database connection
    const database = await getDb();

    // Check if user has permission to view this organization
    const membership = await database.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organizationId
      }
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false,
        status: 403,
        message: "You don't have permission to view this organization's payment settings" 
      }, { status: 403 });
    }

    // Get organization with subscription info
    const organization = await database.organization.findUnique({
      where: { id: organizationId },
      include: {
        organizationSubscriptions: {
          where: { status: "Active" },
          take: 1
        },
        paymentMethods: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ 
        success: false,
        status: 404,
        message: "Organization not found" 
      }, { status: 404 });
    }

    const subscription = organization.organizationSubscriptions[0];

    return NextResponse.json({
      success: true,
      status: 200,
      message: "Payment settings retrieved successfully",
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          accountType: organization.accountType
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          seats: subscription.seats,
          usedSeats: subscription.usedSeats
        } : null,
        paymentMethods: organization.paymentMethods
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Payment settings retrieval error:", error);
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred while retrieving payment settings. Please try again later." 
    }, { status: 500 });
  }
} 