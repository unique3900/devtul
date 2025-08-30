import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";

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
    const { html } = await request.json();
    
    if (!html) {
      return NextResponse.json({ error: "HTML is required" }, { status: 400 });
    }

    const dom = new JSDOM(html);
    const document = dom.window.document;
    const issues: PlaygroundIssue[] = [];

    // Analyze different types of accessibility issues
    issues.push(...analyzeImages(document, html));
    issues.push(...analyzeHeadings(document, html));
    issues.push(...analyzeFocus(document, html));
    issues.push(...analyzeAria(document, html));
    issues.push(...analyzeKeyboard(document, html));
    issues.push(...analyzeContrast(document, html));

    return NextResponse.json({
      success: true,
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      }
    });

  } catch (error) {
    console.error("Playground analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze HTML" },
      { status: 500 }
    );
  }
}

function analyzeImages(document: Document, html: string): PlaygroundIssue[] {
  const issues: PlaygroundIssue[] = [];
  const images = document.querySelectorAll('img');

  images.forEach((img, index) => {
    const { line, column } = getElementPosition(html, img.outerHTML);
    
    if (!img.hasAttribute('alt')) {
      issues.push({
        id: `img-no-alt-${index}`,
        type: 'alt-text',
        severity: 'critical',
        message: 'Image is missing alt attribute',
        element: img.outerHTML,
        line,
        column,
        suggestion: 'Add a descriptive alt attribute that explains the image content and purpose. For decorative images, use alt="".'
      });
    } else if (img.getAttribute('alt') === '' && !img.hasAttribute('role')) {
      issues.push({
        id: `img-empty-alt-${index}`,
        type: 'alt-text',
        severity: 'medium',
        message: 'Image has empty alt but is not marked as decorative',
        element: img.outerHTML,
        line,
        column,
        suggestion: 'If this image is decorative, add role="presentation". If it conveys information, provide meaningful alt text.'
      });
    }
  });

  return issues;
}

function analyzeHeadings(document: Document, html: string): PlaygroundIssue[] {
  const issues: PlaygroundIssue[] = [];
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  let h1Count = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    const { line, column } = getElementPosition(html, heading.outerHTML);

    if (level === 1) {
      h1Count++;
      if (h1Count > 1) {
        issues.push({
          id: `multiple-h1-${index}`,
          type: 'heading',
          severity: 'high',
          message: 'Multiple H1 headings found on page',
          element: heading.outerHTML,
          line,
          column,
          suggestion: 'Use only one H1 per page. Convert additional H1s to H2 or other appropriate heading levels.'
        });
      }
    }

    if (level - previousLevel > 1 && previousLevel !== 0) {
      issues.push({
        id: `heading-skip-${index}`,
        type: 'heading',
        severity: 'high',
        message: `Heading level skipped from H${previousLevel} to H${level}`,
        element: heading.outerHTML,
        line,
        column,
        suggestion: 'Maintain proper heading hierarchy. Don\'t skip heading levels - go from H1 to H2 to H3, etc.'
      });
    }

    previousLevel = level;
  });

  if (h1Count === 0) {
    issues.push({
      id: 'missing-h1',
      type: 'heading',
      severity: 'high',
      message: 'Page is missing an H1 heading',
      element: '<body>',
      line: 1,
      column: 1,
      suggestion: 'Add an H1 heading that describes the main content or purpose of the page.'
    });
  }

  return issues;
}

function analyzeFocus(document: Document, html: string): PlaygroundIssue[] {
  const issues: PlaygroundIssue[] = [];
  
  // Check for elements with positive tabindex
  const positiveTabIndex = document.querySelectorAll('[tabindex]');
  positiveTabIndex.forEach((element, index) => {
    const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
    if (tabIndex > 0) {
      const { line, column } = getElementPosition(html, element.outerHTML);
      issues.push({
        id: `positive-tabindex-${index}`,
        type: 'focus',
        severity: 'medium',
        message: `Element has positive tabindex (${tabIndex}) which disrupts natural tab order`,
        element: element.outerHTML,
        line,
        column,
        suggestion: 'Remove positive tabindex values. Use tabindex="0" to make elements focusable or tabindex="-1" to remove from tab order.'
      });
    }
  });

  // Check for focus removal (outline: none without replacement)
  const styleElements = document.querySelectorAll('[style]');
  styleElements.forEach((element, index) => {
    const style = element.getAttribute('style') || '';
    if (style.includes('outline: none') || style.includes('outline:none')) {
      const { line, column } = getElementPosition(html, element.outerHTML);
      issues.push({
        id: `no-focus-${index}`,
        type: 'focus',
        severity: 'high',
        message: 'Element removes focus indicator without providing alternative',
        element: element.outerHTML,
        line,
        column,
        suggestion: 'If removing default focus outline, provide a custom focus indicator with sufficient contrast and visibility.'
      });
    }
  });

  return issues;
}

