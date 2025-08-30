import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright-core";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const scanId = uuidv4();
    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    
    // Create download directory
    await fs.mkdir(downloadDir, { recursive: true });

    // Launch Playwright browser
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const page = await context.newPage();
    
    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Track resources
    const resources: { [key: string]: Buffer } = {};
    const cssUrls: string[] = [];
    const jsUrls: string[] = [];
    const imageUrls: string[] = [];

    // Intercept network requests to capture resources
    await page.route('**/*', async (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      
      try {
        // Continue the request
        await route.continue();
        
        // Get the response after it completes
        const response = await page.waitForResponse(request.url(), { timeout: 5000 }).catch(() => null);
        
        if (response && response.ok()) {
          const contentType = response.headers()['content-type'] || '';
          
          if (resourceType === 'stylesheet' || contentType.includes('text/css')) {
            const cssContent = await response.text();
            const fileName = getFileName(request.url(), 'css');
            resources[fileName] = Buffer.from(cssContent);
            cssUrls.push(fileName);
          } else if (resourceType === 'script' || contentType.includes('javascript')) {
            const jsContent = await response.text();
            const fileName = getFileName(request.url(), 'js');
            resources[fileName] = Buffer.from(jsContent);
            jsUrls.push(fileName);
          } else if (resourceType === 'image') {
            const imageBuffer = await response.body();
            const fileName = getFileName(request.url(), getImageExtension(contentType));
            resources[fileName] = imageBuffer;
            imageUrls.push(fileName);
          }
        }
      } catch (error) {
        console.warn(`Failed to capture resource ${request.url()}:`, error);
        await route.continue();
      }
    });

    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Wait for dynamic content to load
    await page.waitForTimeout(3000);

    // Get the final HTML content
    const html = await page.content();

    // Process and inline resources
    const processedHtml = await inlineResources(html, resources, url);

    // Save the main HTML file
    await fs.writeFile(path.join(downloadDir, "index.html"), processedHtml);

    // Save all captured resources
    for (const [fileName, content] of Object.entries(resources)) {
      const resourcePath = path.join(downloadDir, fileName);
      await fs.writeFile(resourcePath, content);
    }

    // Create metadata file
    const metadata = {
      scanId,
      url,
      timestamp: new Date().toISOString(),
      resources: {
        css: cssUrls,
        js: jsUrls,
        images: imageUrls
      },
      downloadPath: downloadDir,
      method: 'playwright'
    };

    await fs.writeFile(
      path.join(downloadDir, "metadata.json"), 
      JSON.stringify(metadata, null, 2)
    );

    await browser.close();

    return NextResponse.json({
      success: true,
      scanId,
      downloadPath: downloadDir,
      resourceCount: Object.keys(resources).length,
      method: 'playwright'
    });

  } catch (error) {
    console.error("Playwright scraping error:", error);
    return NextResponse.json(
      { error: "Failed to scrape website with Playwright" },
      { status: 500 }
    );
  }
}

function getFileName(url: string, extension: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let fileName = path.basename(pathname) || 'index';
    
    // Clean filename - remove invalid characters and limit length
    fileName = fileName
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid Windows characters
      .replace(/[^\w\-_.]/g, '_') // Replace non-alphanumeric characters
      .substring(0, 50); // Limit length to 50 characters
    
    const nameWithoutExt = path.parse(fileName).name || 'resource';
    const timestamp = Date.now();
    const shortName = nameWithoutExt.substring(0, 20); // Further limit base name
    
    return `${shortName}_${timestamp}.${extension}`;
  } catch {
    return `resource_${Date.now()}.${extension}`;
  }
}

function getImageExtension(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('webp')) return 'webp';
  return 'img';
}

async function inlineResources(html: string, resources: { [key: string]: Buffer }, baseUrl: string): Promise<string> {
  let modifiedHtml = html;
  
  // Replace external CSS links with inline styles
  for (const [fileName, content] of Object.entries(resources)) {
    if (fileName.endsWith('.css')) {
      const cssContent = content.toString();
      // Find and replace link tags that might reference this CSS
      const linkRegex = /<link[^>]*rel=['"]stylesheet['"][^>]*>/gi;
      modifiedHtml = modifiedHtml.replace(linkRegex, (match) => {
        // Replace first stylesheet link with inline CSS
        if (match.includes('stylesheet')) {
          return `<style type="text/css">\n${cssContent}\n</style>`;
        }
        return match;
      });
    }
  }

  // Update image sources to use local files
  for (const [fileName] of Object.entries(resources)) {
    if (fileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
      const imgRegex = /src=['"]([^'"]*)['"]/gi;
      modifiedHtml = modifiedHtml.replace(imgRegex, (match, src) => {
        try {
          const srcUrl = new URL(src, baseUrl);
          if (srcUrl.origin !== new URL(baseUrl).origin) {
            return `src="./${fileName}"`;
          }
        } catch {
          // If URL parsing fails, keep original
        }
        return match;
      });
    }
  }

  return modifiedHtml;
}
