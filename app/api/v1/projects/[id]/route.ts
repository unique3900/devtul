import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id } } } }
        ]
      },
      include: {
        urls: {
          select: {
            id: true,
            url: true,
            isActive: true,
          },
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

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Transform the data for the frontend
    const transformedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      category: project.category,
      scanFrequency: project.scanFrequency,
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
      urls: project.urls,
      tags: project.projectTags.map(pt => ({
        name: pt.tag.name,
        color: pt.tag.color,
      })),
      enabledScans: project.projectScanTypes.filter(pst => pst.isEnabled).map(pst => pst.scanType),
      enabledTools: {
        security: project.projectScanTypes.some(pst => pst.scanType === 'Security' && pst.isEnabled),
        seo: project.projectScanTypes.some(pst => pst.scanType === 'SEO' && pst.isEnabled),
        accessibility: project.projectScanTypes.some(pst => pst.scanType === 'Accessibility' && pst.isEnabled),
        performance: project.projectScanTypes.some(pst => pst.scanType === 'Performance' && pst.isEnabled),
        uptime: project.projectScanTypes.some(pst => pst.scanType === 'Uptime' && pst.isEnabled),
        ssl: project.projectScanTypes.some(pst => pst.scanType === 'SSLTLS' && pst.isEnabled),
      },
      urlCount: project._count.urls,
      scanCount: project._count.scans,
    };

    return NextResponse.json({
      success: true,
      project: transformedProject
    });

  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has permission to delete this project
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id, role: { in: ['Owner', 'Admin'] } } } } }
        ]
      }
    });

    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.project.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
} 