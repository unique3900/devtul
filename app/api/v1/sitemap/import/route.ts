import { NextRequest, NextResponse } from "next/server";
import { importFromSitemap } from "@/app/actions/project";
import { sitemapImportSchema } from "@/app/actions/project/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request data
    const validationResult = sitemapImportSchema.safeParse(body);
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

    // Import from sitemap
    const result = await importFromSitemap(body);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(
        result,
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in sitemap import API:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    );
  }
} 