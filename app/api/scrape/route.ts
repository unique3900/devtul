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
        // Capture CSS files (including various content types and extensions)
        if (contentType.includes('text/css') || contentType.includes('text/stylesheet') ||
            responseUrl.endsWith('.css') || responseUrl.match(/\.css(\?|$)/) ||
            (response.status() === 200 && responseUrl.includes('.css'))) {
          const cssContent = await response.text();
          const fileName = getFileName(responseUrl, 'css');
          resources[fileName] = Buffer.from(cssContent);
          cssUrls.push(fileName);
          console.log(`Captured CSS: ${fileName} from ${responseUrl}`);
        } 
        // Capture JavaScript files
        else if (contentType.includes('javascript') || contentType.includes('application/javascript') || 
                 responseUrl.endsWith('.js') || (response.status() === 200 && responseUrl.includes('.js'))) {
          const jsContent = await response.text();
          const fileName = getFileName(responseUrl, 'js');
          resources[fileName] = Buffer.from(jsContent);
          jsUrls.push(fileName);
          console.log(`Captured JS: ${fileName} from ${responseUrl}`);
        } 
        // Capture images
        else if (contentType.includes('image/') || 
                 responseUrl.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i)) {
          const imageBuffer = await response.buffer();
          const fileName = getFileName(responseUrl, getImageExtension(contentType));
          resources[fileName] = imageBuffer;
          imageUrls.push(fileName);
          console.log(`Captured image: ${fileName} from ${responseUrl}`);
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
