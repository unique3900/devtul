"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ArrowLeft, Plus, X, Shield, Search, Accessibility, Zap, Globe, Upload } from "lucide-react"
import Link from "next/link"

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    url: "",
    additionalUrls: [] as string[],
    enabledTools: {
      accessibility: true,
      security: false,
      seo: false,
      performance: false,
      uptime: false,
      ssl: false,
    },
    scanFrequency: "Daily" as "Hourly" | "Daily" | "Weekly" | "Monthly" | "Manual",
    complianceOptions: {
      wcagLevel: "aa" as const,
      section508: false
    },
    tags: [] as string[]
  })

  // UI state
  const [newUrl, setNewUrl] = useState("")
  const [newTag, setNewTag] = useState("")
  const [sitemapUrl, setSitemapUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleToolChange = (tool: keyof typeof formData.enabledTools, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      enabledTools: {
        ...prev.enabledTools,
        [tool]: checked
      }
    }))
  }

  const addUrl = () => {
    if (newUrl.trim()) {
      try {
        new URL(newUrl)
        setFormData(prev => ({
          ...prev,
          additionalUrls: [...prev.additionalUrls, newUrl.trim()]
        }))
        setNewUrl("")
      } catch {
        toast.error("Please enter a valid URL")
      }
    }
  }

  const removeUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalUrls: prev.additionalUrls.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const importFromSitemap = async () => {
    if (!sitemapUrl.trim()) {
      toast.error("Please enter a sitemap URL")
      return
    }

    try {
      setIsImporting(true)
      const response = await fetch("/api/v1/sitemap/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sitemapUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to import sitemap")
      }

      if (data.success) {
        const newUrls = data.urls.filter((url: string) => 
          !formData.additionalUrls.includes(url) && url !== formData.url
        )
        setFormData(prev => ({
          ...prev,
          additionalUrls: [...prev.additionalUrls, ...newUrls]
        }))
        setSitemapUrl("")
        toast.success(data.message || "Sitemap imported successfully")
      } else {
        toast.error(data.error || "Failed to import sitemap")
      }
    } catch (error) {
      console.error("Error importing sitemap:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import sitemap")
    } finally {
      setIsImporting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Project name is required")
      return
    }

    if (!formData.url.trim()) {
      toast.error("Main URL is required")
      return
    }

    // Validate main URL
    try {
      new URL(formData.url)
    } catch {
      toast.error("Please enter a valid main URL")
      return
    }

    // Validate additional URLs
    for (const url of formData.additionalUrls) {
      try {
        new URL(url)
      } catch {
        toast.error(`Invalid URL: ${url}`)
        return
      }
    }

    if (!Object.values(formData.enabledTools).some(Boolean)) {
      toast.error("Select at least one testing tool")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category.trim(),
          url: formData.url.trim(),
          additionalUrls: formData.additionalUrls,
          enabledTools: formData.enabledTools,
          scanFrequency: formData.scanFrequency,
          complianceOptions: formData.complianceOptions,
          tags: formData.tags,
          autoStartScan: true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project")
      }

      if (data.success) {
        toast.success("Project created successfully!")
        
        // Show which tools are enabled
        const enabledTools = Object.entries(formData.enabledTools)
          .filter(([_, enabled]) => enabled)
          .map(([tool, _]) => tool)
        
        if (enabledTools.length > 0) {
          toast.info(`Starting ${enabledTools.join(", ")} scans...`)
        }
        
        router.push(`/results/${data.project.id}`)
      } else {
        throw new Error(data.error || "Failed to create project")
      }
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create project")
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground">Set up a new project for website analysis</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  placeholder="e.g., E-commerce, Blog, Corporate"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description of your project"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Main URL *</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleInputChange("url", e.target.value)}
                placeholder="https://example.com"
                type="url"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scanFrequency">Scan Frequency</Label>
              <Select 
                value={formData.scanFrequency} 
                onValueChange={(value) => handleInputChange("scanFrequency", value)}
              >
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
              {Object.entries(formData.enabledTools).map(([tool, enabled]) => (
                <div key={tool} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id={tool}
                    checked={enabled}
                    onCheckedChange={(checked) => handleToolChange(tool as keyof typeof formData.enabledTools, !!checked)}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getToolIcon(tool)}
                      <Label htmlFor={tool} className="text-sm font-medium capitalize">
                        {tool}
                      </Label>
                      {tool === 'accessibility' && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {['security', 'seo'].includes(tool) && (
                        <Badge variant="destructive">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getToolDescription(tool)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Options (show only if accessibility is selected) */}
        {formData.enabledTools.accessibility && (
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Compliance</CardTitle>
              <CardDescription>Configure accessibility standards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>WCAG Level</Label>
                <div className="flex gap-2">
                  {(['a', 'aa', 'aaa'] as const).map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={formData.complianceOptions.wcagLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange("complianceOptions", {
                        ...formData.complianceOptions,
                        wcagLevel: level
                      })}
                    >
                      WCAG {level.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section508"
                  checked={formData.complianceOptions.section508}
                  onCheckedChange={(checked) => handleInputChange("complianceOptions", {
                    ...formData.complianceOptions,
                    section508: !!checked
                  })}
                />
                <Label htmlFor="section508">Section 508 Compliance</Label>
              </div>
            </CardContent>
          </Card>
        )}

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

            {formData.additionalUrls.length > 0 && (
              <div className="space-y-2">
                <Label>Added URLs:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.additionalUrls.map((url, index) => (
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

            {formData.tags.length > 0 && (
              <div className="space-y-2">
                <Label>Added Tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
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

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating Project..." : "Create Project & Start Scanning"}
          </Button>
          <Link href="/projects">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

