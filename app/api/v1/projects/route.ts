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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const status = searchParams.get('status') || 'all';

    const user = session.user;

    // Determine access level based on user's role in organization
    const isOwner = user.organizations?.some(org => org.role === 'Owner');
    const organizationId = user.primaryOrganization?.id;

    let whereClause: any = {};

    // Access control: Owner sees all org projects, others see projects they own OR are members of
    if (isOwner && organizationId) {
      // Organization owners see all organization projects
      whereClause.organizationId = organizationId;
    } else {
      // Others see projects they own OR are members of
      whereClause.OR = [
        { ownerId: user.id }, // Projects they own
        { 
          members: { 
            some: { 
              userId: user.id,
              isActive: true 
            } 
          } 
        } // Projects they're members of
      ];
      
      // Only show projects from user's organization if they have one
      if (organizationId) {
        whereClause.organizationId = organizationId;
      }
    }

    // Add search filter
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { urls: { some: { url: { contains: search, mode: 'insensitive' } } } }
      ];
      
      // If we already have an OR clause for access control, we need to combine them
      if (whereClause.OR) {
        // Combine access control OR with search OR using AND
        whereClause.AND = [
          { OR: whereClause.OR }, // Access control
          { OR: searchConditions } // Search conditions
        ];
        delete whereClause.OR; // Remove the original OR
      } else {
        // No existing OR, just add search conditions
        whereClause.OR = searchConditions;
      }
    }

    // Add status filter
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Determine sort order
    let orderBy: any = {};
    switch (sortBy) {
      case 'lastScan':
        orderBy = { lastScanAt: sortOrder };
        break;
      case 'issues':
        orderBy = { totalIssues: sortOrder };
        break;
      case 'created':
        orderBy = { createdAt: sortOrder };
        break;
      default:
        orderBy = { name: sortOrder };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy,
      include: {
        urls: {
          select: {
            id: true,
            url: true,
            isActive: true,
          },
          take: 1, // Get primary URL
        },
        projectTags: {
          include: {
            tag: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        },
        projectScanTypes: {
          select: {
            scanType: true,
            isEnabled: true,
          },
        },
        _count: {
          select: {
            urls: true,
            scans: true,
          },
        },
      },
    });

    // Transform the data for the frontend
    const transformedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      category: project.category,
      url: project.urls[0]?.url || '',
      status: (project as any).status || 'Active',
      lastScan: (project as any).lastScanAt,
      nextScan: (project as any).nextScanAt,
      created: project.createdAt,
      scores: (project as any).scores || {},
      totalIssues: (project as any).totalIssues || 0,
      criticalIssues: (project as any).criticalIssues || 0,
      highIssues: (project as any).highIssues || 0,
      mediumIssues: (project as any).mediumIssues || 0,
      lowIssues: (project as any).lowIssues || 0,
      scanFrequency: project.scanFrequency,
      tags: project.projectTags.map(pt => ({
        name: pt.tag.name,
        color: pt.tag.color,
      })),
      enabledScans: project.projectScanTypes.filter(pst => pst.isEnabled).map(pst => pst.scanType),
      urlCount: project._count.urls,
      scanCount: project._count.scans,
    }));

    return NextResponse.json({
      success: true,
      projects: transformedProjects
    });

  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
} 