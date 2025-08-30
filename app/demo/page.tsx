"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Loader2, Globe, Wand2, Eye, AlertTriangle, CheckCircle, XCircle, History, Camera, Monitor } from "lucide-react";

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

interface ScanHistory {
  scanId: string;
  url: string;
  timestamp: string;
  status: 'completed' | 'failed';
  issuesCount: number;
  fixedCount: number;
}

export default function DemoPage() {
  const [url, setUrl] = useState("https://example.com");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [comparisonSlider, setComparisonSlider] = useState([50]);
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [previewMode, setPreviewMode] = useState<'iframe' | 'screenshot'>('iframe');
  const [showHistory, setShowHistory] = useState(false);

  // Load scan history on component mount
  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    try {
      const response = await fetch('/api/scan-history');
      if (response.ok) {
        const data = await response.json();
        setScanHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load scan history:', error);
    }
  };

  const saveScanToHistory = async (scanData: ScanHistory) => {
    try {
      await fetch('/api/scan-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanData)
      });
      loadScanHistory(); // Reload history
    } catch (error) {
      console.error('Failed to save scan history:', error);
    }
  };

  const loadScanFromHistory = (historyItem: ScanHistory) => {
    setScanResult({
      id: historyItem.scanId,
      url: historyItem.url,
      status: 'completed',
      progress: 100,
      issues: [], // Will be loaded from saved data
      fixedIssues: [],
      previewUrl: `/preview/${historyItem.scanId}`
    });
    setUrl(historyItem.url);
    setShowHistory(false);
  };

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
      console.log("Analysis response:", analysisData);
      
      // Convert analysis results to demo format
      const demoIssues = analysisData.results?.map((result: any, index: number) => ({
        id: result.id || `issue-${index}`,
        type: getIssueTypeFromTags(result.tags) || 'aria',
        severity: mapSeverity(result.severity),
        message: result.message,
        element: result.element,
        elementPath: result.elementPath,
        fixed: false,
        wcagRule: result.tags?.find((tag: string) => tag.startsWith('wcag'))
      })) || [];

      console.log("Demo issues created:", demoIssues);
      console.log("Analysis data structure:", {
        hasResults: !!analysisData.results,
        resultsLength: analysisData.results?.length,
        firstResult: analysisData.results?.[0],
        summary: analysisData.summary
      });

      // Update with issues
      setScanResult(prev => prev ? { 
        ...prev, 
        progress: 70, 
        issues: demoIssues,
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
      console.log("Fix response:", fixData);
      
      // Update issues with AI fixes
      const updatedIssues = scanResult?.issues.map(issue => {
        const fixedIssue = fixData.fixedIssues?.find((fixed: any) => fixed.id === issue.id);
        return fixedIssue ? { ...issue, ...fixedIssue } : issue;
      }) || [];
      
      // Complete
      setScanResult(prev => prev ? { 
        ...prev, 
        status: 'completed', 
        progress: 100,
        issues: updatedIssues,
        fixedIssues: fixData.fixedIssues || []
      } : null);

      // Save to history
      await saveScanToHistory({
        scanId: scrapeData.scanId,
        url,
        timestamp: new Date().toISOString(),
        status: 'completed',
        issuesCount: updatedIssues.length,
        fixedCount: fixData.fixedIssues?.filter((issue: any) => issue.fixed).length || 0
      });
      
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

  const getIssueTypeFromTags = (tags: string[]): string => {
    if (!tags) return 'aria';
    
    if (tags.some(tag => tag.includes('color') || tag.includes('contrast'))) return 'contrast';
    if (tags.some(tag => tag.includes('alt') || tag.includes('image'))) return 'alt-text';
    if (tags.some(tag => tag.includes('heading') || tag.includes('131'))) return 'heading';
    if (tags.some(tag => tag.includes('focus') || tag.includes('247'))) return 'focus';
    if (tags.some(tag => tag.includes('keyboard') || tag.includes('211'))) return 'keyboard';
    
    return 'aria';
  };

  const mapSeverity = (severity: string): 'critical' | 'high' | 'medium' | 'low' => {
    const normalizedSeverity = severity.toLowerCase();
    
    if (normalizedSeverity === 'critical') return 'critical';
    if (normalizedSeverity === 'high' || normalizedSeverity === 'serious') return 'high';
    if (normalizedSeverity === 'medium' || normalizedSeverity === 'moderate') return 'medium';
    
    return 'low';
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
            <div className="space-y-4">
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
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-4"
                >
                  <History className="mr-2 h-4 w-4" />
                  History ({scanHistory.length})
                </Button>
              </div>

              {/* Scan History */}
              {showHistory && (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Scans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scanHistory.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No scan history yet. Complete a scan to see it here.
                        </div>
                      ) : (
                        scanHistory.map((item) => (
                          <div
                            key={item.scanId}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => loadScanFromHistory(item)}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm truncate">{item.url}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(item.timestamp).toLocaleString()} • 
                                {item.issuesCount} issues • {item.fixedCount} fixed
                              </div>
                            </div>
                            <Badge variant={item.status === 'completed' ? 'default' : 'destructive'}>
                              {item.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
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
          <div className="space-y-8">
            {/* Full Width Preview */}
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
                  {/* Preview Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Preview Mode:</span>
                      <div className="flex gap-2">
                        <Button
                          variant={previewMode === 'iframe' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('iframe')}
                        >
                          <Monitor className="mr-2 h-4 w-4" />
                          Live
                        </Button>
                        <Button
                          variant={previewMode === 'screenshot' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('screenshot')}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Screenshot
                        </Button>
                      </div>
                    </div>
                  </div>

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

                  {/* Full Width Preview Frame */}
                  <div className="relative bg-white border rounded-lg overflow-hidden" style={{ height: '80vh' }}>
                    {scanResult.previewUrl ? (
                      <div className="relative w-full h-full">
                        {previewMode === 'iframe' ? (
                          <>
                            <iframe
                              src={`${scanResult.previewUrl}?version=original`}
                              className="absolute inset-0 w-full h-full border-0"
                              style={{
                                clipPath: `inset(0 ${100 - comparisonSlider[0]}% 0 0)`
                              }}
                              title="Original version"
                              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                            />
                            <iframe
                              src={`${scanResult.previewUrl}?version=fixed`}
                              className="absolute inset-0 w-full h-full border-0"
                              style={{
                                clipPath: `inset(0 0 0 ${comparisonSlider[0]}%)`
                              }}
                              title="Fixed version"
                              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                            />
                          </>
                        ) : (
                          <>
                            <img
                              src={`/api/screenshot/${scanResult.id}?version=original`}
                              className="absolute inset-0 w-full h-full object-contain object-top"
                              style={{
                                clipPath: `inset(0 ${100 - comparisonSlider[0]}% 0 0)`
                              }}
                              alt="Original version screenshot"
                            />
                            <img
                              src={`/api/screenshot/${scanResult.id}?version=fixed`}
                              className="absolute inset-0 w-full h-full object-contain object-top"
                              style={{
                                clipPath: `inset(0 0 0 ${comparisonSlider[0]}%)`
                              }}
                              alt="Fixed version screenshot"
                            />
                          </>
                        )}
                        {/* Divider Line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-purple-500 shadow-lg z-10"
                          style={{ left: `${comparisonSlider[0]}%` }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <div className="text-sm">Preview will appear here after scanning</div>
                          <div className="text-xs mt-1">Choose between Live iframe or Screenshot mode above</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Accessibility Issues ({scanResult.issues?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {scanResult.issues?.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-sm">No accessibility issues found!</div>
                        <div className="text-xs mt-1">This website appears to be fully accessible.</div>
                      </div>
                    )}
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

              {/* Issue Details Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-purple-500" />
                    Issue Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedIssue ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-sm">Select an issue to see details</div>
                      <div className="text-xs mt-1">Click on any accessibility issue to view AI suggestions</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
