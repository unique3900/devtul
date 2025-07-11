"use server"

import { revalidatePath } from "next/cache"
import type { ComplianceOptions, AccessibilityResult, AccessibilitySummary } from "@/lib/types"
import { analyzeAccessibility as simpleAnalyze } from "@/lib/simple-checker"    
import { analyzeAccessibility as playwrightAnalyze } from "@/lib/playwright-axes"
import * as ExcelJS from 'exceljs'
import * as fs from 'fs/promises'
import * as path from 'path'

// Remove the local interface definitions since we're importing them from @/lib/types

// Helper function to map severity values
function mapSeverityToSummary(severity: string): keyof Pick<AccessibilitySummary, 'critical' | 'serious' | 'moderate' | 'minor'> {
  switch (severity) {
    case 'Critical':
      return 'critical'
    case 'High':
      return 'serious'
    case 'Medium':
      return 'moderate'
    case 'Low':
    case 'Info':
      return 'minor'
    default:
      return 'minor'
  }
}

interface ScanResultData {
  url: string
  results: AccessibilityResult[]
  summary: AccessibilitySummary
}

interface ResultsQueryParams {
  page: number
  pageSize: number
  sortBy: string
  search: string
  severityFilters?: string[]
  complianceFilters?: string[]
  scanTypeFilters?: string[]
  categoryFilters?: string[]
}

// In-memory storage for results
let scanResults: ScanResultData[] = []
let screenshotPaths: string[] = [];

