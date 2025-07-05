"use client"

import type React from "react"
import { NextAuthProvider } from "@/components/providers/next-auth-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      {children}
    </NextAuthProvider>
  )
}
