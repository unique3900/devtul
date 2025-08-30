import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import * as path from "path";
import { JSDOM } from "jsdom";
import { injectResourcesIntoHtml } from "@/lib/resource-injector";

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
    
    // Read the original HTML (use the version without resource injection for AI processing)
    let originalHtml;
    try {
      // Try to read the original HTML without resource injection first
      originalHtml = await fs.readFile(path.join(downloadDir, "index_original.html"), "utf-8");
    } catch {
      // Fallback to the processed version if original doesn't exist
      originalHtml = await fs.readFile(htmlPath, "utf-8");
    }
    
    const dom = new JSDOM(originalHtml, {
      runScripts: "outside-only", // Prevent scripts from running during DOM manipulation
      resources: "usable"
    });
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

    // Save the fixed HTML with resource injection
    const fixedHtml = dom.serialize();
    
    // Read metadata to get the original URL for resource injection
    let originalUrl = '';
    try {
      const metadataPath = path.join(downloadDir, "metadata.json");
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
      originalUrl = metadata.url;
    } catch (error) {
      console.warn("Could not read metadata for resource injection:", error);
    }
    
    // Inject resources into the fixed HTML
    const fixedHtmlWithResources = await injectResourcesIntoHtml(fixedHtml, downloadDir, originalUrl);
    await fs.writeFile(path.join(downloadDir, "index_fixed.html"), fixedHtmlWithResources);

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

Respond ONLY with valid JSON in this EXACT format (no markdown, no extra text):
{
  "fixes": [
    {
      "issueId": "issue_id_here",
      "fixed": true,
      "originalElement": "original HTML here",
      "fixedElement": "fixed HTML here",
      "explanation": "brief explanation of fix",
      "confidence": 85
    }
  ]
}

IMPORTANT: 
- Use only double quotes for JSON strings
- Escape any quotes inside HTML attributes with \"
- Do not include any text before or after the JSON
- Ensure all JSON is properly formatted and valid`;

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
    console.log("Raw AI response:", response);
    
    // Clean the response and extract JSON
    let cleanResponse = response.trim();
    
    // Remove markdown code blocks if present
    cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    
    // Find the JSON object - look for the outermost braces
    let startIndex = cleanResponse.indexOf('{');
    let endIndex = -1;
    
    if (startIndex !== -1) {
      let braceCount = 0;
      for (let i = startIndex; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') braceCount++;
        if (cleanResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No valid JSON object found in response");
    }
    
    const jsonString = cleanResponse.substring(startIndex, endIndex + 1);
    console.log("Extracted JSON:", jsonString);
    
    // Fix common JSON issues and handle truncation
    let fixedJson = jsonString
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
      .replace(/\n/g, '\\n') // Escape newlines in strings
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    // Handle truncated JSON - if it doesn't end properly, try to fix it
    if (!fixedJson.endsWith('}')) {
      // Find the last complete object in the fixes array
      const lastCompleteObjectMatch = fixedJson.lastIndexOf('"}');
      if (lastCompleteObjectMatch !== -1) {
        // Truncate to the last complete object and close the JSON properly
        fixedJson = fixedJson.substring(0, lastCompleteObjectMatch + 2) + ']}';
      } else {
        // If no complete objects, create empty fixes array
        fixedJson = '{"fixes":[]}';
      }
    }
    
    console.log("Fixed JSON:", fixedJson);
    
    const parsed = JSON.parse(fixedJson);
    
    if (!parsed.fixes || !Array.isArray(parsed.fixes)) {
      throw new Error("Invalid response format - missing fixes array");
    }
    
    return parsed.fixes.map((fix: any) => ({
      issueId: fix.issueId || '',
      fixed: Boolean(fix.fixed),
      originalElement: fix.originalElement || '',
      fixedElement: fix.fixedElement || fix.originalElement || '',
      explanation: fix.explanation || 'No explanation provided',
      confidence: Math.min(100, Math.max(0, Number(fix.confidence) || 0))
    }));
    
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.error("Response was:", response);
    
    // Fallback: create mock fixes for each issue
    return issues.map(issue => ({
      issueId: issue.id,
      fixed: false,
      originalElement: issue.element,
      fixedElement: issue.element,
      explanation: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        
        // Preserve important attributes that might be needed for JavaScript functionality
        const importantAttributes = ['id', 'class', 'data-*', 'onclick', 'onload', 'role'];
        for (const attr of importantAttributes) {
          if (attr === 'data-*') {
            // Copy all data attributes
            Array.from(targetElement.attributes).forEach(attribute => {
              if (attribute.name.startsWith('data-') && !fixedElement.hasAttribute(attribute.name)) {
                fixedElement.setAttribute(attribute.name, attribute.value);
              }
            });
          } else if (targetElement.hasAttribute(attr) && !fixedElement.hasAttribute(attr)) {
            fixedElement.setAttribute(attr, targetElement.getAttribute(attr) || '');
          }
        }
        
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
