"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Loader2, Globe, Wand2, Eye, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface ScanResult {
  id: string;
  url: string;
  status: 'scanning' | 'analyzing' | 'fixing' | 'completed' | 'error';
  progress: number;
  issues: AccessibilityIssue[];
  fixedIssues: AccessibilityIssue[];
  downloadPath?: string;
  previewUrl?: string;
}

interface AccessibilityIssue {
  id: string;
  type: 'contrast' | 'alt-text' | 'heading' | 'focus' | 'aria' | 'keyboard';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  element: string;
  elementPath: string;
  fixed: boolean;
  aiSuggestion?: string;
}

export default function DemoPage() {
  const [url, setUrl] = useState("https://example.com");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [comparisonSlider, setComparisonSlider] = useState([50]);
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);

  const handleScan = async () => {
    if (!url) return;
    
    try {
      setIsScanning(true);
      
      // Initialize scan result
      const newScanResult: ScanResult = {
        id: Date.now().toString(),
        url,
        status: 'scanning',
        progress: 0,
        issues: [],
        fixedIssues: []
      };
      setScanResult(newScanResult);
      
      // Start scraping
      const scrapeResponse = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      
      if (!scrapeResponse.ok) throw new Error("Scraping failed");
      
      const scrapeData = await scrapeResponse.json();
      
      // Update progress
      setScanResult(prev => prev ? { ...prev, progress: 30, downloadPath: scrapeData.downloadPath } : null);
      
      // Analyze accessibility
      setScanResult(prev => prev ? { ...prev, status: 'analyzing', progress: 50 } : null);
      
      const analysisResponse = await fetch("/api/analyze-accessibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scrapeData.scanId, url }),
      });
      
      if (!analysisResponse.ok) throw new Error("Analysis failed");
      
      const analysisData = await analysisResponse.json();
      
      // Update with issues
      setScanResult(prev => prev ? { 
        ...prev, 
        progress: 70, 
        issues: analysisData.issues,
        previewUrl: `/preview/${scrapeData.scanId}`
      } : null);
      
      // AI Fixing
      setScanResult(prev => prev ? { ...prev, status: 'fixing', progress: 80 } : null);
      
      const fixResponse = await fetch("/api/ai-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          scanId: scrapeData.scanId, 
          issues: analysisData.issues 
        }),
      });
      
      if (!fixResponse.ok) throw new Error("AI fixing failed");
      
      const fixData = await fixResponse.json();
      
      // Complete
      setScanResult(prev => prev ? { 
        ...prev, 
        status: 'completed', 
        progress: 100,
        fixedIssues: fixData.fixedIssues
      } : null);
      
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult(prev => prev ? { ...prev, status: 'error' } : null);
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'contrast': return '🎨';
      case 'alt-text': return '🖼️';
      case 'heading': return '📝';
      case 'focus': return '🎯';
      case 'aria': return '♿';
      case 'keyboard': return '⌨️';
      default: return '⚠️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Accessibility Demo
          </h1>
          <p className="text-gray-600">
            Experience our AI-powered accessibility scanner in action
          </p>
        </div>

        {/* URL Input */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Website Scanner</CardTitle>
            <CardDescription>
              Enter a URL to scan for accessibility issues and see AI-powered fixes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
                disabled={isScanning}
              />
              <Button
                onClick={handleScan}
                disabled={!url || isScanning}
                className="px-8"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Scan Website
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scan Progress */}
        {scanResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Scanning: {scanResult.url}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {scanResult.status === 'scanning' && 'Scraping website...'}
                    {scanResult.status === 'analyzing' && 'Analyzing accessibility...'}
                    {scanResult.status === 'fixing' && 'AI is fixing issues...'}
                    {scanResult.status === 'completed' && 'Scan completed!'}
                    {scanResult.status === 'error' && 'Scan failed'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {scanResult.progress}%
                  </span>
                </div>
                <Progress value={scanResult.progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {scanResult && scanResult.status === 'completed' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Issues Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Accessibility Issues ({scanResult.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scanResult.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedIssue?.id === issue.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedIssue(issue)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getIssueIcon(issue.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getSeverityColor(issue.severity)} text-white`}>
                              {issue.severity}
                            </Badge>
                            <span className="text-sm font-medium capitalize">
                              {issue.type.replace('-', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {issue.message}
                          </p>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {issue.elementPath}
                          </code>
                        </div>
                        {issue.fixed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Before/After Preview
                </CardTitle>
                <CardDescription>
                  Use the slider to compare original vs AI-fixed version
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Magic Slider */}
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm font-medium">Before</span>
                      <div className="flex-1 relative">
                        <Slider
                          value={comparisonSlider}
                          onValueChange={setComparisonSlider}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                          <Wand2 className="h-6 w-6 text-purple-500 animate-pulse" />
                        </div>
                      </div>
                      <span className="text-sm font-medium">After</span>
                    </div>
                  </div>

                  {/* Preview Frame */}
                  <div className="relative bg-white border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                    {scanResult.previewUrl ? (
                      <div className="relative w-full h-full">
                        <iframe
                          src={`${scanResult.previewUrl}?version=original`}
                          className="absolute inset-0 w-full h-full border-0"
                          style={{
                            clipPath: `inset(0 ${100 - comparisonSlider[0]}% 0 0)`
                          }}
                        />
                        <iframe
                          src={`${scanResult.previewUrl}?version=fixed`}
                          className="absolute inset-0 w-full h-full border-0"
                          style={{
                            clipPath: `inset(0 0 0 ${comparisonSlider[0]}%)`
                          }}
                        />
                        {/* Divider Line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-purple-500 shadow-lg"
                          style={{ left: `${comparisonSlider[0]}%` }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Preview will appear here after scanning
                      </div>
                    )}
                  </div>

                  {/* Issue Details */}
                  {selectedIssue && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">
                        {getIssueIcon(selectedIssue.type)} {selectedIssue.type.replace('-', ' ')} Issue
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        {selectedIssue.message}
                      </p>
                      {selectedIssue.aiSuggestion && (
                        <div className="bg-white p-3 rounded border">
                          <div className="flex items-center gap-2 mb-2">
                            <Wand2 className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-medium text-purple-700">
                              AI Suggestion
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {selectedIssue.aiSuggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Stats */}
        {scanResult && scanResult.status === 'completed' && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Scan Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {scanResult.issues.filter(i => i.severity === 'critical').length}
                  </div>
                  <div className="text-sm text-gray-600">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {scanResult.issues.filter(i => i.severity === 'high').length}
                  </div>
                  <div className="text-sm text-gray-600">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {scanResult.issues.filter(i => i.severity === 'medium').length}
                  </div>
                  <div className="text-sm text-gray-600">Medium</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {scanResult.fixedIssues.length}
                  </div>
                  <div className="text-sm text-gray-600">Fixed by AI</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
