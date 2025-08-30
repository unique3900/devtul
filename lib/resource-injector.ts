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
  
  // Collect all CSS content to inject
  const allCssContent: string[] = [];
  
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
      for (const [fileName] of Object.entries(resources)) {
        if (fileName.endsWith('.js') && (fileName.includes(filename) || filename.includes(fileName.split('_')[0]))) {
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
