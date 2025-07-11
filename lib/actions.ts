import db from "@/db"
import type { AccessibilityResult, AccessibilitySummary } from "@/lib/types"

export interface GetAccessibilityResultsParams {
  page: number
  pageSize: number
  sortBy: string
  search: string
  urls?: string[]
  severityFilters?: string[]
  complianceFilters?: string[]
  scanTypeFilters?: string[]
  categoryFilters?: string[]
  projectId?: string
  scanId?: string
}

export interface GetAccessibilityResultsResponse {
  results: AccessibilityResult[]
  summary: AccessibilitySummary
  totalPages: number
  totalResults: number
}

export async function getAccessibilityResults(
  params: GetAccessibilityResultsParams
): Promise<GetAccessibilityResultsResponse> {
  const {
    page = 1,
    pageSize = 10,
    sortBy = "severity",
    search = "",
    urls = [],
    severityFilters = [],
    complianceFilters = [],
    scanTypeFilters = [],
    categoryFilters = [],
    projectId,
    scanId
  } = params

  try {
    // Build where clause
    const whereClause: any = {}

    // Filter by scanId if provided
    if (scanId) {
      whereClause.scanId = scanId
    }

    // Filter by projectId if provided (through scan relation)
    if (projectId && !scanId) {
      whereClause.scan = {
        projectId: projectId
      }
    }

    // Filter by URLs if provided
    if (urls && urls.length > 0) {
      whereClause.url = {
        in: urls
      }
    }

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
        { element: { contains: search, mode: 'insensitive' } },
        { help: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Filter by severity
    if (severityFilters.length > 0) {
      whereClause.severity = {
        in: severityFilters.map(s => s.charAt(0).toUpperCase() + s.slice(1))
      }
    }

    // Filter by compliance (tags)
    if (complianceFilters.length > 0) {
      whereClause.tags = {
        hasSome: complianceFilters
      }
    }

    // Filter by scan type
    if (scanTypeFilters.length > 0) {
      whereClause.scan = {
        ...whereClause.scan,
        scanType: {
          in: scanTypeFilters.map(t => t === 'security' ? 'Security' : 'Accessibility')
        }
      }
    }

    // Filter by category (severity-based)
    if (categoryFilters.length > 0) {
      const categoryToSeverity = {
        'headers': ['High', 'Medium'],
        'tls': ['Critical', 'High'],
        'csp': ['High', 'Medium'],
        'cors': ['Medium', 'Low'],
        'xss': ['Critical', 'High'],
        'auth': ['Critical', 'High'],
        'info-leak': ['Medium', 'Low'],
        'owasp': ['Critical', 'High']
      }
      
      let categorySeverities: string[] = []
      categoryFilters.forEach(cat => {
        const severities = categoryToSeverity[cat as keyof typeof categoryToSeverity]
        if (severities) {
          categorySeverities = [...categorySeverities, ...severities]
        }
      })
      
      if (categorySeverities.length > 0) {
        whereClause.severity = {
          in: [...new Set(categorySeverities)]
        }
      }
    }

    // Count total results
    const totalResults = await db.scanResult.count({
      where: whereClause
    })

    // Calculate total pages
    const totalPages = Math.ceil(totalResults / pageSize)

    // Build orderBy clause
    let orderBy: any = {}
    switch (sortBy) {
      case "severity":
        orderBy = {
          severity: "desc"
        }
        break
      case "url":
        orderBy = {
          url: "asc"
        }
        break
      case "date":
        orderBy = {
          createdAt: "desc"
        }
        break
      default:
        orderBy = {
          createdAt: "desc"
        }
    }

    // Get results
    const scanResults = await db.scanResult.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        scan: {
          select: {
            scanType: true,
            projectId: true
          }
        }
      }
    })

    // Convert to AccessibilityResult format
    const results: AccessibilityResult[] = scanResults.map(result => ({
      id: result.id,
      scanId: result.scanId,
      url: result.url,
      message: result.message,
      element: result.element || undefined,
      severity: result.severity as any,
      impact: result.impact || undefined,
      help: result.help || undefined,
      tags: result.tags,
      elementPath: result.elementPath || undefined,
      details: result.details as Record<string, any>,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      scanType: result.scan?.scanType === 'Security' ? 'security' : 'wcag',
      category: result.severity.toLowerCase()
    }))

    // Calculate summary from all results matching the filters (not just current page)
    const allFilteredResults = await db.scanResult.findMany({
      where: whereClause,
      select: {
        severity: true
      }
    })

    const summary: AccessibilitySummary = {
      total: totalResults,
      critical: allFilteredResults.filter(r => r.severity === 'Critical').length,
      serious: allFilteredResults.filter(r => r.severity === 'High').length,
      moderate: allFilteredResults.filter(r => r.severity === 'Medium').length,
      minor: allFilteredResults.filter(r => r.severity === 'Low').length,
      info: allFilteredResults.filter(r => r.severity === 'Info').length
    }

    return {
      results,
      summary,
      totalPages,
      totalResults
    }
  } catch (error) {
    console.error("Error fetching accessibility results:", error)
    throw new Error("Failed to fetch accessibility results")
  }
} 