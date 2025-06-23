"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  Flag,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  CheckCircle,
  Circle,
  Lock,
  Crown,
} from "lucide-react"
import { motion } from "framer-motion"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import Link from "next/link"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  initials: string
  role: "owner" | "admin" | "member"
  plan: "free" | "premium" | "enterprise"
}

interface Project {
  id: string
  name: string
  description: string
  members: string[]
  owner: string
  plan: "free" | "premium" | "enterprise"
}

interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  priority: "low" | "medium" | "high"
  dueDate: string
  assigneeId: string
  projectId: string
  tags: string[]
  createdAt: string
  status: "todo" | "in-progress" | "done"
  createdBy: string
}

export default function TodosPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [selectedProject, setSelectedProject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Todo | null>(null)
  const [showPremiumDialog, setShowPremiumDialog] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Todo["priority"],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assigneeId: "",
    projectId: "",
    tags: [] as string[],
    status: "todo" as Todo["status"],
  })

  // Load data on component mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = () => {
    // Load current user with proper plan detection
    const demoUser = localStorage.getItem("demoUser")
    let userPlan = "free" // default

    // Check for premium credentials in localStorage or demo data
    const premiumCredentials = localStorage.getItem("premiumUser")
    const userEmail = demoUser ? JSON.parse(demoUser).email : ""

    // Set premium for specific demo emails or if premium flag exists
    if (
      premiumCredentials ||
      userEmail === "premium@devtul.com" ||
      userEmail === "admin@devtul.com" ||
      userEmail?.includes("premium")
    ) {
      userPlan = "premium"
    }

    if (demoUser) {
      const user = JSON.parse(demoUser)
      const currentUserData: User = {
        id: user.id || "1",
        name: user.name || "Demo User",
        email: user.email || "demo@devtul.com",
        avatar: user.image || "/placeholder.svg?height=32&width=32",
        initials:
          user.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("") || "DU",
        role: "owner",
        plan: userPlan as "free" | "premium" | "enterprise",
      }
      setCurrentUser(currentUserData)
    } else {
      // Default demo user
      const currentUserData: User = {
        id: "1",
        name: "Demo User",
        email: "demo@devtul.com",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "DU",
        role: "owner",
        plan: "free",
      }
      setCurrentUser(currentUserData)
    }

    // Load users
    const mockUsers: User[] = [
      {
        id: "1",
        name: "Demo User",
        email: "demo@devtul.com",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "DU",
        role: "owner",
        plan: "free",
      },
      {
        id: "2",
        name: "John Doe",
        email: "john@company.com",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "JD",
        role: "admin",
        plan: "premium",
      },
      {
        id: "3",
        name: "Sarah Wilson",
        email: "sarah@company.com",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "SW",
        role: "member",
        plan: "premium",
      },
      {
        id: "4",
        name: "Mike Johnson",
        email: "mike@company.com",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "MJ",
        role: "member",
        plan: "free",
      },
    ]
    setUsers(mockUsers)

    // Load projects
    const mockProjects: Project[] = [
      {
        id: "1",
        name: "E-commerce Website",
        description: "Main online store project",
        members: ["1", "2", "3"],
        owner: "1",
        plan: "premium",
      },
      {
        id: "2",
        name: "Corporate Blog",
        description: "Company blog and content",
        members: ["1", "3", "4"],
        owner: "1",
        plan: "free",
      },
      {
        id: "3",
        name: "Landing Page",
        description: "Product landing page",
        members: ["1", "2"],
        owner: "2",
        plan: "premium",
      },
    ]
    setProjects(mockProjects)

    // Load todos
    const mockTodos: Todo[] = [
      {
        id: "1",
        title: "Fix security vulnerability in login form",
        description: "Address the XSS vulnerability found in the login form validation",
        completed: false,
        priority: "high",
        dueDate: "2024-02-15",
        assigneeId: "2",
        projectId: "1",
        tags: ["security", "urgent"],
        createdAt: "2024-02-10",
        status: "in-progress",
        createdBy: "1",
      },
      {
        id: "2",
        title: "Optimize SEO meta tags",
        description: "Update meta descriptions and titles for better search rankings",
        completed: true,
        priority: "medium",
        dueDate: "2024-02-12",
        assigneeId: "3",
        projectId: "2",
        tags: ["seo", "content"],
        createdAt: "2024-02-08",
        status: "done",
        createdBy: "1",
      },
      {
        id: "3",
        title: "Implement accessibility improvements",
        description: "Add ARIA labels and improve keyboard navigation",
        completed: false,
        priority: "medium",
        dueDate: "2024-02-18",
        assigneeId: "4",
        projectId: "3",
        tags: ["accessibility", "a11y"],
        createdAt: "2024-02-09",
        status: "todo",
        createdBy: "2",
      },
    ]
    setTodos(mockTodos)
  }

  const canAccessFeature = (feature: string) => {
    if (!currentUser) return false

    const premiumFeatures = ["advanced-kanban", "team-collaboration", "custom-fields", "automation"]
    const enterpriseFeatures = ["analytics", "integrations", "custom-workflows"]

    if (enterpriseFeatures.includes(feature)) {
      return currentUser.plan === "enterprise"
    }

    if (premiumFeatures.includes(feature)) {
      return currentUser.plan === "premium" || currentUser.plan === "enterprise"
    }

    return true
  }

  const getAccessibleProjects = () => {
    if (!currentUser) return []

    return projects.filter((project) => {
      // User can access if they're a member or if it's a free project
      return project.members.includes(currentUser.id) || project.plan === "free"
    })
  }

  const onDragEnd = (result: DropResult) => {
    if (!canAccessFeature("advanced-kanban")) {
      setShowPremiumDialog(true)
      return
    }

    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const newStatus = destination.droppableId as "todo" | "in-progress" | "done"

    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === draggableId ? { ...todo, status: newStatus, completed: newStatus === "done" } : todo,
      ),
    )
  }

  const openTaskDialog = (task?: Todo) => {
    if (task) {
      setEditingTask(task)
      setNewTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        assigneeId: task.assigneeId,
        projectId: task.projectId,
        tags: task.tags,
        status: task.status,
      })
    } else {
      setEditingTask(null)
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        assigneeId: currentUser?.id || "",
        projectId: selectedProject === "all" ? "" : selectedProject,
        tags: [],
        status: "todo",
      })
    }
    setShowTaskDialog(true)
  }

  const saveTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      })
      return
    }

    if (!newTask.projectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      })
      return
    }

    // Check for duplicate task titles in the same project
    const duplicateTask = todos.find(
      (todo) =>
        todo.title.toLowerCase() === newTask.title.toLowerCase() &&
        todo.projectId === newTask.projectId &&
        todo.id !== editingTask?.id,
    )

    if (duplicateTask) {
      toast({
        title: "Task Already Exists",
        description: `A task with the title "${newTask.title}" already exists in this project`,
        variant: "destructive",
      })
      return
    }

    const taskData: Todo = {
      id: editingTask?.id || Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      completed: newTask.status === "done",
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      assigneeId: newTask.assigneeId,
      projectId: newTask.projectId,
      tags: newTask.tags,
      status: newTask.status,
      createdAt: editingTask?.createdAt || new Date().toISOString().split("T")[0],
      createdBy: editingTask?.createdBy || currentUser?.id || "1",
    }

    if (editingTask) {
      setTodos(todos.map((t) => (t.id === editingTask.id ? taskData : t)))
      toast({
        title: "Task Updated",
        description: "Task has been successfully updated",
      })
    } else {
      setTodos([taskData, ...todos])
      toast({
        title: "Task Created",
        description: "New task has been successfully created",
      })
    }

    setShowTaskDialog(false)
    setEditingTask(null)
  }

  const deleteTask = (taskId: string) => {
    setTodos(todos.filter((t) => t.id !== taskId))
    setShowTaskDialog(false)
    setEditingTask(null)
    toast({
      title: "Task Deleted",
      description: "Task has been successfully deleted",
    })
  }

  const getFilteredTodos = () => {
    const accessibleProjects = getAccessibleProjects()
    const accessibleProjectIds = accessibleProjects.map((p) => p.id)

    return todos.filter((todo) => {
      // Only show todos from accessible projects
      if (!accessibleProjectIds.includes(todo.projectId)) return false

      const matchesProject = selectedProject === "all" || todo.projectId === selectedProject
      const matchesFilter =
        filter === "all" ||
        (filter === "completed" && todo.completed) ||
        (filter === "pending" && !todo.completed) ||
        (filter === "high" && todo.priority === "high") ||
        (filter === "assigned-to-me" && todo.assigneeId === currentUser?.id)

      const matchesSearch =
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.description.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesProject && matchesFilter && matchesSearch
    })
  }

  const todosByStatus = {
    todo: getFilteredTodos().filter((t) => t.status === "todo"),
    "in-progress": getFilteredTodos().filter((t) => t.status === "in-progress"),
    done: getFilteredTodos().filter((t) => t.status === "done"),
  }

  const getUserById = (id: string) => users.find((u) => u.id === id)
  const getProjectById = (id: string) => projects.find((p) => p.id === id)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-3 w-3" />
      case "medium":
        return <Clock className="h-3 w-3" />
      case "low":
        return <Flag className="h-3 w-3" />
      default:
        return <Circle className="h-3 w-3" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "done":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const TaskCard = ({ todo, index }: { todo: Todo; index: number }) => {
    const assignee = getUserById(todo.assigneeId)
    const project = getProjectById(todo.projectId)

    return (
      <Draggable draggableId={todo.id} index={index} isDragDisabled={!canAccessFeature("advanced-kanban")}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`p-4 border rounded-lg space-y-3 bg-white shadow-sm transition-all ${
              snapshot.isDragging ? "shadow-lg rotate-2 scale-105" : "hover:shadow-md"
            } ${!canAccessFeature("advanced-kanban") ? "opacity-75" : ""}`}
          >
            <div className="flex items-start gap-3">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => {
                    setTodos(
                      todos.map((t) =>
                        t.id === todo.id ? { ...t, completed: !t.completed, status: t.completed ? "todo" : "done" } : t,
                      ),
                    )
                  }}
                  className="mt-1"
                />
              </motion.div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                      {todo.title}
                    </h3>
                    {todo.description && <p className="text-sm text-muted-foreground">{todo.description}</p>}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openTaskDialog(todo)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteTask(todo.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <Badge className={getPriorityColor(todo.priority)}>
                    {getPriorityIcon(todo.priority)}
                    <span className="ml-1 capitalize">{todo.priority}</span>
                  </Badge>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(todo.dueDate).toLocaleDateString()}</span>
                  </div>

                  {project && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      {project.plan !== "free" && <Crown className="h-3 w-3" />}
                      {project.name}
                    </Badge>
                  )}
                </div>

                {todo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {todo.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {assignee && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignee.avatar || "/placeholder.svg"} alt={assignee.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs">
                    {assignee.initials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        )}
      </Draggable>
    )
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Project Kanban
            {!canAccessFeature("advanced-kanban") && (
              <Badge className="bg-yellow-100 text-yellow-800">
                <Lock className="mr-1 h-3 w-3" />
                Limited
              </Badge>
            )}
            {currentUser?.plan === "premium" && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                <Crown className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Manage your tasks with project-wise kanban boards
            {currentUser && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                Current Plan: {currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Demo Plan Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentUser) {
                const newPlan = currentUser.plan === "free" ? "premium" : "free"
                const updatedUser = { ...currentUser, plan: newPlan as "free" | "premium" | "enterprise" }
                setCurrentUser(updatedUser)

                // Store premium status
                if (newPlan === "premium") {
                  localStorage.setItem("premiumUser", "true")
                } else {
                  localStorage.removeItem("premiumUser")
                }
              }
            }}
            className="text-xs"
          >
            {currentUser?.plan === "free" ? "Upgrade to Premium" : "Downgrade to Free"}
          </Button>

          {!canAccessFeature("advanced-kanban") && (
            <Button variant="outline" onClick={() => setShowPremiumDialog(true)}>
              <Crown className="mr-2 h-4 w-4" />
              Upgrade
            </Button>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => openTaskDialog()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {getAccessibleProjects().map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  {project.plan !== "free" && <Crown className="h-3 w-3" />}
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="assigned-to-me">Assigned to Me</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plan Limitation Notice */}
      {!canAccessFeature("advanced-kanban") && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-medium text-yellow-800">Limited Kanban Access</h3>
                  <p className="text-sm text-yellow-700">
                    Upgrade to Premium for advanced kanban features, drag & drop, and team collaboration.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPremiumDialog(true)}>
                View Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(todosByStatus).map(([status, statusTodos]) => (
            <Card key={status}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize flex items-center gap-2">
                    {status === "todo" && <Circle className="h-4 w-4 text-gray-500" />}
                    {status === "in-progress" && <Clock className="h-4 w-4 text-blue-500" />}
                    {status === "done" && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {status.replace("-", " ")}
                  </CardTitle>
                  <Badge className={getStatusColor(status)}>{statusTodos.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? "bg-blue-50" : ""
                      }`}
                    >
                      {statusTodos.map((todo, index) => (
                        <TaskCard key={todo.id} todo={todo} index={index} />
                      ))}
                      {provided.placeholder}
                      {statusTodos.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No tasks in {status.replace("-", " ")}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details" : "Add a new task to your project"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={newTask.projectId} onValueChange={(value) => setNewTask({ ...newTask, projectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {getAccessibleProjects().map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        {project.plan !== "free" && <Crown className="h-3 w-3" />}
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select
                value={newTask.assigneeId}
                onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => {
                      const project = getProjectById(newTask.projectId)
                      return project ? project.members.includes(user.id) : true
                    })
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                            <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
                          </Avatar>
                          {user.name}
                          {user.plan !== "free" && <Crown className="h-3 w-3" />}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value: Todo["priority"]) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(value: Todo["status"]) => setNewTask({ ...newTask, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveTask} disabled={!newTask.title.trim() || !newTask.projectId} className="flex-1">
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
              {editingTask && (
                <Button variant="outline" onClick={() => deleteTask(editingTask.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Dialog */}
      <Dialog open={showPremiumDialog} onOpenChange={setShowPremiumDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              Premium Feature
            </DialogTitle>
            <DialogDescription>Upgrade to Premium to unlock advanced kanban features</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Premium Kanban Features:</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Drag & drop task management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Advanced team collaboration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Custom fields and automation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Unlimited projects and tasks
                </li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Link href="/pricing" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">View Pricing</Button>
              </Link>
              <Button variant="outline" onClick={() => setShowPremiumDialog(false)}>
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
