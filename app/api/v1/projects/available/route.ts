import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";

export async function GET(request: NextRequest) {
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

    // Get user's role and projects they have access to
    const userRole = session.user.organizations?.[0]?.role;
    
    let projects = [];

    if (userRole === 'Owner') {
      // Owner can see all organization projects
      projects = await prisma.project.findMany({
        where: {
          organizationId: organizationId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          ownerId: true,
          _count: {
            select: {
              members: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    } else if (userRole === 'Admin') {
      // Admin can see all organization projects
      projects = await prisma.project.findMany({
        where: {
          organizationId: organizationId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          ownerId: true,
          _count: {
            select: {
              members: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    } else {
      // Regular users can only see projects they own or are members of
      const userProjects = await prisma.project.findMany({
        where: {
          OR: [
            {
              ownerId: session.user.id
            },
            {
              members: {
                some: {
                  userId: session.user.id,
                  isActive: true
                }
              }
            }
          ],
          organizationId: organizationId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          ownerId: true,
          _count: {
            select: {
              members: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      projects = userProjects;
    }

    const transformedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      isOwner: project.ownerId === session.user.id,
      memberCount: project._count.members
    }));

    return NextResponse.json({
      success: true,
      projects: transformedProjects,
      userRole: userRole
    });

  } catch (error) {
    console.error("Error fetching available projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch available projects" },
      { status: 500 }
    );
  }
} 