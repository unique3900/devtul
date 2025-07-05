import { organizationCreateSchema } from "@/app/actions/organization/schema";
import { OrganizationCreateData } from "@/app/actions/organization/types";
import { NextRequest, NextResponse } from "next/server";

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

    const organizationData: OrganizationCreateData = {
      name: parseResult.data.name,
      slug: parseResult.data.name.toLowerCase().replace(/ /g, "-"),
      type: parseResult.data.type,
      acceptTerms: parseResult.data.acceptTerms,
      contactName: parseResult.data.contactName,
      contactEmail: parseResult.data.contactEmail,
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

    // Get database connection
    const database = await getDb();

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

    // Create the organization only after all validations pass
    const organization = await database.organization.create({
      data: organizationData,
    });

    return NextResponse.json({
      success: true,
      status: 201,
      message: "Organization created successfully",
      data: organization
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
    
    // Handle other database errors
    if (error instanceof Error && error.message.includes('Database')) {
      return NextResponse.json({ 
        success: false,
        status: 500,
        message: "Database error occurred. Please try again." 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred. Please try again." 
    }, { status: 500 });
  }
}   