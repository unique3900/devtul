import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Import db only when needed to avoid build-time issues
let db: any = null;

async function getDb() {
  if (!db) {
    try {
      const { default: prisma } = await import("@/db");
      db = prisma;
    } catch (error) {
      console.error("Failed to import database:", error);
      throw new Error("Database connection failed");
    }
  }
  return db;
}

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false,
        status: 401,
        message: "Not authenticated" 
      }, { status: 401 });
    }

    // Get database connection
    const database = await getDb();

    // Clear refresh token from database
    await database.user.update({
      where: { id: session.user.id },
      data: { 
        refreshToken: null,
        refreshTokenExpiry: null
      }
    });

    // Clear any active sessions for this user
    await database.session.updateMany({
      where: { 
        userId: session.user.id,
        isActive: true
      },
      data: { 
        isActive: false
      }
    });

    return NextResponse.json({
      success: true,
      status: 200,
      message: "Logout successful"
    }, { status: 200 });

  } catch (error) {
    console.error("Logout error:", error);
    
    return NextResponse.json({ 
      success: false,
      status: 500,
      message: "An unexpected error occurred during logout. Please try again later." 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // For logout, we typically use POST, but providing GET as well for convenience
  return NextResponse.json({ 
    success: false,
    status: 405,
    message: "Method not allowed. Use POST for logout." 
  }, { status: 405 });
} 