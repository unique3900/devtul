import { NextRequest, NextResponse } from "next/server"
import { chromium, Browser, Page } from "playwright-core"

// Browser instance cache for reuse
let browserInstance: Browser | null = null
let browserCleanupTimer: NodeJS.Timeout | null = null

// Cache for frequently accessed elements
const elementCache = new Map<string, string>()

// Helper function to get or create browser instance
async function getBrowserInstance(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-first-run',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-client-side-phishing-detection',
        '--disable-features=VizDisplayCompositor',
        '--run-all-compositor-stages-before-draw',
        '--disable-threaded-animation',
        '--disable-threaded-scrolling',
        '--disable-checker-imaging',
        '--disable-new-content-rendering-timeout',
        '--disable-image-animation-resync',
        '--disable-partial-raster',
        '--disable-features=PaintHolding'
      ]
    })
  }
  
  // Reset cleanup timer when browser is accessed
  if (browserCleanupTimer) {
    clearTimeout(browserCleanupTimer)
  }
  
  // Set a 5-minute cleanup timer
  browserCleanupTimer = setTimeout(async () => {
    if (browserInstance) {
      try {
        await browserInstance.close()
      } catch (e) {
        console.warn('Error closing browser:', e)
      }
      browserInstance = null
    }
  }, 5 * 60 * 1000) // 5 minutes
  
  return browserInstance
}

// Enhanced element selector creation with priority targeting
function createOptimizedSelector(elementHtml: string): string[] {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(elementHtml, 'text/html')
    const element = doc.body.firstElementChild

    if (!element) return []

    const selectors: string[] = []
    const tagName = element.tagName.toLowerCase()

    // Priority 1: ID selector (most specific)
    const id = element.getAttribute('id')
    if (id) {
      selectors.push(`#${id}`)
    }

    // Priority 2: Data attributes (often unique)
    const dataTestId = element.getAttribute('data-testid')
    if (dataTestId) {
      selectors.push(`[data-testid="${dataTestId}"]`)
    }

    const dataId = element.getAttribute('data-id')
    if (dataId) {
      selectors.push(`[data-id="${dataId}"]`)
    }

    // Priority 3: Class selectors (with tag)
    const className = element.getAttribute('class')
    if (className) {
      const classes = className.split(' ').filter(c => c.trim())
      if (classes.length > 0) {
        // Try with all classes first
        selectors.push(`${tagName}.${classes.join('.')}`)
        // Then try individual classes
        classes.forEach(cls => {
          selectors.push(`${tagName}.${cls}`)
        })
      }
    }

    // Priority 4: Attribute-based selectors for specific elements
    if (tagName === 'img') {
      const src = element.getAttribute('src')
      const alt = element.getAttribute('alt')
      if (src) {
        const srcPath = new URL(src, 'http://example.com').pathname
        const filename = srcPath.split('/').pop()
        if (filename) {
          selectors.push(`img[src*="${filename}"]`)
        }
      }
      if (alt) {
        selectors.push(`img[alt="${alt}"]`)
      }
    }

    if (tagName === 'a') {
      const href = element.getAttribute('href')
      if (href) {
        selectors.push(`a[href="${href}"]`)
      }
    }

    if (tagName === 'input' || tagName === 'button') {
      const type = element.getAttribute('type')
      const name = element.getAttribute('name')
      if (type) {
        selectors.push(`${tagName}[type="${type}"]`)
      }
      if (name) {
        selectors.push(`${tagName}[name="${name}"]`)
      }
    }

    // Priority 5: Text content selectors (for elements with short text)
    const textContent = element.textContent?.trim()
    if (textContent && textContent.length > 0 && textContent.length <= 50) {
      // Use more specific text matching
      selectors.push(`${tagName}:has-text("${textContent}")`)
      // Also try partial text matching
      if (textContent.length > 10) {
        selectors.push(`${tagName}:has-text("${textContent.substring(0, 20)}")`)
      }
    }

    // Priority 6: Structural selectors (last resort)
    if (selectors.length === 0) {
      selectors.push(tagName)
    }

    return selectors

  } catch (error) {
    console.error('Error creating optimized selector:', error)
    return []
  }
}

