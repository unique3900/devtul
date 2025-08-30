import { JSDOM } from "jsdom";
import type { ComplianceOptions, AccessibilityResult } from "@/lib/types";

export async function analyzeAccessibility(
  url: string,
  complianceOptions: ComplianceOptions,
): Promise<{
  results: AccessibilityResult[]
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
    total: number
    urlsAnalyzed: number
  }
}> {
  try {
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Collect accessibility issues
    const issues: AccessibilityResult[] = [];

    // Run comprehensive accessibility checks
    issues.push(...checkImagesWithoutAlt(document, url));
    issues.push(...checkHeadingStructure(document, url));
    issues.push(...checkFormLabels(document, url));
    issues.push(...checkLinkText(document, url));
    issues.push(...checkColorContrast(document, url));
    issues.push(...checkARIAAttributes(document, url));
    issues.push(...checkKeyboardAccessibility(document, url));
    issues.push(...checkBasicHtmlIssues(document, url));
    issues.push(...checkFocusManagement(document, url));
    issues.push(...checkSemanticStructure(document, url));

    // Generate summary
    const summary = {
      critical: issues.filter((r) => r.severity === "Critical").length,
      serious: issues.filter((r) => r.severity === "High").length,
      moderate: issues.filter((r) => r.severity === "Medium").length,
      minor: issues.filter((r) => r.severity === "Low" || r.severity === "Info").length,
      total: issues.length,
      urlsAnalyzed: 1,
    };

    return {
      results: issues,
      summary,
    };
  } catch (error) {
    console.error(`Error analyzing ${url}:`, error);
    throw new Error(`Failed to analyze ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to generate CSS selector paths
function generateElementPath(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === 1) { // 1 = ELEMENT_NODE
    let selector = current.tagName.toLowerCase();

    // Add ID if present (most specific)
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, we can stop here
    }

    // Add classes if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(/\s+/).filter(cls => cls.length > 0);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    // Add nth-child if there are siblings with the same tag
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        sibling => sibling.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

function checkImagesWithoutAlt(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  const images = document.querySelectorAll("img");

  images.forEach((img, index) => {
    if (!img.hasAttribute("alt")) {
      issues.push({
        id: `img-no-alt-${index}`,
        url,
        message: "Image missing alt attribute",
        help: "Images must have alternate text to convey their purpose to screen reader users",
        element: img.outerHTML,
        elementPath: generateElementPath(img),
        impact: "serious",
        severity: "High",
        tags: ["wcag2a", "wcag111"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    } else if (img.getAttribute("alt") === "") {
      // Empty alt is only valid for decorative images
      const role = img.getAttribute("role");
      if (role !== "presentation" && role !== "none") {
        issues.push({
          id: `img-empty-alt-${index}`,
          url,
          message: "Image has empty alt attribute but is not marked as decorative",
          help: "Non-decorative images should have meaningful alt text, or use role='presentation' for decorative images",
          element: img.outerHTML,
          elementPath: generateElementPath(img),
          impact: "moderate",
          severity: "Medium",
          tags: ["wcag2a", "wcag111"],
          createdAt: new Date(),
          updatedAt: new Date(),
          scanId: "",
        });
      }
    }
  });

  return issues;
}

function checkHeadingStructure(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let previousLevel = 0;
  let h1Count = 0;

  headings.forEach((heading, index) => {
    const level = Number.parseInt(heading.tagName.substring(1));

    if (level === 1) {
      h1Count++;
    }

    // Check for skipped heading levels
    if (level - previousLevel > 1 && previousLevel !== 0) {
      issues.push({
        id: `heading-skip-${index}`,
        url,
        message: `Heading level skipped from h${previousLevel} to h${level}`,
        help: "Heading levels should only increase by one to maintain proper document structure",
        element: heading.outerHTML,
        elementPath: generateElementPath(heading),
        impact: "serious",
        severity: "High",
        tags: ["wcag2a", "wcag131"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }

    previousLevel = level;
  });

  // Check if there's no h1
  if (h1Count === 0) {
    issues.push({
      id: "missing-h1",
      url,
      message: "Document does not have a main heading (h1)",
      help: "Pages should contain exactly one main heading to describe their primary content",
      element: "<body>...</body>",
      elementPath: "body",
      impact: "serious",
      severity: "High",
      tags: ["wcag2a", "wcag131"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    });
  } else if (h1Count > 1) {
    issues.push({
      id: "multiple-h1",
      url,
      message: `Document has ${h1Count} h1 headings, should have only one`,
      help: "Use only one h1 heading per page for proper document structure",
      element: "<body>...</body>",
      elementPath: "body",
      impact: "moderate",
      severity: "Medium",
      tags: ["wcag2a", "wcag131"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    });
  }

  return issues;
}

function checkFormLabels(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  const formControls = document.querySelectorAll("input, select, textarea");

  formControls.forEach((control, index) => {
    const id = control.getAttribute("id");
    const type = control.getAttribute("type");
    const ariaLabel = control.getAttribute("aria-label");
    const ariaLabelledBy = control.getAttribute("aria-labelledby");

    // Skip hidden inputs and buttons
    if (type === "hidden" || type === "button" || type === "submit" || type === "reset") {
      return;
    }

    // Check if control has proper labeling
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const isInLabel = control.closest("label");
    const hasAriaLabel = ariaLabel || ariaLabelledBy;

    if (!hasLabel && !isInLabel && !hasAriaLabel) {
      issues.push({
        id: `form-control-no-label-${index}`,
        url,
        message: "Form control does not have an accessible label",
        help: "Form controls must have associated labels using <label>, aria-label, or aria-labelledby",
        element: control.outerHTML,
        elementPath: generateElementPath(control),
        impact: "critical",
        severity: "Critical",
        tags: ["wcag2a", "wcag332"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  return issues;
}

function checkLinkText(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  const links = document.querySelectorAll("a[href]");

  links.forEach((link, index) => {
    const text = link.textContent?.trim() || "";
    const ariaLabel = link.getAttribute("aria-label");
    const ariaLabelledBy = link.getAttribute("aria-labelledby");
    const title = link.getAttribute("title");

    // Check for empty links
    if (!text && !ariaLabel && !ariaLabelledBy && !title) {
      issues.push({
        id: `empty-link-${index}`,
        url,
        message: "Link has no accessible text",
        help: "Links must have discernible text that describes their purpose",
        element: link.outerHTML,
        elementPath: generateElementPath(link),
        impact: "serious",
        severity: "High",
        tags: ["wcag2a", "wcag244"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }

    // Check for generic link text
    const genericTexts = ["click here", "here", "more", "read more", "link", "continue"];
    if (genericTexts.includes(text.toLowerCase()) && !ariaLabel && !ariaLabelledBy) {
      issues.push({
        id: `generic-link-${index}`,
        url,
        message: "Link has generic text that doesn't describe its purpose",
        help: "Link text should be descriptive and meaningful out of context",
        element: link.outerHTML,
        elementPath: generateElementPath(link),
        impact: "moderate",
        severity: "Medium",
        tags: ["wcag2a", "wcag244"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  return issues;
}

function checkColorContrast(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  const elements = document.querySelectorAll('[style*="color"], [style*="background"]');

  elements.forEach((element, index) => {
    const style = element.getAttribute("style") || "";
    
    // Basic check for potentially problematic color combinations
    const hasLightText = /color:\s*#[cdef]/i.test(style) || /color:\s*rgb\(2[0-4]\d|25[0-5]/i.test(style);
    const hasLightBackground = /background.*#[cdef]/i.test(style) || /background.*rgb\(2[0-4]\d|25[0-5]/i.test(style);
    
    if (hasLightText && hasLightBackground && element.textContent?.trim()) {
      issues.push({
        id: `potential-contrast-issue-${index}`,
        url,
        message: "Potential color contrast issue with inline styles",
        help: "Ensure text has sufficient contrast ratio: 4.5:1 for normal text, 3:1 for large text",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "serious",
        severity: "High",
        tags: ["wcag2aa", "wcag143"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  return issues;
}

function checkARIAAttributes(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  
  const validRoles = [
    "alert", "alertdialog", "application", "article", "banner", "button", "cell",
    "checkbox", "columnheader", "combobox", "complementary", "contentinfo",
    "definition", "dialog", "directory", "document", "feed", "figure", "form",
    "grid", "gridcell", "group", "heading", "img", "link", "list", "listbox",
    "listitem", "log", "main", "marquee", "math", "menu", "menubar", "menuitem",
    "menuitemcheckbox", "menuitemradio", "navigation", "none", "note", "option",
    "presentation", "progressbar", "radio", "radiogroup", "region", "row",
    "rowgroup", "rowheader", "scrollbar", "search", "searchbox", "separator",
    "slider", "spinbutton", "status", "switch", "tab", "table", "tablist",
    "tabpanel", "term", "textbox", "timer", "toolbar", "tooltip", "tree",
    "treegrid", "treeitem"
  ];

  // Check for invalid roles
  const elementsWithRole = document.querySelectorAll("[role]");
  elementsWithRole.forEach((element, index) => {
    const role = element.getAttribute("role");
    if (role && !validRoles.includes(role)) {
      issues.push({
        id: `invalid-role-${index}`,
        url,
        message: `Invalid ARIA role: "${role}"`,
        help: "Use valid ARIA roles as defined in the ARIA specification",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "serious",
        severity: "High",
        tags: ["wcag2a", "wcag412"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  // Check for aria-labelledby pointing to non-existent elements
  const labelledByElements = document.querySelectorAll("[aria-labelledby]");
  labelledByElements.forEach((element, index) => {
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy && !document.getElementById(labelledBy)) {
      issues.push({
        id: `invalid-labelledby-${index}`,
        url,
        message: `aria-labelledby references non-existent element: "${labelledBy}"`,
        help: "Ensure the element referenced by aria-labelledby exists and has an id attribute",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "serious",
        severity: "High",
        tags: ["wcag2a", "wcag412"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  return issues;
}

function checkKeyboardAccessibility(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  
  // Check for elements with click handlers but no keyboard equivalent
  const elementsWithOnClick = document.querySelectorAll("[onclick]");
  elementsWithOnClick.forEach((element, index) => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");
    const tabIndex = element.getAttribute("tabindex");

    // If it's not a naturally interactive element and doesn't have keyboard access
    if (!["a", "button", "input", "select", "textarea"].includes(tagName) && 
        role !== "button" && !tabIndex) {
      issues.push({
        id: `keyboard-inaccessible-${index}`,
        url,
        message: "Element has click handler but may not be keyboard accessible",
        help: "Interactive elements must be accessible via keyboard using tabindex and keyboard event handlers",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "critical",
        severity: "Critical",
        tags: ["wcag2a", "wcag211"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  // Check for positive tabindex which disrupts natural tab order
  const elementsWithPositiveTabIndex = document.querySelectorAll("[tabindex]");
  elementsWithPositiveTabIndex.forEach((element, index) => {
    const tabIndex = Number.parseInt(element.getAttribute("tabindex") || "0");
    if (tabIndex > 0) {
      issues.push({
        id: `positive-tabindex-${index}`,
        url,
        message: `Element has positive tabindex (${tabIndex}) which disrupts natural tab order`,
        help: "Avoid using positive tabindex values; use tabindex='0' to make elements focusable or tabindex='-1' to remove from tab order",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "moderate",
        severity: "Medium",
        tags: ["wcag2a", "wcag211"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  return issues;
}

function checkBasicHtmlIssues(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];

  // Check for missing language attribute
  const html = document.documentElement;
  if (!html.hasAttribute("lang")) {
    issues.push({
      id: "missing-lang",
      url,
      message: "Missing language attribute on HTML element",
      help: "Specify the document language using the lang attribute for screen readers",
      element: html.outerHTML.substring(0, 100) + "...",
      elementPath: "html",
      impact: "serious",
      severity: "High",
      tags: ["wcag2a", "wcag311"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    });
  }

  // Check for missing title
  if (!document.title || document.title.trim() === "") {
    issues.push({
      id: "missing-title",
      url,
      message: "Missing or empty document title",
      help: "Provide a descriptive title that identifies the page content",
      element: "<head>...</head>",
      elementPath: "head",
      impact: "serious",
      severity: "High",
      tags: ["wcag2a", "wcag242"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    });
  }

  // Check for duplicate IDs
  const idMap = new Map<string, Element[]>();
  const elementsWithId = document.querySelectorAll("[id]");

  elementsWithId.forEach((element) => {
    const id = element.getAttribute("id") || "";
    if (!idMap.has(id)) {
      idMap.set(id, []);
    }
    idMap.get(id)!.push(element);
  });

  idMap.forEach((elements, id) => {
    if (elements.length > 1) {
      elements.forEach((element, index) => {
        issues.push({
          id: `duplicate-id-${id}-${index}`,
          url,
          message: `Duplicate ID: "${id}" appears ${elements.length} times`,
          help: "IDs must be unique within the document for proper accessibility",
          element: element.outerHTML,
          elementPath: generateElementPath(element),
          impact: "serious",
          severity: "High",
          tags: ["wcag2a", "wcag411"],
          createdAt: new Date(),
          updatedAt: new Date(),
          scanId: "",
        });
      });
    }
  });

  return issues;
}

function checkFocusManagement(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  
  // Check for elements that remove focus outline without replacement
  const elementsWithOutlineNone = document.querySelectorAll('[style*="outline: none"], [style*="outline:none"]');
  elementsWithOutlineNone.forEach((element, index) => {
    const tagName = element.tagName.toLowerCase();
    if (["a", "button", "input", "select", "textarea"].includes(tagName)) {
      issues.push({
        id: `focus-outline-removed-${index}`,
        url,
        message: "Interactive element removes focus outline without providing alternative",
        help: "If removing default focus outline, provide a custom focus indicator with sufficient contrast",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "serious",
        severity: "High",
        tags: ["wcag2aa", "wcag247"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      });
    }
  });

  return issues;
}

function checkSemanticStructure(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = [];
  
  // Check for missing main landmark
  const mainElements = document.querySelectorAll('main, [role="main"]');
  if (mainElements.length === 0) {
    issues.push({
      id: "missing-main-landmark",
      url,
      message: "Page is missing a main landmark",
      help: "Use <main> element or role='main' to identify the primary content area",
      element: "<body>...</body>",
      elementPath: "body",
      impact: "moderate",
      severity: "Medium",
      tags: ["wcag2a", "wcag131"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    });
  } else if (mainElements.length > 1) {
    issues.push({
      id: "multiple-main-landmarks",
      url,
      message: `Page has ${mainElements.length} main landmarks, should have only one`,
      help: "Use only one main landmark per page",
      element: "<body>...</body>",
      elementPath: "body",
      impact: "moderate",
      severity: "Medium",
      tags: ["wcag2a", "wcag131"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    });
  }

  return issues;
}