function analyzeAria(document: Document, html: string): PlaygroundIssue[] {
  const issues: PlaygroundIssue[] = [];
  
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

  // Check for invalid roles
  const elementsWithRole = document.querySelectorAll('[role]');
  elementsWithRole.forEach((element, index) => {
    const role = element.getAttribute('role');
    if (role && !validRoles.includes(role)) {
      const { line, column } = getElementPosition(html, element.outerHTML);
      issues.push({
        id: `invalid-role-${index}`,
        type: 'aria',
        severity: 'high',
        message: `Invalid ARIA role: "${role}"`,
        element: element.outerHTML,
        line,
        column,
        suggestion: `Use a valid ARIA role. Valid roles include: ${validRoles.slice(0, 10).join(', ')}, etc.`
      });
    }
  });

  // Check for aria-labelledby pointing to non-existent elements
  const labelledByElements = document.querySelectorAll('[aria-labelledby]');
  labelledByElements.forEach((element, index) => {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy && !document.getElementById(labelledBy)) {
      const { line, column } = getElementPosition(html, element.outerHTML);
      issues.push({
        id: `invalid-labelledby-${index}`,
        type: 'aria',
        severity: 'high',
        message: `aria-labelledby references non-existent element: "${labelledBy}"`,
        element: element.outerHTML,
        line,
        column,
        suggestion: 'Ensure the element referenced by aria-labelledby exists and has an id attribute.'
      });
    }
  });

  // Check for form inputs without labels
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
  inputs.forEach((input, index) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const inLabel = input.closest('label');

    if (!hasLabel && !inLabel && !ariaLabel && !ariaLabelledBy) {
      const { line, column } = getElementPosition(html, input.outerHTML);
      issues.push({
        id: `input-no-label-${index}`,
        type: 'aria',
        severity: 'critical',
        message: 'Form input has no accessible label',
        element: input.outerHTML,
        line,
        column,
        suggestion: 'Add a <label> element, aria-label attribute, or aria-labelledby attribute to provide an accessible name.'
      });
    }
  });

  return issues;
}

function analyzeKeyboard(document: Document, html: string): PlaygroundIssue[] {
  const issues: PlaygroundIssue[] = [];
  
  // Check for clickable elements that aren't keyboard accessible
  const clickableElements = document.querySelectorAll('[onclick]');
  clickableElements.forEach((element, index) => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const tabIndex = element.getAttribute('tabindex');
    
    const isNativelyFocusable = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName);
    const hasButtonRole = role === 'button';
    const isFocusable = tabIndex === '0' || (tabIndex && parseInt(tabIndex) >= 0);
    
    if (!isNativelyFocusable && !hasButtonRole && !isFocusable) {
      const { line, column } = getElementPosition(html, element.outerHTML);
      issues.push({
        id: `keyboard-inaccessible-${index}`,
        type: 'keyboard',
        severity: 'critical',
        message: 'Clickable element is not keyboard accessible',
        element: element.outerHTML,
        line,
        column,
        suggestion: 'Add tabindex="0" and keyboard event handlers, or use a semantic button/link element instead.'
      });
    }
  });

  return issues;
}

function analyzeContrast(document: Document, html: string): PlaygroundIssue[] {
  const issues: PlaygroundIssue[] = [];
  
  // Simple contrast check for inline styles (limited without actual rendering)
  const elementsWithStyle = document.querySelectorAll('[style]');
  elementsWithStyle.forEach((element, index) => {
    const style = element.getAttribute('style') || '';
    const hasColor = style.includes('color:') || style.includes('color ');
    const hasBackground = style.includes('background:') || style.includes('background-color:');
    
    if (hasColor || hasBackground) {
      // Check for potentially problematic color combinations
      const lightColors = ['#ccc', '#ddd', '#eee', '#f0f0f0', 'lightgray', 'lightgrey'];
      const hasLightColor = lightColors.some(color => style.toLowerCase().includes(color));
      
      if (hasLightColor && element.textContent?.trim()) {
        const { line, column } = getElementPosition(html, element.outerHTML);
        issues.push({
          id: `potential-contrast-${index}`,
          type: 'contrast',
          severity: 'medium',
          message: 'Potential color contrast issue detected',
          element: element.outerHTML,
          line,
          column,
          suggestion: 'Ensure text has sufficient contrast ratio: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold).'
        });
      }
    }
  });

  return issues;
}

function getElementPosition(html: string, elementHtml: string): { line: number; column: number } {
  const lines = html.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const column = lines[i].indexOf(elementHtml.substring(0, 50)); // Match first 50 chars
    if (column !== -1) {
      return { line: i + 1, column: column + 1 };
    }
  }
  
  return { line: 1, column: 1 };
}
