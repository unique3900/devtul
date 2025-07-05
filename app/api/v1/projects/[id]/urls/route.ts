import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/db";
import { z } from "zod";

const urlCreateSchema = z.object({
  url: z.string().url("Invalid URL format"),
  isActive: z.boolean().default(true),
});

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

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id } } } }
        ]
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const urls = await prisma.url.findMany({
      where: {
        projectId: params.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      urls: urls
    });

  } catch (error) {
    console.error("Error fetching project URLs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch URLs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has permission to modify this project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: session.user.id },
          { organization: { members: { some: { userId: session.user.id, role: { in: ['Owner', 'Admin'] } } } }
        ]
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = urlCreateSchema.parse(body);
    const { url, isActive } = validatedData;

    // Check if URL already exists in this project
    const existingUrl = await prisma.url.findFirst({
      where: {
        projectId: params.id,
        url: url
      }
    });

    if (existingUrl) {
      return NextResponse.json(
        { success: false, error: "URL already exists in this project" },
        { status: 400 }
      );
    }

    const newUrl = await prisma.url.create({
      data: {
        url,
        projectId: params.id,
        isActive,
      }
    });

    return NextResponse.json({
      success: true,
      message: "URL added successfully",
      url: newUrl
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

    console.error("Error adding URL to project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add URL" },
      { status: 500 }
    );
  }
} 