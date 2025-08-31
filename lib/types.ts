export interface ComplianceOptions {
  wcagLevel: "a" | "aa" | "aaa";
  section508: boolean;
  bestPractices: boolean;
  experimental: boolean;
  captureScreenshots: boolean;
}

export interface AccessibilityResult {
  id: string
  scanId: string
  url: string
  message: string
  element?: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  impact?: string
  help?: string
  tags?: string[]
  elementPath?: string
  details?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  // Additional fields for UI
  scanType?: 'wcag' | 'security'
  category?: string
  estimatedFixTime?: string
  screenshotPath?: string
}

export interface AccessibilitySummary {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
  urlsAnalyzed: number;
}