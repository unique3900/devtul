import { NextRequest, NextResponse } from "next/server";
import { analyzeAccessibility } from "@/lib/playwright-axes";
import { analyzeSEO } from "@/lib/html-validator";
import * as fs from "fs/promises";
import * as path from "path";

export async function POST(request: NextRequest) {
  try {
    const { scanId, url } = await request.json();
    
    if (!scanId || !url) {
      return NextResponse.json({ error: "scanId and url are required" }, { status: 400 });
    }

    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    const metadataPath = path.join(downloadDir, "metadata.json");
    
    // Check if scan exists
    try {
      await fs.access(metadataPath);
    } catch {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Read metadata
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    
    // Analyze accessibility using Playwright Axe
    const accessibilityResults = await analyzeAccessibility(url, {
      wcagLevel: "aa",
      section508: true,
      bestPractices: true,
      experimental: false,
      captureScreenshots: true
    });

    // Analyze SEO
    const seoResults = await analyzeSEO(url, {
      meta: true,
      content: true,
      performance: true,
      structure: true,
      technical: true
    });

    // Transform results to our format
    const issues = [
      ...accessibilityResults.results.map(result => ({
        id: result.id,
        type: mapAxeTagToType(result.tags),
        severity: mapSeverity(result.severity),
        message: result.message,
        help: result.help || '',
        element: result.element || '',
        elementPath: result.elementPath || '',
        fixed: false,
        wcagRule: extractWcagRule(result.tags),
        impact: result.impact,
        screenshotPath: result.screenshotPath
      })),
      ...seoResults.results.map(result => ({
        id: result.id,
        type: 'seo' as const,
        severity: result.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
        message: result.message,
        help: result.help,
        element: result.element || '',
        elementPath: result.elementPath || '',
        fixed: false,
        category: result.category,
        recommendation: result.recommendation
      }))
    ];

    // Save analysis results
    const analysisResults = {
      scanId,
      url,
      timestamp: new Date().toISOString(),
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
        accessibility: accessibilityResults.results.length,
        seo: seoResults.results.length
      },
      accessibilityDetails: accessibilityResults.summary,
      seoDetails: seoResults.summary
    };

    await fs.writeFile(
      path.join(downloadDir, "analysis.json"),
      JSON.stringify(analysisResults, null, 2)
    );

    return NextResponse.json({
      success: true,
      issues,
      summary: analysisResults.summary
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze accessibility" },
      { status: 500 }
    );
  }
}

function mapAxeTagToType(tags: string[]): 'contrast' | 'alt-text' | 'heading' | 'focus' | 'aria' | 'keyboard' {
  if (tags.some(tag => tag.includes('color-contrast') || tag.includes('143'))) return 'contrast';
  if (tags.some(tag => tag.includes('111') || tag.includes('alt'))) return 'alt-text';
  if (tags.some(tag => tag.includes('131') || tag.includes('heading'))) return 'heading';
  if (tags.some(tag => tag.includes('focus') || tag.includes('247'))) return 'focus';
  if (tags.some(tag => tag.includes('aria') || tag.includes('412'))) return 'aria';
  if (tags.some(tag => tag.includes('keyboard') || tag.includes('211'))) return 'keyboard';
  return 'aria'; // default
}

function mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (severity.toLowerCase()) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'medium';
  }
}

function extractWcagRule(tags: string[]): string {
  const wcagTag = tags.find(tag => tag.match(/wcag\d+/));
  return wcagTag || '';
}
