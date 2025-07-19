"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { X, Plus, Upload, Shield, Search, Accessibility, Zap, Globe } from "lucide-react";
import { projectCreateSchema } from "@/app/actions/project/schema";
import { updateProject } from "@/app/actions/project";
import type { ProjectFormData } from "@/app/actions/project/types";

interface EditProjectFormProps {
  projectId: string;
}

export function EditProjectForm({ projectId }: EditProjectFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [additionalUrls, setAdditionalUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      url: "",
      scanFrequency: "Weekly",
      enabledTools: {
        security: false,
        seo: false,
        accessibility: false,
        performance: false,
        uptime: false,
        ssl: false,
      },
      tags: [],
      additionalUrls: [],
    },
  });

  // Load existing project data
  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoadingProject(true);
        const response = await fetch(`/api/v1/projects/${projectId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load project");
        }

        if (data.success && data.project) {
          const project = data.project;
          
          // Set form values
          reset({
            name: project.name || "",
            description: project.description || "",
            category: project.category || "",
            url: project.url || "",
            scanFrequency: project.scanFrequency || "Weekly",
            enabledTools: project.enabledTools || {
              security: false,
              seo: false,
              accessibility: false,
              performance: false,
              uptime: false,
              ssl: false,
            },
            tags: project.tags?.map((tag: any) => tag.name) || [],
            additionalUrls: project.urls?.filter((url: any) => url.url !== project.url).map((url: any) => url.url) || [],
          });

          // Set local state
          setTags(project.tags?.map((tag: any) => tag.name) || []);
          setAdditionalUrls(project.urls?.filter((url: any) => url.url !== project.url).map((url: any) => url.url) || []);
        } else {
          throw new Error(data.error || "Failed to load project");
        }
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load project");
        router.push("/projects");
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProject();
  }, [projectId, reset, router]);

  const enabledTools = watch("enabledTools");

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setIsLoading(true);
      
      const formData = {
        ...data,
        tags,
        additionalUrls,
      };

      const result = await updateProject(projectId, formData);

      if (result.success) {
        toast.success("Project updated successfully!");
        router.push("/projects");
      } else {
        toast.error(result.error || "Failed to update project");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setIsLoading(false);
    }
  };

  const addUrl = () => {
    if (newUrl.trim()) {
      try {
        new URL(newUrl);
        setAdditionalUrls([...additionalUrls, newUrl.trim()]);
        setNewUrl("");
      } catch {
        toast.error("Please enter a valid URL");
      }
    }
  };

  const removeUrl = (index: number) => {
    setAdditionalUrls(additionalUrls.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const importFromSitemap = async () => {
    if (!sitemapUrl.trim()) {
      toast.error("Please enter a sitemap URL");
      return;
    }

    try {
      setIsImporting(true);
      const response = await fetch("/api/v1/sitemap/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sitemapUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import sitemap");
      }

      if (data.success) {
        const newUrls = data.urls.filter((url: string) => 
          !additionalUrls.includes(url) && url !== watch("url")
        );
        setAdditionalUrls([...additionalUrls, ...newUrls]);
        setSitemapUrl("");
        toast.success(data.message || "Sitemap imported successfully");
      } else {
        toast.error(data.error || "Failed to import sitemap");
      }
    } catch (error) {
      console.error("Error importing sitemap:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import sitemap");
    } finally {
      setIsImporting(false);
    }
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'accessibility':
        return <Accessibility className="h-4 w-4" />
      case 'security':
        return <Shield className="h-4 w-4" />
      case 'seo':
        return <Search className="h-4 w-4" />
      case 'performance':
        return <Zap className="h-4 w-4" />
      case 'uptime':
        return <Globe className="h-4 w-4" />
      case 'ssl':
        return <Shield className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const getToolDescription = (tool: string) => {
    switch (tool) {
      case 'accessibility':
        return 'WCAG compliance, screen reader compatibility, keyboard navigation'
      case 'security':
        return 'SSL/TLS, headers, XSS, injection vulnerabilities, OWASP Top 10'
      case 'seo':
        return 'Meta tags, structured data, content optimization, technical SEO'
      case 'performance':
        return 'Page speed, optimization suggestions, Core Web Vitals'
      case 'uptime':
        return 'Monitor site availability and uptime'
      case 'ssl':
        return 'Certificate validation and SSL/TLS configuration'
      default:
        return ''
    }
  }

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Basic details about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter project name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  {...register("category")}
                  placeholder="e.g., E-commerce, Blog, Corporate"
                />
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Brief description of your project"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Main URL *</Label>
              <Input
                id="url"
                {...register("url")}
                placeholder="https://example.com"
                type="url"
              />
              {errors.url && (
                <p className="text-sm text-red-500">{errors.url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scanFrequency">Scan Frequency</Label>
              <Select value={watch("scanFrequency")} onValueChange={(value) => setValue("scanFrequency", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {errors.scanFrequency && (
                <p className="text-sm text-red-500">{errors.scanFrequency.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Testing Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Tools</CardTitle>
            <CardDescription>Choose which tools you want to use for scanning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "accessibility", label: "Accessibility", description: "WCAG compliance testing" },
                { key: "security", label: "Security Scanning", description: "Detect vulnerabilities and security issues" },
                { key: "seo", label: "SEO Analysis", description: "Optimize for search engines" },
                { key: "performance", label: "Performance", description: "Speed and optimization analysis" },
                { key: "uptime", label: "Uptime Monitoring", description: "Monitor site availability" },
                { key: "ssl", label: "SSL/TLS Check", description: "Certificate validation" },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id={key}
                    checked={enabledTools[key as keyof typeof enabledTools]}
                    onCheckedChange={(checked) => {
                      setValue(`enabledTools.${key as keyof typeof enabledTools}`, !!checked);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getToolIcon(key)}
                      <Label htmlFor={key} className="text-sm font-medium">
                        {label}
                      </Label>
                      {key === 'accessibility' && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {['security', 'seo'].includes(key) && (
                        <Badge variant="destructive">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getToolDescription(key)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
                  </Card>

        {/* Additional URLs */}
        <Card>
          <CardHeader>
            <CardTitle>Additional URLs</CardTitle>
            <CardDescription>Add more URLs to scan within this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/page"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
              />
              <Button type="button" onClick={addUrl} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {additionalUrls.length > 0 && (
              <div className="space-y-2">
                <Label>Added URLs:</Label>
                <div className="flex flex-wrap gap-2">
                  {additionalUrls.map((url, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {url}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 ml-1"
                        onClick={() => removeUrl(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Import from Sitemap</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/sitemap.xml"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                />
                <Button type="button" onClick={importFromSitemap} disabled={isImporting} size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? "Importing..." : "Import"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Add tags to organize your projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="space-y-2">
                <Label>Added Tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="pr-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 ml-1"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Updating..." : "Update Project"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/projects")}>
            Cancel
          </Button>
        </div>
      </form>
  );
} 