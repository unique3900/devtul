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
  includeResolved?: boolean // Whether to include resolved issues
}

export interface GetAccessibilityResultsResponse {
  results: AccessibilityResult[]
  summary: AccessibilitySummary
  totalPages: number
  totalResults: number
}

// Helper function to map frontend severity names to database enum values
function mapSeverityToEnum(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'Critical'
    case 'serious':
      return 'High'
    case 'moderate':
      return 'Medium'
    case 'minor':
      return 'Low'
    case 'info':
      return 'Info'
    default:
      return severity.charAt(0).toUpperCase() + severity.slice(1)
  }
}

// Helper function to map database enum values to frontend display names
function mapEnumToDisplay(severity: string): string {
  switch (severity) {
    case 'Critical':
      return 'critical'
    case 'High':
      return 'serious'
    case 'Medium':
      return 'moderate'
    case 'Low':
      return 'minor'
    case 'Info':
      return 'info'
    default:
      return severity.toLowerCase()
  }
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
    scanId,
    includeResolved = false
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

    // Filter by severity - properly map frontend names to database enum values
    if (severityFilters.length > 0) {
      whereClause.severity = {
        in: severityFilters.map(s => mapSeverityToEnum(s))
      }
    }

    // Filter by compliance (tags)
    if (complianceFilters.length > 0) {
      whereClause.tags = {
        hasSome: complianceFilters
      }
    }

    // Filter by scan type - use scanType field in ScanResult
    if (scanTypeFilters.length > 0) {
      const mappedScanTypes = scanTypeFilters.map(t => {
        switch (t.toLowerCase()) {
          case 'accessibility': return 'Accessibility'
          case 'security': return 'Security'
          case 'seo': return 'SEO'
          case 'performance': return 'Performance'
          case 'uptime': return 'Uptime'
          case 'ssl': return 'SSLTLS'
          default: return t
        }
      })
      whereClause.scanType = {
        in: mappedScanTypes
      }
    }

    // Filter by category - use category field in ScanResult
    if (categoryFilters.length > 0) {
      whereClause.category = {
        in: categoryFilters
      }
    }

    // Filter by resolution status (exclude resolved issues by default)
    if (!includeResolved) {
      whereClause.isResolved = false
    }

    // Count total results
    const totalResults = await db.scanResult.count({
      where: whereClause
    })

    // Calculate total pages
    const totalPages = Math.ceil(totalResults / pageSize)

    // Get results with proper ordering
    let scanResults: any[]
    
    if (sortBy === "severity") {
      // For severity sorting, we need to fetch all filtered results and sort them in JavaScript
      // since Prisma doesn't support custom enum ordering directly
      const allResults = await db.scanResult.findMany({
        where: whereClause,
        include: {
          scan: {
            select: {
              scanType: true,
              projectId: true
            }
          }
        }
      })
      
      // Define severity order
      const severityOrder = {
        'Critical': 1,
        'High': 2,
        'Medium': 3,
        'Low': 4,
        'Info': 5
      }
      
      // Sort by severity
      const sortedResults = allResults.sort((a, b) => {
        const orderA = severityOrder[a.severity as keyof typeof severityOrder] || 6
        const orderB = severityOrder[b.severity as keyof typeof severityOrder] || 6
        return orderA - orderB
      })
      
      // Apply pagination
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      scanResults = sortedResults.slice(startIndex, endIndex)
    } else {
      // Build orderBy clause for non-severity sorting
      let orderBy: any = {}
      switch (sortBy) {
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

      // Get results with regular Prisma query
      scanResults = await db.scanResult.findMany({
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
    }

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
      category: mapEnumToDisplay(result.severity)
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