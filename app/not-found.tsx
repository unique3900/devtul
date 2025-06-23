"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Home, ArrowLeft, Construction, Search, Wrench } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function NotFound() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  }

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      rotate: [-5, 5, -5],
      transition: {
        duration: 3,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-md">
          <CardContent className="p-12 text-center space-y-8">
            {/* Header with Logo */}
            <motion.div variants={itemVariants}>
              <Link href="/" className="inline-flex items-center space-x-2 mb-6">
                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Shield className="h-7 w-7 text-white" />
                </motion.div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Devtul
                </span>
              </Link>
            </motion.div>

            {/* 404 Illustration */}
            <motion.div variants={itemVariants} className="relative">
              <motion.div className="mx-auto w-64 h-64 relative" variants={floatingVariants} animate="animate">
                {/* Main 404 Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="text-8xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    404
                  </motion.div>
                </div>

                {/* Floating Tools */}
                <motion.div
                  className="absolute top-4 right-4 p-3 bg-white rounded-full shadow-lg"
                  animate={{
                    rotate: [0, 360],
                    y: [-5, 5, -5],
                  }}
                  transition={{
                    rotate: { duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                    y: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                  }}
                >
                  <Wrench className="h-6 w-6 text-blue-600" />
                </motion.div>

                <motion.div
                  className="absolute bottom-4 left-4 p-3 bg-white rounded-full shadow-lg"
                  animate={{
                    rotate: [360, 0],
                    y: [5, -5, 5],
                  }}
                  transition={{
                    rotate: { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                    y: { duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 },
                  }}
                >
                  <Construction className="h-6 w-6 text-purple-600" />
                </motion.div>

                <motion.div
                  className="absolute top-1/2 left-0 p-2 bg-white rounded-full shadow-lg"
                  animate={{
                    x: [-5, 5, -5],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    x: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                    rotate: { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                  }}
                >
                  <Search className="h-5 w-5 text-green-600" />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Status Badge */}
            <motion.div variants={itemVariants}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge className="bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-0 px-4 py-2">
                  <Construction className="mr-2 h-4 w-4" />
                  Under Development
                </Badge>
              </motion.div>
            </motion.div>

            {/* Main Message */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">Page Not Found</h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Oops! This page is currently under development or doesn't exist yet. Our team is working hard to bring
                you new features.
              </p>
            </motion.div>

            {/* Feature Preview */}
            <motion.div variants={itemVariants}>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Coming Soon</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    Advanced Analytics Dashboard
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    AI-Powered Insights
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Real-time Collaboration
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    Custom Integrations
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </motion.div>
              </Link>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={() => window.history.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </motion.div>
            </motion.div>

            {/* Help Text */}
            <motion.div variants={itemVariants}>
              <p className="text-sm text-gray-500">
                Need help? Contact our support team at{" "}
                <a href="mailto:support@devtul.com" className="text-blue-600 hover:underline">
                  support@devtul.com
                </a>
              </p>
            </motion.div>
          </CardContent>
        </Card>

        {/* Floating Elements */}
        <motion.div
          className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3"
          variants={floatingVariants}
          animate="animate"
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-sm font-medium">Building...</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex items-center gap-2">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}>
              <Construction className="h-4 w-4 text-orange-600" />
            </motion.div>
            <span className="text-sm font-medium">In Progress</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
