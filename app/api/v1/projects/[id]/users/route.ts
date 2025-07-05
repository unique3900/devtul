import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const addUserToProjectSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["Admin", "Collaborator", "Viewer"]).default("Collaborator"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectId = params.id;

    // Check if user has access to this project
    const userRole = session.user.organizations?.[0]?.role;
    
    // Get project to check ownership and organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = project.ownerId === session.user.id;
    const isOrgOwner = userRole === 'Owner';
    const isOrgAdmin = userRole === 'Admin';
    
    // Check if user is a member of this project
    const isProjectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: session.user.id,
        isActive: true
      }
    });

    if (!isOwner && !isOrgOwner && !isOrgAdmin && !isProjectMember) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get project members
    const projectMembers = await prisma.projectMember.findMany({
      where: {
        projectId: projectId,
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
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    const transformedMembers = projectMembers.map(member => ({
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
      users: transformedMembers,
      project: {
        id: project.id,
        name: project.name,
        owner: project.owner
      }
    });

  } catch (error) {
    console.error("Error fetching project users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project users" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectId = params.id;

    // Get project to check ownership and organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Check permissions - only project owner or org admin/owner can add users
    const userRole = session.user.organizations?.[0]?.role;
    const isOwner = project.ownerId === session.user.id;
    const isOrgOwner = userRole === 'Owner';
    const isOrgAdmin = userRole === 'Admin';

    if (!isOwner && !isOrgOwner && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = addUserToProjectSchema.parse(body);
    const { email, firstName, lastName, role } = validatedData;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // Check if user is already a member of this project
      const existingMembership = await prisma.projectMember.findFirst({
        where: {
          userId: user.id,
          projectId: projectId
        }
      });

      if (existingMembership) {
        return NextResponse.json(
          { success: false, error: "User is already a member of this project" },
          { status: 400 }
        );
      }
    } else {
      // Create new user with hardcoded password
      const hashedPassword = await bcrypt.hash("devtool123", 12);

      user = await prisma.user.create({
        data: {
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          password: hashedPassword,
          isActive: true,
          isEmailVerified: false,
        }
      });

      // Add user to organization if project belongs to an organization
      if (project.organizationId) {
        await prisma.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: project.organizationId,
            role: "Member", // Organization role - always Member for project invites
            invitedBy: session.user.id,
            joinedAt: new Date(),
            isActive: true,
          }
        });
      }
    }

    // Add user to project
    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: projectId,
        role: role,
        invitedBy: session.user.id,
        joinedAt: new Date(),
        isActive: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: user ? "User added to project" : "User created and added to project",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: role,
        temporaryPassword: !user ? "devtool123" : undefined,
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

    console.error("Error adding user to project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add user to project" },
      { status: 500 }
    );
  }
} 