"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ResultsTable } from "@/app/results/result-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import Link from "next/link"
import type { AccessibilityResult, AccessibilitySummary } from "@/lib/types"

interface Project {
    id: string
    name: string
    description?: string
    status: string
    lastScanAt?: string
    totalIssues: number
    criticalIssues: number
    urls?: Array<{ url: string }>
}

export default function ResultsPage() {
    const params = useParams()
    const projectId = params.id as string

    const [project, setProject] = useState<Project | null>(null)
    const [results, setResults] = useState<AccessibilityResult[]>([])
    const [summary, setSummary] = useState<AccessibilitySummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize] = useState(10)
    const [totalPages, setTotalPages] = useState(1)
    const [sortBy, setSortBy] = useState("severity")
    const [searchQuery, setSearchQuery] = useState("")
    const [severityFilters, setSeverityFilters] = useState<string[]>([])
    const [complianceFilters, setComplianceFilters] = useState<string[]>([])
    const [scanTypeFilters, setScanTypeFilters] = useState<string[]>([])
    const [categoryFilters, setCategoryFilters] = useState<string[]>([])

    const fetchProject = async () => {
        try {
            const response = await fetch(`/api/v1/projects/${projectId}`)
            if (!response.ok) {
                throw new Error("Failed to fetch project")
            }
            const data = await response.json()
            if (data.success) {
                setProject(data.project)
            } else {
                throw new Error(data.error || "Failed to fetch project")
            }
        } catch (err) {
            console.error("Error fetching project:", err)
            setError(err instanceof Error ? err.message : "Failed to fetch project")
        }
    }

    const fetchResults = async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams()
            params.set("page", page.toString())
            params.set("pageSize", pageSize.toString())
            params.set("sortBy", sortBy)
            if (searchQuery) params.set("search", searchQuery)
            if (severityFilters.length > 0) {
                severityFilters.forEach(filter => params.append("severityFilters", filter))
            }
            if (complianceFilters.length > 0) {
                complianceFilters.forEach(filter => params.append("complianceFilters", filter))
            }
            if (scanTypeFilters.length > 0) {
                scanTypeFilters.forEach(filter => params.append("scanTypeFilters", filter))
            }
            if (categoryFilters.length > 0) {
                categoryFilters.forEach(filter => params.append("categoryFilters", filter))
            }

            const response = await fetch(`/api/v1/results?projectId=${projectId}&${params.toString()}`)
            if (!response.ok) {
                throw new Error("Failed to fetch results")
            }

            const data = await response.json()
            setResults(data.results || [])
            setSummary(data.summary || null)
            setTotalPages(data.totalPages || 1)

        } catch (err) {
            console.error("Error fetching results:", err)
            setError(err instanceof Error ? err.message : "Failed to fetch results")
        } finally {
            setLoading(false)
        }
    }

    const handleRescan = async () => {
        if (!project) return

        try {
            setLoading(true)

            // Get project URLs first
            const urls = project.urls || []
            if (urls.length === 0) {
                throw new Error("No URLs found for this project")
            }

            // Start scans for each URL
            const scanPromises = urls.map(async (urlObj: any) => {
                const response = await fetch('/api/v1/scans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: projectId,
                        url: urlObj.url,
                        complianceOptions: { wcagLevel: 'aa' }
                    })
                })

                const data = await response.json()
                if (!response.ok) {
                    throw new Error(data.error || "Failed to start scan")
                }
                return data
            })

            await Promise.all(scanPromises)

            // Refresh the data
            await fetchProject()
            await fetchResults()

        } catch (err) {
            console.error("Error rescanning project:", err)
            setError(err instanceof Error ? err.message : "Failed to start rescan")
        }
    }

    useEffect(() => {
        if (projectId) {
            fetchProject()
        }
    }, [projectId])

    useEffect(() => {
        if (projectId) {
            fetchResults()
        }
    }, [projectId, page, pageSize, sortBy, searchQuery, severityFilters, complianceFilters, scanTypeFilters, categoryFilters])

    if (error && !project) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-red-600 mb-2">Error loading project</h3>
                        <p className="text-muted-foreground">{error}</p>
                        <Link href="/projects">
                            <Button className="mt-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Projects
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between -mt-6">

                <div className="flex flex-col gap-4">
                    <Link href="/projects" className="">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Projects
                        </Button>
                    </Link>
                    <div className="flex items-center gap-4">

                        <div>
                            <h1 className="text-3xl font-bold">{project?.name || "Loading..."}</h1>
                            <p className="text-muted-foreground">
                                {project?.description ||
                                    (project?.urls && project.urls.length > 0 ? `${project.urls.length} URLs configured` : "No description")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {project && (
                        <>
                            <Badge variant={project.status === "Active" ? "default" : project.status === "Scanning" ? "secondary" : "destructive"}>
                                {project.status}
                            </Badge>
                            <Button
                                onClick={handleRescan}
                                disabled={loading || project.status === "Scanning"}
                                variant="outline"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                {loading ? "Scanning..." : "Rescan"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Project Stats */}
            {project && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{project.totalIssues}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{project.criticalIssues}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">URLs Scanned</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{project.urls?.length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {project.totalIssues === 0 ? "100%" : `${Math.max(0, 100 - (project.totalIssues * 5))}%`}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Results Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Accessibility Results</CardTitle>
                    <CardDescription>
                        {summary ? `${summary.total} issues found across all scanned URLs` : "Loading results..."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResultsTable
                        results={results}
                        summary={summary}
                        loading={loading}
                        page={page}
                        pageSize={pageSize}
                        totalPages={totalPages}
                        sortBy={sortBy}
                        searchQuery={searchQuery}
                        severityFilters={severityFilters}
                        complianceFilters={complianceFilters}
                        scanTypeFilters={scanTypeFilters}
                        categoryFilters={categoryFilters}
                        projectId={projectId}
                        onPageChange={setPage}
                        onSortChange={setSortBy}
                        onSearchChange={setSearchQuery}
                        onSeverityFilterChange={setSeverityFilters}
                        onComplianceFilterChange={setComplianceFilters}
                        onScanTypeFilterChange={setScanTypeFilters}
                        onCategoryFilterChange={setCategoryFilters}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
