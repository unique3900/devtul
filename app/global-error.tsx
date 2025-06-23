"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, RefreshCw, Home, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-md">
              <CardContent className="p-8 text-center space-y-6">
                {/* Header */}
                <Link href="/" className="inline-flex items-center space-x-2 mb-4">
                  <motion.div
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Shield className="h-6 w-6 text-white" />
                  </motion.div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Devtul
                  </span>
                </Link>

                {/* Error Icon */}
                <motion.div
                  className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </motion.div>

                {/* Error Message */}
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-gray-900">Something went wrong!</h1>
                  <p className="text-gray-600">
                    We encountered an unexpected error. Our team has been notified and is working on a fix.
                  </p>
                </div>

                {/* Error Details (in development) */}
                {process.env.NODE_ENV === "development" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                    <h3 className="font-medium text-red-800 mb-2">Error Details:</h3>
                    <pre className="text-xs text-red-700 overflow-auto">{error.message}</pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={reset} className="bg-gradient-to-r from-blue-600 to-purple-600">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  </motion.div>

                  <Link href="/">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                      </Button>
                    </motion.div>
                  </Link>
                </div>

                {/* Support Info */}
                <p className="text-sm text-gray-500">
                  If the problem persists, contact{" "}
                  <a href="mailto:support@devtul.com" className="text-blue-600 hover:underline">
                    support@devtul.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </body>
    </html>
  )
}
