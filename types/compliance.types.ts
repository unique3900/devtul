export interface AccessibilityResult {
    id: string
    url: string
    message: string
    help: string
    element: string
    elementPath?: string
    impact: string
    severity: 'critical' | 'serious' | 'moderate' | 'minor'
    tags: string[]
    details?: Record<string, any>
    screenshotPath?: string
    createdAt: string
  }
  
  export interface SecurityResult {
    id: string
    url: string
    message: string
    help: string
    element?: string
    elementPath?: string
    impact: string
    severity: 'critical' | 'serious' | 'moderate' | 'minor'
    tags: string[]
    category: 'headers' | 'tls' | 'csp' | 'injection' | 'auth' | 'cors' | 'xss' | 'sqli' | 'info-leak' | 'owasp'
    details?: Record<string, any>
    recommendation?: string
    createdAt: string
  }
  
  export type ScanResult = AccessibilityResult | SecurityResult
  
  export interface AccessibilitySummary {
    critical: number
    serious: number
    moderate: number
    minor: number
    total: number
    urlsAnalyzed: number
  }
  
  export interface SecuritySummary {
    critical: number
    serious: number
    moderate: number
    minor: number
    total: number
    urlsAnalyzed: number
    categorySummary: {
      headers: number
      tls: number
      csp: number
      injection: number
      auth: number
      cors: number
      xss: number
      sqli: number
      'info-leak': number
      owasp: number
    }
  }
  
  export interface ResultsQueryParams {
    urls: string[]
    page: number
    pageSize: number
    sortBy: string
    search?: string
    severityFilters?: string[]
    complianceFilters?: string[]
    scanTypeFilters?: string[]
    categoryFilters?: string[]
  }
  
  export interface ComplianceOptions {
    wcagLevel: 'a' | 'aa' | 'aaa'
    section508?: boolean
    bestPractices?: boolean
    experimental?: boolean
    captureScreenshots?: boolean
  }
  
  export interface SecurityOptions {
    headers?: boolean
    tls?: boolean
    csp?: boolean
    injection?: boolean
    auth?: boolean
    cors?: boolean
    xss?: boolean
    sqli?: boolean
    infoLeak?: boolean
    owasp?: boolean
    deepScan?: boolean
  }
  
  export interface ProjectScanOptions {
    scanTypes: ('wcag' | 'security' | 'tls' | 'headers')[]
    complianceOptions?: ComplianceOptions
    securityOptions?: SecurityOptions
  }
  
  export interface ScanResultData {
    url: string
    results: ScanResult[]
    summary: AccessibilitySummary | SecuritySummary
    scanType: 'wcag' | 'security' | 'tls' | 'headers'
  }
  