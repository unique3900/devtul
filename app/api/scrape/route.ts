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
      
      // Skip data URLs and very long URLs
      if (responseUrl.startsWith('data:') || responseUrl.length > 500) {
        return;
      }
      
      try {
        const contentEncoding = response.headers()['content-encoding'] || '';
        const isCompressed = contentEncoding.includes('gzip') || contentEncoding.includes('br') || contentEncoding.includes('deflate');
        
        // Skip compressed files that can't be properly decoded as text
        if (isCompressed && (contentType.includes('text/css') || contentType.includes('javascript'))) {
          console.log(`Skipping compressed resource: ${responseUrl} (encoding: ${contentEncoding})`);
          return;
        }
        
        // Capture CSS files (including various content types and extensions)
        if (contentType.includes('text/css') || contentType.includes('text/stylesheet') ||
            (responseUrl.endsWith('.css') && !isCompressed) || 
            (responseUrl.match(/\.css(\?|$)/) && !isCompressed)) {
          try {
            const cssContent = await response.text();
            // Validate that it's actually CSS content, not binary
            if (cssContent && typeof cssContent === 'string' && !isBinaryContent(cssContent)) {
              const fileName = getFileName(responseUrl, 'css');
              if (!resources[fileName]) { // Avoid duplicates
                resources[fileName] = Buffer.from(cssContent, 'utf8');
                cssUrls.push(fileName);
                console.log(`Captured CSS: ${fileName} from ${responseUrl}`);
              }
            } else {
              console.log(`Skipping invalid CSS content: ${responseUrl}`);
            }
          } catch (error) {
            console.warn(`Failed to decode CSS as text: ${responseUrl}`, error);
          }
        } 
        // Capture JavaScript files (including more patterns)
        else if (contentType.includes('javascript') || contentType.includes('application/javascript') || 
                 contentType.includes('text/javascript') || 
                 (responseUrl.endsWith('.js') && !isCompressed) || 
                 (responseUrl.match(/\.js(\?|$)/) && !isCompressed)) {
          try {
            const jsContent = await response.text();
            // Validate that it's actually JS content, not binary
            if (jsContent && typeof jsContent === 'string' && !isBinaryContent(jsContent)) {
              const fileName = getFileName(responseUrl, 'js');
              if (!resources[fileName]) { // Avoid duplicates
                resources[fileName] = Buffer.from(jsContent, 'utf8');
                jsUrls.push(fileName);
                console.log(`Captured JS: ${fileName} from ${responseUrl}`);
              }
            } else {
              console.log(`Skipping invalid JS content: ${responseUrl}`);
            }
          } catch (error) {
            console.warn(`Failed to decode JS as text: ${responseUrl}`, error);
          }
        } 
        // Capture images (including more formats)
        else if (contentType.includes('image/') || 
                 responseUrl.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff)(\?|$)/i)) {
          const imageBuffer = await response.buffer();
          const fileName = getFileName(responseUrl, getImageExtension(contentType));
          if (!resources[fileName]) { // Avoid duplicates
            resources[fileName] = imageBuffer;
            imageUrls.push(fileName);
            console.log(`Captured image: ${fileName} from ${responseUrl}`);
          }
        }
        // Capture fonts
        else if (contentType.includes('font/') || contentType.includes('application/font') ||
                 responseUrl.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/i)) {
          const fontBuffer = await response.buffer();
          const fileName = getFileName(responseUrl, 'font');
          if (!resources[fileName]) {
            resources[fileName] = fontBuffer;
            console.log(`Captured font: ${fileName} from ${responseUrl}`);
          }
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

    // Additional wait to capture any lazy-loaded resources
    await page.waitForTimeout(2000);
    
    // Trigger any lazy loading by scrolling
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await page.waitForTimeout(1000);

    // Get the final HTML after all JavaScript execution
    const html = await page.content();
    
    // Additional resource discovery from HTML content
    console.log("Scanning HTML for additional resources...");
    await discoverAdditionalResources(page, resources, cssUrls, jsUrls, imageUrls, url);

    // Extract and inline CSS
    const inlinedHtml = await inlineResources(html, resources, url);

    // Save the main HTML file
    await fs.writeFile(path.join(downloadDir, "index.html"), inlinedHtml);
    
    // Also save a copy of the original HTML without inlining for AI processing
    await fs.writeFile(path.join(downloadDir, "index_original.html"), html);

    // Save all captured resources with error handling
    for (const [fileName, content] of Object.entries(resources)) {
      try {
        const resourcePath = path.join(downloadDir, fileName);
        await fs.writeFile(resourcePath, content);
      } catch (error) {
        console.warn(`Failed to save resource ${fileName}:`, error);
        // Continue with other resources even if one fails
      }
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

    console.log(`Scraping completed for ${url}`);
    console.log(`Total resources captured: ${Object.keys(resources).length}`);
    console.log(`CSS files: ${cssUrls.length}`, cssUrls);
    console.log(`JS files: ${jsUrls.length}`, jsUrls);
    console.log(`Images: ${imageUrls.length}`, imageUrls);
    console.log(`Resources will be injected directly into HTML for better compatibility`);

    return NextResponse.json({
      success: true,
      scanId,
      downloadPath: downloadDir,
      resourceCount: Object.keys(resources).length,
      resources: {
        css: cssUrls.length,
        js: jsUrls.length,
        images: imageUrls.length
      }
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
  
  // Collect all CSS content to inject
  const allCssContent: string[] = [];
  const allJsContent: string[] = [];
  
  // Create URL to filename mapping for images
  const imageMapping = new Map<string, string>();
  
  // Process all resources
  for (const [fileName, content] of Object.entries(resources)) {
    if (fileName.endsWith('.css')) {
      // Collect CSS content for injection
      let cssContent = content.toString();
      
      // Fix relative URLs in CSS to point to our local images
      cssContent = cssContent.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match, url) => {
        try {
          if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
            return match;
          }
          
          const fullUrl = new URL(url, baseUrl);
          const pathname = fullUrl.pathname;
          const filename = pathname.split('/').pop() || '';
          
          // Find matching local image file
          for (const [imgFileName] of Object.entries(resources)) {
            if (imgFileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) && 
                (imgFileName.includes(filename) || filename.includes(imgFileName.split('_')[0]))) {
              imageMapping.set(url, imgFileName);
              return `url("data:image/${getImageMimeType(imgFileName)};base64,${resources[imgFileName].toString('base64')}")`;
            }
          }
          
          return match;
        } catch {
          return match;
        }
      });
      
      allCssContent.push(`/* CSS from ${fileName} */\n${cssContent}\n`);
    } else if (fileName.endsWith('.js')) {
      // Collect JS content for injection
      const jsContent = content.toString();
      allJsContent.push(`/* JS from ${fileName} */\n${jsContent}\n`);
    }
  }
  
  // Remove all existing CSS link tags
  modifiedHtml = modifiedHtml.replace(/<link[^>]*rel=['"]stylesheet['"][^>]*>/gi, '');
  
  // Remove all existing script tags with src attributes
  modifiedHtml = modifiedHtml.replace(/<script[^>]*src=['"][^'"]*['"][^>]*><\/script>/gi, '');
  
  // Inject all CSS into the head
  if (allCssContent.length > 0) {
    const combinedCss = allCssContent.join('\n');
    const cssTag = `<style type="text/css">\n${combinedCss}\n</style>`;
    
    if (modifiedHtml.includes('</head>')) {
      modifiedHtml = modifiedHtml.replace('</head>', `${cssTag}\n</head>`);
    } else if (modifiedHtml.includes('<head>')) {
      modifiedHtml = modifiedHtml.replace('<head>', `<head>\n${cssTag}`);
    } else {
      // If no head tag, add one
      modifiedHtml = `<head>${cssTag}</head>${modifiedHtml}`;
    }
  }
  
  // Inject all JavaScript at the end of body
  if (allJsContent.length > 0) {
    const combinedJs = allJsContent.join('\n');
    const jsTag = `<script type="text/javascript">\n${combinedJs}\n</script>`;
    
    if (modifiedHtml.includes('</body>')) {
      modifiedHtml = modifiedHtml.replace('</body>', `${jsTag}\n</body>`);
    } else {
      // If no body tag, add at the end
      modifiedHtml = `${modifiedHtml}\n${jsTag}`;
    }
  }
  
  // Update image sources to use base64 data URLs for better compatibility
  const imgRegex = /<img[^>]*src=['"]([^'"]+)['"][^>]*>/gi;
  modifiedHtml = modifiedHtml.replace(imgRegex, (match, src) => {
    try {
      const fullUrl = new URL(src, baseUrl);
      const pathname = fullUrl.pathname;
      const filename = pathname.split('/').pop() || '';
      
      // Find matching local file
      for (const [fileName, content] of Object.entries(resources)) {
        if (fileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) && 
            (fileName.includes(filename) || filename.includes(fileName.split('_')[0]))) {
          const mimeType = getImageMimeType(fileName);
          const base64Data = content.toString('base64');
          return match.replace(src, `data:image/${mimeType};base64,${base64Data}`);
        }
      }
      
      return match;
    } catch {
      return match;
    }
  });

  return modifiedHtml;
}

