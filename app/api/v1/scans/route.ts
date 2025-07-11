import { NextResponse } from "next/server"
import db from "@/db"
import { analyzeAccessibility as simpleAnalyze } from "@/lib/simple-checker"
import { analyzeAccessibility as playwrightAnalyze } from "@/lib/playwright-axes"
import { analyzeAccessibility as htmlAnalyze } from "@/lib/html-validator"
import type { ComplianceOptions } from "@/lib/types"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { projectId, url, complianceOptions, scanId } = await request.json()

    if (!projectId || !url) {
      return NextResponse.json(
        { error: "Project ID and URL are required" },
        { status: 400 }
      )
    }

    // Start a transaction to ensure atomicity
    const scan = await db.$transaction(async (tx) => {
      let scan
      
      if (scanId) {
        // This is a rescan - update existing scan
        scan = await tx.scan.update({
          where: { id: scanId },
          data: {
            status: "Running",
            startedAt: new Date(),
            completedAt: null,
            errorMessage: null,
            scanConfig: complianceOptions || {}
          }
        })

        // Delete existing results for this scan
        await tx.scanResult.deleteMany({
          where: { scanId }
        })
      } else {
        // Find or create URL record
        let urlRecord = await tx.url.findFirst({
          where: { projectId, url }
        })
        
        if (!urlRecord) {
          urlRecord = await tx.url.create({
            data: { projectId, url }
          })
        }

        // Create new scan record
        scan = await tx.scan.create({
          data: {
            projectId,
            urlId: urlRecord.id,
            scanType: "WCAG",
            status: "Running",
            startedAt: new Date(),
            initiatedById: session.user.id,
            scanConfig: complianceOptions || {}
          }
        })
      }

      return scan
    })

    // Process the scan asynchronously
    processScan(scan.id, url, complianceOptions, !!scanId).catch(error => {
      console.error(`Error processing scan ${scan.id}:`, error)
    })

    return NextResponse.json({ 
      success: true, 
      message: "Scan started successfully",
      scan 
    })
  } catch (error) {
    console.error("Error starting scan:", error)
    return NextResponse.json(
      { error: "Failed to start scan" },
      { status: 500 }
    )
  }
}

async function processScan(scanId: string, url: string, complianceOptions: ComplianceOptions, isRescan: boolean = false) {
  try {
    // Update scan status to running
    await db.scan.update({
      where: { id: scanId },
      data: { status: "Running" }
    })

    // Validate URL exists and is accessible - handle 404s gracefully
    let urlAccessible = true
    let urlError = null
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WCAG-Checker/1.0 (Accessibility Scanner)'
        }
      })
      
      clearTimeout(timeoutId)
      if (!response.ok) {
        urlError = `URL returned status ${response.status}`
        urlAccessible = false
        
        // For 404 and similar client errors, continue with limited analysis
        if (response.status >= 400 && response.status < 500) {
          console.warn(`URL ${url} returned ${response.status}, continuing with limited analysis`)
        } else {
          throw new Error(urlError)
        }
      }
    } catch (error) {
      urlError = error instanceof Error ? error.message : 'Unknown error'
      urlAccessible = false
      
      // Try to continue with analysis even if HEAD request fails
      console.warn(`HEAD request failed for ${url}: ${urlError}. Attempting analysis anyway.`)
    }

    // Determine which analysis method to use
    let analysisResult
    let analysisMethod = "simple"
    let analysisError = null

    try {
      // Try playwright-axe first for better accuracy
      analysisResult = await playwrightAnalyze(url, complianceOptions)
      analysisMethod = "playwright-axe"
    } catch (error) {
      console.warn("Playwright analysis failed, falling back to simple checker:", error)
      analysisError = error instanceof Error ? error.message : 'Unknown error'
      try {
        // Fall back to simple checker
        analysisResult = await simpleAnalyze(url, complianceOptions)
        analysisMethod = "simple"
      } catch (error) {
        console.warn("Simple analysis failed, falling back to HTML validator:", error)
        analysisError = error instanceof Error ? error.message : 'Unknown error'
        try {
          // Last resort: HTML validator
          analysisResult = await htmlAnalyze(url, complianceOptions)
          analysisMethod = "html-validator"
        } catch (error) {
          // If all methods fail, create empty result with error info
          analysisError = error instanceof Error ? error.message : 'Unknown error'
          analysisResult = {
            results: [],
            summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 }
          }
        }
      }
    }

    // Function to map severity to Prisma enum values
    const mapSeverity = (severity: string): 'Critical' | 'High' | 'Medium' | 'Low' | 'Info' => {
      const lowerSeverity = severity.toLowerCase()
      switch (lowerSeverity) {
        case 'critical':
          return 'Critical'
        case 'serious':
        case 'high':
          return 'High'
        case 'moderate':
        case 'medium':
          return 'Medium'
        case 'minor':
        case 'low':
          return 'Low'
        case 'info':
          return 'Info'
        default:
          console.warn(`Unknown severity level: ${severity}, defaulting to Medium`)
          return 'Medium'
      }
    }

    // Start a transaction to ensure atomicity of results update
    await db.$transaction(async (tx) => {
      // Save results to database
      if (analysisResult.results.length > 0) {
        await tx.scanResult.createMany({
          data: analysisResult.results.map((result: any) => ({
            scanId,
            url: result.url,
            message: result.message,
            element: result.element,
            severity: mapSeverity(result.severity),
            impact: result.impact,
            help: result.help,
            tags: result.tags || [],
            elementPath: result.elementPath,
            details: result.details || {},
            createdAt: new Date()
          }))
        })
      }

      // Update scan status to completed with summary data
      await tx.scan.update({
        where: { id: scanId },
        data: { 
          status: urlAccessible && !analysisError ? "Completed" : "Failed",
          completedAt: new Date(),
          errorMessage: urlError || analysisError || null
        }
      })

      // Get project ID from scan
      const scan = await tx.scan.findUnique({
        where: { id: scanId },
        select: { projectId: true }
      })

      if (scan) {
        // Calculate project statistics across ALL scans for this project
        const projectStats = await tx.scanResult.groupBy({
          by: ['severity'],
          where: { 
            scan: { 
              projectId: scan.projectId,
              status: 'Completed' // Only count completed scans
            }
          },
          _count: true
        })

        const totalIssues = projectStats.reduce((sum, stat) => sum + stat._count, 0)
        const criticalIssues = projectStats.find(s => s.severity === 'Critical')?._count || 0
        const highIssues = projectStats.find(s => s.severity === 'High')?._count || 0
        const mediumIssues = projectStats.find(s => s.severity === 'Medium')?._count || 0
        const lowIssues = projectStats.find(s => s.severity === 'Low')?._count || 0

        console.log(`Updating project ${scan.projectId} stats:`, {
          totalIssues,
          criticalIssues,
          highIssues,
          mediumIssues,
          lowIssues
        })

        // Update project with latest scan data
        await tx.project.update({
          where: { id: scan.projectId },
          data: {
            lastScanAt: new Date(),
            totalIssues,
            criticalIssues,
            highIssues,
            mediumIssues,
            lowIssues,
            status: criticalIssues > 0 ? "Warning" : "Active"
          }
        })
      }
    })

    console.log(`Scan ${scanId} completed successfully`)
  } catch (error) {
    console.error(`Error processing scan ${scanId}:`, error)
    
    // Update scan status to failed
    await db.scan.update({
      where: { id: scanId },
      data: { 
        status: "Failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      }
    })
    
    console.error(`Scan ${scanId} failed`)
  }
}