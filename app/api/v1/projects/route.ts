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
      status: project.status || 'Active',
      lastScan: project.lastScanAt,
      nextScan: project.nextScanAt,
      created: project.createdAt,
      scores: project.scores || {},
      totalIssues: project.totalIssues || 0,
      criticalIssues: project.criticalIssues || 0,
      highIssues: project.highIssues || 0,
      mediumIssues: project.mediumIssues || 0,
      lowIssues: project.lowIssues || 0,
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description = '',
      category = '',
      url = '',
      urls = [],
      additionalUrls = [],
      scanTypes = { accessibility: true },
      enabledTools,
      scanFrequency = 'Daily',
      complianceOptions = { wcagLevel: 'aa', section508: false },
      tags = [],
      autoStartScan = false
    } = body;

    // Handle both old and new formats
    const allUrls = urls.length > 0 ? urls : [url, ...additionalUrls].filter(Boolean);
    const finalScanTypes = enabledTools || scanTypes;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    if (!allUrls || allUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one URL is required" },
        { status: 400 }
      );
    }

    // Validate URLs
    for (const urlToValidate of allUrls) {
      try {
        new URL(urlToValidate);
      } catch {
        return NextResponse.json(
          { success: false, error: `Invalid URL: ${urlToValidate}` },
          { status: 400 }
        );
      }
    }

    if (!Object.values(finalScanTypes).some(Boolean)) {
      return NextResponse.json(
        { success: false, error: "At least one scan type must be selected" },
        { status: 400 }
      );
    }

    // Get user's organization
    const userOrgMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        isActive: true
      },
      include: {
        organization: true
      }
    });

    const organizationId = userOrgMembership?.organizationId;

    // Create project in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the project
      const project = await tx.project.create({
        data: {
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          ownerId: session.user.id,
          organizationId,
          scanFrequency: scanFrequency as any,
          complianceOptions,
          status: 'Active',
          scanToken: `scan_${Math.random().toString(36).substring(2)}${Date.now()}`
        }
      });

      // Create URLs
      const urlRecords = await Promise.all(
        allUrls.map((urlToCreate: string) => 
          tx.url.create({
            data: {
              url: urlToCreate.trim(),
              projectId: project.id,
              isActive: true
            }
          })
        )
      );

      // Create scan type configurations
      const scanTypeMapping: Record<string, string> = {
        'accessibility': 'Accessibility',
        'security': 'Security',
        'seo': 'SEO',
        'performance': 'Performance',
        'uptime': 'Uptime',
        'ssl': 'SSLTLS'
      };

      const scanTypeConfigs = Object.entries(finalScanTypes)
        .filter(([_, enabled]) => enabled)
        .map(([scanType, _]) => ({
          projectId: project.id,
          scanType: scanTypeMapping[scanType] as any,
          isEnabled: true,
          config: scanType === 'accessibility' ? complianceOptions : {}
        }));

      if (scanTypeConfigs.length > 0) {
        await tx.projectScanType.createMany({
          data: scanTypeConfigs
        });
      }

      return { project, urls: urlRecords };
    });

    // Create project created activity
    try {
      const { createActivityWithNotifications } = await import('@/lib/notification-rules');
      await createActivityWithNotifications(prisma, {
        type: 'ProjectCreated',
        organizationId: organizationId!,
        projectId: result.project.id,
        userId: session.user.id,
        title: `Project "${name}" created`,
        message: `New project "${name}" has been created with ${allUrls.length} URL${allUrls.length > 1 ? 's' : ''}`,
        metadata: {
          projectName: name,
          urlCount: allUrls.length,
          scanTypes: Object.keys(finalScanTypes).filter(key => finalScanTypes[key as keyof typeof finalScanTypes]),
          scanFrequency,
          tags
        }
      });
    } catch (activityError) {
      console.error('Error creating project activity:', activityError);
      // Don't fail project creation if activity creation fails
    }

    // Start initial scans if requested
    if (autoStartScan) {
      try {
        const enabledScanTypes = Object.entries(finalScanTypes)
          .filter(([_, enabled]) => enabled)
          .map(([type, _]) => type);

        for (const urlToScan of allUrls) {
          // Start scans for each enabled scan type
          const enabledScanTypes = Object.entries(finalScanTypes)
            .filter(([_, enabled]) => enabled)
            .map(([scanType, _]) => scanType);

          for (const scanType of enabledScanTypes) {
            const scanTypeMapping: Record<string, string> = {
              'accessibility': 'Accessibility',
              'security': 'Security',
              'seo': 'SEO',
              'performance': 'Performance',
              'uptime': 'Uptime',
              'ssl': 'SSLTLS'
            };

            const scanResponse = await fetch(`${request.nextUrl.origin}/api/v1/scans`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('Cookie') || ''
              },
              body: JSON.stringify({
                projectId: result.project.id,
                url: urlToScan,
                scanType: scanTypeMapping[scanType] || 'Accessibility',
                complianceOptions: scanType === 'accessibility' ? complianceOptions : {}
              })
            });

            if (!scanResponse.ok) {
              console.warn(`Failed to start ${scanType} scan for ${urlToScan}:`, await scanResponse.text());
            }
          }
        }
      } catch (scanError) {
        console.error('Error starting initial scans:', scanError);
        // Don't fail project creation if scan startup fails
      }
    }

    // Return the created project with URLs
    const projectWithDetails = {
      ...result.project,
      urls: result.urls,
      enabledScanTypes: Object.keys(finalScanTypes).filter(key => finalScanTypes[key as keyof typeof finalScanTypes]),
      tags
    };

    return NextResponse.json({
      success: true,
      message: "Project created successfully",
      project: projectWithDetails
    });

  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    );
  }
} 