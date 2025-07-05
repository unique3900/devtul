import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const addUserToProjectsSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["Admin", "Collaborator", "Viewer"]).default("Collaborator"),
  projectIds: z.array(z.string()).min(1, "At least one project must be selected"),
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

    const organizationId = session.user.primaryOrganization?.id;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = addUserToProjectsSchema.parse(body);
    const { email, firstName, lastName, role, projectIds } = validatedData;

    // Check if user has permission to add users to these projects
    const userRole = session.user.organizations?.[0]?.role;
    
    // Verify all selected projects exist and user has access to them
    const projects = await prisma.project.findMany({
      where: {
        id: {
          in: projectIds
        },
        organizationId: organizationId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        organizationId: true
      }
    });

    if (projects.length !== projectIds.length) {
      return NextResponse.json(
        { success: false, error: "Some projects not found or not accessible" },
        { status: 400 }
      );
    }

    // Check permissions for each project
    const isOwner = userRole === 'Owner';
    const isAdmin = userRole === 'Admin';
    
    for (const project of projects) {
      const isProjectOwner = project.ownerId === session.user.id;
      
      if (!isOwner && !isAdmin && !isProjectOwner) {
        return NextResponse.json(
          { success: false, error: `Insufficient permissions for project: ${project.name}` },
          { status: 403 }
        );
      }
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    let isNewUser = false;

    if (user) {
      // Check if user is already a member of any of these projects
      const existingMemberships = await prisma.projectMember.findMany({
        where: {
          userId: user.id,
          projectId: {
            in: projectIds
          }
        },
        include: {
          project: {
            select: {
              name: true
            }
          }
        }
      });

      if (existingMemberships.length > 0) {
        const existingProjectNames = existingMemberships.map(m => m.project.name);
        return NextResponse.json(
          { success: false, error: `User is already a member of these projects: ${existingProjectNames.join(', ')}` },
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

      isNewUser = true;

      // Add user to organization as Member
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organizationId,
          role: "Member", // Organization role - always Member for project invites
          invitedBy: session.user.id,
          joinedAt: new Date(),
          isActive: true,
        }
      });
    }

    // Add user to all selected projects
    const projectMemberships = projectIds.map(projectId => ({
      userId: user.id,
      projectId: projectId,
      role: role,
      invitedBy: session.user.id,
      joinedAt: new Date(),
      isActive: true,
    }));

    await prisma.projectMember.createMany({
      data: projectMemberships
    });

    return NextResponse.json({
      success: true,
      message: isNewUser 
        ? `User created and added to ${projects.length} project(s)`
        : `User added to ${projects.length} project(s)`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: role,
        temporaryPassword: isNewUser ? "devtool123" : undefined,
      },
      projects: projects.map(p => ({ id: p.id, name: p.name }))
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

    console.error("Error adding user to projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add user to projects" },
      { status: 500 }
    );
  }
} 