import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { lookup } from "mime-types";

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string; path: string[] } }
) {
  try {
    const { scanId, path: filePath } = params;
    
    // Construct the file path
    const downloadDir = path.join(process.cwd(), "downloads", scanId);
    const requestedFile = path.join(downloadDir, ...filePath);
    
    // Security check: ensure the requested file is within the download directory
    const resolvedPath = path.resolve(requestedFile);
    const resolvedDownloadDir = path.resolve(downloadDir);
    
    if (!resolvedPath.startsWith(resolvedDownloadDir)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Check if file exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    
    // Read the file
    const fileBuffer = await fs.readFile(resolvedPath);
    
    // Determine content type
    const mimeType = lookup(resolvedPath) || 'application/octet-stream';
    
    return new NextResponse(fileBuffer.buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
  } catch (error) {
    console.error("File serving error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
