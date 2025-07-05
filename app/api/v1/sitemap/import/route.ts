import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const sitemapImportSchema = z.object({
  sitemapUrl: z.string().url("Invalid sitemap URL"),
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

    const body = await request.json();
    const validatedData = sitemapImportSchema.parse(body);
    const { sitemapUrl } = validatedData;

    // Fetch sitemap
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'DevTul Sitemap Parser/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch sitemap" },
        { status: 400 }
      );
    }

    const sitemapContent = await response.text();

    // Parse XML sitemap
    const urlPattern = /<loc>(.*?)<\/loc>/g;
    const urls: string[] = [];
    let match;

    while ((match = urlPattern.exec(sitemapContent)) !== null) {
      const url = match[1].trim();
      if (url && url.startsWith('http')) {
        urls.push(url);
      }
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: "No URLs found in sitemap" },
        { status: 400 }
      );
    }

    // Limit to first 100 URLs to avoid overwhelming the system
    const limitedUrls = urls.slice(0, 100);

    return NextResponse.json({
      success: true,
      urls: limitedUrls,
      totalFound: urls.length,
      imported: limitedUrls.length,
      message: urls.length > 100 ? 
        `Found ${urls.length} URLs, imported first 100` : 
        `Successfully imported ${urls.length} URLs`
    });

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

    console.error("Error importing sitemap:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import sitemap" },
      { status: 500 }
    );
  }
} 