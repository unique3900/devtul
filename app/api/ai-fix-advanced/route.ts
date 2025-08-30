import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";

export async function POST(request: NextRequest) {
  try {
    const { scanId, issues } = await request.json();
    
    if (!scanId || !issues) {
      return NextResponse.json({ error: "scanId and issues are required" }, { status: 400 });
    }

    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    const htmlPath = path.join(downloadDir, "index.html");
    const issuesPath = path.join(downloadDir, "issues_for_python.json");
    const outputPath = path.join(downloadDir, "index_fixed_advanced.html");
    const reportPath = path.join(downloadDir, "advanced_fix_report.json");
    
    // Check if original HTML exists
    try {
      await fs.access(htmlPath);
    } catch {
      return NextResponse.json({ error: "Original HTML not found" }, { status: 404 });
    }

    // Prepare issues for Python agent
    const issuesData = {
      issues: issues.map((issue: any) => ({
        id: issue.id,
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        element: issue.element,
        elementPath: issue.elementPath || '',
        wcagRule: extractWcagRule(issue.tags || []),
        suggestion: issue.help || issue.suggestion || ''
      }))
    };

    await fs.writeFile(issuesPath, JSON.stringify(issuesData, null, 2));

    // Run Python agent
    const pythonResult = await runPythonAgent(htmlPath, issuesPath, outputPath, reportPath);
    
    if (!pythonResult.success) {
      return NextResponse.json({ 
        error: "Python agent failed", 
        details: pythonResult.error 
      }, { status: 500 });
    }

    // Read the fix report
    let fixReport = null;
    try {
      const reportContent = await fs.readFile(reportPath, "utf-8");
      fixReport = JSON.parse(reportContent);
    } catch (error) {
      console.warn("Could not read fix report:", error);
    }

    // Read the fixed HTML to verify it exists
    let fixedHtml = "";
    try {
      fixedHtml = await fs.readFile(outputPath, "utf-8");
    } catch (error) {
      console.error("Could not read fixed HTML:", error);
      return NextResponse.json({ error: "Fixed HTML not generated" }, { status: 500 });
    }

    // Transform fix report to match our format
    const fixedIssues = issues.map((issue: any) => {
      const fix = fixReport?.fixes?.find((f: any) => f.issue_id === issue.id);
      return {
        ...issue,
        fixed: fix?.fixed || false,
        aiSuggestion: fix?.explanation || '',
        confidence: fix?.confidence || 0,
        tokensUsed: fix?.tokens_used || 0
      };
    });

    // Save the enhanced fix report
    const enhancedReport = {
      scanId,
      timestamp: new Date().toISOString(),
      method: 'python-rag-agent',
      totalIssues: issues.length,
      totalFixed: fixReport?.fixed_issues || 0,
      totalTokensUsed: fixReport?.total_tokens_used || 0,
      avgConfidence: fixReport?.avg_confidence || 0,
      fixResults: fixedIssues,
      performance: {
        tokenEfficiency: calculateTokenEfficiency(fixReport?.total_tokens_used || 0, issues.length),
        processingTime: pythonResult.processingTime,
        successRate: (fixReport?.fixed_issues || 0) / issues.length
      }
    };

    await fs.writeFile(
      path.join(downloadDir, "enhanced_fix_report.json"),
      JSON.stringify(enhancedReport, null, 2)
    );

    return NextResponse.json({
      success: true,
      fixedIssues,
      totalFixed: fixReport?.fixed_issues || 0,
      totalTokensUsed: fixReport?.total_tokens_used || 0,
      avgConfidence: fixReport?.avg_confidence || 0,
      performance: enhancedReport.performance,
      fixReport: enhancedReport
    });

  } catch (error) {
    console.error("Advanced AI fixing error:", error);
    return NextResponse.json(
      { error: "Failed to run advanced AI fixing" },
      { status: 500 }
    );
  }
}

function runPythonAgent(
  inputPath: string, 
  issuesPath: string, 
  outputPath: string, 
  reportPath: string
): Promise<{ success: boolean; error?: string; processingTime: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const pythonPath = path.join(process.cwd(), "python_agent", "accessibility_agent.py");
    
    const python = spawn("python3", [
      pythonPath,
      "--input", inputPath,
      "--issues", issuesPath,
      "--output", outputPath,
      "--report", reportPath
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      const processingTime = Date.now() - startTime;
      
      if (code === 0) {
        resolve({ 
          success: true, 
          processingTime 
        });
      } else {
        console.error("Python agent stderr:", stderr);
        resolve({ 
          success: false, 
          error: `Python agent exited with code ${code}: ${stderr}`,
          processingTime
        });
      }
    });

    python.on('error', (error) => {
      const processingTime = Date.now() - startTime;
      resolve({ 
        success: false, 
        error: `Failed to spawn Python process: ${error.message}`,
        processingTime
      });
    });

    // Set timeout to prevent hanging
    setTimeout(() => {
      python.kill();
      resolve({ 
        success: false, 
        error: "Python agent timeout",
        processingTime: Date.now() - startTime
      });
    }, 60000); // 60 second timeout
  });
}

function extractWcagRule(tags: string[]): string {
  const wcagTag = tags.find(tag => tag.match(/wcag\d+/));
  if (wcagTag) {
    // Convert wcag2aa format to 2.4.4 format
    const match = wcagTag.match(/wcag(\d)(\d+)/);
    if (match) {
      const level = match[1];
      const rule = match[2];
      // This is a simplified conversion - you might need more sophisticated mapping
      return `${level}.${rule.charAt(0)}.${rule.charAt(1)}`;
    }
  }
  return '';
}

function calculateTokenEfficiency(tokensUsed: number, issueCount: number): string {
  if (issueCount === 0) return "N/A";
  
  const tokensPerIssue = tokensUsed / issueCount;
  
  if (tokensPerIssue < 50) return "Excellent";
  if (tokensPerIssue < 100) return "Good"; 
  if (tokensPerIssue < 200) return "Fair";
  return "Poor";
}