// Enhanced element finding with multiple strategies
async function findElement(page: Page, elementPath: string | null, elementHtml: string | null) {
  const strategies = []

  // Strategy 1: Use provided element path
  if (elementPath) {
    strategies.push({
      name: 'elementPath',
      selector: elementPath,
      method: 'querySelector'
    })
  }

  // Strategy 2: Use optimized selectors from HTML
  if (elementHtml) {
    const selectors = createOptimizedSelector(elementHtml)
    selectors.forEach((selector, index) => {
      strategies.push({
        name: `optimizedSelector${index}`,
        selector: selector,
        method: 'querySelector'
      })
    })
  }

  // Try each strategy in order
  for (const strategy of strategies) {
    try {
      const element = await page.$(strategy.selector)
      if (element) {
        console.log(`Found element using ${strategy.name}: ${strategy.selector}`)
        return element
      }
    } catch (e) {
      console.log(`Strategy ${strategy.name} failed: ${e}`)
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { url, elementPath, element } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Check cache first
    const cacheKey = `${url}:${elementPath || ''}:${element || ''}`
    if (elementCache.has(cacheKey)) {
      console.log(`Cache hit for ${cacheKey}`)
      // Note: In a real implementation, you'd cache the actual screenshot
      // For now, we'll just note the cache hit and continue
    }

    // Get browser instance (reused)
    const browser = await getBrowserInstance()
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    const page = await context.newPage()

    // Optimize page loading
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    })

    // Block unnecessary resources for faster loading
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        route.abort()
      } else {
        route.continue()
      }
    })

    // Navigate with optimized settings
    await page.goto(url, { 
      waitUntil: "domcontentloaded", // Faster than networkidle
      timeout: 20000 // Reduced timeout
    })

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded')

    let screenshot: Buffer

    try {
      // Use enhanced element finding
      const elementHandle = await findElement(page, elementPath, element)

      if (elementHandle) {
        // Take screenshot of the specific element with optimized settings
        screenshot = await elementHandle.screenshot({ 
          type: 'png',
          timeout: 5000, // Reduced timeout
          animations: 'disabled', // Disable animations for faster capture
          caret: 'hide' // Hide cursor
        })
        
        console.log(`Element screenshot captured in ${Date.now() - startTime}ms`)
      } else {
        // Fallback: take viewport screenshot (faster than full page)
        screenshot = await page.screenshot({ 
          type: 'png',
          timeout: 5000,
          animations: 'disabled',
          caret: 'hide'
        })
        
        console.log(`Viewport screenshot captured in ${Date.now() - startTime}ms`)
      }

    } catch (screenshotError) {
      console.error('Error taking screenshot:', screenshotError)
      // Final fallback: simple viewport screenshot
      screenshot = await page.screenshot({ 
        type: 'png',
        timeout: 5000
      })
    }

    // Close context (but keep browser instance for reuse)
    await context.close()

    // Cache the result (in a real implementation, you'd cache the screenshot)
    elementCache.set(cacheKey, 'cached')
    
    // Clean up old cache entries (keep only last 100)
    if (elementCache.size > 100) {
      const keys = Array.from(elementCache.keys())
      for (let i = 0; i < keys.length - 100; i++) {
        elementCache.delete(keys[i])
      }
    }

    console.log(`Total capture time: ${Date.now() - startTime}ms`)

    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Capture-Time': `${Date.now() - startTime}ms`
      },
    })

  } catch (error) {
    console.error('Error capturing element screenshot:', error)
    return NextResponse.json(
      { error: "Failed to capture screenshot" },
      { status: 500 }
    )
  }
} 