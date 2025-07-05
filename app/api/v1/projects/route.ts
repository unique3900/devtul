import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/app/actions/project";
import { projectCreateSchema } from "@/app/actions/project/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request data
    const validationResult = projectCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request data",
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    // Create the project
    const result = await createProject(body);
    
    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(
        result,
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in project creation API:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    );
  }
} 