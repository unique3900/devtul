import { chromium, Browser, Page, Request, Response } from 'playwright-core'
import * as crypto from 'crypto'
import * as tls from 'tls'
import * as net from 'net'
import type { SecurityResult, SecuritySummary, SecurityOptions } from '@/types/compliance.types'

interface SecurityScanResult {
  results: SecurityResult[]
  summary: SecuritySummary
}

interface TLSInfo {
  version: string
  cipher: string
  protocol: string
  authorized: boolean
  certificate: {
    subject: string
    issuer: string
    valid_from: string
    valid_to: string
    fingerprint: string
  }
}

export async function scanSecurity(
  url: string,
  options: SecurityOptions = {
    headers: true,
    tls: true,
    csp: true,
    injection: true,
    auth: true,
    cors: true,
    xss: true,
    sqli: false,
    infoLeak: true,
    owasp: true,
    deepScan: false
  }
): Promise<SecurityScanResult> {
  const results: SecurityResult[] = []
  let browser: Browser | null = null

  try {
    // Launch browser for web-based scans
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    // Set user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Security-Scanner/1.0 (OWASP Scanner)'
    })

    // Collect network requests and responses
    const requests: any[] = []
    const responses: any[] = []

    page.on('request', (request: Request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      })
    })

    page.on('response', (response: Response) => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        statusText: response.statusText()
      })
    })

    // Navigate to the page
    let response
    try {
      response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      })
    } catch (error) {
      console.warn(`Failed to navigate to ${url}:`, error)
      // Continue with limited analysis
    }

    // Perform different types of security scans
    if (options.headers) {
      results.push(...await scanSecurityHeaders(url, response, page))
    }

    if (options.tls) {
      results.push(...await scanTLS(url))
    }

    if (options.csp) {
      results.push(...await scanCSP(url, response, page))
    }

    if (options.cors) {
      results.push(...await scanCORS(url, response, page))
    }

    if (options.xss) {
      results.push(...await scanXSS(url, page))
    }

    if (options.injection && options.deepScan) {
      results.push(...await scanInjectionVulnerabilities(url, page))
    }

    if (options.auth) {
      results.push(...await scanAuthentication(url, page, responses))
    }

    if (options.infoLeak) {
      results.push(...await scanInformationLeakage(url, page, responses))
    }

    if (options.owasp) {
      results.push(...await scanOWASPTop10(url, page, responses))
    }

    await browser.close()

  } catch (error) {
    console.error('Security scan error:', error)
    if (browser) {
      await browser.close()
    }
    
    results.push({
      id: crypto.randomUUID(),
      url,
      message: `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      help: 'Unable to complete security analysis due to technical issues',
      severity: 'Medium',   
      impact: 'medium',
      tags: ['error', 'scan-failure'],
      category: 'owasp',
      createdAt: new Date().toISOString()
    })
  }

  // Generate summary
  const summary = generateSecuritySummary(results)

  return { results, summary }
}

async function scanSecurityHeaders(url: string, response: any, page: Page): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []
  const headers = response?.headers() || {}

  // Check for missing security headers
  const securityHeaders = [
    {
      name: 'Strict-Transport-Security',
      missing: 'Missing HSTS header - site vulnerable to SSL stripping attacks',
      severity: 'High' as const,
      tags: ['hsts', 'ssl', 'transport-security']
    },
    {
      name: 'X-Content-Type-Options',
      missing: 'Missing X-Content-Type-Options header - vulnerable to MIME type confusion attacks',
      severity: 'moderate' as const,
      tags: ['mime-sniffing', 'content-type']
    },
    {
      name: 'X-Frame-Options',
      missing: 'Missing X-Frame-Options header - vulnerable to clickjacking attacks',
      severity: 'moderate' as const,
      tags: ['clickjacking', 'framing']
    },
    {
      name: 'X-XSS-Protection',
      missing: 'Missing X-XSS-Protection header - browser XSS filtering not enabled',
      severity: 'minor' as const,
      tags: ['xss', 'browser-protection']
    },
    {
      name: 'Referrer-Policy',
      missing: 'Missing Referrer-Policy header - referrer information may leak',
      severity: 'minor' as const,
      tags: ['privacy', 'referrer']
    },
    {
      name: 'Permissions-Policy',
      missing: 'Missing Permissions-Policy header - no control over browser features',
      severity: 'minor' as const,
      tags: ['permissions', 'feature-policy']
    }
  ]

  for (const header of securityHeaders) {
    if (!headers[header.name.toLowerCase()]) {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: header.missing,
        help: `Add ${header.name} header to improve security`,
        severity: header.severity as 'High' | 'Critical' | 'Medium' | 'Low' | 'Info',
        impact: 'medium',
        tags: ['headers', ...header.tags],
        category: 'headers',
        recommendation: `Set ${header.name} header with appropriate values`,
        createdAt: new Date().toISOString()
      })
    }
  }

  // Check for insecure header values
  if (headers['strict-transport-security']) {
    const hsts = headers['strict-transport-security']
    if (!hsts.includes('max-age=') || !hsts.includes('includeSubDomains')) {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: 'HSTS header is present but may be misconfigured',
        help: 'HSTS should include max-age and includeSubDomains directives',
        severity: 'Medium',
        impact: 'medium',
        tags: ['headers', 'hsts', 'misconfiguration'],
        category: 'headers',
        details: { currentValue: hsts },
        createdAt: new Date().toISOString()
      })
    }
  }

  // Check Server header information disclosure
  if (headers['server']) {
    results.push({
      id: crypto.randomUUID(),
      url,
      message: 'Server header discloses server information',
      help: 'Remove or obfuscate server header to prevent information disclosure',
      severity: 'Low',
      impact: 'low',
      tags: ['headers', 'information-disclosure', 'server'],
      category: 'info-leak',
      details: { serverHeader: headers['server'] },
      createdAt: new Date().toISOString()
    })
  }

  return results
}

async function scanTLS(url: string): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []
  
  try {
    const urlObj = new URL(url)
    if (urlObj.protocol !== 'https:') {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: 'Site does not use HTTPS',
        help: 'Enable HTTPS to encrypt data in transit',
        severity: 'Critical',
        impact: 'high',
        tags: ['tls', 'https', 'encryption'],
        category: 'tls',
        recommendation: 'Implement SSL/TLS certificate and redirect HTTP to HTTPS',
        createdAt: new Date().toISOString()
      })
      return results
    }

    const tlsInfo = await getTLSInfo(urlObj.hostname, urlObj.port ? parseInt(urlObj.port) : 443)
    
    // Check TLS version
    if (tlsInfo.version && (tlsInfo.version.includes('TLSv1.0') || tlsInfo.version.includes('TLSv1.1'))) {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: `Outdated TLS version detected: ${tlsInfo.version}`,
        help: 'Upgrade to TLS 1.2 or higher for better security',
        severity: 'High',
        impact: 'high',
        tags: ['tls', 'outdated', 'version'],
        category: 'tls',
        details: { tlsVersion: tlsInfo.version },
        createdAt: new Date().toISOString()
      })
    }

    // Check certificate validity
    if (!tlsInfo.authorized) {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: 'SSL certificate is not trusted or invalid',
        help: 'Ensure SSL certificate is valid and trusted by major CAs',
        severity: 'Critical',
        impact: 'high',
        tags: ['tls', 'certificate', 'invalid'],
        category: 'tls',
        details: { certificate: tlsInfo.certificate },
        createdAt: new Date().toISOString()
      })
    }

    // Check certificate expiration
    if (tlsInfo.certificate) {
      const expiryDate = new Date(tlsInfo.certificate.valid_to)
      const now = new Date()
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilExpiry < 30) {
        results.push({
          id: crypto.randomUUID(),
          url,
          message: `SSL certificate expires soon (${daysUntilExpiry} days)`,
          help: 'Renew SSL certificate before expiration',
          severity: daysUntilExpiry < 7 ? 'Critical' : 'High',
          impact: 'high',
          tags: ['tls', 'certificate', 'expiring'],
          category: 'tls',
          details: { daysUntilExpiry, expiryDate: tlsInfo.certificate.valid_to },
          createdAt: new Date().toISOString()
        })
      }
    }

  } catch (error) {
    results.push({
      id: crypto.randomUUID(),
      url,
      message: 'Failed to analyze TLS configuration',
      help: 'Unable to connect or analyze TLS settings',
      severity: 'Medium',
      impact: 'medium',
      tags: ['tls', 'error'],
      category: 'tls',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      createdAt: new Date().toISOString()
    })
  }

  return results
}

async function scanCSP(url: string, response: any, page: Page): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []
  const headers = response?.headers() || {}

  const cspHeader = headers['content-security-policy'] || headers['content-security-policy-report-only']

  if (!cspHeader) {
    results.push({
      id: crypto.randomUUID(),
      url,
      message: 'Missing Content Security Policy header',
      help: 'Implement CSP to prevent XSS and injection attacks',
      severity: 'High',
      impact: 'high',
      tags: ['csp', 'xss', 'injection'],
      category: 'csp',
      recommendation: 'Add Content-Security-Policy header with restrictive directives',
      createdAt: new Date().toISOString()
    })
  } else {
    // Analyze CSP for common issues
    if (cspHeader.includes("'unsafe-inline'")) {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: "CSP allows 'unsafe-inline' - vulnerable to inline script injection",
        help: "Remove 'unsafe-inline' and use nonces or hashes for inline scripts",
        severity: 'Medium',
        impact: 'medium',
        tags: ['csp', 'unsafe-inline', 'xss'],
        category: 'csp',
        details: { cspHeader },
        createdAt: new Date().toISOString()
      })
    }

    if (cspHeader.includes("'unsafe-eval'")) {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: "CSP allows 'unsafe-eval' - vulnerable to code injection",
        help: "Remove 'unsafe-eval' to prevent dynamic code execution",
        severity: 'Medium',
        impact: 'medium',
        tags: ['csp', 'unsafe-eval', 'injection'],
        category: 'csp',
        details: { cspHeader },
        createdAt: new Date().toISOString()
      })
    }

    if (cspHeader.includes('*')) {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: 'CSP uses wildcard (*) directive - overly permissive',
        help: 'Replace wildcards with specific domains to improve security',
        severity: 'Low',
        impact: 'low',
        tags: ['csp', 'wildcard', 'permissive'],
        category: 'csp',
        details: { cspHeader },
        createdAt: new Date().toISOString()
      })
    }
  }

  return results
}

async function scanCORS(url: string, response: any, page: Page): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []
  const headers = response?.headers() || {}

  const corsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-methods',
    'access-control-allow-headers'
  ]

  const corsFound = corsHeaders.some(header => headers[header])

  if (corsFound) {
    const origin = headers['access-control-allow-origin']
    const credentials = headers['access-control-allow-credentials']

    if (origin === '*' && credentials === 'true') {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: 'CORS misconfiguration: wildcard origin with credentials',
        help: 'Do not use wildcard origin (*) when credentials are allowed',
        severity: 'Critical',
        impact: 'high',
        tags: ['cors', 'misconfiguration', 'credentials'],
        category: 'cors',
        details: { origin, credentials },
        createdAt: new Date().toISOString()
      })
    }

    if (origin === '*') {
      results.push({
        id: crypto.randomUUID(),
        url,
        message: 'CORS allows all origins (*) - overly permissive',
        help: 'Restrict CORS to specific trusted origins',
        severity: 'Medium',
        impact: 'medium',
        tags: ['cors', 'wildcard', 'permissive'],
        category: 'cors',
        details: { origin },
        createdAt: new Date().toISOString()
      })
    }
  }

  return results
}

async function scanXSS(url: string, page: Page): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []

  try {
    // Test for reflected XSS by injecting test payloads
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "';alert('XSS');//",
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>'
    ]

    for (const payload of xssPayloads) {
      try {
        // Check if URL has query parameters
        const urlObj = new URL(url)
        if (urlObj.search) {
          const testUrl = `${url}&xsstest=${encodeURIComponent(payload)}`
          const response = await page.goto(testUrl, { timeout: 10000 })
          const content = await page.content()
          
          if (content.includes(payload)) {
            results.push({
              id: crypto.randomUUID(),
              url,
              message: 'Potential reflected XSS vulnerability detected',
              help: 'Sanitize and validate all user input to prevent XSS attacks',
              severity: 'Critical',
              impact: 'high',
              tags: ['xss', 'injection', 'reflected'],
              category: 'xss',
              details: { payload, testUrl },
              recommendation: 'Implement proper input validation and output encoding',
              createdAt: new Date().toISOString()
            })
            break // Found XSS, no need to test more payloads
          }
        }
      } catch (error) {
        // Continue with other tests
        continue
      }
    }

    // Check for DOM-based XSS indicators
    const domXssPatterns = [
      'document.write(',
      'innerHTML',
      'outerHTML',
      'document.location',
      'window.location'
    ]

    const content = await page.content()
    const scripts = await page.$$eval('script', (scripts: HTMLScriptElement[]) => scripts.map(s => s.innerHTML))
    
    for (const script of scripts) {
      for (const pattern of domXssPatterns) {
        if (script.includes(pattern) && script.includes('location')) {
          results.push({
            id: crypto.randomUUID(),
            url,
            message: 'Potential DOM-based XSS vulnerability detected',
            help: 'Review JavaScript code for unsafe DOM manipulation',
            severity: 'High',
            impact: 'high',
            tags: ['xss', 'dom', 'javascript'],
            category: 'xss',
            details: { pattern, scriptSnippet: script.substring(0, 200) },
            createdAt: new Date().toISOString()
          })
          break
        }
      }
    }

  } catch (error) {
    console.warn('XSS scan error:', error)
  }

  return results
}

async function scanInjectionVulnerabilities(url: string, page: Page): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []

  try {
    // SQL Injection test payloads
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT NULL, NULL, NULL --"
    ]

    // Command injection payloads
    const cmdPayloads = [
      "; ls",
      "| whoami",
      "&& dir"
    ]

    const urlObj = new URL(url)
    if (urlObj.search) {
      // Test SQL injection
      for (const payload of sqlPayloads) {
        try {
          const testUrl = `${url}&sqltest=${encodeURIComponent(payload)}`
          const response = await page.goto(testUrl, { timeout: 10000 })
          const content = (await page.content()).toLowerCase()
          
          // Look for SQL error messages
          const sqlErrors = [
            'sql syntax',
            'mysql_',
            'sqlite_',
            'postgresql',
            'ora-',
            'sqlstate',
            'database'
          ]
          
          if (sqlErrors.some(error => content.includes(error))) {
            results.push({
              id: crypto.randomUUID(),
              url,
              message: 'Potential SQL injection vulnerability detected',
              help: 'Use parameterized queries to prevent SQL injection',
              severity: 'Critical',
              impact: 'high',
              tags: ['sqli', 'injection', 'database'],
              category: 'injection',
              details: { payload, testUrl },
              recommendation: 'Implement prepared statements and input validation',
              createdAt: new Date().toISOString()
            })
            break
          }
        } catch (error) {
          continue
        }
      }
    }

  } catch (error) {
    console.warn('Injection scan error:', error)
  }

  return results
}

async function scanAuthentication(url: string, page: Page, responses: any[]): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []

  try {
    // Check for authentication bypass attempts
    const authUrls = [
      '/admin',
      '/login',
      '/auth',
      '/dashboard',
      '/panel',
      '/admin/dashboard',
      '/wp-admin',
      '/wp-login',
      '/wp-login.php',
      '/wp-login.php?action=register',
      '/wp-login.php?action=lostpassword',
      '/wp-login.php?action=resetpass',
      '/wp-login.php?action=rp',
      '/wp-login.php?action=lostpassword',
    ]

    for (const authPath of authUrls) {
      try {
        const authUrl = new URL(authPath, url).href
        const response = await page.goto(authUrl, { timeout: 10000 })
        
        if (response?.status() === 200) {
          const content = (await page.content()).toLowerCase()
          
          // Check if admin panel is accessible without authentication
          if (content.includes('admin') && content.includes('dashboard')) {
            results.push({
              id: crypto.randomUUID(),
              url: authUrl,
              message: 'Potential authentication bypass - admin panel accessible',
              help: 'Ensure proper authentication is required for administrative areas',
              severity: 'Critical',
              impact: 'high',
              tags: ['auth', 'bypass', 'admin'],
              category: 'auth',
              createdAt: new Date().toISOString()
            })
          }
        }
      } catch (error) {
        continue
      }
    }

    // Check for weak session management
    const cookies = await page.context().cookies()
    for (const cookie of cookies) {
      if (cookie.name.toLowerCase().includes('session') || cookie.name.toLowerCase().includes('auth')) {
        if (!cookie.secure) {
          results.push({
            id: crypto.randomUUID(),
            url,
            message: 'Session cookie not marked as Secure',
            help: 'Mark authentication cookies as Secure to prevent transmission over HTTP',
            severity: 'High',
            impact: 'medium',
            tags: ['auth', 'session', 'cookie', 'secure'],
            category: 'auth',
            details: { cookieName: cookie.name },
            createdAt: new Date().toISOString()
          })
        }

        if (!cookie.httpOnly) {
          results.push({
            id: crypto.randomUUID(),
            url,
            message: 'Session cookie not marked as HttpOnly',
            help: 'Mark authentication cookies as HttpOnly to prevent XSS access',  
            severity: 'High',
            impact: 'medium',
            tags: ['auth', 'session', 'cookie', 'httponly'],
            category: 'auth',
            details: { cookieName: cookie.name },
            createdAt: new Date().toISOString()
          })
        }
      }
    }

  } catch (error) {
    console.warn('Authentication scan error:', error)
  }

  return results
}

async function scanInformationLeakage(url: string, page: Page, responses: any[]): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []

  try {
    // Check for common information disclosure endpoints
    const infoEndpoints = [
      '/.env',
      '/config.php',
      '/wp-config.php',
      '/.git/config',
      '/robots.txt',
      '/sitemap.xml',
      '/.htaccess',
      '/web.config',
      '/package.json'
    ]

    for (const endpoint of infoEndpoints) {
      try {
        const testUrl = new URL(endpoint, url).href
        const response = await page.goto(testUrl, { timeout: 10000 })
        
        if (response?.status() === 200) {
          const content = await page.content()
          
          if (endpoint.includes('.env') && content.includes('=')) {
            results.push({
              id: crypto.randomUUID(),
              url: testUrl,
              message: 'Environment file (.env) exposed',
              help: 'Remove or restrict access to environment configuration files',
              severity: 'Critical',
              impact: 'high',
              tags: ['info-leak', 'environment', 'credentials'],
              category: 'info-leak',
              createdAt: new Date().toISOString()
            })
          }

          if (endpoint.includes('.git')) {
            results.push({
              id: crypto.randomUUID(),
              url: testUrl,
              message: 'Git repository files exposed',
              help: 'Remove .git directory from web root',
              severity: 'High',
              impact: 'medium',
              tags: ['info-leak', 'git', 'source-code'],
              category: 'info-leak',
              createdAt: new Date().toISOString()
            })
          }
        }
      } catch (error) {
        continue
      }
    }

    // Check page content for information leaks
    const content = await page.content()
    const infoPatterns = [
      { pattern: /password[\s]*[:=][\s]*["']?[\w]+/gi, type: 'password' },
      { pattern: /api[_-]?key[\s]*[:=][\s]*["']?[\w\-]+/gi, type: 'api-key' },
      { pattern: /secret[\s]*[:=][\s]*["']?[\w]+/gi, type: 'secret' },
      { pattern: /token[\s]*[:=][\s]*["']?[\w\-\.]+/gi, type: 'token' }
    ]

    for (const { pattern, type } of infoPatterns) {
      const matches = content.match(pattern)
      if (matches && matches.length > 0) {
        results.push({
          id: crypto.randomUUID(),
          url,
          message: `Potential ${type} leaked in page source`,
          help: `Remove ${type} from client-side code`,
          severity: 'High',
          impact: 'high',
          tags: ['info-leak', type, 'source-code'],
          category: 'info-leak',
          details: { matches: matches.slice(0, 3) }, // Only show first 3 matches
          createdAt: new Date().toISOString()
        })
      }
    }

  } catch (error) {
    console.warn('Information leakage scan error:', error)
  }

  return results
}

async function scanOWASPTop10(url: string, page: Page, responses: any[]): Promise<SecurityResult[]> {
  const results: SecurityResult[] = []

  try {
    // A01:2021 – Broken Access Control
    // Check for directory traversal
    const traversalPaths = [
      '../../etc/passwd',
      '../../../windows/system32/drivers/etc/hosts',
      '....//....//etc/passwd'
    ]

    for (const path of traversalPaths) {
      try {
        const testUrl = `${url}?file=${encodeURIComponent(path)}`
        const response = await page.goto(testUrl, { timeout: 10000 })
        const content = await page.content()
        
        if (content.includes('root:') || content.includes('localhost')) {
          results.push({
            id: crypto.randomUUID(),
            url: testUrl,
            message: 'Potential directory traversal vulnerability (OWASP A01)',
            help: 'Validate and sanitize file path inputs',
            severity: 'Critical',
            impact: 'high',
            tags: ['owasp', 'a01', 'access-control', 'traversal'],
            category: 'owasp',
            createdAt: new Date().toISOString()
          })
          break
        }
      } catch (error) {
        continue
      }
    }

    // A03:2021 – Injection (already covered in injection scan)
    
    // A05:2021 – Security Misconfiguration
    // Check for default credentials
    const defaultCreds = [
      { user: 'admin', pass: 'admin' },
      { user: 'admin', pass: 'password' },
      { user: 'root', pass: 'root' }
    ]

    // A06:2021 – Vulnerable and Outdated Components
    // Check for version disclosure in headers and content
    const versionPatterns = [
      /server:\s*([^\r\n]+)/gi,
      /x-powered-by:\s*([^\r\n]+)/gi,
      /generator.*?content=["']([^"']+)/gi
    ]

    const content = await page.content()
    const responseHeaders = responses.length > 0 ? responses[0].headers : {}
    const headerString = JSON.stringify(responseHeaders)

    for (const pattern of versionPatterns) {
      const matches = (content + headerString).match(pattern)
      if (matches && matches.length > 0) {
        results.push({
          id: crypto.randomUUID(),
          url,
          message: 'Software version information disclosed (OWASP A06)',
          help: 'Hide or obfuscate software version information',
          severity: 'Low',
          impact: 'low',
          tags: ['owasp', 'a06', 'information-disclosure', 'version'],
          category: 'owasp',
          details: { versions: matches.slice(0, 3) },
          createdAt: new Date().toISOString()
        })
        break
      }
    }

  } catch (error) {
    console.warn('OWASP scan error:', error)
  }

  return results
}

async function getTLSInfo(hostname: string, port: number): Promise<TLSInfo> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(port, hostname, {
      servername: hostname,
      rejectUnauthorized: false
    }, () => {
      const cert = socket.getPeerCertificate(true)
      const cipher = socket.getCipher()
      const protocol = socket.getProtocol()
      
      const tlsInfo: TLSInfo = {
        version: protocol || 'unknown',
        cipher: cipher?.name || 'unknown',
        protocol: protocol || 'unknown',
        authorized: socket.authorized,
        certificate: {
          subject: cert.subject?.CN || 'unknown',
          issuer: cert.issuer?.CN || 'unknown',
          valid_from: cert.valid_from || 'unknown',
          valid_to: cert.valid_to || 'unknown',
          fingerprint: cert.fingerprint || 'unknown'
        }
      }
      
      socket.end()
      resolve(tlsInfo)
    })

    socket.on('error', (error) => {
      reject(error)
    })

    socket.setTimeout(10000, () => {
      socket.destroy()
      reject(new Error('TLS connection timeout'))
    })
  })
}

function generateSecuritySummary(results: SecurityResult[]): SecuritySummary {
  const summary: SecuritySummary = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    info: 0,
    total: results.length,
    urlsAnalyzed: new Set(results.map(r => r.url)).size,
    categorySummary: {
      headers: 0,
      tls: 0,
      csp: 0,
      injection: 0,
      auth: 0,
      cors: 0,
      xss: 0,
      sqli: 0,
      'info-leak': 0,
      owasp: 0
    }
  }

  results.forEach(result => {
    // Count by severity - map database enum values to summary fields
    switch (result.severity) {
      case 'Critical':
        summary.critical++
        break
      case 'High':
        summary.serious++
        break
      case 'Medium':
        summary.moderate++
        break
      case 'Low':
        summary.minor++
        break
      case 'Info':
        summary.info++
        break
      default:
        // For backwards compatibility with old severity values
        if (result.severity === 'critical') summary.critical++
        else if (result.severity === 'serious') summary.serious++
        else if (result.severity === 'moderate') summary.moderate++
        else if (result.severity === 'minor') summary.minor++
        else summary.info++
    }
    
    // Count by category
    if (result.category in summary.categorySummary) {
      summary.categorySummary[result.category]++
    }
  })

  return summary
} 