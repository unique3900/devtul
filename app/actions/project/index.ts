"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";
import { projectCreateSchema, sitemapImportSchema } from "./schema";
import { ProjectCreateResult, SitemapImportResult } from "./types";
import { revalidatePath } from "next/cache";
import { ProjectStatus } from "@prisma/client";

export async function createProject(data: unknown): Promise<ProjectCreateResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    const validatedData = projectCreateSchema.parse(data);
    const { enabledTools, tags, additionalUrls, url, ...projectData } = validatedData;

    // Create project
    const project = await prisma.project.create({
      data: {
        ...projectData,
        ownerId: session.user.id,
        organizationId: session.user.primaryOrganization?.id,
        scanToken: generateScanToken(),
      },
      include: {
        urls: true,
        projectScanTypes: true,
        projectTags: {
          include: {
            tag: true,
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

    // Create main URL
    await prisma.url.create({
      data: {
        url: url,
        projectId: project.id,
      },
    });

    // Create additional URLs if provided
    if (additionalUrls && additionalUrls.length > 0) {
      await prisma.url.createMany({
        data: additionalUrls.map((url) => ({
          url,
          projectId: project.id,
        })),
      });
    }

    // Create enabled scan types
    const scanTypesToCreate = [];
    if (enabledTools.security) scanTypesToCreate.push("Security");
    if (enabledTools.seo) scanTypesToCreate.push("SEO");
    if (enabledTools.accessibility) scanTypesToCreate.push("Accessibility");
    if (enabledTools.performance) scanTypesToCreate.push("Performance");
    if (enabledTools.uptime) scanTypesToCreate.push("Uptime");
    if (enabledTools.ssl) scanTypesToCreate.push("SSLTLS");

    if (scanTypesToCreate.length > 0) {
      await prisma.projectScanType.createMany({
        data: scanTypesToCreate.map((scanType) => ({
          projectId: project.id,
          scanType: scanType as any,
          isEnabled: true,
        })),
      });
    }

    // Create tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Find or create tag
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {},
        });

        // Create project tag relationship
        await prisma.projectTag.create({
          data: {
            projectId: project.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Fetch the complete project with relations
    const completeProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        urls: true,
        projectScanTypes: true,
        projectTags: {
          include: {
            tag: true,
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

    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true, project: completeProject! };
  } catch (error) {
    console.error("Error creating project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(projectId: string, data: unknown): Promise<ProjectCreateResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    const validatedData = projectCreateSchema.parse(data);
    const { enabledTools, tags, additionalUrls, url, ...projectData } = validatedData;

    // Check if user has permission to update this project
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id, role: { in: ['Owner', 'Admin'] } } } } }
        ]
      }
    });

    if (!existingProject) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: projectData,
      include: {
        urls: true,
        projectScanTypes: true,
        projectTags: {
          include: {
            tag: true,
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

    // Update main URL if provided
    if (url) {
      await prisma.url.updateMany({
        where: { projectId, isActive: true },
        data: { url }
      });
    }

    // Handle additional URLs
    if (additionalUrls && additionalUrls.length > 0) {
      // Delete existing additional URLs
      await prisma.url.deleteMany({
        where: { projectId, url: { not: url } }
      });
      
      // Add new additional URLs
      await prisma.url.createMany({
        data: additionalUrls.map((additionalUrl) => ({
          url: additionalUrl,
          projectId,
          isActive: true,
        })),
      });
    }

    // Update scan types
    await prisma.projectScanType.deleteMany({
      where: { projectId }
    });

    const scanTypesToCreate = [];
    if (enabledTools.security) scanTypesToCreate.push("Security");
    if (enabledTools.seo) scanTypesToCreate.push("SEO");
    if (enabledTools.accessibility) scanTypesToCreate.push("Accessibility");
    if (enabledTools.performance) scanTypesToCreate.push("Performance");
    if (enabledTools.uptime) scanTypesToCreate.push("Uptime");
    if (enabledTools.ssl) scanTypesToCreate.push("SSLTLS");

    if (scanTypesToCreate.length > 0) {
      await prisma.projectScanType.createMany({
        data: scanTypesToCreate.map((scanType) => ({
          projectId,
          scanType: scanType as any,
          isEnabled: true,
        })),
      });
    }

    // Update tags
    await prisma.projectTag.deleteMany({
      where: { projectId }
    });

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {},
        });

        await prisma.projectTag.create({
          data: {
            projectId,
            tagId: tag.id,
          },
        });
      }
    }

    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true, project: updatedProject as any };
  } catch (error) {
    console.error("Error updating project:", error);
    return { success: false, error: "Failed to update project" };
  }
}

export async function updateProjectStatus(projectId: string, status: string): Promise<ProjectCreateResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    // Check if user has permission to update this project
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id, role: { in: ['Owner', 'Admin'] } } } } }
        ]
      }
    });

    if (!existingProject) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { status: status as ProjectStatus },
      include: {
        urls: true,
        projectScanTypes: true,
        projectTags: {
          include: {
            tag: true,
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



   
      


    // Update scan types
    await prisma.projectScanType.deleteMany({
      where: { projectId }
    });


    // Update tags
    await prisma.projectTag.deleteMany({
      where: { projectId }
    });

    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true, project: updatedProject as any };
  } catch (error) {
    console.error("Error updating project:", error);
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(projectId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    // Check if user has permission to delete this project
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id, role: { in: ['Owner', 'Admin'] } } } } }
        ]
      }
    });

    if (!existingProject) {
      return { success: false, error: "Project not found or access denied" };
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}

export async function addUrlToProject(projectId: string, url: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    // Check if user has permission to modify this project
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id, role: { in: ['Owner', 'Admin'] } } } } }
        ]
      }
    });

    if (!existingProject) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Check if URL already exists
    const existingUrl = await prisma.url.findFirst({
      where: { projectId, url }
    });

    if (existingUrl) {
      return { success: false, error: "URL already exists in this project" };
    }

    await prisma.url.create({
      data: {
        url,
        projectId,
        isActive: true,
      },
    });

    revalidatePath("/projects");

    return { success: true };
  } catch (error) {
    console.error("Error adding URL to project:", error);
    return { success: false, error: "Failed to add URL" };
  }
}
export async function importFromSitemap(data: unknown): Promise<SitemapImportResult> {
  try {
    const validatedData = sitemapImportSchema.parse(data);
    const { sitemapUrl } = validatedData;

    // Fetch sitemap
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      return { success: false, error: "Failed to fetch sitemap" };
    }

    const sitemapContent = await response.text();
    
    // Parse sitemap XML to extract URLs
    const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
    if (!urlMatches) {
      return { success: false, error: "No URLs found in sitemap" };
    }

    const urls = urlMatches
      .map((match) => match.replace(/<\/?loc>/g, ""))
      .filter((url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

    if (urls.length === 0) {
      return { success: false, error: "No valid URLs found in sitemap" };
    }

    // Limit to reasonable number of URLs
    const limitedUrls = urls.slice(0, 50);

    return { success: true, urls: limitedUrls };
  } catch (error) {
    console.error("Error importing sitemap:", error);
    return { success: false, error: "Failed to import sitemap" };
  }
}

function generateScanToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
} 