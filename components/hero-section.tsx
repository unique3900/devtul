"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, ArrowRight, Shield, Zap, Users } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"

export function HeroSection() {
  const [isPlaying, setIsPlaying] = useState(false)

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
      transition: {
        duration: 3,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50" />
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

      <div className="container mx-auto px-4 relative max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge className="w-fit bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-0">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    className="mr-1"
                  >
                    🚀
                  </motion.span>
                  New: AI-Powered Testing Suite
                </Badge>
              </motion.div>
            </motion.div>

            <motion.div className="space-y-4" variants={itemVariants}>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                <motion.span
                  className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  Test, Monitor & Optimize
                </motion.span>
                <br />
                Your Web Projects
              </h1>
              <motion.p
                className="text-xl text-muted-foreground max-w-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                Comprehensive web testing platform with SEO, accessibility, security, and performance monitoring. Built
                for modern development teams.
              </motion.p>
            </motion.div>

            <motion.div className="flex flex-col sm:flex-row gap-4" variants={itemVariants}>
              <Link href="/signup">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Start Free Trial
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </motion.div>
                  </Button>
                </motion.div>
              </Link>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" onClick={() => setIsPlaying(!isPlaying)} className="group">
                  <motion.div animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
                    <Play className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  </motion.div>
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            <motion.div className="flex items-center gap-8 pt-4" variants={itemVariants}>
              {[
                { icon: Shield, text: "Enterprise Security", color: "text-green-600" },
                { icon: Zap, text: "Real-time Monitoring", color: "text-yellow-600" },
                { icon: Users, text: "Team Collaboration", color: "text-blue-600" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl border overflow-hidden"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              {/* Demo Video/Animation Area */}
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                {!isPlaying ? (
                  <motion.div className="text-center space-y-4" variants={floatingVariants} animate="animate">
                    <motion.div
                      className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto cursor-pointer"
                      onClick={() => setIsPlaying(true)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(59, 130, 246, 0.7)",
                          "0 0 0 10px rgba(59, 130, 246, 0)",
                          "0 0 0 20px rgba(59, 130, 246, 0)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <Play className="h-8 w-8 text-white ml-1" />
                    </motion.div>
                    <p className="text-muted-foreground">Click to see Devtul in action</p>
                  </motion.div>
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <motion.div
                      className="text-center space-y-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mx-auto mb-4" />
                      </motion.div>
                      <div className="space-y-2">
                        {[
                          { width: "w-32", color: "bg-blue-400", delay: 0 },
                          { width: "w-24", color: "bg-purple-400", delay: 0.2 },
                          { width: "w-28", color: "bg-green-400", delay: 0.4 },
                        ].map((bar, index) => (
                          <motion.div
                            key={index}
                            className={`h-2 ${bar.color} rounded ${bar.width} mx-auto`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{
                              duration: 1,
                              delay: bar.delay,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "reverse",
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-white text-sm">Running comprehensive tests...</p>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Demo Dashboard Preview */}
              <motion.div
                className="p-6 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Project Dashboard</h3>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      All Tests Passed
                    </Badge>
                  </motion.div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { score: 98, label: "SEO Score", color: "bg-blue-50 text-blue-600" },
                    { score: 100, label: "Accessibility", color: "bg-green-50 text-green-600" },
                    { score: "A+", label: "Security", color: "bg-purple-50 text-purple-600" },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      className={`text-center p-3 ${item.color.split(" ")[0]} rounded-lg`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        className={`text-2xl font-bold ${item.color.split(" ")[1]}`}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                      >
                        {item.score}
                      </motion.div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3"
              variants={floatingVariants}
              animate="animate"
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                />
                <span className="text-sm font-medium">Live Monitoring</span>
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
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Shield className="h-4 w-4 text-blue-600" />
                </motion.div>
                <span className="text-sm font-medium">Security Scan Complete</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
