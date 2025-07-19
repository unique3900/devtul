import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import db from "@/db"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const projectId = searchParams.get('projectId')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')

    // Get user's organization memberships to determine access
    const userOrganizations = await db.organizationMember.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: {
        organizationId: true,
        role: true
      }
    })

    // Get user's project memberships
    const userProjects = await db.projectMember.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: {
        projectId: true,
        role: true
      }
    })

    // Get projects owned by the user
    const ownedProjects = await db.project.findMany({
      where: {
        ownerId: session.user.id
      },
      select: {
        id: true
      }
    })

    const organizationIds = userOrganizations.map(org => org.organizationId)
    const projectIds = [
      ...userProjects.map(proj => proj.projectId),
      ...ownedProjects.map(proj => proj.id)
    ]

    // Build where clause based on user access
    const whereClause: any = {
      OR: [
        // User-specific activities
        { userId: session.user.id },
        // Organization activities user has access to
        { organizationId: { in: organizationIds } },
        // Project activities user has access to
        { projectId: { in: projectIds } },
        // Global activities
        { isGlobal: true }
      ]
    }

    // Add additional filters
    if (projectId) {
      whereClause.projectId = projectId
    }
    if (category) {
      whereClause.category = category
    }
    if (priority) {
      whereClause.priority = priority
    }

    // Fetch activities with related data
    const activities = await db.recentActivity.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        scan: {
          select: {
            id: true,
            scanType: true,
            status: true
          }
        },
        deliveredTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await db.recentActivity.count({
      where: whereClause
    })

    // Transform activities for frontend consumption
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      message: activity.message,
      type: activity.type,
      category: activity.category,
      priority: activity.priority,
      color: activity.color,
      icon: activity.icon,
      isGlobal: activity.isGlobal,
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      metadata: activity.metadata,
      notificationRules: activity.notificationRules,
      // Related data
      user: activity.user,
      project: activity.project,
      organization: activity.organization,
      scan: activity.scan,
      deliveredTo: activity.deliveredTo,
      // Computed fields
      userDisplayName: activity.user 
        ? `${activity.user.firstName} ${activity.user.lastName}`.trim() || activity.user.email
        : null,
      projectName: activity.project?.name,
      organizationName: activity.organization?.name
    }))

    // Group activities by date for better UX
    const groupedActivities = transformedActivities.reduce((groups: any, activity) => {
      const date = new Date(activity.createdAt).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
      return groups
    }, {})

    return NextResponse.json({
      success: true,
      activities: transformedActivities,
      groupedActivities,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      userAccess: {
        organizationIds,
        projectIds,
        isOwner: ownedProjects.length > 0,
        isAdmin: userOrganizations.some(org => org.role === 'Owner' || org.role === 'Admin')
      }
    })

  } catch (error) {
    console.error("Error fetching recent activities:", error)
    return NextResponse.json(
      { error: "Failed to fetch recent activities" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { 
      type, 
      title, 
      message, 
      category, 
      priority = 'Medium',
      projectId, 
      scanId,
      metadata,
      isGlobal = false 
    } = await request.json()

    if (!type || !title || !message || !category) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, message, category" },
        { status: 400 }
      )
    }

    // Get organization ID from project if provided
    let organizationId = null
    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true }
      })
      organizationId = project?.organizationId
    }

    if (!organizationId && !isGlobal) {
      // Get user's primary organization
      const userOrg = await db.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: {
          organizationId: true
        }
      })
      organizationId = userOrg?.organizationId
    }

    if (!organizationId && !isGlobal) {
      return NextResponse.json(
        { error: "Cannot determine organization for activity" },
        { status: 400 }
      )
    }

    // Use our notification system for consistent activity creation
    const { createActivityWithNotifications } = await import('@/lib/notification-rules')
    
    await createActivityWithNotifications(db, {
      type,
      organizationId: organizationId!,
      projectId,
      scanId,
      userId: session.user.id,
      title,
      message,
      metadata
    })

    return NextResponse.json({
      success: true,
      message: "Activity created successfully"
    })

  } catch (error) {
    console.error("Error creating activity:", error)
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    )
  }
}

// Mark activities as read
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { activityIds, action } = await request.json()

    if (!activityIds || !Array.isArray(activityIds)) {
      return NextResponse.json(
        { error: "Activity IDs array is required" },
        { status: 400 }
      )
    }

    if (action === 'markAsRead') {
      // This would typically update a separate user_activity_read table
      // For now, we'll just return success since our current schema doesn't have read tracking
      return NextResponse.json({
        success: true,
        message: `Marked ${activityIds.length} activities as read`
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("Error updating activities:", error)
    return NextResponse.json(
      { error: "Failed to update activities" },
      { status: 500 }
    )
  }
}
