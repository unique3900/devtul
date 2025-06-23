"use client"

import type React from "react"

// This layout is now empty since the main layout handles everything
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
