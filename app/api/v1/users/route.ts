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

    const organizationId = session.user.primaryOrganization?.id;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization found" },
        { status: 400 }
      );
    }

    const userRole = session.user.organizations?.[0]?.role;

    let users = [];

    if (userRole === 'Owner') {
      // Owner can see all organization members
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
            }
          }
        },
        orderBy: {
          invitedAt: 'desc'
        }
      });

      users = members.map(member => ({
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

    } else if (userRole === 'Admin') {
      // Admin can see project-specific users from projects they have access to
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          project: {
            organizationId: organizationId,
          },
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
          },
          project: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: {
          joinedAt: 'desc'
        }
      });

      // Group users by unique user ID and collect their projects
      const userMap = new Map();
      projectMembers.forEach(member => {
        const userId = member.user.id;
        if (!userMap.has(userId)) {
          // Get organization role for this user
          userMap.set(userId, {
            id: member.user.id,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            role: "Admin", // Will be updated with org role
            isActive: member.user.isActive,
            lastLoginAt: member.user.lastLoginAt,
            joinedAt: member.joinedAt,
            invitedAt: member.invitedAt,
            projects: []
          });
        }
        userMap.get(userId).projects.push({
          id: member.project.id,
          name: member.project.name,
          role: member.role
        });
      });

      // Get organization roles for each user
      const userIds = Array.from(userMap.keys());
      const orgMemberships = await prisma.organizationMember.findMany({
        where: {
          userId: { in: userIds },
          organizationId: organizationId,
          isActive: true
        }
      });

      // Update users with their organization roles
      orgMemberships.forEach(membership => {
        if (userMap.has(membership.userId)) {
          const user = userMap.get(membership.userId);
          user.role = membership.role;
          user.joinedAt = membership.joinedAt;
          user.invitedAt = membership.invitedAt;
        }
      });

      users = Array.from(userMap.values());

    } else {
      // Regular members can see:
      // 1. Organization owners (always visible)
      // 2. Themselves
      // 3. Team members from shared projects
      
      const userIds = new Set<string>();
      const userMap = new Map();

      // 1. Always include organization owners
      const orgOwners = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          role: 'Owner',
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
        }
      });

      orgOwners.forEach(owner => {
        userIds.add(owner.user.id);
        userMap.set(owner.user.id, {
          id: owner.user.id,
          email: owner.user.email,
          firstName: owner.user.firstName,
          lastName: owner.user.lastName,
          role: owner.role,
          isActive: owner.user.isActive,
          lastLoginAt: owner.user.lastLoginAt,
          joinedAt: owner.joinedAt,
          invitedAt: owner.invitedAt,
          projects: []
        });
      });

      // 2. Include current user themselves
      const currentUserMembership = await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
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
            }
          }
        }
      });

      if (currentUserMembership) {
        userIds.add(currentUserMembership.user.id);
        userMap.set(currentUserMembership.user.id, {
          id: currentUserMembership.user.id,
          email: currentUserMembership.user.email,
          firstName: currentUserMembership.user.firstName,
          lastName: currentUserMembership.user.lastName,
          role: currentUserMembership.role,
          isActive: currentUserMembership.user.isActive,
          lastLoginAt: currentUserMembership.user.lastLoginAt,
          joinedAt: currentUserMembership.joinedAt,
          invitedAt: currentUserMembership.invitedAt,
          projects: []
        });
      }

      // 3. Get user's projects
      const userProjects = await prisma.projectMember.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: {
          projectId: true,
          project: {
            select: {
              id: true,
              name: true,
            }
          },
          role: true
        }
      });

      const projectIds = userProjects.map(pm => pm.projectId);

      // Add current user's projects
      if (currentUserMembership) {
        userProjects.forEach(project => {
          userMap.get(currentUserMembership.user.id).projects.push({
            id: project.project.id,
            name: project.project.name,
            role: project.role
          });
        });
      }

      // 4. Get team members from shared projects
      if (projectIds.length > 0) {
        const teamMembers = await prisma.projectMember.findMany({
          where: {
            projectId: {
              in: projectIds
            },
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
            },
            project: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            joinedAt: 'desc'
          }
        });

        // Add team members to the map
        teamMembers.forEach(member => {
          const userId = member.user.id;
          userIds.add(userId);
          
          if (!userMap.has(userId)) {
            userMap.set(userId, {
              id: member.user.id,
              email: member.user.email,
              firstName: member.user.firstName,
              lastName: member.user.lastName,
              role: "Member", // Will be updated with org role
              isActive: member.user.isActive,
              lastLoginAt: member.user.lastLoginAt,
              joinedAt: member.joinedAt,
              invitedAt: member.invitedAt,
              projects: []
            });
          }
          
          // Add project association
          const existingProject = userMap.get(userId).projects.find(p => p.id === member.project.id);
          if (!existingProject) {
            userMap.get(userId).projects.push({
              id: member.project.id,
              name: member.project.name,
              role: member.role
            });
          }
        });

        // Get organization roles for all users
        const allUserIds = Array.from(userIds);
        const orgMemberships = await prisma.organizationMember.findMany({
          where: {
            userId: { in: allUserIds },
            organizationId: organizationId,
            isActive: true
          }
        });

        // Update users with their organization roles
        orgMemberships.forEach(membership => {
          if (userMap.has(membership.userId)) {
            const user = userMap.get(membership.userId);
            user.role = membership.role;
            user.joinedAt = membership.joinedAt;
            user.invitedAt = membership.invitedAt;
          }
        });
      }

      users = Array.from(userMap.values());
    }

    return NextResponse.json({
      success: true,
      users: users,
      userRole: userRole
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
} 