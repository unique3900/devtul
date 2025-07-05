"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()

  // Pages that don't need the dashboard layout
  const publicPages = ["/", "/login", "/signup", "/pricing", "/about", "/contact"]
  const isPublicPage = publicPages.includes(pathname)

  // Handle authentication redirects
  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!isPublicPage && status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, isPublicPage, router])

  // Show loading spinner while checking auth
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Public pages render without dashboard layout
  if (isPublicPage) {
    return <>{children}</>
  }

  // If not authenticated and trying to access protected page, show loading while redirecting
  if (status === "unauthenticated" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Dashboard layout for authenticated pages
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 bg-slate-50">
            {/* Pass session data to children if needed */}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
