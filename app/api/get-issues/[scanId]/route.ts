import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { scanId } = params;
    
    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    const analysisPath = path.join(downloadDir, "analysis.json");
    const fixReportPath = path.join(downloadDir, "fix_report.json");
    
    try {
      // Read analysis results
      const analysisData = JSON.parse(await fs.readFile(analysisPath, "utf-8"));
      
      // Try to read fix report if it exists
      let fixData = null;
      try {
        fixData = JSON.parse(await fs.readFile(fixReportPath, "utf-8"));
      } catch {
        // Fix report doesn't exist yet
      }
      
      // Merge fix results with issues
      let issues = analysisData.issues || [];
      
      if (fixData && fixData.fixResults) {
        issues = issues.map((issue: any) => {
          const fixResult = fixData.fixResults.find((f: any) => f.issueId === issue.id);
          if (fixResult) {
            return {
              ...issue,
              fixed: fixResult.fixed,
              aiSuggestion: fixResult.explanation,
              confidence: fixResult.confidence
            };
          }
          return issue;
        });
      }
      
      return NextResponse.json({
        success: true,
        issues,
        summary: analysisData.summary,
        fixSummary: fixData?.summary
      });
      
    } catch (error) {
      return NextResponse.json({ error: "Issues not found" }, { status: 404 });
    }
    
  } catch (error) {
    console.error("Get issues error:", error);
    return NextResponse.json(
      { error: "Failed to get issues" },
      { status: 500 }
    );
  }
}
