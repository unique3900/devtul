import { NextResponse } from 'next/server'
import db from "@/db"

// Function to calculate estimated fix time based on issue count and severity
function calculateEstimatedTime(
  critical: number,
  serious: number,
  moderate: number,
  minor: number
): string {
  // More realistic time estimates in minutes by severity
  const timeInMinutes = 
    critical * 30 +   // 30 minutes each (reduced from 2 hours)
    serious * 20 +    // 20 minutes each (reduced from 1.5 hours)
    moderate * 10 +   // 10 minutes each (reduced from 45 minutes)
    minor * 5         // 5 minutes each (reduced from 15 minutes)
  
  // Convert to readable format
  if (timeInMinutes < 60) {
    return `${Math.round(timeInMinutes)}m`
  } else if (timeInMinutes < 480) { // Less than 8 hours
    const hours = Math.floor(timeInMinutes / 60)
    const minutes = Math.round(timeInMinutes % 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  } else {
    const days = Math.floor(timeInMinutes / 480) // 8 hours per day
    const remainingHours = Math.floor((timeInMinutes % 480) / 60)
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
}

export async function GET() {
  try {
    // Get all projects with their scans and results
    const projects = await db.project.findMany({
      include: {
        urls: true,
        scans: {
          where: {
            status: { in: ['Completed'] }
          },
          include: {
            results: true
          },
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    })

    // Calculate project-specific stats
    const projectStats = projects.map(project => {
      const latestScan = project.scans[0]
      const allScans = project.scans
      
      // Aggregate issues across all scans for this project
      let totalIssues = 0
      let criticalIssues = 0
      let seriousIssues = 0
      let moderateIssues = 0
      let minorIssues = 0
      
      allScans.forEach(scan => {
        scan.results.forEach(result => {
          totalIssues++
          switch (result.severity) {
            case 'Critical':
              criticalIssues++
              break
            case 'High':
              seriousIssues++
              break
            case 'Medium':
              moderateIssues++
              break
            case 'Low':
              minorIssues++
              break
          }
        })
      })
      
      return {
        id: project.id,
        name: project.name,
        totalIssues,
        criticalIssues,
        seriousIssues,
        moderateIssues,
        minorIssues,
        estimatedTime: calculateEstimatedTime(criticalIssues, seriousIssues, moderateIssues, minorIssues),
        lastScan: latestScan?.startedAt || null
      }
    })

    // Get all completed scans with their results for overall stats
    const allScans = projects.flatMap(p => p.scans)

    // Calculate total issues by severity across all scans
    let totalIssues = 0
    let criticalIssues = 0
    let seriousIssues = 0
    let moderateIssues = 0
    let minorIssues = 0

    allScans.forEach(scan => {
      scan.results.forEach(result => {
        totalIssues++
        switch (result.severity) {
          case 'Critical':
            criticalIssues++
            break
          case 'High':
            seriousIssues++
            break
          case 'Medium':
            moderateIssues++
            break
          case 'Low':
            minorIssues++
            break
        }
      })
    })

    // Get project counts
    const totalProjects = projects.length
    const totalScans = allScans.length

    // Calculate average issues per project
    const averageIssuesPerProject = totalProjects > 0 ? totalIssues / totalProjects : 0

    // Calculate total estimated fix time
    const totalEstimatedTime = calculateEstimatedTime(criticalIssues, seriousIssues, moderateIssues, minorIssues)

    // Get last scan date
    const lastScan = allScans.length > 0 ? allScans.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0] : null

    const response = {
      overview: {
        totalProjects,
        totalScans,
        totalIssues,
        criticalIssues,
        seriousIssues,
        moderateIssues,
        minorIssues,
        totalEstimatedTime,
        averageIssuesPerProject,
        lastScanDate: lastScan?.startedAt || null
      },
      projects: projectStats,
      // Legacy format for backward compatibility
      totalProjects,
      totalScans,
      totalIssues,
      criticalIssues,
      seriousIssues,
      moderateIssues,
      minorIssues,
      totalEstimatedTime,
      averageIssuesPerProject,
      lastScanDate: lastScan?.startedAt || null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

 