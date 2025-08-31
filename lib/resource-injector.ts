import * as fs from "fs/promises";
import * as path from "path";

export async function injectResourcesIntoHtml(
  htmlContent: string, 
  downloadDir: string, 
  baseUrl: string
): Promise<string> {
  let modifiedHtml = htmlContent;
  
  // Read all resources from the download directory
  const resources: { [key: string]: Buffer } = {};
  
  try {
    const files = await fs.readdir(downloadDir);
    
    for (const file of files) {
      if (file.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp)$/i)) {
        const filePath = path.join(downloadDir, file);
        const content = await fs.readFile(filePath);
        resources[file] = content;
      }
    }
  } catch (error) {
    console.warn("Failed to read resources directory:", error);
    return htmlContent;
  }
  
  // Collect all CSS content to inject (with deduplication)
  const allCssContent: string[] = [];
  const processedCssFiles = new Set<string>();
  
  // Process all resources
  for (const [fileName, content] of Object.entries(resources)) {
    if (fileName.endsWith('.css') && !processedCssFiles.has(fileName)) {
      processedCssFiles.add(fileName);
      
      // Validate content is actually CSS and not binary
      const cssContentString = content.toString('utf8');
      if (isBinaryContent(cssContentString)) {
        console.warn(`Skipping binary CSS file: ${fileName}`);
        continue;
      }
      
      // Collect CSS content for injection
      let cssContent = cssContentString;
      
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
              return `url("data:image/${getImageMimeType(imgFileName)};base64,${resources[imgFileName].toString('base64')}")`;
            }
          }
          
          return match;
        } catch {
          return match;
        }
      });
      
      allCssContent.push(`/* CSS from ${fileName} */\n${cssContent}\n`);
    }
  }
  
  // Remove all existing CSS link tags
  modifiedHtml = modifiedHtml.replace(/<link[^>]*rel=['"]stylesheet['"][^>]*>/gi, '');
  
  // Remove any existing corrupted style blocks that might contain binary data
  modifiedHtml = modifiedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
    // Check if the style block contains binary-like content
    const content = match.replace(/<\/?style[^>]*>/gi, '');
    if (isBinaryContent(content)) {
      console.log('Removing corrupted style block');
      return '';
    }
    return match;
  });
  
  // Keep JavaScript files as external but point to our local copies
  // This preserves the original execution context and loading behavior
  const scriptRegex = /<script[^>]*src=['"]([^'"]+)['"][^>]*><\/script>/gi;
  let scriptMatch;
  const scriptReplacements: Array<{original: string, replacement: string}> = [];
  
  while ((scriptMatch = scriptRegex.exec(modifiedHtml)) !== null) {
    const originalTag = scriptMatch[0];
    const src = scriptMatch[1];
    
    try {
      const fullUrl = new URL(src, baseUrl);
      const pathname = fullUrl.pathname;
      const filename = pathname.split('/').pop() || '';
      
      // Find matching local JS file
      for (const [fileName, content] of Object.entries(resources)) {
        if (fileName.endsWith('.js') && (fileName.includes(filename) || filename.includes(fileName.split('_')[0]))) {
          // Validate that the JS file is not binary
          const jsContentString = content.toString('utf8');
          if (isBinaryContent(jsContentString)) {
            console.warn(`Skipping binary JS file: ${fileName}`);
            continue;
          }
          
          // Keep as external script but point to our local file
          const localScriptTag = originalTag.replace(src, `./${fileName}`);
          scriptReplacements.push({
            original: originalTag,
            replacement: localScriptTag
          });
          break;
        }
      }
    } catch (error) {
      console.warn(`Failed to process script tag: ${originalTag}`, error);
    }
  }
  
  // Apply script replacements
  for (const replacement of scriptReplacements) {
    modifiedHtml = modifiedHtml.replace(replacement.original, replacement.replacement);
  }
  
  // Leave inline scripts completely untouched to preserve their execution context
  // This is crucial for animations, carousels, and complex interactions
  
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

  console.log(`Injected ${allCssContent.length} CSS files directly and linked ${scriptReplacements.length} JS files as external resources`);
  
  return modifiedHtml;
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