export async function addUrlsForAnalysis(
  urls: string[],
  complianceOptions: ComplianceOptions = {
    wcagLevel: "aa",
    section508: false,
    bestPractices: true,
    experimental: false,
    captureScreenshots: true,
  },
): Promise<{ success: boolean; count: number; errors?: string[] }> {
  try {
    const validUrls = urls.filter((url) => {
      try {
        new URL(url)
        return true
      } catch (e) {
        return false
      }
    })

    if (validUrls.length === 0) {
      throw new Error("No valid URLs provided")
    }

    scanResults = []
    screenshotPaths = []
    
    const errors: string[] = []

    for (const url of validUrls) {
      try {
        let simpleResults;
        try {
          simpleResults = await simpleAnalyze(url, complianceOptions)
        } catch (simpleError) {
          console.error(`Error in simple analysis for ${url}:`, simpleError)
          simpleResults = { results: [], summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0, urlsAnalyzed: 0 } }
        }
        
        // Try playwright analysis
        let playwrightResults;
        try {
          playwrightResults = await playwrightAnalyze(url, complianceOptions)
          
          // Store screenshots if any were captured
          if (playwrightResults.screenshots) {
            screenshotPaths = [...screenshotPaths, ...playwrightResults.screenshots]
          }
        } catch (playwrightError) {
          console.error(`Error in Playwright analysis for ${url}:`, playwrightError)
          errors.push(`Failed to analyze ${url} with Playwright: ${playwrightError instanceof Error ? playwrightError.message : String(playwrightError)}`)
          playwrightResults = { results: [], summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0, urlsAnalyzed: 0 } }
        }
        
        const combinedResultsMap = new Map<string, AccessibilityResult>()
        
        simpleResults.results.forEach(result => {
          combinedResultsMap.set(result.id, result)
        })
        
        // Add playwright results to map, potentially overwriting simple results with more detailed ones
        playwrightResults.results.forEach(result => {
          combinedResultsMap.set(result.id, result)
        })
        
        const combinedResults = Array.from(combinedResultsMap.values())
        
        const summary: AccessibilitySummary = {
          critical: combinedResults.filter((r) => r.severity === "Critical").length,
          serious: combinedResults.filter((r) => r.severity === "High").length,
          moderate: combinedResults.filter((r) => r.severity === "Medium").length,
          minor: combinedResults.filter((r) => r.severity === "Low" || r.severity === "Info").length,
          total: combinedResults.length,
        }

        // Store results in memory
        scanResults.push({
          url,
          results: combinedResults,
          summary,
        })
      } catch (error) {
        console.error(`Error analyzing ${url}:`, error)
        errors.push(`Failed to analyze ${url}: ${error instanceof Error ? error.message : String(error)}`)
        // Continue with other URLs even if one fails
      }
    }

    revalidatePath("/")
    return { 
      success: true, 
      count: validUrls.length,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error("Error adding URLs for analysis:", error)
    throw new Error(`Failed to add URLs for analysis: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getAccessibilityResults(params: ResultsQueryParams) {
  const { page, pageSize, sortBy, search, severityFilters, complianceFilters } = params
  const skip = (page - 1) * pageSize

  try {
    let allResults: AccessibilityResult[] = []
    scanResults.forEach((scan) => {
      allResults = [...allResults, ...scan.results]
    })

    // Apply search filter if selected
    let filteredResults = allResults
    if (search) {
      const searchLower = search.toLowerCase()
      filteredResults = allResults.filter(
        (result) =>
          result.url.toLowerCase().includes(searchLower) ||
          result.message.toLowerCase().includes(searchLower) ||
          (result.help && result.help.toLowerCase().includes(searchLower)) ||
          (result.element && result.element.toLowerCase().includes(searchLower)) ||
          (result.elementPath && result.elementPath.toLowerCase().includes(searchLower)) ||
          (result.details && JSON.stringify(result.details).toLowerCase().includes(searchLower)),
      )
    }

    // Apply severity filters if selected
    if (severityFilters && severityFilters.length > 0) {
      filteredResults = filteredResults.filter(result => {
        const mappedSeverity = mapSeverityToSummary(result.severity)
        return severityFilters.includes(mappedSeverity)
      })
    }

    // Apply compliance filters if provided
    if (complianceFilters && complianceFilters.length > 0) {
      filteredResults = filteredResults.filter(result => 
        result.tags && result.tags.some((tag: string) => complianceFilters.includes(tag))
      )
    }

    //  sorting
    const sortedResults = [...filteredResults].sort((a, b) => {
      switch (sortBy) {
        case "severity":
          // Custom severity order: Critical > High > Medium > Low/Info
          const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 }
          return (
            (severityOrder[a.severity as keyof typeof severityOrder] || 5) -
            (severityOrder[b.severity as keyof typeof severityOrder] || 5)
          )
        case "url":
          return a.url.localeCompare(b.url)
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    // Apply pagination
    const paginatedResults = sortedResults.slice(skip, skip + pageSize)

    // Calculate summary
    const summary: AccessibilitySummary = {
      critical: filteredResults.filter((r) => r.severity === "Critical").length,
      serious: filteredResults.filter((r) => r.severity === "High").length,
      moderate: filteredResults.filter((r) => r.severity === "Medium").length,
      minor: filteredResults.filter((r) => r.severity === "Low" || r.severity === "Info").length,
      total: filteredResults.length,
    }

    return {
      results: paginatedResults,
      total: filteredResults.length,
      summary,
    }
  } catch (error) {
    console.error("Error fetching accessibility results:", error)
    throw new Error(`Failed to fetch accessibility results: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function exportToExcel(params?: {
  search?: string;
  sortBy?: string;
  severityFilters?: string[];
  complianceFilters?: string[];
  exportAll?: boolean;
}) {
  try {
    console.log('Export params:', params);
    console.log('Original scan results count:', scanResults.length);
    
    // Check if we have any scan results
    if (scanResults.length === 0) {
      throw new Error('No accessibility scan results available. Please scan some URLs first.');
    }
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Accessibility Checker';
    workbook.created = new Date();
    
    // Create a worksheet for the summary
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Add summary headers
    summarySheet.columns = [
      { header: 'URL', key: 'url', width: 50 },
      { header: 'Critical Issues', key: 'critical', width: 15 },
      { header: 'Serious Issues', key: 'serious', width: 15 },
      { header: 'Moderate Issues', key: 'moderate', width: 15 },
      { header: 'Minor Issues', key: 'minor', width: 15 },
      { header: 'Total Issues', key: 'total', width: 15 },
    ];
    
    // Filter the scan results if necessary
    let filteredScanResults = [...scanResults];
    
    // Apply URL/element search filter
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredScanResults = filteredScanResults.filter(result => 
        result.url.toLowerCase().includes(searchLower)
      );
    }
    
    console.log('Filtered scan results count:', filteredScanResults.length);
    
    // Add summary data
    filteredScanResults.forEach(result => {
      summarySheet.addRow({
        url: result.url,
        critical: result.summary.critical,
        serious: result.summary.serious,
        moderate: result.summary.moderate,
        minor: result.summary.minor,
        total: result.summary.total,
      });
    });
    
    // Style the header row
    const headerRow = summarySheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Create a worksheet for detailed results
    const detailsSheet = workbook.addWorksheet('Detailed Results');
    
    // Add details headers
    detailsSheet.columns = [
      { header: 'URL', key: 'url', width: 40 },
      { header: 'Issue ID', key: 'id', width: 20 },
      { header: 'Message', key: 'message', width: 40 },
      { header: 'Help Text', key: 'help', width: 40 },
      { header: 'Element', key: 'element', width: 50 },
      { header: 'Element Path', key: 'elementPath', width: 50 },
      { header: 'Severity', key: 'severity', width: 15 },
      { header: 'Impact', key: 'impact', width: 15 },
      { header: 'Tags', key: 'tags', width: 30 },
      { header: 'Screenshot', key: 'screenshot', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    
    // Get all results and apply filters
    let allResults: AccessibilityResult[] = [];
    
    filteredScanResults.forEach(scan => {
      // Get results from this scan
      let scanResultsList = [...scan.results];
      console.log(`Scan URL: ${scan.url}, Results count before filtering: ${scanResultsList.length}`);
      
      // Apply severity filters
      if (params?.severityFilters && params.severityFilters.length > 0) {
        scanResultsList = scanResultsList.filter(result => 
          params.severityFilters!.includes(result.severity.toLowerCase())
        );
        console.log('After severity filters:', scanResultsList.length);
      }
      
      // Apply compliance filters
      if (params?.complianceFilters && params.complianceFilters.length > 0) {
        scanResultsList = scanResultsList.filter(result => 
          result.tags && result.tags.some((tag: string) => 
            params.complianceFilters!.some(filter => tag.includes(filter))
          )
        );
        console.log('After compliance filters:', scanResultsList.length);
      }
      
      // Apply search filter to individual results
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        scanResultsList = scanResultsList.filter(result => 
          result.message.toLowerCase().includes(searchLower) ||
          (result.element && result.element.toLowerCase().includes(searchLower)) ||
          (result.help && result.help.toLowerCase().includes(searchLower))
        );
        console.log('After search filter:', scanResultsList.length);
      }
      
      allResults.push(...scanResultsList);
    });
    
    console.log('Total results count after all filtering:', allResults.length);
    
    // Sort results if necessary
    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'severity':
          // Define severity order: critical > serious > moderate > minor
          const severityOrder = { critical: 4, serious: 3, moderate: 2, minor: 1 };
          allResults.sort((a, b) => 
            (severityOrder[b.severity.toLowerCase() as keyof typeof severityOrder] || 0) - 
            (severityOrder[a.severity.toLowerCase() as keyof typeof severityOrder] || 0)
          );
          break;
        case 'url':
          allResults.sort((a, b) => a.url.localeCompare(b.url));
          break;
        case 'date':
          allResults.sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          break;
      }
    }
    
    // Add all filtered results to the sheet
    allResults.forEach(result => {
      detailsSheet.addRow({
        url: result.url,
        id: result.id,
        message: result.message,
        help: result.help || 'N/A',
        element: result.element && result.element.length > 500 ? result.element.substring(0, 500) + '...' : result.element || 'N/A',
        elementPath: result.elementPath || 'N/A',
        severity: result.severity,
        impact: result.impact,
        tags: result.tags ? result.tags.join(', ') : 'N/A',
        screenshot: result.screenshotPath || 'N/A',
        createdAt: result.createdAt,
      });
    });
    
    // Style the header row
    const detailsHeaderRow = detailsSheet.getRow(1);
    detailsHeaderRow.font = { bold: true };
    detailsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Create a directory for exports if it doesn't exist
    const exportDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    // Save the workbook
    const filename = `accessibility-report-${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, filename);
    await workbook.xlsx.writeFile(filePath);
    console.log('Excel file saved successfully at:', filePath);
    
    return { 
      success: true, 
      filePath,
      filename
    }
  } catch (error) {
    console.error("Error exporting to Excel:", error)
    throw new Error(`Failed to export results to Excel: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Function to get screenshot paths for a specific issue
export async function getScreenshotForIssue(issueId: string) {
  try {
    // Flatten all results from all URLs
    let allResults: AccessibilityResult[] = []
    scanResults.forEach((scan) => {
      allResults = [...allResults, ...scan.results]
    })
    
    // Find the issue
    const issue = allResults.find(result => result.id === issueId);
    
    if (!issue || !issue.screenshotPath) {
      return { success: false, message: 'No screenshot available for this issue' };
    }
    
    // Check if the file exists
    try {
      await fs.access(issue.screenshotPath);
      return { 
        success: true, 
        screenshotPath: issue.screenshotPath,
        filename: path.basename(issue.screenshotPath)
      };
    } catch {
      return { success: false, message: 'Screenshot file not found' };
    }
  } catch (error) {
    console.error("Error getting screenshot:", error);
    return { success: false, message: 'Error retrieving screenshot' };
  }
}

// Function to get all screenshots
export async function getAllScreenshots() {
  return {
    success: true,
    screenshots: screenshotPaths
  };
}

export async function addUrlsForSimpleAnalysisOnly(
  urls: string[],
  complianceOptions: ComplianceOptions = {
    wcagLevel: "aa",
    section508: false,
    bestPractices: true,
    experimental: false,
    captureScreenshots: false,
  },
): Promise<{ success: boolean; count: number }> {
  try {
    // Validate URLs
    const validUrls = urls.filter((url) => {
      try {
        new URL(url)
        return true
      } catch (e) {
        return false
      }
    })

    if (validUrls.length === 0) {
      throw new Error("No valid URLs provided")
    }

    // Clear previous results
    scanResults = []
    screenshotPaths = []

    // Analyze each URL
    for (const url of validUrls) {
      try {
        // Perform simple regex-based scan only
        const simpleResults = await simpleAnalyze(url, complianceOptions)
        
        // Store results in memory
        scanResults.push({
          url,
          results: simpleResults.results,
          summary: simpleResults.summary,
        })
      } catch (error) {
        console.error(`Error analyzing ${url}:`, error)
        // Continue with other URLs even if one fails
      }
    }

    revalidatePath("/")
    return { success: true, count: validUrls.length }
  } catch (error) {
    console.error("Error adding URLs for analysis:", error)
    throw new Error(`Failed to add URLs for analysis: ${error instanceof Error ? error.message : String(error)}`)
  }
}
