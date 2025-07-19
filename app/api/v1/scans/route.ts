import { NextResponse } from "next/server"
import db from "@/db"
import { analyzeAccessibility as simpleAnalyze } from "@/lib/simple-checker"
import { analyzeAccessibility as playwrightAnalyze } from "@/lib/playwright-axes"
import { analyzeAccessibility as htmlAnalyze } from "@/lib/html-validator"
import type { ComplianceOptions } from "@/lib/types"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { projectId, url, complianceOptions, scanId, scanType = 'Accessibility' } = await request.json()

    if (!projectId || !url) {
      return NextResponse.json(
        { error: "Project ID and URL are required" },
        { status: 400 }
      )
    }

    // Validate scan type
    const validScanTypes = ['Accessibility', 'Security', 'SEO', 'Performance', 'Uptime', 'SSLTLS']
    if (!validScanTypes.includes(scanType)) {
      return NextResponse.json(
        { error: `Invalid scan type. Must be one of: ${validScanTypes.join(', ')}` },
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
            scanType: scanType,
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
    processScan(scan.id, url, complianceOptions, scanType, !!scanId).catch(error => {
      console.error(`Error processing scan ${scan.id}:`, error)
    })

    // Create activity using our notification system
    try {
      const { createScanActivity } = await import('@/lib/notification-rules')
      await createScanActivity(
        db,
        'ScanStarted',
        projectId,
        scan.id,
        session.user.id
      )
    } catch (error) {
      console.error('Error creating scan activity:', error)
      // Don't fail the request if activity creation fails
    }
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

// Helper function to generate a hash for issue deduplication
function generateIssueHash(url: string, message: string, element: string | null, scanType: string): string {
  const data = `${url}|${message}|${element || ''}|${scanType}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Helper function to find existing issue by hash
async function findExistingIssue(projectId: string, issueHash: string, scanType: string) {
  return await db.scanResult.findFirst({
    where: {
      issueHash: issueHash,
      scanType: scanType as any,
      scan: {
        projectId: projectId
      },
      isResolved: false
    },
    include: {
      scan: true
    }
  });
}

async function processScan(scanId: string, url: string, complianceOptions: ComplianceOptions, scanType: string, isRescan: boolean = false) {
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

    // Determine which analysis method to use based on scan type
    let analysisResult
    let analysisMethod = "simple"
    let analysisError = null

    try {
      if (scanType === 'Accessibility') {
        // Try playwright-axe first for better accuracy
        try {
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
      } else if (scanType === 'Security') {
        // Import and use security scanner
        const { scanSecurity } = await import('@/lib/securiy-scanner')
        analysisResult = await scanSecurity(url)
        analysisMethod = "security-scanner"
      } else if (scanType === 'SEO') {
        // Import and use SEO analyzer (enhanced HTML validator)
        const { analyzeSEO } = await import('@/lib/html-validator')
        analysisResult = await analyzeSEO(url)
        analysisMethod = "seo-analyzer"
      } else {
        // For other scan types, create a placeholder result
        analysisResult = {
          results: [{
            url,
            message: `${scanType} scanning not yet implemented`,
            severity: 'Info',
            element: null,
            help: `${scanType} scanning feature is coming soon`,
            tags: [scanType.toLowerCase()],
            elementPath: null,
            details: { scanType, implementationStatus: 'pending' }
          }],
          summary: { critical: 0, serious: 0, moderate: 0, minor: 0, info: 1, total: 1 }
        }
        analysisMethod = "placeholder"
      }
    } catch (error) {
      console.error(`Error in ${scanType} analysis:`, error)
      analysisError = error instanceof Error ? error.message : 'Unknown error'
      analysisResult = {
        results: [],
        summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 }
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

    // Function to determine category based on scan type and result
    const getScanCategory = (scanType: string, result: any): string => {
      if (scanType === 'Security') {
        // For security scans, use the category from the result or derive from tags/message
        if (result.category) return result.category
        const message = result.message?.toLowerCase() || ''
        const tags = result.tags || []
        
        if (message.includes('header') || tags.some((tag: string) => tag.includes('header'))) {
          return 'headers'
        } else if (message.includes('tls') || message.includes('ssl') || tags.some((tag: string) => tag.includes('tls') || tag.includes('ssl'))) {
          return 'tls'
        } else if (message.includes('csp') || tags.some((tag: string) => tag.includes('csp'))) {
          return 'csp'
        } else if (message.includes('cors') || tags.some((tag: string) => tag.includes('cors'))) {
          return 'cors'
        } else if (message.includes('xss') || tags.some((tag: string) => tag.includes('xss'))) {
          return 'xss'
        } else if (message.includes('auth') || tags.some((tag: string) => tag.includes('auth'))) {
          return 'auth'
        } else if (message.includes('owasp') || tags.some((tag: string) => tag.includes('owasp'))) {
          return 'owasp'
        } else {
          return 'general'
        }
      } else if (scanType === 'SEO') {
        const message = result.message?.toLowerCase() || ''
        if (message.includes('meta') || message.includes('title')) {
          return 'meta-tags'
        } else if (message.includes('structured') || message.includes('schema')) {
          return 'structured-data'
        } else if (message.includes('performance') || message.includes('speed')) {
          return 'performance'
        } else if (message.includes('content')) {
          return 'content'
        } else {
          return 'technical-seo'
        }
      } else if (scanType === 'Accessibility') {
        const tags = result.tags || []
        if (tags.some((tag: string) => tag.includes('wcag'))) {
          return 'wcag-compliance'
        } else if (tags.some((tag: string) => tag.includes('section508'))) {
          return 'section508'
        } else {
          return 'accessibility'
        }
      } else {
        return scanType.toLowerCase()
      }
    }

    // Start a transaction to ensure atomicity of results update
    await db.$transaction(async (tx) => {
      // Get project ID for this scan
      const currentScan = await tx.scan.findUnique({
        where: { id: scanId },
        select: { projectId: true }
      });

      if (!currentScan) {
        throw new Error(`Scan ${scanId} not found`);
      }

      const projectId = currentScan.projectId;
      const currentScanIssues = new Set<string>(); // Track issues found in current scan

      // Process each result for deduplication and resolution tracking
      if (analysisResult.results.length > 0) {
        for (const result of analysisResult.results) {
          const issueHash = generateIssueHash(
            result.url, 
            result.message, 
            result.element || null, 
            scanType
          );
          
          currentScanIssues.add(issueHash);

          // Check if this issue already exists
          const existingIssue = await findExistingIssue(projectId, issueHash, scanType);

          if (existingIssue) {
            // Issue already exists - update its occurrence count and last seen date
            await tx.scanResult.update({
              where: { id: existingIssue.id },
              data: {
                lastSeenAt: new Date(),
                occurrenceCount: existingIssue.occurrenceCount + 1,
                scanId: scanId, // Update to reference the latest scan
                                 // Update other fields in case they changed
                 severity: mapSeverity(result.severity),
                 impact: (result as any).impact || null,
                 help: result.help,
                tags: result.tags || [],
                elementPath: result.elementPath,
                details: result.details || {},
                category: getScanCategory(scanType, result),
                updatedAt: new Date()
              }
            });
          } else {
            // New issue - create it
            await tx.scanResult.create({
              data: {
                scanId,
                url: result.url,
                                 message: result.message,
                 element: result.element,
                 severity: mapSeverity(result.severity),
                 impact: (result as any).impact || null,
                 help: result.help,
                tags: result.tags || [],
                elementPath: result.elementPath,
                details: result.details || {},
                scanType: scanType as any,
                category: getScanCategory(scanType, result),
                issueHash: issueHash,
                firstSeenAt: new Date(),
                lastSeenAt: new Date(),
                occurrenceCount: 1,
                createdAt: new Date()
              }
            });
          }
        }
      }

      // Mark issues as resolved if they were found in previous scans but not in current scan
      if (isRescan) {
        const previousUnresolvedIssues = await tx.scanResult.findMany({
          where: {
            scan: {
              projectId: projectId
            },
            scanType: scanType as any,
            url: url, // Only for the same URL
            isResolved: false,
            scanId: { not: scanId } // Exclude current scan
          }
        });

        // Find issues that were not seen in the current scan
        const resolvedIssueIds = previousUnresolvedIssues
          .filter(issue => issue.issueHash && !currentScanIssues.has(issue.issueHash))
          .map(issue => issue.id);

        if (resolvedIssueIds.length > 0) {
          await tx.scanResult.updateMany({
            where: {
              id: { in: resolvedIssueIds }
            },
            data: {
              isResolved: true,
              resolvedAt: new Date(),
              resolvedInScanId: scanId,
              updatedAt: new Date()
            }
          });

          console.log(`Marked ${resolvedIssueIds.length} issues as resolved in scan ${scanId}`);
        }
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

      // Get project ID from scan for statistics update
      const scanForStats = await tx.scan.findUnique({
        where: { id: scanId },
        select: { projectId: true }
      })

      if (scanForStats) {
        // Calculate project statistics across ALL scans for this project
        const projectStats = await tx.scanResult.groupBy({
          by: ['severity'],
          where: { 
            scan: { 
              projectId: scanForStats.projectId,
              status: 'Completed' // Only count completed scans
            },
            isResolved: false // Only count unresolved issues
          },
          _count: true
        })

        const totalIssues = projectStats.reduce((sum, stat) => sum + stat._count, 0)
        const criticalIssues = projectStats.find(s => s.severity === 'Critical')?._count || 0
        const highIssues = projectStats.find(s => s.severity === 'High')?._count || 0
        const mediumIssues = projectStats.find(s => s.severity === 'Medium')?._count || 0
        const lowIssues = projectStats.find(s => s.severity === 'Low')?._count || 0

        console.log(`Updating project ${scanForStats.projectId} stats:`, {
          totalIssues,
          criticalIssues,
          highIssues,
          mediumIssues,
          lowIssues
        })

        // Update project with latest scan data
        await tx.project.update({
          where: { id: scanForStats.projectId },
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