async function discoverAdditionalResources(
  page: any, 
  resources: { [key: string]: Buffer }, 
  cssUrls: string[], 
  jsUrls: string[], 
  imageUrls: string[], 
  baseUrl: string
) {
  try {
    // Get all link tags for stylesheets
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', (links: any[]) => 
      links.map(link => link.href).filter(href => href)
    );
    
    // Get all script tags with src
    const scripts = await page.$$eval('script[src]', (scripts: any[]) => 
      scripts.map(script => script.src).filter(src => src)
    );
    
    // Get all img tags
    const images = await page.$$eval('img[src]', (imgs: any[]) => 
      imgs.map(img => img.src).filter(src => src && !src.startsWith('data:'))
    );
    
    // Fetch missing stylesheets
    for (const href of stylesheets) {
      try {
        const fileName = getFileName(href, 'css');
        if (!resources[fileName]) {
          const response = await page.goto(href, { waitUntil: 'networkidle0', timeout: 10000 });
          if (response && response.ok()) {
            const cssContent = await response.text();
            resources[fileName] = Buffer.from(cssContent);
            cssUrls.push(fileName);
            console.log(`Additional CSS captured: ${fileName}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to capture additional CSS ${href}:`, error);
      }
    }
    
    // Fetch missing scripts
    for (const src of scripts) {
      try {
        const fileName = getFileName(src, 'js');
        if (!resources[fileName]) {
          const response = await page.goto(src, { waitUntil: 'networkidle0', timeout: 10000 });
          if (response && response.ok()) {
            const jsContent = await response.text();
            resources[fileName] = Buffer.from(jsContent);
            jsUrls.push(fileName);
            console.log(`Additional JS captured: ${fileName}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to capture additional JS ${src}:`, error);
      }
    }
    
    // Return to original page
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    
  } catch (error) {
    console.warn("Error discovering additional resources:", error);
  }
}

function isBinaryContent(content: string): boolean {
  // Check for binary content indicators
  if (!content || typeof content !== 'string') return true;
  
  // Check for null bytes (common in binary files)
  if (content.includes('\0')) return true;
  
  // Check for high percentage of non-printable characters
  let nonPrintableCount = 0;
  const sampleSize = Math.min(content.length, 1000); // Check first 1000 chars
  
  for (let i = 0; i < sampleSize; i++) {
    const charCode = content.charCodeAt(i);
    // Count characters that are not printable ASCII or common whitespace
    if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
      nonPrintableCount++;
    }
  }
  
  // If more than 10% are non-printable, likely binary
  return (nonPrintableCount / sampleSize) > 0.1;
}

function getImageMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'png';
    case 'jpg':
    case 'jpeg': return 'jpeg';
    case 'gif': return 'gif';
    case 'svg': return 'svg+xml';
    case 'webp': return 'webp';
    default: return 'png';
  }
}
