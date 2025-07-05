import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const userCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["Admin", "Member", "Viewer"]).default("Member"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is organization owner/admin
    const isAuthorized = session.user.organizations?.some(org => 
      org.role === 'Owner' || org.role === 'Admin'
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = userCreateSchema.parse(body);
    const { email, firstName, lastName, role } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // If user exists, check if they're already in the organization
      const organizationId = session.user.primaryOrganization?.id;
      if (organizationId) {
        const existingMembership = await prisma.organizationMember.findFirst({
          where: {
            userId: existingUser.id,
            organizationId: organizationId
          }
        });

        if (existingMembership) {
          return NextResponse.json(
            { success: false, error: "User is already a member of this organization" },
            { status: 400 }
          );
        }

        // Add existing user to organization
        await prisma.organizationMember.create({
          data: {
            userId: existingUser.id,
            organizationId: organizationId,
            role: role,
            invitedBy: session.user.id,
            joinedAt: new Date(),
            isActive: true,
          }
        });

        return NextResponse.json({
          success: true,
          message: "Existing user added to organization",
          user: {
            id: existingUser.id,
            email: existingUser.email,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            role: role,
          }
        });
      }
    }

    // Create new user with hardcoded password
    const hashedPassword = await bcrypt.hash("devtool123", 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        password: hashedPassword,
        isActive: true,
        isEmailVerified: false, // Will be verified when they first login
      }
    });

    // Add user to organization if organization exists
    const organizationId = session.user.primaryOrganization?.id;
    if (organizationId) {
      await prisma.organizationMember.create({
        data: {
          userId: newUser.id,
          organizationId: organizationId,
          role: role,
          invitedBy: session.user.id,
          joinedAt: new Date(),
          isActive: true,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "User created and added to organization",
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: role,
        temporaryPassword: "devtool123", // Include in response for now
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid input data",
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is organization owner/admin
    const isAuthorized = session.user.organizations?.some(org => 
      org.role === 'Owner' || org.role === 'Admin'
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const organizationId = session.user.primaryOrganization?.id;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 }
      );
    }

    // Get all organization members
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: organizationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const transformedMembers = members.map(member => ({
      id: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      role: member.role,
      isActive: member.user.isActive,
      lastLoginAt: member.user.lastLoginAt,
      joinedAt: member.joinedAt,
      invitedAt: member.invitedAt,
    }));

    return NextResponse.json({
      success: true,
      users: transformedMembers
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
} 