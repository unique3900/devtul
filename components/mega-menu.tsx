"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Shield, Search, Accessibility, Zap, BarChart3, Globe } from "lucide-react"
import Link from "next/link"

export function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="hidden md:flex items-center space-x-8">
      <div className="relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
        <Button variant="ghost" className="flex items-center gap-1">
          Products
          <ChevronDown className="h-4 w-4" />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-screen max-w-4xl bg-white border shadow-2xl rounded-lg mt-2 p-8 z-50">
            <div className="grid grid-cols-3 gap-8">
              {/* Testing Tools */}
              <div>
                <h3 className="font-semibold text-lg mb-4 text-slate-900">Testing Tools</h3>
                <div className="space-y-3">
                  <Link
                    href="/tools/security"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium">Security Testing</div>
                      <div className="text-sm text-muted-foreground">Vulnerability scanning & security audits</div>
                    </div>
                  </Link>

                  <Link
                    href="/tools/seo"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Search className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">SEO Analysis</div>
                      <div className="text-sm text-muted-foreground">Comprehensive SEO optimization</div>
                    </div>
                  </Link>

                  <Link
                    href="/tools/accessibility"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Accessibility className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">WCAG Compliance</div>
                      <div className="text-sm text-muted-foreground">Accessibility testing & reports</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Monitoring */}
              <div>
                <h3 className="font-semibold text-lg mb-4 text-slate-900">Monitoring</h3>
                <div className="space-y-3">
                  <Link
                    href="/monitoring/performance"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Zap className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium">Performance</div>
                      <div className="text-sm text-muted-foreground">Real-time performance monitoring</div>
                    </div>
                  </Link>

                  <Link
                    href="/monitoring/uptime"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Globe className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">Uptime Monitoring</div>
                      <div className="text-sm text-muted-foreground">24/7 website availability tracking</div>
                    </div>
                  </Link>

                  <Link
                    href="/monitoring/analytics"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium">Analytics</div>
                      <div className="text-sm text-muted-foreground">Detailed reports & insights</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Visual Demo */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">See It In Action</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">Live Dashboard</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Security Score</span>
                        <span className="font-medium text-green-600">A+</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>SEO Score</span>
                        <span className="font-medium text-blue-600">98/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Performance</span>
                        <span className="font-medium text-purple-600">95/100</span>
                      </div>
                    </div>
                  </div>
                  <Link href="/demo">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Try Demo</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Link href="/pricing">
        <Button variant="ghost">Pricing</Button>
      </Link>
      <Link href="/docs">
        <Button variant="ghost">Docs</Button>
      </Link>
      <Link href="/about">
        <Button variant="ghost">About</Button>
      </Link>
    </nav>
  )
}
