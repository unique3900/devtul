import db from "@/db"
import type { AccessibilityResult, AccessibilitySummary } from "@/lib/types"

export interface GetScanResultsResponse {
  results: AccessibilityResult[]
  summary: AccessibilitySummary
  totalPages: number
  totalResults: number
}

export async function getScanResults(
  scanId: string,
  page: number = 1,
  pageSize: number = 10,
  sortBy: string = "severity",
  search: string = "",
  severityFilters: string[] = [],
  complianceFilters: string[] = []
): Promise<GetScanResultsResponse> {
  try {
    // Build where clause
    const whereClause: any = {
      scanId: scanId
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

    // Calculate summary
    const summary: AccessibilitySummary = {
      total: totalResults,
      critical: results.filter(r => r.severity === 'Critical').length,
      serious: results.filter(r => r.severity === 'High').length,
      moderate: results.filter(r => r.severity === 'Medium').length,
      minor: results.filter(r => r.severity === 'Low').length,
      info: results.filter(r => r.severity === 'Info').length
    }

    return {
      results,
      summary,
      totalPages,
      totalResults
    }
  } catch (error) {
    console.error("Error fetching scan results:", error)
    throw new Error("Failed to fetch scan results")
  }
} 