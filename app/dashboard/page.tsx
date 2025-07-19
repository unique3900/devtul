"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Search,
  Accessibility,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  BarChart3,
  Globe,
  Users,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"

interface DashboardStats {
  overview: {
    totalProjects: number
    totalScans: number
    totalIssues: number
    criticalIssues: number
    seriousIssues: number
    moderateIssues: number
    minorIssues: number
    totalEstimatedTime: string
    averageIssuesPerProject: number
    lastScanDate: string | null
  }
  projects: Array<{
    id: string
    name: string
    totalIssues: number
    criticalIssues: number
    seriousIssues: number
    moderateIssues: number
    minorIssues: number
    estimatedTime: string
    lastScan: string | null
  }>
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  lastScanAt?: string
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  scores?: Record<string, number>
  urls?: Array<{ url: string }>
  urlCount: number
}

interface RecentActivity {
  id: string
  message: string
  title: string
  type: string
  color: string
  icon: string
  priority: string
  category: string
  createdAt: string
  projectId?: string
  userId?: string
  metadata?: any
  project?: {
    name: string
  }
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  // Enhanced fields from API
  projectName?: string
  userDisplayName?: string
  organizationName?: string
  isGlobal?: boolean
  notificationRules?: any
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/v1/stats')
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      const statsData = await statsResponse.json()
      setStats(statsData)

