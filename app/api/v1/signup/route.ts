import { organizationCreateSchema } from "@/app/actions/organization/schema";
import { OrganizationCreateData } from "@/app/actions/organization/types";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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
    
    // Convert File object data back to proper format for validation
    let dataForValidation = { ...body };
    
    if (body.logo && typeof body.logo === 'object') {
      try {
        dataForValidation.logo = new File([], body.logo.name || 'logo', { 
          type: body.logo.type || 'image/png' 
        });
      } catch (error) {
        // If File constructor fails, create a mock file object
        dataForValidation.logo = {
          name: body.logo.name || 'logo',
          type: body.logo.type || 'image/png',
          size: body.logo.size || 0
        } as any;
      }
    }
    
    const parseResult = organizationCreateSchema.safeParse(dataForValidation);

    if (!parseResult.success) {
      return NextResponse.json({ 
        success: false,
        status: 400,
        error: parseResult.error.message 
      }, { status: 400 });
    }

    // Get database connection
    const database = await getDb();

    // Check if user already exists
    const existingUser = await database.user.findUnique({
      where: { email: parseResult.data.contactEmail },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: false,
        status: 409,
        message: "A user with this email already exists. Please use a different email." 
      }, { status: 409 });
    }

    const organizationData: OrganizationCreateData = {
      name: parseResult.data.name,
      slug: parseResult.data.name.toLowerCase().replace(/ /g, "-"),
      type: parseResult.data.type,
      acceptTerms: parseResult.data.acceptTerms,
      contactName: parseResult.data.contactName,
      contactEmail: parseResult.data.contactEmail,
      accountType: "Premium", // Set all new users to Premium by default
    };

    // Only add optional fields if they have values
    if (parseResult.data.website) {
      organizationData.website = parseResult.data.website;
    }
    
    if (parseResult.data.size) {
      organizationData.size = parseResult.data.size;
    }
    
    if (parseResult.data.logo) {
      organizationData.logo = parseResult.data.logo.name;
    }

    // Check if organization with same slug already exists
    const existingOrganization = await database.organization.findFirst({
      where: {
        slug: organizationData.slug,
      },
      select: {
        id: true,
      },
    });

    if (existingOrganization) {
      return NextResponse.json({ 
        success: false,
        status: 409,
        message: "An organization with this name already exists. Please choose a different name." 
      }, { status: 409 });
    }

    // Check if contact email is already used by another organization
    const existingEmail = await database.organization.findFirst({
      where: {
        contactEmail: organizationData.contactEmail,
      },
      select: {
        id: true,
      },
    });

    if (existingEmail) {
      return NextResponse.json({ 
        success: false,
        status: 409,
        message: "This email address is already associated with another organization. Please use a different email." 
      }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(parseResult.data.password, 12);

    // Create user and organization in a transaction
    const result = await database.$transaction(async (tx: any) => {
      // Create the organization
      const organization = await tx.organization.create({
        data: organizationData,
      });

      // Create the user
      const user = await tx.user.create({
        data: {
          email: parseResult.data.contactEmail,
          password: hashedPassword,
          firstName: parseResult.data.contactName.split(' ')[0] || parseResult.data.contactName,
          lastName: parseResult.data.contactName.split(' ').slice(1).join(' ') || null,
          isEmailVerified: true, // Since they signed up with email
          isActive: true,
        },
      });

      // Create organization membership (owner role)
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "Owner",
          joinedAt: new Date(),
        },
      });

      // Create Premium organization subscription
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1); // 1 year from now
      
      await tx.organizationSubscription.create({
        data: {
          organizationId: organization.id,
          planId: "premium-plan", // You can adjust this based on your plan structure
          status: "Active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: subscriptionEndDate,
          seats: 5, // Premium plan includes 5 seats
          usedSeats: 1, // Owner takes 1 seat
        },
      });

      return { organization, user };
    });

    return NextResponse.json({
      success: true,
      status: 201,
      message: "Premium organization and user account created successfully",
      data: {
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          accountType: result.organization.accountType,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          isEmailVerified: result.user.isEmailVerified,
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Organization creation error:", error);
    
    // Handle Prisma unique constraint errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      if (error.message.includes('slug')) {
        return NextResponse.json({ 
          success: false,
          status: 409,
          message: "An organization with this name already exists. Please choose a different name." 
        }, { status: 409 });
      }
      if (error.message.includes('contactEmail')) {
        return NextResponse.json({ 
          success: false,
          status: 409,
          message: "This email address is already associated with another organization. Please use a different email." 
        }, { status: 409 });
      }
      return NextResponse.json({ 
        success: false,
        status: 409,
        message: "A record with this information already exists. Please check your details and try again." 
      }, { status: 409 });
    }

    // Handle other errors
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred while creating your account. Please try again later." 
    }, { status: 500 });
  }
}   