export interface ComplianceOptions {
  wcagLevel: "a" | "aa" | "aaa";
  section508: boolean;
  bestPractices: boolean;
  experimental: boolean;
  captureScreenshots: boolean;
}

export interface AccessibilityResult {
  id: string;
  url: string;
  message: string;
  help: string;
  element: string;
  elementPath: string;
  impact: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  scanId: string;
  screenshotPath?: string;
}

export interface AccessibilitySummary {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
  urlsAnalyzed: number;
}