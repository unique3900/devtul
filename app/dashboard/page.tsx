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
} from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const projects = [
    {
      id: 1,
      name: "E-commerce Website",
      url: "https://shop.example.com",
      status: "active",
      lastScan: "2 hours ago",
      scores: {
        security: 95,
        seo: 88,
        accessibility: 92,
        performance: 87,
      },
      issues: 3,
    },
    {
      id: 2,
      name: "Corporate Blog",
      url: "https://blog.company.com",
      status: "scanning",
      lastScan: "Running now",
      scores: {
        security: 98,
        seo: 94,
        accessibility: 89,
        performance: 91,
      },
      issues: 1,
    },
    {
      id: 3,
      name: "Landing Page",
      url: "https://landing.startup.com",
      status: "warning",
      lastScan: "1 day ago",
      scores: {
        security: 76,
        seo: 82,
        accessibility: 78,
        performance: 84,
      },
      issues: 8,
    },
  ]

  const recentActivity = [
    {
      type: "security",
      message: "Security scan completed for E-commerce Website",
      time: "2 hours ago",
      status: "success",
    },
    {
      type: "accessibility",
      message: "WCAG compliance issues found in Corporate Blog",
      time: "4 hours ago",
      status: "warning",
    },
    {
      type: "seo",
      message: "SEO optimization suggestions available for Landing Page",
      time: "6 hours ago",
      status: "info",
    },
    {
      type: "performance",
      message: "Performance monitoring alert for E-commerce Website",
      time: "1 day ago",
      status: "error",
    },
  ]

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
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Scans</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Corporate Blog scanning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">-3 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">88</div>
            <p className="text-xs text-muted-foreground">+2.1% from last week</p>
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
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          project.status === "active"
                            ? "default"
                            : project.status === "scanning"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {project.status === "active" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {project.status === "scanning" && <Clock className="mr-1 h-3 w-3" />}
                        {project.status === "warning" && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{project.lastScan}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Security</span>
                      </div>
                      <Progress value={project.scores.security} className="h-2" />
                      <span className="text-sm text-muted-foreground">{project.scores.security}/100</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">SEO</span>
                      </div>
                      <Progress value={project.scores.seo} className="h-2" />
                      <span className="text-sm text-muted-foreground">{project.scores.seo}/100</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Accessibility className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">A11y</span>
                      </div>
                      <Progress value={project.scores.accessibility} className="h-2" />
                      <span className="text-sm text-muted-foreground">{project.scores.accessibility}/100</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">Perf</span>
                      </div>
                      <Progress value={project.scores.performance} className="h-2" />
                      <span className="text-sm text-muted-foreground">{project.scores.performance}/100</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{project.issues} issues found</span>
                    <div className="flex gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/projects/${project.id}/scan`}>
                        <Button size="sm">Run Scan</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      activity.status === "success"
                        ? "bg-green-100"
                        : activity.status === "warning"
                          ? "bg-yellow-100"
                          : activity.status === "error"
                            ? "bg-red-100"
                            : "bg-blue-100"
                    }`}
                  >
                    {activity.type === "security" && <Shield className="h-4 w-4 text-red-600" />}
                    {activity.type === "accessibility" && <Accessibility className="h-4 w-4 text-blue-600" />}
                    {activity.type === "seo" && <Search className="h-4 w-4 text-green-600" />}
                    {activity.type === "performance" && <Zap className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
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
