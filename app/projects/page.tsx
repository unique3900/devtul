"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Shield,
  Accessibility,
  Zap,
  Globe,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Settings,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const projects = [
    {
      id: 1,
      name: "E-commerce Website",
      url: "https://shop.example.com",
      description: "Main online store with payment processing",
      status: "active",
      lastScan: "2 hours ago",
      created: "2024-01-15",
      scores: {
        security: 95,
        seo: 88,
        accessibility: 92,
        performance: 87,
      },
      issues: 3,
      tags: ["production", "ecommerce"],
    },
    {
      id: 2,
      name: "Corporate Blog",
      url: "https://blog.company.com",
      description: "Company blog and news updates",
      status: "scanning",
      lastScan: "Running now",
      created: "2024-02-01",
      scores: {
        security: 98,
        seo: 94,
        accessibility: 89,
        performance: 91,
      },
      issues: 1,
      tags: ["blog", "content"],
    },
    {
      id: 3,
      name: "Landing Page",
      url: "https://landing.startup.com",
      description: "Product landing page for new users",
      status: "warning",
      lastScan: "1 day ago",
      created: "2024-01-28",
      scores: {
        security: 76,
        seo: 82,
        accessibility: 78,
        performance: 84,
      },
      issues: 8,
      tags: ["marketing", "landing"],
    },
    {
      id: 4,
      name: "API Documentation",
      url: "https://docs.api.com",
      description: "Developer documentation and API reference",
      status: "active",
      lastScan: "6 hours ago",
      created: "2024-02-10",
      scores: {
        security: 92,
        seo: 78,
        accessibility: 95,
        performance: 89,
      },
      issues: 2,
      tags: ["docs", "api"],
    },
    {
      id: 5,
      name: "Mobile App Landing",
      url: "https://app.mobile.com",
      description: "Mobile app download and feature showcase",
      status: "active",
      lastScan: "12 hours ago",
      created: "2024-01-20",
      scores: {
        security: 88,
        seo: 91,
        accessibility: 86,
        performance: 93,
      },
      issues: 4,
      tags: ["mobile", "app"],
    },
    {
      id: 6,
      name: "Admin Dashboard",
      url: "https://admin.internal.com",
      description: "Internal admin panel for team management",
      status: "active",
      lastScan: "3 hours ago",
      created: "2024-02-05",
      scores: {
        security: 97,
        seo: 45,
        accessibility: 91,
        performance: 85,
      },
      issues: 1,
      tags: ["internal", "admin"],
    },
  ]

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "scanning":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "scanning":
        return "bg-blue-100 text-blue-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage and monitor all your web projects</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <CardDescription className="text-sm">{project.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${project.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${project.id}/settings`}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span className="truncate">{project.url}</span>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                  {getStatusIcon(project.status)}
                  <span className="ml-1 capitalize">{project.status}</span>
                </Badge>
                <span className="text-xs text-muted-foreground">{project.lastScan}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-red-600" />
                    <span className="text-xs font-medium">Security</span>
                  </div>
                  <Progress value={project.scores.security} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">{project.scores.security}/100</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Search className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium">SEO</span>
                  </div>
                  <Progress value={project.scores.seo} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">{project.scores.seo}/100</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Accessibility className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium">A11y</span>
                  </div>
                  <Progress value={project.scores.accessibility} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">{project.scores.accessibility}/100</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs font-medium">Perf</span>
                  </div>
                  <Progress value={project.scores.performance} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">{project.scores.performance}/100</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Link href={`/projects/${project.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
                <Link href={`/projects/${project.id}/scan`}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Scan
                  </Button>
                </Link>
              </div>

              <div className="text-xs text-muted-foreground">
                {project.issues} issues • Created {new Date(project.created).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {searchQuery ? "No projects found matching your search." : "No projects yet."}
          </div>
          <Link href="/projects/new">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
