// Types for accessibility results and summaries
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
  total: number
  critical: number
  serious: number
  moderate: number
  minor: number
  info?: number
}

export interface ComplianceOptions {
  wcagLevel: 'a' | 'aa' | 'aaa'
  section508?: boolean
  bestPractices?: boolean
  experimental?: boolean
  captureScreenshots?: boolean
}

export interface ScanResult {
  id: string
  scanId: string
  url: string
  message: string
  element?: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  impact?: string
  help?: string
  tags: string[]
  elementPath?: string
  details?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Scan {
  id: string
  projectId: string
  urlId?: string
  scanType: 'SEO' | 'WCAG' | 'Security' | 'SSLTLS' | 'Performance' | 'Uptime' | 'Accessibility' | 'SEO_AUDIT' | 'SECURITY_AUDIT' | 'PERFORMANCE_AUDIT'
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Canceled'
  startedAt: Date
  completedAt?: Date
  errorMessage?: string
  scanConfig?: Record<string, any>
  initiatedById: string
  results?: ScanResult[]
}

export interface Project {
  id: string
  name: string
  description?: string
  category?: string
  scanFrequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Manual'
  complianceOptions?: Record<string, any>
  isActive: boolean
  lastScanAt?: Date
  nextScanAt?: Date
  status: 'Active' | 'Scanning' | 'Warning' | 'Error' | 'Paused'
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  scores?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  scanToken: string
  organizationId?: string
  ownerId: string
} 