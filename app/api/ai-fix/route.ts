import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import * as path from "path";
import { JSDOM } from "jsdom";

const genAI = new GoogleGenerativeAI("AIzaSyCH5kpJdB_4cFbCbCkUzLKDhS2C6HHIxyg");

interface AccessibilityIssue {
  id: string;
  type: 'contrast' | 'alt-text' | 'heading' | 'focus' | 'aria' | 'keyboard' | 'seo';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  help: string;
  element: string;
  elementPath: string;
  fixed: boolean;
  wcagRule?: string;
  impact?: string;
  category?: string;
  recommendation?: string;
}

interface FixResult {
  issueId: string;
  fixed: boolean;
  originalElement: string;
  fixedElement: string;
  explanation: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const { scanId, issues } = await request.json();
    
    if (!scanId || !issues) {
      return NextResponse.json({ error: "scanId and issues are required" }, { status: 400 });
    }

    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    const htmlPath = path.join(downloadDir, "index.html");
    
    // Read the original HTML
    const originalHtml = await fs.readFile(htmlPath, "utf-8");
    const dom = new JSDOM(originalHtml);
    const document = dom.window.document;

    // Group issues by type for batch processing
    const issuesByType = groupIssuesByType(issues);
    const fixResults: FixResult[] = [];
    let totalFixed = 0;

    // Process each type of issue
    for (const [type, typeIssues] of Object.entries(issuesByType)) {
      const fixes = await processIssueType(type, typeIssues, document);
      fixResults.push(...fixes);
      totalFixed += fixes.filter(f => f.fixed).length;
    }

    // Apply fixes to the DOM
    applyFixesToDOM(document, fixResults);

    // Save the fixed HTML
    const fixedHtml = dom.serialize();
    await fs.writeFile(path.join(downloadDir, "index_fixed.html"), fixedHtml);

    // Create fix report
    const fixReport = {
      scanId,
      timestamp: new Date().toISOString(),
      totalIssues: issues.length,
      totalFixed,
      fixResults,
      summary: {
        contrast: fixResults.filter(f => f.issueId.includes('contrast')).length,
        altText: fixResults.filter(f => f.issueId.includes('alt')).length,
        heading: fixResults.filter(f => f.issueId.includes('heading')).length,
        focus: fixResults.filter(f => f.issueId.includes('focus')).length,
        aria: fixResults.filter(f => f.issueId.includes('aria')).length,
        keyboard: fixResults.filter(f => f.issueId.includes('keyboard')).length
      }
    };

    await fs.writeFile(
      path.join(downloadDir, "fix_report.json"),
      JSON.stringify(fixReport, null, 2)
    );

    // Return fixed issues
    const fixedIssues = issues.map((issue: AccessibilityIssue) => {
      const fixResult = fixResults.find(f => f.issueId === issue.id);
      return {
        ...issue,
        fixed: fixResult?.fixed || false,
        aiSuggestion: fixResult?.explanation || '',
        confidence: fixResult?.confidence || 0
      };
    });

    return NextResponse.json({
      success: true,
      fixedIssues,
      totalFixed,
      fixReport: fixReport.summary
    });

  } catch (error) {
    console.error("AI fixing error:", error);
    return NextResponse.json(
      { error: "Failed to fix accessibility issues" },
      { status: 500 }
    );
  }
}

function groupIssuesByType(issues: AccessibilityIssue[]): Record<string, AccessibilityIssue[]> {
  return issues.reduce((groups, issue) => {
    const type = issue.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(issue);
    return groups;
  }, {} as Record<string, AccessibilityIssue[]>);
}

async function processIssueType(
  type: string, 
  issues: AccessibilityIssue[], 
  document: Document
): Promise<FixResult[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = createPromptForIssueType(type, issues);
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return parseAIResponse(text, issues);
  } catch (error) {
    console.error(`Failed to process ${type} issues:`, error);
    return issues.map(issue => ({
      issueId: issue.id,
      fixed: false,
      originalElement: issue.element,
      fixedElement: issue.element,
      explanation: "AI processing failed",
      confidence: 0
    }));
  }
}

