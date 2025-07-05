"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Globe, Shield, Search, Accessibility, Zap, Plus, X } from "lucide-react";
import { projectCreateSchema, type ProjectCreateInput } from "@/app/actions/project/schema";

export function ProjectForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [importedUrls, setImportedUrls] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const form = useForm<ProjectCreateInput>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: "",
      url: "",
      description: "",
      category: "",
      scanFrequency: "Daily",
      enabledTools: {
        security: true,
        seo: true,
        accessibility: true,
        performance: true,
        uptime: false,
        ssl: false,
      },
      tags: [],
      additionalUrls: [],
    },
  });

  const handleSubmit = async (data: ProjectCreateInput) => {
    setIsLoading(true);
    
    try {
      const formData = {
        ...data,
        tags,
        additionalUrls: importedUrls,
      };

      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Project created successfully!",
        });
        router.push("/dashboard");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create project",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSitemapImport = async (sitemapUrl: string) => {
    if (!sitemapUrl.trim()) return;

    setIsImporting(true);
    try {
      const response = await fetch("/api/v1/sitemap/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sitemapUrl }),
      });

      const result = await response.json();

      if (result.success) {
        setImportedUrls(result.urls);
        toast({
          title: "Success",
          description: `Imported ${result.urls.length} URLs from sitemap`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to import sitemap",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import sitemap",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide basic details about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Website" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="https://example.com"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of your project..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="landing">Landing Page</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sitemap Import */}
        <Card>
          <CardHeader>
            <CardTitle>Sitemap Import</CardTitle>
            <CardDescription>Import multiple URLs from your sitemap</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SitemapImport onImport={handleSitemapImport} isImporting={isImporting} />
            {importedUrls.length > 0 && (
              <div className="space-y-2">
                <Label>Imported URLs ({importedUrls.length})</Label>
                <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                  {importedUrls.map((url, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {url}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Testing Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Tools</CardTitle>
            <CardDescription>Select which tools you want to enable for this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="enabledTools.security"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        <FormLabel>Security Testing</FormLabel>
                      </div>
                      <FormDescription>
                        Vulnerability scans and security audits
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabledTools.seo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-green-600" />
                        <FormLabel>SEO Analysis</FormLabel>
                      </div>
                      <FormDescription>
                        Search engine optimization checks
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabledTools.accessibility"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-2">
                        <Accessibility className="h-4 w-4 text-blue-600" />
                        <FormLabel>WCAG Compliance</FormLabel>
                      </div>
                      <FormDescription>
                        Accessibility testing and compliance
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabledTools.performance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <FormLabel>Performance</FormLabel>
                      </div>
                      <FormDescription>
                        Speed and performance monitoring
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabledTools.uptime"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-600" />
                        <FormLabel>Uptime Monitoring</FormLabel>
                      </div>
                      <FormDescription>
                        24/7 availability monitoring
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabledTools.ssl"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-600" />
                        <FormLabel>SSL/TLS Check</FormLabel>
                      </div>
                      <FormDescription>
                        Certificate validation and monitoring
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scan Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Scan Settings</CardTitle>
            <CardDescription>Configure how often you want to scan this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="scanFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scan Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Add tags to organize and categorize your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1" 
            onClick={() => router.push("/projects")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isLoading}
          >
            {isLoading ? "Creating Project..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface SitemapImportProps {
  onImport: (sitemapUrl: string) => void;
  isImporting: boolean;
}

function SitemapImport({ onImport, isImporting }: SitemapImportProps) {
  const [sitemapUrl, setSitemapUrl] = useState("");

  const handleImport = () => {
    if (sitemapUrl.trim()) {
      onImport(sitemapUrl.trim());
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="https://example.com/sitemap.xml"
        value={sitemapUrl}
        onChange={(e) => setSitemapUrl(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleImport())}
      />
      <Button 
        type="button" 
        onClick={handleImport} 
        variant="outline"
        disabled={isImporting}
      >
        {isImporting ? "Importing..." : "Import"}
      </Button>
    </div>
  );
} 