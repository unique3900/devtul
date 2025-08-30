"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Eye, Code, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface PlaygroundIssue {
  id: string;
  type: 'contrast' | 'alt-text' | 'heading' | 'focus' | 'aria' | 'keyboard';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  element: string;
  line: number;
  column: number;
  suggestion: string;
}

const DEMO_TEMPLATES = {
  'contrast-issues': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrast Issues Demo</title>
    <style>
        .low-contrast { color: #ccc; background: #fff; }
        .medium-contrast { color: #666; background: #fff; }
        .good-contrast { color: #333; background: #fff; }
    </style>
</head>
<body>
    <h1>Accessibility Contrast Demo</h1>
    <p class="low-contrast">This text has poor contrast (fails WCAG)</p>
    <p class="medium-contrast">This text has medium contrast</p>
    <p class="good-contrast">This text has good contrast</p>
    <button style="color: #ddd; background: #eee;">Hard to read button</button>
</body>
</html>`,
  
  'alt-text-issues': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alt Text Issues Demo</title>
</head>
<body>
    <h1>Image Alt Text Demo</h1>
    <img src="https://via.placeholder.com/300x200/ff6b6b/ffffff?text=No+Alt" width="300" height="200">
    <img src="https://via.placeholder.com/300x200/4ecdc4/ffffff?text=Empty+Alt" alt="" width="300" height="200">
    <img src="https://via.placeholder.com/300x200/45b7d1/ffffff?text=Good+Alt" alt="A blue placeholder image demonstrating proper alt text" width="300" height="200">
</body>
</html>`,

  'heading-structure': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heading Structure Demo</title>
</head>
<body>
    <h1>Main Title</h1>
    <h3>Skipped H2 - This is wrong!</h3>
    <h2>Proper H2</h2>
    <h3>Proper H3</h3>
    <h5>Skipped H4 - Another issue!</h5>
    <h1>Multiple H1s are problematic</h1>
</body>
</html>`,

  'focus-keyboard': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Focus and Keyboard Demo</title>
    <style>
        .no-focus:focus { outline: none; }
        .custom-focus:focus { outline: 3px solid #4dabf7; }
        .clickable { cursor: pointer; padding: 10px; background: #f0f0f0; }
    </style>
</head>
<body>
    <h1>Focus and Keyboard Accessibility Demo</h1>
    <button class="no-focus">Button with no focus indicator</button>
    <button class="custom-focus">Button with custom focus</button>
    <div class="clickable" onclick="alert('clicked')">Clickable div (not keyboard accessible)</div>
    <a href="#" tabindex="5">Link with positive tabindex (bad practice)</a>
</body>
</html>`,

  'aria-issues': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARIA Issues Demo</title>
</head>
<body>
    <h1>ARIA Issues Demo</h1>
    <div role="invalid-role">Invalid ARIA role</div>
    <button aria-labelledby="nonexistent">Button with invalid aria-labelledby</button>
    <input type="text" aria-describedby="missing-description">
    <div role="button">Div as button without proper ARIA</div>
    <form>
        <input type="email" placeholder="Email">
        <input type="password" placeholder="Password">
    </form>
</body>
</html>`
};

export default function PlaygroundPage() {
  const [htmlCode, setHtmlCode] = useState(DEMO_TEMPLATES['contrast-issues']);
  const [selectedTemplate, setSelectedTemplate] = useState('contrast-issues');
  const [issues, setIssues] = useState<PlaygroundIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<PlaygroundIssue | null>(null);
  const [fixedCode, setFixedCode] = useState('');

  useEffect(() => {
    setHtmlCode(DEMO_TEMPLATES[selectedTemplate as keyof typeof DEMO_TEMPLATES]);
  }, [selectedTemplate]);

  const analyzeCode = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlCode })
      });
      
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fixIssues = async () => {
    try {
      const response = await fetch('/api/fix-playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlCode, issues })
      });
      
      const data = await response.json();
      setFixedCode(data.fixedHtml || htmlCode);
    } catch (error) {
      console.error('Fixing failed:', error);
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
            Accessibility Playground
          </h1>
          <p className="text-gray-600">
            Interactive environment to test and fix accessibility issues in real-time
          </p>
        </div>

        {/* Template Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Demo Templates</CardTitle>
            <CardDescription>
              Choose a template to explore different accessibility issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a demo template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contrast-issues">Color Contrast Issues</SelectItem>
                <SelectItem value="alt-text-issues">Image Alt Text Problems</SelectItem>
                <SelectItem value="heading-structure">Heading Structure Issues</SelectItem>
                <SelectItem value="focus-keyboard">Focus & Keyboard Issues</SelectItem>
                <SelectItem value="aria-issues">ARIA Implementation Problems</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                HTML Code Editor
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={analyzeCode} disabled={isAnalyzing}>
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Issues'}
                </Button>
                <Button onClick={fixIssues} disabled={!issues.length} variant="outline">
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI Fix Issues
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="original" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">Original Code</TabsTrigger>
                  <TabsTrigger value="fixed">AI Fixed Code</TabsTrigger>
                </TabsList>
                <TabsContent value="original">
                  <Textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder="Enter your HTML code here..."
                  />
                </TabsContent>
                <TabsContent value="fixed">
                  <Textarea
                    value={fixedCode || 'Click "AI Fix Issues" to see fixed code'}
                    readOnly
                    className="font-mono text-sm min-h-[400px] bg-green-50"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="original" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">Original</TabsTrigger>
                  <TabsTrigger value="fixed">Fixed Version</TabsTrigger>
                </TabsList>
                <TabsContent value="original">
                  <div className="border rounded-lg bg-white p-4 min-h-[400px] overflow-auto">
                    <iframe
                      srcDoc={htmlCode}
                      className="w-full h-96 border-0"
                      title="Original Preview"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="fixed">
                  <div className="border rounded-lg bg-white p-4 min-h-[400px] overflow-auto">
                    <iframe
                      srcDoc={fixedCode || htmlCode}
                      className="w-full h-96 border-0"
                      title="Fixed Preview"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Issues Panel */}
        {issues.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Accessibility Issues ({issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Issues List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {issues.map((issue) => (
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
                          <div className="text-xs text-gray-500">
                            Line {issue.line}, Column {issue.column}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Issue Details */}
                <div>
                  {selectedIssue ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">
                        {getIssueIcon(selectedIssue.type)} {selectedIssue.type.replace('-', ' ')} Issue
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        {selectedIssue.message}
                      </p>
                      <div className="bg-white p-3 rounded border mb-3">
                        <div className="text-xs text-gray-500 mb-1">Problematic Element:</div>
                        <code className="text-sm bg-gray-100 p-2 rounded block">
                          {selectedIssue.element}
                        </code>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="flex items-center gap-2 mb-2">
                          <Wand2 className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium text-purple-700">
                            AI Suggestion
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {selectedIssue.suggestion}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Info className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Select an issue to see details and suggestions</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {issues.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Issue Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {issues.filter(i => i.severity === 'critical').length}
                  </div>
                  <div className="text-sm text-gray-600">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {issues.filter(i => i.severity === 'high').length}
                  </div>
                  <div className="text-sm text-gray-600">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {issues.filter(i => i.severity === 'medium').length}
                  </div>
                  <div className="text-sm text-gray-600">Medium</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {issues.filter(i => i.severity === 'low').length}
                  </div>
                  <div className="text-sm text-gray-600">Low</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
