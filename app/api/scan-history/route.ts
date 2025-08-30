import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

interface ScanHistory {
  scanId: string;
  url: string;
  timestamp: string;
  status: 'completed' | 'failed';
  issuesCount: number;
  fixedCount: number;
}

const HISTORY_FILE = path.join(process.cwd(), "scan_history.json");

export async function GET() {
  try {
    // Read existing history
    let history: ScanHistory[] = [];
    try {
      const historyData = await fs.readFile(HISTORY_FILE, 'utf-8');
      history = JSON.parse(historyData);
    } catch {
      // File doesn't exist yet, start with empty array
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return NextResponse.json({ history });
    
  } catch (error) {
    console.error("Error reading scan history:", error);
    return NextResponse.json({ error: "Failed to read scan history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const scanData: ScanHistory = await request.json();
    
    // Read existing history
    let history: ScanHistory[] = [];
    try {
      const historyData = await fs.readFile(HISTORY_FILE, 'utf-8');
      history = JSON.parse(historyData);
    } catch {
      // File doesn't exist yet, start with empty array
    }
    
    // Add new scan to history (or update existing)
    const existingIndex = history.findIndex(h => h.scanId === scanData.scanId);
    if (existingIndex >= 0) {
      history[existingIndex] = scanData;
    } else {
      history.unshift(scanData); // Add to beginning
    }
    
    // Keep only last 50 scans
    history = history.slice(0, 50);
    
    // Save updated history
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error saving scan history:", error);
    return NextResponse.json({ error: "Failed to save scan history" }, { status: 500 });
  }
}
