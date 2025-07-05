"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Search,
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
  ArrowUpDown,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "./ui/switch";
import { updateProjectStatus } from "@/app/actions/project";
import { AddUserModal } from "./add-user-modal";

interface Project {
  id: string;
  name: string;
  description?: string;
  category?: string;
  url: string;
  status: string;
  lastScan?: Date;
  nextScan?: Date;
  created: Date;
  scores: Record<string, number>;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  tags: Array<{ name: string; color?: string }>;
  enabledScans: string[];
  urlCount: number;
  scanCount: number;
}

interface ProjectsListProps {
  searchParams: {
    search?: string;
    sortBy?: 'name' | 'lastScan' | 'issues' | 'created';
    sortOrder?: 'asc' | 'desc';
    status?: string;
  };
}

export function ProjectsList({ searchParams }: ProjectsListProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Modal state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedProjectForUser, setSelectedProjectForUser] = useState<{id: string, name: string} | null>(null);

  // Local state for immediate UI feedback
  const [searchQuery, setSearchQuery] = useState(searchParams.search || "");
  const [sortBy, setSortBy] = useState(searchParams.sortBy || "name");
  const [sortOrder, setSortOrder] = useState(searchParams.sortOrder || "asc");
  const [statusFilter, setStatusFilter] = useState(searchParams.status || "all");

  // State for projects data
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/v1/projects?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch projects");
      }

      if (data.success) {
        setProjects(data.projects || []);
      } else {
        setError(data.error || "Failed to fetch projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects on mount and when filters change
  useEffect(() => {
    fetchProjects();
  }, [searchQuery, sortBy, sortOrder, statusFilter]);

  // Delete project function
  const deleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete project");
      }

      if (data.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        throw new Error(data.error || "Failed to delete project");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      alert(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set("search", searchQuery);
    if (sortBy !== "name") params.set("sortBy", sortBy);
    if (sortOrder !== "asc") params.set("sortOrder", sortOrder);
    if (statusFilter !== "all") params.set("status", statusFilter);

    startTransition(() => {
      router.push(`/projects?${params.toString()}`);
    });
  }, [searchQuery, sortBy, sortOrder, statusFilter, router]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "scanning":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "scanning":
        return "bg-blue-100 text-blue-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScanTypeIcon = (scanType: string) => {
    switch (scanType.toLowerCase()) {
      case "security":
        return <Shield className="h-3 w-3" />;
      case "accessibility":
        return <Accessibility className="h-3 w-3" />;
      case "performance":
        return <Zap className="h-3 w-3" />;
      case "seo":
        return <Globe className="h-3 w-3" />;
      default:
        return <CheckCircle className="h-3 w-3" />;
    }
  };

  const formatLastScan = (lastScan?: Date) => {
    if (!lastScan) return "Never";
    return formatDistanceToNow(new Date(lastScan), { addSuffix: true });
  };

  const handleAddUserClick = (project: Project) => {
    setSelectedProjectForUser({ id: project.id, name: project.name });
    setIsAddUserModalOpen(true);
  };

  const handleAddUserClose = () => {
    setIsAddUserModalOpen(false);
    setSelectedProjectForUser(null);
  };

  const handleAddUserSuccess = () => {
    setIsAddUserModalOpen(false);
    setSelectedProjectForUser(null);
    fetchProjects();
  };

  return (
    <div className="space-y-6">
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Scanning">Scanning</SelectItem>
            <SelectItem value="Warning">Warning</SelectItem>
            <SelectItem value="Error">Error</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("asc"); }}>
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("desc"); }}>
              Name (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy("lastScan"); setSortOrder("desc"); }}>
              Last Scan (Recent)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy("lastScan"); setSortOrder("asc"); }}>
              Last Scan (Oldest)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy("issues"); setSortOrder("desc"); }}>
              Most Issues
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy("issues"); setSortOrder("asc"); }}>
              Least Issues
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy("created"); setSortOrder("desc"); }}>
              Recently Created
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy("created"); setSortOrder("asc"); }}>
              Oldest Created
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading projects...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-red-600">Error loading projects</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchProjects} className="mt-4">
            Try Again
          </Button>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && !error && (
        <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${isPending ? "opacity-50" : ""}`}>
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="w-full flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Switch 
                        variant="gradient" 
                        className="w-10 h-6" 
                        size={"sm"} 
                        checked={project.status === "Active"} 
                        onCheckedChange={async (checked) => {
                          const result = await updateProjectStatus(project.id, checked ? "Active" : "Paused");
                          if(result.success){
                            fetchProjects();
                          }
                        }} 
                      />
                    </div>
                    <CardDescription className="text-sm">
                      {project.description || project.url}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleAddUserClick(project)}
                      title="Add user to project"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteProject(project.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status and Last Scan */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(project.status)}
                    <Badge variant="secondary" className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatLastScan(project.lastScan)}
                  </span>
                </div>

                {/* Scores */}
                {Object.keys(project.scores).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(project.scores).slice(0, 2).map(([type, score]) => (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{type}</span>
                          <span>{score}%</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Issues */}
                {project.totalIssues > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>{project.totalIssues} issue{project.totalIssues !== 1 ? 's' : ''}</span>
                    {project.criticalIssues > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {project.criticalIssues} critical
                      </Badge>
                    )}
                  </div>
                )}

                {/* Tags and Enabled Scans */}
                <div className="space-y-2">
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag.name} variant="outline" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                      {project.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {project.enabledScans.length > 0 && (
                    <div className="flex items-center gap-1">
                      {project.enabledScans.slice(0, 4).map((scanType) => (
                        <div
                          key={scanType}
                          className="flex items-center justify-center w-6 h-6 rounded bg-muted text-muted-foreground"
                          title={scanType}
                        >
                          {getScanTypeIcon(scanType)}
                        </div>
                      ))}
                      {project.enabledScans.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{project.enabledScans.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                  <span>{project.urlCount} URL{project.urlCount !== 1 ? 's' : ''}</span>
                  <span>{project.scanCount} scan{project.scanCount !== 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-12">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by creating your first project"}
          </p>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={handleAddUserClose}
        onSuccess={handleAddUserSuccess}
        projectId={selectedProjectForUser?.id}
        projectName={selectedProjectForUser?.name}
      />
    </div>
  );
} 