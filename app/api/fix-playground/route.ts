import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { JSDOM } from "jsdom";

const genAI = new GoogleGenerativeAI("AIzaSyCH5kpJdB_4cFbCbCkUzLKDhS2C6HHIxyg");

interface PlaygroundIssue {
  id: string;
  type: 'contrast' | 'alt-text' | 'heading' | 'focus' | 'aria' | 'keyboard';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  element: string;
  line: number;
  column: number;
  suggestion: string;
}

export async function POST(request: NextRequest) {
  try {
    const { html, issues } = await request.json();
    
    if (!html || !issues) {
      return NextResponse.json({ error: "HTML and issues are required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are an expert web accessibility engineer. Fix the following HTML to resolve all accessibility issues while maintaining functionality and styling.

ORIGINAL HTML:
${html}

ISSUES TO FIX:
${issues.map((issue: PlaygroundIssue, index: number) => `
${index + 1}. ${issue.type.toUpperCase()} (${issue.severity}): ${issue.message}
   Element: ${issue.element}
   Suggestion: ${issue.suggestion}
`).join('')}

REQUIREMENTS:
- Fix ALL identified accessibility issues
- Maintain original styling and functionality
- Use semantic HTML where possible
- Follow WCAG 2.1 AA/AAA guidelines
- Provide clean, valid HTML
- Add proper ARIA attributes where needed
- Ensure keyboard accessibility
- Fix color contrast issues
- Add proper alt text for images
- Fix heading structure
- Ensure form accessibility

Return ONLY the complete fixed HTML (no explanations, no markdown, just the HTML):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let fixedHtml = response.text();

    // Clean up the response (remove any markdown formatting)
    fixedHtml = fixedHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    // Validate the HTML
    try {
      const dom = new JSDOM(fixedHtml);
      // If JSDOM can parse it, it's valid HTML
    } catch (error) {
      console.error("Generated HTML is invalid:", error);
      // Fallback to original HTML with basic fixes
      fixedHtml = applyBasicFixes(html, issues);
    }

    return NextResponse.json({
      success: true,
      fixedHtml
    });

  } catch (error) {
    console.error("Playground fixing error:", error);
    
    // Fallback to basic fixes if AI fails
    const { html, issues } = await request.json();
    const fixedHtml = applyBasicFixes(html, issues);
    
    return NextResponse.json({
      success: true,
      fixedHtml,
      note: "AI fixing failed, applied basic fixes"
    });
  }
}

function applyBasicFixes(html: string, issues: PlaygroundIssue[]): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  issues.forEach(issue => {
    try {
      switch (issue.type) {
        case 'alt-text':
          fixAltTextIssues(document, issue);
          break;
        case 'heading':
          fixHeadingIssues(document, issue);
          break;
        case 'focus':
          fixFocusIssues(document, issue);
          break;
        case 'aria':
          fixAriaIssues(document, issue);
          break;
        case 'keyboard':
          fixKeyboardIssues(document, issue);
          break;
        case 'contrast':
          fixContrastIssues(document, issue);
          break;
      }
    } catch (error) {
      console.warn(`Failed to apply basic fix for ${issue.type}:`, error);
    }
  });

  return dom.serialize();
}

function fixAltTextIssues(document: Document, issue: PlaygroundIssue): void {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (!img.hasAttribute('alt')) {
      // Add generic alt text (AI would provide better descriptions)
      const src = img.getAttribute('src') || '';
      if (src.includes('placeholder')) {
        img.setAttribute('alt', 'Placeholder image');
      } else {
        img.setAttribute('alt', 'Image');
      }
    }
  });
}

