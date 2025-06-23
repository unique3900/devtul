"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Shield, Search, Accessibility, Zap, ArrowLeft, Plus, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NewProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    category: "",
    scanFrequency: "daily",
    enabledTools: {
      security: true,
      seo: true,
      accessibility: true,
      performance: true,
      uptime: false,
      ssl: false,
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate project creation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Redirect to project dashboard
    router.push("/projects/1") // In real app, use actual project ID
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleToolToggle = (tool: string) => {
    setFormData((prev) => ({
      ...prev,
      enabledTools: {
        ...prev.enabledTools,
        [tool]: !prev.enabledTools[tool as keyof typeof prev.enabledTools],
      },
    }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground">Add a new website or web application to monitor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide basic details about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Website"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Website URL *</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  className="pl-10"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your project..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
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
            </div>
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
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="security"
                  checked={formData.enabledTools.security}
                  onCheckedChange={() => handleToolToggle("security")}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    <Label htmlFor="security" className="font-medium">
                      Security Testing
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Vulnerability scans and security audits</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="seo"
                  checked={formData.enabledTools.seo}
                  onCheckedChange={() => handleToolToggle("seo")}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-green-600" />
                    <Label htmlFor="seo" className="font-medium">
                      SEO Analysis
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Search engine optimization checks</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="accessibility"
                  checked={formData.enabledTools.accessibility}
                  onCheckedChange={() => handleToolToggle("accessibility")}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Accessibility className="h-4 w-4 text-blue-600" />
                    <Label htmlFor="accessibility" className="font-medium">
                      WCAG Compliance
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Accessibility testing and compliance</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="performance"
                  checked={formData.enabledTools.performance}
                  onCheckedChange={() => handleToolToggle("performance")}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <Label htmlFor="performance" className="font-medium">
                      Performance
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Speed and performance monitoring</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="uptime"
                  checked={formData.enabledTools.uptime}
                  onCheckedChange={() => handleToolToggle("uptime")}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-600" />
                    <Label htmlFor="uptime" className="font-medium">
                      Uptime Monitoring
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">24/7 availability monitoring</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="ssl"
                  checked={formData.enabledTools.ssl}
                  onCheckedChange={() => handleToolToggle("ssl")}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    <Label htmlFor="ssl" className="font-medium">
                      SSL/TLS Check
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Certificate validation and monitoring</p>
                </div>
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="frequency">Scan Frequency</Label>
              <Select
                value={formData.scanFrequency}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, scanFrequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <Link href="/projects" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isLoading || !formData.name || !formData.url}
          >
            {isLoading ? "Creating Project..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  )
}
