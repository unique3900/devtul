"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  FolderOpen,
  Shield,
  Search,
  Accessibility,
  Zap,
  BarChart3,
  Users,
  Settings,
  Plus,
  CheckSquare,
  Calendar,
  Target,
  Globe,
  Lock,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const [toolsOpen, setToolsOpen] = useState(true)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const isCollapsed = state === "collapsed"

  const mainNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: FolderOpen,
    },
  ]

  const toolsItems = [
    {
      title: "Security Testing",
      url: "/tools/security",
      icon: Shield,
      description: "Vulnerability scans",
    },
    {
      title: "SEO Analysis",
      url: "/tools/seo",
      icon: Search,
      description: "Search optimization",
    },
    {
      title: "WCAG Compliance",
      url: "/tools/accessibility",
      icon: Accessibility,
      description: "Accessibility testing",
    },
    {
      title: "Performance",
      url: "/tools/performance",
      icon: Zap,
      description: "Speed & optimization",
    },
    {
      title: "Uptime Monitoring",
      url: "/tools/uptime",
      icon: Globe,
      description: "Availability tracking",
    },
    {
      title: "SSL/TLS Check",
      url: "/tools/ssl",
      icon: Lock,
      description: "Certificate validation",
    },
  ]

  const workspaceItems = [
    {
      title: "Team Management",
      url: "/workspace/team",
      icon: Users,
      description: "Manage team members",
    },
    {
      title: "Project Planning",
      url: "/workspace/planning",
      icon: Target,
      description: "Sprint & task planning",
    },
    {
      title: "Todo Lists",
      url: "/workspace/todos",
      icon: CheckSquare,
      description: "Task management",
    },
    {
      title: "Calendar",
      url: "/workspace/calendar",
      icon: Calendar,
      description: "Schedule & deadlines",
    },
    {
      title: "Analytics",
      url: "/workspace/analytics",
      icon: BarChart3,
      description: "Performance insights",
    },
  ]

  const sidebarVariants = {
    expanded: {
      width: "16rem",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
    collapsed: {
      width: "3rem",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  }

  const contentVariants = {
    expanded: {
      opacity: 1,
      transition: {
        delay: 0.1,
        duration: 0.2,
      },
    },
    collapsed: {
      opacity: 0,
      transition: {
        duration: 0.1,
      },
    },
  }

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            <Shield className="h-5 w-5 text-white" />
          </motion.div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                Devtul
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <item.icon className="h-4 w-4" />
                        </motion.div>
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {item.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Testing Tools
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div animate={{ rotate: toolsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <AnimatePresence>
              {(toolsOpen || isCollapsed) && (
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {toolsItems.map((item, index) => (
                        <SidebarMenuItem key={item.title}>
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ x: 5 }}
                          >
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === item.url}
                              tooltip={isCollapsed ? item.description : undefined}
                            >
                              <Link href={item.url}>
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}>
                                  <item.icon className="h-4 w-4" />
                                </motion.div>
                                <AnimatePresence>
                                  {!isCollapsed && (
                                    <motion.span
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      {item.title}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </Link>
                            </SidebarMenuButton>
                          </motion.div>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              )}
            </AnimatePresence>
          </Collapsible>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Workspace
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div animate={{ rotate: workspaceOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <AnimatePresence>
              {(workspaceOpen || isCollapsed) && (
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {workspaceItems.map((item, index) => (
                        <SidebarMenuItem key={item.title}>
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ x: 5 }}
                          >
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === item.url}
                              tooltip={isCollapsed ? item.description : undefined}
                            >
                              <Link href={item.url}>
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}>
                                  <item.icon className="h-4 w-4" />
                                </motion.div>
                                <AnimatePresence>
                                  {!isCollapsed && (
                                    <motion.span
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      {item.title}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </Link>
                            </SidebarMenuButton>
                          </motion.div>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              )}
            </AnimatePresence>
          </Collapsible>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.95 }}>
                  <SidebarMenuButton asChild>
                    <Link href="/projects/new">
                      <motion.div whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                        <Plus className="h-4 w-4" />
                      </motion.div>
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            New Project
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.95 }}>
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <motion.div whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                    <Settings className="h-4 w-4" />
                  </motion.div>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        Settings
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </SidebarMenuButton>
            </motion.div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