function createPromptForIssueType(type: string, issues: AccessibilityIssue[]): string {
  const basePrompt = `You are an expert web accessibility engineer. Fix the following ${type} accessibility issues according to WCAG 2.1 AA/AAA standards.

CRITICAL REQUIREMENTS:
- Provide ONLY the fixed HTML elements
- Maintain all existing functionality and styling
- Use minimal, efficient fixes
- Ensure WCAG compliance
- Provide confidence score (0-100)

Issues to fix:
${issues.map((issue, index) => `
${index + 1}. Issue ID: ${issue.id}
   Problem: ${issue.message}
   Element: ${issue.element}
   Path: ${issue.elementPath}
   WCAG Rule: ${issue.wcagRule || 'N/A'}
`).join('')}

Respond in this EXACT JSON format:
{
  "fixes": [
    {
      "issueId": "issue_id_here",
      "fixed": true/false,
      "originalElement": "original HTML",
      "fixedElement": "fixed HTML",
      "explanation": "brief explanation of fix",
      "confidence": 85
    }
  ]
}`;

  // Add type-specific instructions
  switch (type) {
    case 'contrast':
      return basePrompt + `

CONTRAST FIXING RULES:
- Ensure minimum 4.5:1 ratio for normal text, 3:1 for large text
- Modify colors while preserving design intent
- Use CSS custom properties when possible
- Consider dark/light theme compatibility`;

    case 'alt-text':
      return basePrompt + `

ALT TEXT RULES:
- Describe image content and purpose
- Keep descriptions concise but meaningful
- Use empty alt="" for decorative images
- Include context-relevant information`;

    case 'heading':
      return basePrompt + `

HEADING STRUCTURE RULES:
- Ensure logical heading hierarchy (h1 → h2 → h3...)
- Don't skip heading levels
- Use only one h1 per page
- Make headings descriptive`;

    case 'focus':
      return basePrompt + `

FOCUS MANAGEMENT RULES:
- Ensure visible focus indicators
- Maintain logical tab order
- Remove positive tabindex values
- Add focus styles where missing`;

    case 'aria':
      return basePrompt + `

ARIA RULES:
- Use semantic HTML first, ARIA second
- Ensure proper role, state, and property usage
- Provide accessible names and descriptions
- Maintain ARIA relationships`;

    case 'keyboard':
      return basePrompt + `

KEYBOARD ACCESSIBILITY RULES:
- Make all interactive elements keyboard accessible
- Add proper event handlers (keydown/keyup)
- Ensure logical tab order
- Provide keyboard shortcuts where appropriate`;

    default:
      return basePrompt;
  }
}

function parseAIResponse(response: string, issues: AccessibilityIssue[]): FixResult[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.fixes || !Array.isArray(parsed.fixes)) {
      throw new Error("Invalid response format");
    }
    
    return parsed.fixes.map((fix: any) => ({
      issueId: fix.issueId,
      fixed: Boolean(fix.fixed),
      originalElement: fix.originalElement || '',
      fixedElement: fix.fixedElement || fix.originalElement || '',
      explanation: fix.explanation || 'No explanation provided',
      confidence: Math.min(100, Math.max(0, Number(fix.confidence) || 0))
    }));
    
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return issues.map(issue => ({
      issueId: issue.id,
      fixed: false,
      originalElement: issue.element,
      fixedElement: issue.element,
      explanation: "Failed to parse AI response",
      confidence: 0
    }));
  }
}

function applyFixesToDOM(document: Document, fixResults: FixResult[]): void {
  for (const fix of fixResults) {
    if (!fix.fixed || !fix.fixedElement) continue;
    
    try {
      // Find the element to replace
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fix.originalElement;
      const originalElement = tempDiv.firstElementChild;
      
      if (!originalElement) continue;
      
      // Create the fixed element
      const fixedDiv = document.createElement('div');
      fixedDiv.innerHTML = fix.fixedElement;
      const fixedElement = fixedDiv.firstElementChild;
      
      if (!fixedElement) continue;
      
      // Find matching elements in the document
      const selector = createSelectorFromElement(originalElement);
      const elementsToReplace = document.querySelectorAll(selector);
      
      // Replace the first matching element
      if (elementsToReplace.length > 0) {
        const targetElement = elementsToReplace[0];
        targetElement.parentNode?.replaceChild(fixedElement.cloneNode(true), targetElement);
      }
      
    } catch (error) {
      console.error(`Failed to apply fix for ${fix.issueId}:`, error);
    }
  }
}

function createSelectorFromElement(element: Element): string {
  let selector = element.tagName.toLowerCase();
  
  if (element.id) {
    selector += `#${element.id}`;
  } else if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      selector += '.' + classes.join('.');
    }
  }
  
  return selector;
}
