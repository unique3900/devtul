import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
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
    const screenshotDir = path.join(downloadDir, "screenshots");
    
    // Ensure screenshots directory exists
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const screenshotFile = `${version}_screenshot.png`;
    const screenshotPath = path.join(screenshotDir, screenshotFile);
    
    // Check if screenshot already exists
    try {
      await fs.access(screenshotPath);
      const screenshot = await fs.readFile(screenshotPath);
      return new NextResponse(screenshot, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      // Screenshot doesn't exist, create it
    }
    
    // Determine which HTML file to screenshot
    const htmlFile = version === 'fixed' ? 'index_fixed.html' : 'index.html';
    const htmlPath = path.join(downloadDir, htmlFile);
    
    // Check if HTML file exists
    try {
      await fs.access(htmlPath);
    } catch {
      return NextResponse.json({ error: "HTML file not found" }, { status: 404 });
    }
    
    // Create screenshot using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      // Set viewport for consistent screenshots
      await page.setViewport({ 
        width: 1200, 
        height: 800,
        deviceScaleFactor: 1
      });
      
      // Navigate to the local HTML file
      const fileUrl = `file://${htmlPath}`;
      await page.goto(fileUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Wait a bit more for any dynamic content
      await page.waitForTimeout(2000);
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
        quality: 90
      });
      
      // Save screenshot for future use
      await fs.writeFile(screenshotPath, screenshot);
      
      return new NextResponse(screenshot, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
      
    } finally {
      await browser.close();
    }
    
  } catch (error) {
    console.error("Screenshot error:", error);
    return NextResponse.json(
      { error: "Failed to generate screenshot" },
      { status: 500 }
    );
  }
}