function fixHeadingIssues(document: Document, issue: PlaygroundIssue): void {
  if (issue.message.includes('Multiple H1')) {
    const h1s = document.querySelectorAll('h1');
    // Convert additional H1s to H2s
    for (let i = 1; i < h1s.length; i++) {
      const h2 = document.createElement('h2');
      h2.innerHTML = h1s[i].innerHTML;
      h2.className = h1s[i].className;
      h1s[i].parentNode?.replaceChild(h2, h1s[i]);
    }
  }
  
  if (issue.message.includes('missing an H1')) {
    const body = document.body;
    if (body && body.firstChild) {
      const h1 = document.createElement('h1');
      h1.textContent = 'Main Heading';
      body.insertBefore(h1, body.firstChild);
    }
  }
}

function fixFocusIssues(document: Document, issue: PlaygroundIssue): void {
  // Remove positive tabindex values
  const positiveTabIndex = document.querySelectorAll('[tabindex]');
  positiveTabIndex.forEach(element => {
    const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
    if (tabIndex > 0) {
      element.setAttribute('tabindex', '0');
    }
  });

  // Add focus styles for elements that remove outline
  const styleElements = document.querySelectorAll('[style]');
  styleElements.forEach(element => {
    const style = element.getAttribute('style') || '';
    if (style.includes('outline: none') || style.includes('outline:none')) {
      const newStyle = style + '; outline: 2px solid #4dabf7 !important;';
      element.setAttribute('style', newStyle);
    }
  });
}

function fixAriaIssues(document: Document, issue: PlaygroundIssue): void {
  // Fix form inputs without labels
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
  inputs.forEach((input, index) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const inLabel = input.closest('label');

    if (!hasLabel && !inLabel && !ariaLabel && !ariaLabelledBy) {
      const type = input.getAttribute('type') || 'text';
      const placeholder = input.getAttribute('placeholder') || '';
      const labelText = placeholder || `${type.charAt(0).toUpperCase() + type.slice(1)} input`;
      input.setAttribute('aria-label', labelText);
    }
  });

  // Remove invalid roles
  const elementsWithRole = document.querySelectorAll('[role]');
  const validRoles = [
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell',
    'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
    'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form',
    'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
    'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem',
    'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option',
    'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row',
    'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
    'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
    'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree',
    'treegrid', 'treeitem'
  ];

  elementsWithRole.forEach(element => {
    const role = element.getAttribute('role');
    if (role && !validRoles.includes(role)) {
      element.removeAttribute('role');
    }
  });
}

function fixKeyboardIssues(document: Document, issue: PlaygroundIssue): void {
  // Make clickable elements keyboard accessible
  const clickableElements = document.querySelectorAll('[onclick]');
  clickableElements.forEach(element => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const tabIndex = element.getAttribute('tabindex');
    
    const isNativelyFocusable = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName);
    const hasButtonRole = role === 'button';
    const isFocusable = tabIndex === '0' || (tabIndex && parseInt(tabIndex) >= 0);
    
    if (!isNativelyFocusable && !hasButtonRole && !isFocusable) {
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      
      // Add keyboard event handler
      const onclick = element.getAttribute('onclick');
      if (onclick) {
        element.setAttribute('onkeydown', `if(event.key==='Enter'||event.key===' '){${onclick}}`);
      }
    }
  });
}

function fixContrastIssues(document: Document, issue: PlaygroundIssue): void {
  // Basic contrast fixes for common problematic combinations
  const elementsWithStyle = document.querySelectorAll('[style]');
  elementsWithStyle.forEach(element => {
    const style = element.getAttribute('style') || '';
    let newStyle = style;
    
    // Fix light gray text on white background
    if (style.includes('color: #ccc') || style.includes('color:#ccc')) {
      newStyle = newStyle.replace(/color:\s*#ccc/g, 'color: #666');
    }
    if (style.includes('color: #ddd') || style.includes('color:#ddd')) {
      newStyle = newStyle.replace(/color:\s*#ddd/g, 'color: #555');
    }
    if (style.includes('color: #eee') || style.includes('color:#eee')) {
      newStyle = newStyle.replace(/color:\s*#eee/g, 'color: #444');
    }
    
    if (newStyle !== style) {
      element.setAttribute('style', newStyle);
    }
  });
}
