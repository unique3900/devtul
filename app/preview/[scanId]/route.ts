import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { scanId } = params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version') || 'original';
    
    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    
    // Determine which HTML file to serve
    const htmlFile = version === 'fixed' ? 'index_fixed.html' : 'index.html';
    const htmlPath = path.join(downloadDir, htmlFile);
    
    // Check if file exists
    try {
      await fs.access(htmlPath);
    } catch {
      // If fixed version doesn't exist, fall back to original
      if (version === 'fixed') {
        const originalPath = path.join(downloadDir, 'index.html');
        try {
          await fs.access(originalPath);
          const originalHtml = await fs.readFile(originalPath, 'utf-8');
          return new NextResponse(originalHtml, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache',
            },
          });
        } catch {
          return NextResponse.json({ error: "HTML file not found" }, { status: 404 });
        }
      }
      return NextResponse.json({ error: "HTML file not found" }, { status: 404 });
    }
    
    // Read and serve the HTML file
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    
    // Inject base tag and remove CSP/frame restrictions
    const baseUrl = `/downloads/${scanId}/`;
    let modifiedHtml = htmlContent;
    
    // CSS is injected directly, but JavaScript files are kept as external for better execution context
    console.log(`Processing HTML for base URL: ${baseUrl}`);
    console.log('Using hybrid approach - CSS injected directly, JS files served externally');
    
    // Remove CSP and X-Frame-Options that block iframe rendering
    modifiedHtml = modifiedHtml
      .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
      .replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
      .replace(/X-Frame-Options:[^\r\n]*/gi, '')
      .replace(/Content-Security-Policy:[^\r\n]*/gi, '');
    
    // Add base tag if head exists
    if (modifiedHtml.includes('<head>')) {
      modifiedHtml = modifiedHtml.replace(
        '<head>',
        `<head>
        <base href="${baseUrl}">
        <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';">
        <style>
          /* Minimal CSS to ensure iframe compatibility */
          html, body { 
            margin: 0;
            padding: 0;
            min-height: 100vh;
          }
          * { 
            box-sizing: border-box; 
          }
        </style>
        <script>
          // Ensure page is visible after load
          window.addEventListener('load', function() {
            document.body.style.visibility = 'visible';
            document.body.style.opacity = '1';
            // Force repaint
            document.body.offsetHeight;
            
            // Trigger common animation library initialization
            setTimeout(function() {
              // Trigger resize event to reinitialize responsive components
              window.dispatchEvent(new Event('resize'));
              
              // Reinitialize common animation libraries
              if (window.AOS) window.AOS.refresh();
              if (window.Swiper) {
                // Reinitialize all Swiper instances
                document.querySelectorAll('.swiper-container, .swiper').forEach(function(el) {
                  if (el.swiper) el.swiper.update();
                });
              }
              if (window.ScrollMagic) {
                // Refresh ScrollMagic scenes
                if (window.controller) window.controller.update(true);
              }
              if (window.GSAP || window.gsap) {
                // Refresh GSAP animations
                if (window.ScrollTrigger) window.ScrollTrigger.refresh();
              }
            }, 100);
          });
          
          // Also run immediately in case load event already fired
          if (document.readyState === 'complete') {
            document.body.style.visibility = 'visible';
            document.body.style.opacity = '1';
          }
        </script>`
      );
    } else {
      // If no head tag, add it
      modifiedHtml = `<head>
        <base href="${baseUrl}">
        <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';">
        <style>
          html, body { 
            margin: 0;
            padding: 0;
            min-height: 100vh;
          }
          * { 
            box-sizing: border-box; 
          }
        </style>
        <script>
          window.addEventListener('load', function() {
            document.body.style.visibility = 'visible';
            document.body.style.opacity = '1';
            document.body.offsetHeight;
            
            // Trigger common animation library initialization
            setTimeout(function() {
              window.dispatchEvent(new Event('resize'));
              if (window.AOS) window.AOS.refresh();
              if (window.Swiper) {
                document.querySelectorAll('.swiper-container, .swiper').forEach(function(el) {
                  if (el.swiper) el.swiper.update();
                });
              }
              if (window.ScrollMagic && window.controller) window.controller.update(true);
              if ((window.GSAP || window.gsap) && window.ScrollTrigger) window.ScrollTrigger.refresh();
              
              // Trigger scroll events for lazy loading and scroll-based animations
              window.dispatchEvent(new Event('scroll'));
              
              // Handle lazy loading libraries
              if (window.LazyLoad) {
                if (typeof window.LazyLoad.update === 'function') window.LazyLoad.update();
              }
              if (window.lozad) {
                const observer = window.lozad();
                observer.observe();
              }
              
              // Trigger intersection observer for elements that might be in view
              setTimeout(function() {
                window.dispatchEvent(new Event('scroll'));
                // Force a small scroll to trigger intersection observers
                window.scrollBy(0, 1);
                window.scrollBy(0, -1);
              }, 200);
            }, 100);
          });
          if (document.readyState === 'complete') {
            document.body.style.visibility = 'visible';
            document.body.style.opacity = '1';
          }
        </script>
      </head>${modifiedHtml}`;
    }
    
    console.log(`Serving ${version} HTML for scan ${scanId} with base URL: ${baseUrl}`);
    
    // Count resources in HTML
    const cssLinks = (modifiedHtml.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []).length;
    const scriptTags = (modifiedHtml.match(/<script[^>]*src=["'][^"']+["'][^>]*>/gi) || []).length;
    const imgTags = (modifiedHtml.match(/<img[^>]*src=["'][^"']+["'][^>]*>/gi) || []).length;
    
    console.log(`HTML contains: ${cssLinks} CSS links, ${scriptTags} script tags, ${imgTags} images`);
    
    return new NextResponse(modifiedHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
        'X-Frame-Options': 'SAMEORIGIN', // Allow iframe from same origin
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; frame-ancestors 'self';",
      },
    });
    
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to load preview" },
      { status: 500 }
    );
  }
}