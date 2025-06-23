"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Pages that don't need the dashboard layout
  const publicPages = ["/", "/login", "/signup", "/pricing", "/about", "/contact"]
  const isPublicPage = publicPages.includes(pathname)

  useEffect(() => {
    // For public pages, no auth check needed
    if (isPublicPage) {
      setIsLoading(false)
      setIsAuthenticated(false)
      return
    }

    // Check authentication for protected pages
    const checkAuth = () => {
      try {
        const demoUser = localStorage.getItem("demoUser")
        const isAuth = !!demoUser
        setIsAuthenticated(isAuth)

        // If not authenticated and trying to access protected page, redirect to login
        if (!isAuth) {
          router.push("/login")
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setIsAuthenticated(false)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    // Small delay to ensure localStorage is available
    const timeoutId = setTimeout(checkAuth, 100)

    return () => clearTimeout(timeoutId)
  }, [pathname, isPublicPage, router])

  // Show loading spinner while checking auth
  if (isLoading) {
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

  // If not authenticated, show nothing (redirect is happening)
  if (!isAuthenticated) {
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
          <main className="flex-1 p-6 bg-slate-50">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