      // Fetch projects
      const projectsResponse = await fetch('/api/v1/projects')
      
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects')
      }
      const projectsData = await projectsResponse.json()
      console.log(projectsData)
      if (projectsData.success) {
        setProjects(projectsData.projects || [])
      }

      // Fetch recent activity
      try {
        const activityResponse = await fetch('/api/v1/recent-activities?limit=10')
        if (activityResponse.ok) {
          const activityData = await activityResponse.json()
          if (activityData.success) {
            setRecentActivity(activityData.activities || [])
          }
        }
      } catch (err) {
        // Recent activity is optional, don't fail if it's not available
        console.warn('Failed to fetch recent activity:', err)
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error loading dashboard</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <CheckCircle className="mr-1 h-3 w-3" />
      case "scanning":
        return <Clock className="mr-1 h-3 w-3" />
      case "warning":
        return <AlertTriangle className="mr-1 h-3 w-3" />
      default:
        return <CheckCircle className="mr-1 h-3 w-3" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "default"
      case "scanning":
        return "secondary"
      case "warning":
        return "destructive"
      default:
        return "default"
    }
  }

  const formatLastScan = (lastScan?: string) => {
    if (!lastScan) return "Never"
    try {
      return formatDistanceToNow(new Date(lastScan), { addSuffix: true })
    } catch {
      return "Unknown"
    }
  }

  const getActivityIcon = (iconName: string, type: string) => {
    // Use the icon name from the database if available
    const iconMap: Record<string, React.ReactElement> = {
      'FolderPlus': <Plus className="h-4 w-4" />,
      'FolderEdit': <Globe className="h-4 w-4" />,
      'FolderMinus': <Globe className="h-4 w-4" />,
      'PlayCircle': <Clock className="h-4 w-4" />,
      'CheckCircle': <CheckCircle className="h-4 w-4" />,
      'XCircle': <AlertTriangle className="h-4 w-4" />,
      'UserPlus': <Users className="h-4 w-4" />,
      'UserMinus': <Users className="h-4 w-4" />,
      'Mail': <Globe className="h-4 w-4" />,
      'Shield': <Shield className="h-4 w-4" />,
      'Accessibility': <Accessibility className="h-4 w-4" />,
      'Search': <Search className="h-4 w-4" />,
      'Settings': <Globe className="h-4 w-4" />,
      'Download': <Globe className="h-4 w-4" />,
      'Upload': <Globe className="h-4 w-4" />
    }

    // Return icon by name if available, otherwise fall back to type-based icons
    if (iconName && iconMap[iconName]) {
      return iconMap[iconName]
    }

    // Fallback to type-based icons
    switch (type.toLowerCase()) {
      case "security":
      case "securityissuefound":
        return <Shield className="h-4 w-4 text-red-600" />
      case "accessibility":
      case "accessibilityissuefound":
        return <Accessibility className="h-4 w-4 text-blue-600" />
      case "seo":
      case "seoissuefound":
        return <Search className="h-4 w-4 text-green-600" />
      case "performance":
        return <Zap className="h-4 w-4 text-yellow-600" />
      case "project":
      case "projectcreated":
      case "projectupdated":
        return <Plus className="h-4 w-4 text-blue-600" />
      case "scan":
      case "scanstarted":
      case "scancompleted":
        return <Clock className="h-4 w-4 text-green-600" />
      case "scanfailed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "user":
      case "useradded":
      case "userinvited":
        return <Users className="h-4 w-4 text-blue-600" />
      default:
        return <Globe className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityBgColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100"
      case "medium":
        return "bg-yellow-100"
      case "low":
        return "bg-green-100"
      default:
        return "bg-blue-100"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Monitor and optimize your web projects</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.overview.lastScanDate ? formatLastScan(stats.overview.lastScanDate) : "No recent scans"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalScans || 0}</div>
            <p className="text-xs text-muted-foreground">
              {projects.filter(p => p.status === "Scanning").length} currently scanning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalIssues || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.overview.criticalIssues || 0} critical issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Issues</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats?.overview.averageIssuesPerProject || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Est. fix time: {stats?.overview.totalEstimatedTime || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Projects</CardTitle>
              <CardDescription>Monitor the health and performance of your web projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by creating your first project</p>
                  <Link href="/projects/new">
                    <Button>Create Project</Button>
                  </Link>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 space-y-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => window.location.href = `/results/${project.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {project.description || (project.urls && project.urls.length > 0 ? project.urls[0].url : "No URLs configured")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(project.status)}>
                          {getStatusIcon(project.status)}
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{formatLastScan(project.lastScanAt)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Critical</span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">{project.criticalIssues}</div>
                        <span className="text-sm text-muted-foreground">Critical issues</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">High</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">{project.highIssues || 0}</div>
                        <span className="text-sm text-muted-foreground">High issues</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">URLs</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{project.urlCount || 0}</div>
                        <span className="text-sm text-muted-foreground">URLs configured</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Health</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {project.totalIssues === 0 ? "100%" : `${Math.max(0, 100 - (project.totalIssues * 5))}%`}
                        </div>
                        <span className="text-sm text-muted-foreground">Overall health</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{project.totalIssues} issues found</span>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/results/${project.id}`}>
                          <Button variant="outline" size="sm">
                            View Results
                          </Button>
                        </Link>
                        <Link href={`/projects/${project.id}/edit`}>
                          <Button size="sm">Edit Project</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your projects and scans</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No recent activity</h3>
                  <p className="text-muted-foreground">Activity will appear here once you start scanning projects</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div 
                      key={activity.id || index} 
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
                        activity.priority === 'Critical' || activity.priority === 'High' ? 'border-l-4 border-l-red-500' :
                        activity.priority === 'Medium' ? 'border-l-4 border-l-yellow-500' :
                        'border-l-4 border-l-blue-500'
                      }`}
                    >
                      <div 
                        className={`p-2 rounded-full ${getActivityBgColor(activity.priority)}`}
                        style={{ backgroundColor: activity.color }}
                      >
                        {getActivityIcon(activity.icon, activity.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              activity.priority === 'Critical' ? 'border-red-500 text-red-700 bg-red-50' :
                              activity.priority === 'High' ? 'border-orange-500 text-orange-700 bg-orange-50' :
                              activity.priority === 'Medium' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                              'border-blue-500 text-blue-700 bg-blue-50'
                            }`}
                          >
                            {activity.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatLastScan(activity.createdAt)}</span>
                          {activity.projectName && (
                            <>
                              <span>•</span>
                              <span className="font-medium">{activity.projectName}</span>
                            </>
                          )}
                          {activity.userDisplayName && (
                            <>
                              <span>•</span>
                              <span>by {activity.userDisplayName}</span>
                            </>
                          )}
                          {activity.category && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                {activity.category}
                              </Badge>
                            </>
                          )}
                        </div>
                        {activity.metadata && (activity.metadata.issueCount || activity.metadata.severity) && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {activity.metadata.issueCount && (
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                {activity.metadata.issueCount} issues found
                              </span>
                            )}
                            {activity.metadata.severity && (
                              <span className={`ml-2 px-2 py-1 rounded ${
                                activity.metadata.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                                activity.metadata.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {activity.metadata.severity} severity
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {recentActivity.length >= 10 && (
                    <div className="text-center pt-4">
                      <Link href="/workspace/activity">
                        <Button variant="outline" size="sm">
                          View All Activities
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/projects/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Project
                </Button>
              </Link>
              <Link href="/tools/security">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Run Security Scan
                </Button>
              </Link>
              <Link href="/workspace/team">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Invite Team Members
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
