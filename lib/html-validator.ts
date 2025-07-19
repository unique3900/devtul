import { JSDOM } from "jsdom"
import type { ComplianceOptions, AccessibilityResult } from "@/lib/types"

// Add SEO-specific types
export interface SEOResult {
  id: string
  url: string
  message: string
  help: string
  element?: string
  elementPath?: string
  impact: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  tags: string[]
  category: 'seo' | 'meta' | 'content' | 'performance' | 'structure' | 'technical'
  recommendation?: string
  details?: any
  createdAt: Date
  updatedAt: Date
  scanId: string
}

export interface SEOSummary {
  critical: number
  serious: number
  moderate: number
  minor: number
  info: number
  total: number
  urlsAnalyzed: number
  categorySummary: {
    meta: number
    content: number
    performance: number
    structure: number
    technical: number
  }
}

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
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }

    const html = await response.text()

    // Parse the HTML with JSDOM
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Collect accessibility issues
    const issues: AccessibilityResult[] = []

    // Check for basic accessibility issues
    issues.push(...checkImagesWithoutAlt(document, url))
    issues.push(...checkHeadingStructure(document, url))
    issues.push(...checkFormLabels(document, url))
    issues.push(...checkLinkText(document, url))

    // Add additional checks based on compliance options
    if (complianceOptions.wcagLevel === "aa" || complianceOptions.wcagLevel === "aaa") {
      issues.push(...checkColorContrast(document, url))
      issues.push(...checkARIAAttributes(document, url))
    }

    if (complianceOptions.wcagLevel === "aaa") {
      issues.push(...checkTextSpacing(document, url))
    }

    if (complianceOptions.section508) {
      issues.push(...checkKeyboardAccessibility(document, url))
    }

    // Check for basic HTML validation issues
    issues.push(...checkBasicHtmlIssues(document, url))

    // Generate summary
    const summary = {
      critical: issues.filter((r) => r.severity === "Critical").length,
      serious: issues.filter((r) => r.severity === "High").length,
      moderate: issues.filter((r) => r.severity === "Medium").length,
      minor: issues.filter((r) => r.severity === "Low" || r.severity === "Info").length,
      total: issues.length,
      urlsAnalyzed: 1,
    }

    return {
      results: issues,
      summary,
    }
  } catch (error) {
    console.error(`Error analyzing ${url}:`, error)
    throw new Error(`Failed to analyze ${url}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// New SEO Analysis Function
export async function analyzeSEO(
  url: string,
  options: { 
    meta?: boolean,
    content?: boolean, 
    performance?: boolean,
    structure?: boolean,
    technical?: boolean 
  } = {}
): Promise<{
  results: SEOResult[]
  summary: SEOSummary
}> {
  try {
    // Fetch the HTML content with headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEO-Scanner/1.0 (Website Analysis Tool)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }

    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document

    const issues: SEOResult[] = []

    // Meta tags analysis
    if (options.meta !== false) {
      issues.push(...checkMetaTags(document, url))
    }

    // Content analysis  
    if (options.content !== false) {
      issues.push(...checkContentSEO(document, url))
    }

    // Structure analysis
    if (options.structure !== false) {
      issues.push(...checkStructuredData(document, url))
      issues.push(...checkURLStructure(url))
    }

    // Technical SEO
    if (options.technical !== false) {
      issues.push(...checkTechnicalSEO(document, url, response))
    }

    // Performance indicators (basic)
    if (options.performance !== false) {
      issues.push(...checkPerformanceSEO(document, url))
    }

    // Generate summary
    const summary = generateSEOSummary(issues)

    return {
      results: issues,
      summary
    }
  } catch (error) {
    console.error(`Error analyzing SEO for ${url}:`, error)
    throw new Error(`Failed to analyze SEO for ${url}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Enhanced helper function to generate CSS selector paths
function generateElementPath(element: Element): string {
  const path: string[] = []
  let current: Element | null = element

  while (current && current.nodeType === 1) { // 1 = ELEMENT_NODE
    let selector = current.tagName.toLowerCase()

    // Add ID if present (most specific)
    if (current.id) {
      selector += `#${current.id}`
      path.unshift(selector)
      break // ID is unique, we can stop here
    }

    // Add classes if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(/\s+/).filter(cls => cls.length > 0)
      if (classes.length > 0) {
        selector += '.' + classes.join('.')
      }
    }

    // Add nth-child if there are siblings with the same tag
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        sibling => sibling.tagName === current!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  return path.join(' > ')
}

// Helper functions for accessibility checks

function checkImagesWithoutAlt(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []
  const images = document.querySelectorAll("img")

  images.forEach((img, index) => {
    if (!img.hasAttribute("alt")) {
      issues.push({
        id: `img-no-alt-${index}`,
        url,
        message: "Image missing alt attribute",
        help: "Images must have alternate text",
        element: img.outerHTML,
        elementPath: generateElementPath(img),
        impact: "High",
        severity: "High",
        tags: ["wcag2a", "wcag2aa", "wcag2aaa", "section508"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    } else if (img.getAttribute("alt") === "") {
      // Empty alt is only valid for decorative images
      const role = img.getAttribute("role")
      if (role !== "presentation" && role !== "none") {
        issues.push({
          id: `img-empty-alt-${index}`,
          url,
          message: "Image has empty alt attribute but is not marked as decorative",
          help: "Non-decorative images should have meaningful alt text",
          element: img.outerHTML,
          elementPath: generateElementPath(img),
          impact: "moderate",
          severity: "Medium",
          tags: ["wcag2a", "wcag2aa", "wcag2aaa", "best-practice"],
          createdAt: new Date(),
          updatedAt: new Date(),
          scanId: "",
        })
      }
    }
  })

  return issues
}

function checkHeadingStructure(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6")
  let previousLevel = 0

  headings.forEach((heading, index) => {
    const level = Number.parseInt(heading.tagName.substring(1))

    // Check for skipped heading levels
    if (level - previousLevel > 1 && previousLevel !== 0) {
      issues.push({
        id: `heading-skip-${index}`,
        url,
        message: `Heading level skipped from h${previousLevel} to h${level}`,
        help: "Heading levels should only increase by one",
        element: heading.outerHTML,
        elementPath: generateElementPath(heading),
        impact: "High",
        severity: "High",
        tags: ["best-practice"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }

    previousLevel = level
  })

  // Check if there's an h1
  if (!document.querySelector("h1")) {
    issues.push({
      id: "missing-h1",
      url,
      message: "Document does not have a main heading (h1)",
      help: "Pages should contain a main heading to describe their content",
      element: "<body>...</body>",
      elementPath: "body",
      impact: "High",
      severity: "High",
      tags: ["best-practice"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    })
  }

  return issues
}

function checkFormLabels(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []
  const formControls = document.querySelectorAll("input, select, textarea")

  formControls.forEach((control, index) => {
    const id = control.getAttribute("id")
    const type = control.getAttribute("type")

    // Skip hidden inputs and buttons
    if (type === "hidden" || type === "button" || type === "submit" || type === "reset") {
      return
    }

    // Check if control has an id and a corresponding label
    if (!id || !document.querySelector(`label[for="${id}"]`)) {
      // Check if control is inside a label
      if (!control.closest("label")) {
        issues.push({
          id: `form-control-no-label-${index}`,
          url,
          message: "Form control does not have a label",
          help: "Form controls must have associated labels",
          element: control.outerHTML,
          elementPath: generateElementPath(control),
          impact: "Critical",
          severity: "Critical",
          tags: ["wcag2a", "wcag2aa", "wcag2aaa", "section508"],
          createdAt: new Date(),
          updatedAt: new Date(),
          scanId: "",
        })
      }
    }
  })

  return issues
}

function checkLinkText(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []
  const links = document.querySelectorAll("a")

  links.forEach((link, index) => {
    const text = link.textContent?.trim() || ""
    const ariaLabel = link.getAttribute("aria-label")
    const ariaLabelledBy = link.getAttribute("aria-labelledby")
    const title = link.getAttribute("title")

    // Check for empty links
    if (!text && !ariaLabel && !ariaLabelledBy && !title) {
      issues.push({
        id: `empty-link-${index}`,
        url,
        message: "Link has no text",
        help: "Links must have discernible text",
        element: link.outerHTML,
        elementPath: generateElementPath(link),
        impact: "High",
        severity: "High",
        tags: ["wcag2a", "wcag2aa", "wcag2aaa", "section508"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }

    // Check for generic link text
    if (["click here", "here", "more", "read more"].includes(text.toLowerCase()) && !ariaLabel && !ariaLabelledBy) {
      issues.push({
        id: `generic-link-${index}`,
        url,
        message: "Link has generic text",
        help: "Link text should be descriptive",
        element: link.outerHTML,
        elementPath: generateElementPath(link),
        impact: "High",
        severity: "High",
        tags: ["best-practice"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }
  })

  return issues
}

function checkColorContrast(document: Document, url: string): AccessibilityResult[] {
  // Note: Proper color contrast checking requires browser rendering
  // This is a simplified check that looks for potential inline style issues
  const issues: AccessibilityResult[] = []
  const elements = document.querySelectorAll('[style*="color"], [style*="background"]')

  elements.forEach((element, index) => {
    const style = element.getAttribute("style") || ""

    // This is a very simplified check - real contrast checking requires computing styles
    if (
      (style.includes("color") && style.includes("background")) ||
      (element.textContent?.trim() && (style.includes("color: #") || style.includes("background: #")))
    ) {
      issues.push({
        id: `potential-contrast-issue-${index}`,
        url,
        message: "Potential color contrast issue with inline styles",
        help: "Text elements must have sufficient color contrast",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "High",
        severity: "High",
        tags: ["wcag2aa", "wcag2aaa"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }
  })

  return issues
}

function checkARIAAttributes(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []
  const elementsWithRole = document.querySelectorAll("[role]")

  // Valid ARIA roles
  const validRoles = [
    "alert",
    "alertdialog",
    "application",
    "article",
    "banner",
    "button",
    "cell",
    "checkbox",
    "columnheader",
    "combobox",
    "complementary",
    "contentinfo",
    "definition",
    "dialog",
    "directory",
    "document",
    "feed",
    "figure",
    "form",
    "grid",
    "gridcell",
    "group",
    "heading",
    "img",
    "link",
    "list",
    "listbox",
    "listitem",
    "log",
    "main",
    "marquee",
    "math",
    "menu",
    "menubar",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "navigation",
    "none",
    "note",
    "option",
    "presentation",
    "progressbar",
    "radio",
    "radiogroup",
    "region",
    "row",
    "rowgroup",
    "rowheader",
    "scrollbar",
    "search",
    "searchbox",
    "separator",
    "slider",
    "spinbutton",
    "status",
    "switch",
    "tab",
    "table",
    "tablist",
    "tabpanel",
    "term",
    "textbox",
    "timer",
    "toolbar",
    "tooltip",
    "tree",
    "treegrid",
    "treeitem",
  ]

  elementsWithRole.forEach((element, index) => {
    const role = element.getAttribute("role")

    if (role && !validRoles.includes(role)) {
      issues.push({
        id: `invalid-role-${index}`,
        url,
        message: `Invalid ARIA role: ${role}`,
        help: "ARIA roles must be valid",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "High",
        severity: "High",
        tags: ["wcag2aa", "wcag2aaa"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }
  })

  return issues
}

function checkTextSpacing(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []
  const elementsWithLineHeight = document.querySelectorAll('[style*="line-height"]')

  elementsWithLineHeight.forEach((element, index) => {
    const style = element.getAttribute("style") || ""

    // Check for potentially restrictive line height
    if (style.includes("line-height: 1") || style.includes("line-height:1") || style.includes("line-height: 0")) {
      issues.push({
        id: `restrictive-line-height-${index}`,
        url,
        message: "Restrictive line height may cause readability issues",
        help: "Text spacing should be adjustable without loss of content",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "High",
        severity: "High",
        tags: ["wcag2aaa"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }
  })

  return issues
}

function checkKeyboardAccessibility(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []

  // Check for elements with click handlers but no keyboard equivalent
  const elementsWithOnClick = document.querySelectorAll("[onclick]")

  elementsWithOnClick.forEach((element, index) => {
    const tagName = element.tagName.toLowerCase()
    const role = element.getAttribute("role")
    const tabIndex = element.getAttribute("tabindex")

    // If it's not a naturally interactive element and doesn't have keyboard access
    if (!["a", "button", "input", "select", "textarea"].includes(tagName) && role !== "button" && !tabIndex) {
      issues.push({
        id: `keyboard-inaccessible-${index}`,
        url,
        message: "Element has click handler but may not be keyboard accessible",
        help: "Interactive elements must be accessible via keyboard",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "Critical",
        severity: "Critical",
        tags: ["section508", "wcag2a", "wcag2aa", "wcag2aaa"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }
  })

  // Check for positive tabindex which disrupts natural tab order
  const elementsWithPositiveTabIndex = document.querySelectorAll("[tabindex]")

  elementsWithPositiveTabIndex.forEach((element, index) => {
    const tabIndex = Number.parseInt(element.getAttribute("tabindex") || "0")

    if (tabIndex > 0) {
      issues.push({
        id: `positive-tabindex-${index}`,
        url,
        message: `Element has positive tabindex (${tabIndex}) which disrupts natural tab order`,
        help: "Avoid using positive tabindex values",
        element: element.outerHTML,
        elementPath: generateElementPath(element),
        impact: "High",
        severity: "High",
        tags: ["best-practice", "section508"],
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: "",
      })
    }
  })

  return issues
}

function checkBasicHtmlIssues(document: Document, url: string): AccessibilityResult[] {
  const issues: AccessibilityResult[] = []

  // Check for missing doctype
  const doctype = document.doctype
  if (!doctype) {
    issues.push({
      id: "missing-doctype",
      url,
      message: "Missing DOCTYPE declaration",
      help: "Include a proper DOCTYPE declaration for better accessibility",
      element: "<html>...</html>",
      elementPath: "html",
      impact: "Low",
      severity: "Low",
      tags: ["best-practice"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    })
  }

  // Check for missing language attribute
  const html = document.documentElement
  if (!html.hasAttribute("lang")) {
    issues.push({
      id: "missing-lang",
      url,
      message: "Missing language attribute on HTML element",
      help: "Specify the document language using the lang attribute",
      element: html.outerHTML.substring(0, 100) + "...",
      elementPath: "html",
      impact: "High",
      severity: "High",
      tags: ["wcag2a", "wcag2aa", "wcag2aaa"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    })
  }

  // Check for missing title
  if (!document.title) {
    issues.push({
      id: "missing-title",
      url,
      message: "Missing document title",
      help: "Provide a descriptive title for the document",
      element: "<head>...</head>",
      elementPath: "head",
      impact: "High",
      severity: "High",
      tags: ["wcag2a", "wcag2aa", "wcag2aaa"],
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: "",
    })
  }

  // Check for duplicate IDs
  const idMap = new Map<string, Element[]>()
  const elementsWithId = document.querySelectorAll("[id]")

  elementsWithId.forEach((element) => {
    const id = element.getAttribute("id") || ""
    if (!idMap.has(id)) {
      idMap.set(id, [])
    }
    idMap.get(id)!.push(element)
  })

  idMap.forEach((elements, id) => {
    if (elements.length > 1) {
      elements.forEach((element, index) => {
        issues.push({
          id: `duplicate-id-${id}-${index}`,
          url,
          message: `Duplicate ID: "${id}" appears ${elements.length} times`,
          help: "IDs must be unique within the document",
          element: element.outerHTML,
          elementPath: generateElementPath(element),
          impact: "High",
          severity: "High",
          tags: ["wcag2a", "wcag2aa", "wcag2aaa"],
          createdAt: new Date(),
          updatedAt: new Date(),
          scanId: "",
        })
      })
    }
  })

  return issues
}

// SEO Check Functions
function checkMetaTags(document: Document, url: string): SEOResult[] {
  const issues: SEOResult[] = []
  let issueIndex = 0

  // Check title tag
  const title = document.querySelector('title')
  if (!title || !title.textContent?.trim()) {
    issues.push({
      id: `missing-title-${issueIndex++}`,
      url,
      message: 'Missing or empty title tag',
      help: 'Add a descriptive title tag (50-60 characters recommended)',
      element: '<head>...</head>',
      elementPath: 'head',
      impact: 'high',
      severity: 'Critical',
      tags: ['meta', 'title', 'seo'],
      category: 'meta',
      recommendation: 'Add a unique, descriptive title that includes your target keywords',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  } else {
    const titleLength = title.textContent.length
    if (titleLength < 30) {
      issues.push({
        id: `short-title-${issueIndex++}`,
        url,
        message: `Title tag is too short (${titleLength} characters)`,
        help: 'Title should be 50-60 characters for optimal display in search results',
        element: title.outerHTML,
        elementPath: generateElementPath(title),
        impact: 'medium',
        severity: 'Medium',
        tags: ['meta', 'title', 'length'],
        category: 'meta',
        details: { currentLength: titleLength, recommendedRange: '50-60' },
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: ''
      })
    } else if (titleLength > 60) {
      issues.push({
        id: `long-title-${issueIndex++}`,
        url,
        message: `Title tag is too long (${titleLength} characters)`,
        help: 'Title may be truncated in search results. Keep it under 60 characters',
        element: title.outerHTML,
        elementPath: generateElementPath(title),
        impact: 'medium',
        severity: 'Medium',
        tags: ['meta', 'title', 'length'],
        category: 'meta',
        details: { currentLength: titleLength, recommendedRange: '50-60' },
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: ''
      })
    }
  }

  // Check meta description
  const metaDescription = document.querySelector('meta[name="description"]')
  if (!metaDescription || !metaDescription.getAttribute('content')?.trim()) {
    issues.push({
      id: `missing-meta-description-${issueIndex++}`,
      url,
      message: 'Missing or empty meta description',
      help: 'Add a compelling meta description (150-160 characters recommended)',
      element: '<head>...</head>',
      elementPath: 'head',
      impact: 'high',
      severity: 'High',
      tags: ['meta', 'description', 'seo'],
      category: 'meta',
      recommendation: 'Add a unique meta description that summarizes the page content',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  } else {
    const descriptionLength = metaDescription.getAttribute('content')!.length
    if (descriptionLength < 120) {
      issues.push({
        id: `short-meta-description-${issueIndex++}`,
        url,
        message: `Meta description is too short (${descriptionLength} characters)`,
        help: 'Meta description should be 150-160 characters for optimal display',
        element: metaDescription.outerHTML,
        elementPath: generateElementPath(metaDescription),
        impact: 'medium',
        severity: 'Medium',
        tags: ['meta', 'description', 'length'],
        category: 'meta',
        details: { currentLength: descriptionLength, recommendedRange: '150-160' },
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: ''
      })
    } else if (descriptionLength > 160) {
      issues.push({
        id: `long-meta-description-${issueIndex++}`,
        url,
        message: `Meta description is too long (${descriptionLength} characters)`,
        help: 'Meta description may be truncated. Keep it under 160 characters',
        element: metaDescription.outerHTML,
        elementPath: generateElementPath(metaDescription),
        impact: 'medium',
        severity: 'Medium',
        tags: ['meta', 'description', 'length'],
        category: 'meta',
        details: { currentLength: descriptionLength, recommendedRange: '150-160' },
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: ''
      })
    }
  }

  // Check meta keywords (outdated but some still use it)
  const metaKeywords = document.querySelector('meta[name="keywords"]')
  if (metaKeywords) {
    issues.push({
      id: `meta-keywords-${issueIndex++}`,
      url,
      message: 'Meta keywords tag detected',
      help: 'Meta keywords are no longer used by search engines and can be removed',
      element: metaKeywords.outerHTML,
      elementPath: generateElementPath(metaKeywords),
      impact: 'low',
      severity: 'Info',
      tags: ['meta', 'keywords', 'outdated'],
      category: 'meta',
      recommendation: 'Remove meta keywords tag as it is not used by modern search engines',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check meta viewport
  const metaViewport = document.querySelector('meta[name="viewport"]')
  if (!metaViewport) {
    issues.push({
      id: `missing-viewport-${issueIndex++}`,
      url,
      message: 'Missing viewport meta tag',
      help: 'Add viewport meta tag for mobile responsiveness',
      element: '<head>...</head>',
      elementPath: 'head',
      impact: 'high',
      severity: 'High',
      tags: ['meta', 'viewport', 'mobile'],
      category: 'technical',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check canonical URL
  const canonical = document.querySelector('link[rel="canonical"]')
  if (!canonical) {
    issues.push({
      id: `missing-canonical-${issueIndex++}`,
      url,
      message: 'Missing canonical URL',
      help: 'Add canonical URL to prevent duplicate content issues',
      element: '<head>...</head>',
      elementPath: 'head',
      impact: 'medium',
      severity: 'Medium',
      tags: ['meta', 'canonical', 'duplicate-content'],
      category: 'technical',
      recommendation: 'Add canonical link tag to specify the preferred URL version',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  return issues
}

function checkContentSEO(document: Document, url: string): SEOResult[] {
  const issues: SEOResult[] = []
  let issueIndex = 0

  // Check heading structure for SEO
  const h1s = document.querySelectorAll('h1')
  if (h1s.length === 0) {
    issues.push({
      id: `missing-h1-seo-${issueIndex++}`,
      url,
      message: 'Missing H1 heading',
      help: 'Add an H1 heading that describes the main topic of the page',
      element: '<body>...</body>',
      elementPath: 'body',
      impact: 'high',
      severity: 'High',
      tags: ['content', 'headings', 'h1'],
      category: 'content',
      recommendation: 'Add a single, descriptive H1 heading',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  } else if (h1s.length > 1) {
    issues.push({
      id: `multiple-h1-${issueIndex++}`,
      url,
      message: `Multiple H1 headings found (${h1s.length})`,
      help: 'Use only one H1 heading per page for SEO best practices',
      element: h1s[0].outerHTML,
      elementPath: generateElementPath(h1s[0]),
      impact: 'medium',
      severity: 'Medium',
      tags: ['content', 'headings', 'h1', 'multiple'],
      category: 'content',
      details: { count: h1s.length },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check content length
  const textContent = document.body.textContent || ''
  const wordCount = textContent.trim().split(/\s+/).length
  if (wordCount < 300) {
    issues.push({
      id: `low-content-${issueIndex++}`,
      url,
      message: `Low content word count (${wordCount} words)`,
      help: 'Pages should typically have at least 300 words of content',
      element: '<body>...</body>',
      elementPath: 'body',
      impact: 'medium',
      severity: 'Medium',
      tags: ['content', 'word-count', 'thin-content'],
      category: 'content',
      details: { wordCount, recommended: 300 },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check for duplicate content indicators
  const paragraphs = document.querySelectorAll('p')
  const paragraphTexts = Array.from(paragraphs).map(p => p.textContent?.trim() || '')
  const duplicateParagraphs = paragraphTexts.filter((text, index) => 
    text.length > 50 && paragraphTexts.indexOf(text) !== index
  )
  
  if (duplicateParagraphs.length > 0) {
    issues.push({
      id: `duplicate-content-${issueIndex++}`,
      url,
      message: 'Duplicate content detected within page',
      help: 'Remove or rewrite duplicate paragraphs to improve content quality',
      element: '<body>...</body>',
      elementPath: 'body',
      impact: 'medium',
      severity: 'Medium',
      tags: ['content', 'duplicate', 'quality'],
      category: 'content',
      details: { duplicateCount: duplicateParagraphs.length },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  return issues
}

function checkStructuredData(document: Document, url: string): SEOResult[] {
  const issues: SEOResult[] = []
  let issueIndex = 0

  // Check for JSON-LD structured data
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
  if (jsonLdScripts.length === 0) {
    issues.push({
      id: `missing-structured-data-${issueIndex++}`,
      url,
      message: 'No structured data found',
      help: 'Add JSON-LD structured data to improve search engine understanding',
      element: '<head>...</head>',
      elementPath: 'head',
      impact: 'medium',
      severity: 'Medium',
      tags: ['structured-data', 'json-ld', 'seo'],
      category: 'structure',
      recommendation: 'Add relevant schema.org structured data for your content type',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  } else {
    // Validate JSON-LD syntax
    jsonLdScripts.forEach((script, index) => {
      try {
        JSON.parse(script.textContent || '')
      } catch (error) {
        issues.push({
          id: `invalid-json-ld-${index}-${issueIndex++}`,
          url,
          message: 'Invalid JSON-LD structured data syntax',
          help: 'Fix JSON syntax errors in structured data',
          element: script.outerHTML,
          elementPath: generateElementPath(script),
          impact: 'medium',
          severity: 'Medium',
          tags: ['structured-data', 'json-ld', 'syntax-error'],
          category: 'structure',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          createdAt: new Date(),
          updatedAt: new Date(),
          scanId: ''
        })
      }
    })
  }

  // Check for Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]')
  const ogDescription = document.querySelector('meta[property="og:description"]')
  const ogImage = document.querySelector('meta[property="og:image"]')

  if (!ogTitle || !ogDescription || !ogImage) {
    issues.push({
      id: `missing-og-tags-${issueIndex++}`,
      url,
      message: 'Missing essential Open Graph tags',
      help: 'Add og:title, og:description, and og:image for better social media sharing',
      element: '<head>...</head>',
      elementPath: 'head',
      impact: 'medium',
      severity: 'Medium',
      tags: ['open-graph', 'social-media', 'meta'],
      category: 'meta',
      details: {
        missingTags: [
          !ogTitle && 'og:title',
          !ogDescription && 'og:description', 
          !ogImage && 'og:image'
        ].filter(Boolean)
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  return issues
}

function checkURLStructure(url: string): SEOResult[] {
  const issues: SEOResult[] = []
  let issueIndex = 0

  const urlObj = new URL(url)
  
  // Check URL length
  if (url.length > 100) {
    issues.push({
      id: `long-url-${issueIndex++}`,
      url,
      message: `URL is too long (${url.length} characters)`,
      help: 'Keep URLs under 100 characters when possible',
      impact: 'low',
      severity: 'Low',
      tags: ['url', 'length', 'structure'],
      category: 'technical',
      details: { urlLength: url.length, recommended: 100 },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check for URL parameters
  if (urlObj.search.length > 0) {
    issues.push({
      id: `url-parameters-${issueIndex++}`,
      url,
      message: 'URL contains parameters',
      help: 'Consider using clean URLs without parameters for better SEO',
      impact: 'low',
      severity: 'Info',
      tags: ['url', 'parameters', 'clean-urls'],
      category: 'technical',
      details: { parameters: urlObj.search },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check for underscores in URL
  if (urlObj.pathname.includes('_')) {
    issues.push({
      id: `url-underscores-${issueIndex++}`,
      url,
      message: 'URL contains underscores',
      help: 'Use hyphens instead of underscores in URLs for better SEO',
      impact: 'low',
      severity: 'Low',
      tags: ['url', 'underscores', 'structure'],
      category: 'technical',
      recommendation: 'Replace underscores with hyphens in URL structure',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  return issues
}

function checkTechnicalSEO(document: Document, url: string, response: Response): SEOResult[] {
  const issues: SEOResult[] = []
  let issueIndex = 0

  // Check for SSL
  const urlObj = new URL(url)
  if (urlObj.protocol !== 'https:') {
    issues.push({
      id: `non-https-${issueIndex++}`,
      url,
      message: 'Site is not using HTTPS',
      help: 'Migrate to HTTPS for better security and SEO rankings',
      impact: 'high',
      severity: 'High',
      tags: ['https', 'ssl', 'security', 'ranking-factor'],
      category: 'technical',
      recommendation: 'Implement SSL certificate and redirect HTTP to HTTPS',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check robots meta tag
  const robotsMeta = document.querySelector('meta[name="robots"]')
  if (robotsMeta) {
    const robotsContent = robotsMeta.getAttribute('content')?.toLowerCase() || ''
    if (robotsContent.includes('noindex')) {
      issues.push({
        id: `noindex-detected-${issueIndex++}`,
        url,
        message: 'Page is set to noindex',
        help: 'Page will not be indexed by search engines',
        element: robotsMeta.outerHTML,
        elementPath: generateElementPath(robotsMeta),
        impact: 'high',
        severity: 'Critical',
        tags: ['robots', 'noindex', 'indexing'],
        category: 'technical',
        details: { robotsDirective: robotsContent },
        createdAt: new Date(),
        updatedAt: new Date(),
        scanId: ''
      })
    }
  }

  // Check for rel="nofollow" on internal links
  const internalLinks = document.querySelectorAll('a[href]')
  let nofollowInternalCount = 0
  
  internalLinks.forEach(link => {
    const href = link.getAttribute('href') || ''
    const rel = link.getAttribute('rel') || ''
    
    // Check if it's an internal link and has nofollow
    if (!href.startsWith('http') && !href.startsWith('mailto:') && rel.includes('nofollow')) {
      nofollowInternalCount++
    }
  })

  if (nofollowInternalCount > 0) {
    issues.push({
      id: `nofollow-internal-${issueIndex++}`,
      url,
      message: `${nofollowInternalCount} internal links have rel="nofollow"`,
      help: 'Remove nofollow from internal links to improve link equity flow',
      impact: 'medium',
      severity: 'Medium',
      tags: ['internal-links', 'nofollow', 'link-equity'],
      category: 'technical',
      details: { nofollowCount: nofollowInternalCount },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  return issues
}

function checkPerformanceSEO(document: Document, url: string): SEOResult[] {
  const issues: SEOResult[] = []
  let issueIndex = 0

  // Check image optimization
  const images = document.querySelectorAll('img')
  let missingAltCount = 0
  let largeSrcCount = 0

  images.forEach(img => {
    if (!img.hasAttribute('alt')) {
      missingAltCount++
    }
    
    const src = img.getAttribute('src') || ''
    // Basic check for potentially large images (this is limited without actual image analysis)
    if (src.includes('.png') || src.includes('.jpg') || src.includes('.jpeg')) {
      // Check if it doesn't have width/height attributes (might indicate unoptimized)
      if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
        largeSrcCount++
      }
    }
  })

  if (missingAltCount > 0) {
    issues.push({
      id: `images-missing-alt-seo-${issueIndex++}`,
      url,
      message: `${missingAltCount} images missing alt attributes`,
      help: 'Add descriptive alt text to all images for better SEO and accessibility',
      impact: 'medium',
      severity: 'Medium',
      tags: ['images', 'alt-text', 'seo'],
      category: 'content',
      details: { missingAltCount },
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  // Check for external scripts that might slow down the page
  const externalScripts = document.querySelectorAll('script[src]')
  const externalScriptCount = Array.from(externalScripts).filter(script => {
    const src = script.getAttribute('src') || ''
    return src.startsWith('http') && !src.includes(new URL(url).hostname)
  }).length

  if (externalScriptCount > 5) {
    issues.push({
      id: `many-external-scripts-${issueIndex++}`,
      url,
      message: `${externalScriptCount} external scripts detected`,
      help: 'Consider reducing external scripts to improve page load speed',
      impact: 'medium',
      severity: 'Medium',
      tags: ['performance', 'external-scripts', 'page-speed'],
      category: 'performance',
      details: { externalScriptCount },
      recommendation: 'Audit and minimize external script dependencies',
      createdAt: new Date(),
      updatedAt: new Date(),
      scanId: ''
    })
  }

  return issues
}

function generateSEOSummary(results: SEOResult[]): SEOSummary {
  const summary: SEOSummary = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    info: 0,
    total: results.length,
    urlsAnalyzed: new Set(results.map(r => r.url)).size,
    categorySummary: {
      meta: 0,
      content: 0,
      performance: 0,
      structure: 0,
      technical: 0
    }
  }

  results.forEach(result => {
    // Count by severity
    switch (result.severity) {
      case 'Critical':
        summary.critical++
        break
      case 'High':
        summary.serious++
        break
      case 'Medium':
        summary.moderate++
        break
      case 'Low':
        summary.minor++
        break
      case 'Info':
        summary.info++
        break
    }
    
    // Count by category
    switch (result.category) {
      case 'meta':
        summary.categorySummary.meta++
        break
      case 'content':
        summary.categorySummary.content++
        break
      case 'performance':
        summary.categorySummary.performance++
        break
      case 'structure':
        summary.categorySummary.structure++
        break
      case 'technical':
        summary.categorySummary.technical++
        break
    }
  })

  return summary
}
