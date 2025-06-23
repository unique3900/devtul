"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
} from "lucide-react"
import { motion } from "framer-motion"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  priority: "low" | "medium" | "high"
  dueDate: string
  assignee: {
    name: string
    avatar: string
    initials: string
  }
  project: string
  tags: string[]
  createdAt: string
  status: "todo" | "in-progress" | "done"
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([
    {
      id: "1",
      title: "Fix security vulnerability in login form",
      description: "Address the XSS vulnerability found in the login form validation",
      completed: false,
      priority: "high",
      dueDate: "2024-02-15",
      assignee: {
        name: "John Doe",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "JD",
      },
      project: "E-commerce Website",
      tags: ["security", "urgent"],
      createdAt: "2024-02-10",
      status: "in-progress",
    },
    {
      id: "2",
      title: "Optimize SEO meta tags",
      description: "Update meta descriptions and titles for better search rankings",
      completed: true,
      priority: "medium",
      dueDate: "2024-02-12",
      assignee: {
        name: "Sarah Wilson",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "SW",
      },
      project: "Corporate Blog",
      tags: ["seo", "content"],
      createdAt: "2024-02-08",
      status: "done",
    },
    {
      id: "3",
      title: "Implement accessibility improvements",
      description: "Add ARIA labels and improve keyboard navigation",
      completed: false,
      priority: "medium",
      dueDate: "2024-02-18",
      assignee: {
        name: "Mike Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "MJ",
      },
      project: "Landing Page",
      tags: ["accessibility", "a11y"],
      createdAt: "2024-02-09",
      status: "todo",
    },
    {
      id: "4",
      title: "Performance optimization review",
      description: "Analyze and optimize page load times",
      completed: false,
      priority: "low",
      dueDate: "2024-02-20",
      assignee: {
        name: "Emily Chen",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "EC",
      },
      project: "E-commerce Website",
      tags: ["performance", "optimization"],
      createdAt: "2024-02-11",
      status: "todo",
    },
  ])

  const [newTodo, setNewTodo] = useState("")
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState("all")

  const projects = ["E-commerce Website", "Corporate Blog", "Landing Page", "Infrastructure"]

  const onDragEnd = (result: DropResult) => {
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

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed, status: todo.completed ? "todo" : "done" } : todo,
      ),
    )
  }

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        title: newTodo,
        description: "",
        completed: false,
        priority: "medium",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        assignee: {
          name: "Demo User",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "DU",
        },
        project: selectedProject === "all" ? "General" : selectedProject,
        tags: [],
        createdAt: new Date().toISOString().split("T")[0],
        status: "todo",
      }
      setTodos([todo, ...todos])
      setNewTodo("")
    }
  }

  const filteredTodos = todos.filter((todo) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "completed" && todo.completed) ||
      (filter === "pending" && !todo.completed) ||
      (filter === "high" && todo.priority === "high")

    const matchesSearch =
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.project.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProject = selectedProject === "all" || todo.project === selectedProject

    return matchesFilter && matchesSearch && matchesProject
  })

  const todosByStatus = {
    todo: filteredTodos.filter((t) => t.status === "todo"),
    "in-progress": filteredTodos.filter((t) => t.status === "in-progress"),
    done: filteredTodos.filter((t) => t.status === "done"),
  }

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

  const TodoCard = ({ todo, index }: { todo: Todo; index: number }) => (
    <Draggable draggableId={todo.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-4 border rounded-lg space-y-3 bg-white shadow-sm transition-all ${
            snapshot.isDragging ? "shadow-lg rotate-2 scale-105" : "hover:shadow-md"
          }`}
        >
          <div className="flex items-start gap-3">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Checkbox checked={todo.completed} onCheckedChange={() => toggleTodo(todo.id)} className="mt-1" />
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
                    <DropdownMenuItem>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => deleteTodo(todo.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Badge className={getPriorityColor(todo.priority)}>
                    {getPriorityIcon(todo.priority)}
                    <span className="ml-1 capitalize">{todo.priority}</span>
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(todo.dueDate).toLocaleDateString()}</span>
                </div>

                <Badge variant="outline">{todo.project}</Badge>
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

            <Avatar className="h-8 w-8">
              <AvatarImage src={todo.assignee.avatar || "/placeholder.svg"} alt={todo.assignee.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs">
                {todo.assignee.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}
    </Draggable>
  )

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
          <h1 className="text-3xl font-bold">Project Kanban</h1>
          <p className="text-muted-foreground">Manage your tasks with project-wise kanban boards</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </motion.div>
      </motion.div>

      {/* Add Todo */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
          <CardDescription>Create a new task for your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
              className="flex-1"
            />
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addTodo} disabled={!newTodo.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project} value={project}>
                {project}
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                        <TodoCard key={todo.id} todo={todo} index={index} />
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
    </div>
  )
}
