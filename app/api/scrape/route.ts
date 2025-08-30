import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
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

    // Launch Puppeteer
    const browser = await puppeteer.launch({
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

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Enable request interception to capture resources
    await page.setRequestInterception(true);
    
    const resources: { [key: string]: Buffer } = {};
    const cssUrls: string[] = [];
    const jsUrls: string[] = [];
    const imageUrls: string[] = [];

    page.on('request', (request) => {
      request.continue();
    });

    page.on('response', async (response) => {
      const responseUrl = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      try {
        if (contentType.includes('text/css')) {
          const cssContent = await response.text();
          const fileName = getFileName(responseUrl, 'css');
          resources[fileName] = Buffer.from(cssContent);
          cssUrls.push(fileName);
        } else if (contentType.includes('javascript') || contentType.includes('application/javascript')) {
          const jsContent = await response.text();
          const fileName = getFileName(responseUrl, 'js');
          resources[fileName] = Buffer.from(jsContent);
          jsUrls.push(fileName);
        } else if (contentType.includes('image/')) {
          const imageBuffer = await response.buffer();
          const fileName = getFileName(responseUrl, getImageExtension(contentType));
          resources[fileName] = imageBuffer;
          imageUrls.push(fileName);
        }
      } catch (error) {
        console.warn(`Failed to capture resource ${responseUrl}:`, error);
      }
    });

    // Navigate to the page and wait for it to load completely
    await page.goto(url, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000 
    });

    // Wait for any dynamic content to load
    await page.waitForTimeout(3000);

    // Execute JavaScript to ensure all dynamic content is rendered
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', () => resolve());
        }
      });
    });

    // Get the final HTML after all JavaScript execution
    const html = await page.content();

    // Extract and inline CSS
    const inlinedHtml = await inlineResources(html, resources, url);

    // Save the main HTML file
    await fs.writeFile(path.join(downloadDir, "index.html"), inlinedHtml);

    // Save all captured resources
    for (const [fileName, content] of Object.entries(resources)) {
      const resourcePath = path.join(downloadDir, fileName);
      await fs.writeFile(resourcePath, content);
    }

    // Create a metadata file
    const metadata = {
      scanId,
      url,
      timestamp: new Date().toISOString(),
      resources: {
        css: cssUrls,
        js: jsUrls,
        images: imageUrls
      },
      downloadPath: downloadDir
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
      resourceCount: Object.keys(resources).length
    });

  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { error: "Failed to scrape website" },
      { status: 500 }
    );
  }
}

function getFileName(url: string, extension: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = path.basename(pathname) || 'index';
    const nameWithoutExt = path.parse(fileName).name || 'resource';
    return `${nameWithoutExt}_${Date.now()}.${extension}`;
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
      const linkRegex = /<link[^>]*href=['"][^'"]*['"][^>]*>/gi;
      modifiedHtml = modifiedHtml.replace(linkRegex, (match) => {
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
      const imgRegex = new RegExp(`src=['"](.*?)['"`, 'gi');
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
