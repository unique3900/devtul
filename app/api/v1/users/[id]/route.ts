import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = params.id;
    const organizationId = session.user.primaryOrganization?.id;
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 }
      );
    }

    const userRole = session.user.organizations?.[0]?.role;

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get organization membership info
    const orgMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: userId,
        organizationId: organizationId,
        isActive: true
      }
    });

    if (!orgMembership) {
      return NextResponse.json(
        { success: false, error: "User not found in organization" },
        { status: 404 }
      );
    }

    // Get project memberships based on user role
    let projectMemberships = [];

    if (userRole === 'Owner') {
      // Owner can see all projects the user is in within the organization
      projectMemberships = await prisma.projectMember.findMany({
        where: {
          userId: userId,
          isActive: true,
          project: {
            organizationId: organizationId
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            }
          }
        }
      });
    } else if (userRole === 'Admin') {
      // Admin can see projects within the organization
      projectMemberships = await prisma.projectMember.findMany({
        where: {
          userId: userId,
          isActive: true,
          project: {
            organizationId: organizationId
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            }
          }
        }
      });
    } else {
      // Regular users can only see shared projects
      const userProjects = await prisma.projectMember.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: {
          projectId: true
        }
      });

      const projectIds = userProjects.map(pm => pm.projectId);

      if (projectIds.length > 0) {
        projectMemberships = await prisma.projectMember.findMany({
          where: {
            userId: userId,
            projectId: {
              in: projectIds
            },
            isActive: true
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
              }
            }
          }
        });
      }
    }

    const projects = projectMemberships.map(pm => ({
      id: pm.project.id,
      name: pm.project.name,
      description: pm.project.description,
      status: pm.project.status,
      role: pm.role,
    }));

    const userInfo = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: orgMembership.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      joinedAt: orgMembership.joinedAt,
      invitedAt: orgMembership.invitedAt,
      projects: projects,
    };

    return NextResponse.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user information" },
      { status: 500 }
    );
  }
} 