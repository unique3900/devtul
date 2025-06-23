"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ChevronLeft, ChevronRight, MapPin, Trash2, Edit } from "lucide-react"
import { motion } from "framer-motion"

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  type: "meeting" | "deadline" | "scan" | "review" | "other"
  attendees?: string[]
  location?: string
  allDay?: boolean
}

type ViewType = "month" | "week" | "day" | "agenda"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>("month")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayEvents, setShowDayEvents] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "meeting" as CalendarEvent["type"],
    start: new Date(),
    end: new Date(),
    location: "",
    attendees: "",
    allDay: false,
  })

  // Load events from localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem("devtul-calendar-events")
    if (savedEvents) {
      try {
        const parsedEvents = JSON.parse(savedEvents).map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }))
        setEvents(parsedEvents)
      } catch (error) {
        console.error("Error loading events:", error)
        loadDefaultEvents()
      }
    } else {
      loadDefaultEvents()
    }
  }, [])

  const loadDefaultEvents = () => {
    const now = new Date()
    const defaultEvents: CalendarEvent[] = [
      {
        id: "1",
        title: "Team Meeting",
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0),
        description: "Weekly team sync",
        type: "meeting",
        attendees: ["John", "Sarah"],
        location: "Conference Room A",
      },
      {
        id: "2",
        title: "Project Deadline",
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 17, 0),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 17, 30),
        description: "Final submission",
        type: "deadline",
      },
      {
        id: "3",
        title: "Security Scan",
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 14, 0),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 15, 0),
        description: "Automated security check",
        type: "scan",
      },
    ]
    setEvents(defaultEvents)
    localStorage.setItem("devtul-calendar-events", JSON.stringify(defaultEvents))
  }

  // Save events to localStorage
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem("devtul-calendar-events", JSON.stringify(events))
    }
  }, [events])

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getMonthData = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getWeekData = (date: Date) => {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDateRange = (start: Date, end: Date) => {
    if (start.toDateString() === end.toDateString()) {
      return `${formatTime(start)} - ${formatTime(end)}`
    }
    return `${start.toLocaleDateString()} ${formatTime(start)} - ${end.toLocaleDateString()} ${formatTime(end)}`
  }

  const navigateDate = (direction: "prev" | "next" | "today") => {
    const newDate = new Date(currentDate)

    if (direction === "today") {
      setCurrentDate(new Date())
      return
    }

    switch (view) {
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
        break
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
        break
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
        break
    }

    setCurrentDate(newDate)
  }

  const openEventDialog = (date?: Date, event?: CalendarEvent) => {
    if (event) {
      setSelectedEvent(event)
      setNewEvent({
        title: event.title,
        description: event.description || "",
        type: event.type,
        start: event.start,
        end: event.end,
        location: event.location || "",
        attendees: event.attendees?.join(", ") || "",
        allDay: event.allDay || false,
      })
    } else {
      setSelectedEvent(null)
      const startTime = date ? new Date(date) : new Date()
      if (date) {
        startTime.setHours(9, 0, 0, 0)
      }
      const endTime = new Date(startTime)
      endTime.setHours(startTime.getHours() + 1)

      setNewEvent({
        title: "",
        description: "",
        type: "meeting",
        start: startTime,
        end: endTime,
        location: "",
        attendees: "",
        allDay: false,
      })
    }
    setShowEventDialog(true)
  }

  const saveEvent = () => {
    if (!newEvent.title.trim()) return

    const eventData: CalendarEvent = {
      id: selectedEvent?.id || Date.now().toString(),
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      description: newEvent.description,
      type: newEvent.type,
      location: newEvent.location,
      attendees: newEvent.attendees ? newEvent.attendees.split(",").map((a) => a.trim()) : [],
      allDay: newEvent.allDay,
    }

    if (selectedEvent) {
      setEvents(events.map((e) => (e.id === selectedEvent.id ? eventData : e)))
    } else {
      setEvents([...events, eventData])
    }

    setShowEventDialog(false)
    setSelectedEvent(null)
  }

  const deleteEvent = (eventId: string) => {
    setEvents(events.filter((e) => e.id !== eventId))
    setShowEventDialog(false)
    setSelectedEvent(null)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-blue-500"
      case "deadline":
        return "bg-red-500"
      case "scan":
        return "bg-purple-500"
      case "review":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-blue-100 text-blue-800"
      case "deadline":
        return "bg-red-100 text-red-800"
      case "scan":
        return "bg-purple-100 text-purple-800"
      case "review":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const showDayEventsDialog = (date: Date) => {
    const dayEvents = getEventsForDate(date)
    if (dayEvents.length > 0) {
      setSelectedDate(date)
      setShowDayEvents(true)
      setShowEventDialog(true)
    } else {
      openEventDialog(date)
    }
  }

  const renderMonthView = () => {
    const days = getMonthData(currentDate)
    const today = new Date()

    return (
      <div className="bg-white rounded-lg border">
        {/* Header */}
        <div className="grid grid-cols-7 border-b">
          {dayNames.map((day) => (
            <div key={day} className="p-4 text-center font-medium text-gray-600 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = day.toDateString() === today.toDateString()
            const dayEvents = getEventsForDate(day)

            return (
              <motion.div
                key={index}
                className={`min-h-[120px] border-r border-b p-2 cursor-pointer hover:bg-gray-50 ${
                  !isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                } ${isToday ? "bg-blue-50" : ""}`}
                onClick={() => showDayEventsDialog(day)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.1 }}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : ""}`}>{day.getDate()}</div>
                <div className="space-y-1">
                  {dayEvents.length > 0 && (
                    <>
                      {dayEvents.length === 1 ? (
                        <motion.div
                          key={dayEvents[0].id}
                          className={`text-xs p-1 rounded text-white truncate ${getTypeColor(dayEvents[0].type)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEventDialog(undefined, dayEvents[0])
                          }}
                          whileHover={{ scale: 1.05 }}
                        >
                          {dayEvents[0].title}
                        </motion.div>
                      ) : (
                        <motion.div
                          className="text-xs p-1 rounded bg-blue-600 text-white text-center font-medium cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            showDayEventsDialog(day)
                          }}
                          whileHover={{ scale: 1.05 }}
                        >
                          +{dayEvents.length}
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDays = getWeekData(currentDate)
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-4 bg-gray-50"></div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-4 text-center bg-gray-50">
              <div className="font-medium text-gray-600">
                {day.getDate()} {dayNames[day.getDay()]}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="grid grid-cols-8 max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="p-2 text-xs text-gray-500 bg-gray-50 border-r border-b">
                {hour === 0
                  ? "12:00 AM"
                  : hour < 12
                    ? `${hour}:00 AM`
                    : hour === 12
                      ? "12:00 PM"
                      : `${hour - 12}:00 PM`}
              </div>
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day).filter((event) => event.start.getHours() === hour)

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="min-h-[60px] border-r border-b p-1 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      const clickDate = new Date(day)
                      clickDate.setHours(hour, 0, 0, 0)
                      openEventDialog(clickDate)
                    }}
                  >
                    {dayEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        className={`text-xs p-1 rounded text-white mb-1 cursor-pointer ${getTypeColor(event.type)}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEventDialog(undefined, event)
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        {event.title}
                      </motion.div>
                    ))}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const dayEvents = getEventsForDate(currentDate)

    return (
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter((event) => event.start.getHours() === hour)

            return (
              <div key={hour} className="flex border-b">
                <div className="w-20 p-2 text-xs text-gray-500 bg-gray-50 border-r">
                  {hour === 0
                    ? "12:00 AM"
                    : hour < 12
                      ? `${hour}:00 AM`
                      : hour === 12
                        ? "12:00 PM"
                        : `${hour - 12}:00 PM`}
                </div>
                <div
                  className="flex-1 min-h-[60px] p-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const clickDate = new Date(currentDate)
                    clickDate.setHours(hour, 0, 0, 0)
                    openEventDialog(clickDate)
                  }}
                >
                  {hourEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      className={`text-sm p-2 rounded text-white mb-1 cursor-pointer ${getTypeColor(event.type)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEventDialog(undefined, event)
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs opacity-90">
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderAgendaView = () => {
    const upcomingEvents = events
      .filter((event) => event.start >= new Date())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 20)

    return (
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium">Upcoming Events</h3>
        </div>

        <div className="divide-y max-h-[600px] overflow-y-auto">
          {upcomingEvents.map((event) => (
            <motion.div
              key={event.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => openEventDialog(undefined, event)}
              whileHover={{ x: 5 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{event.title}</h4>
                  <div className="text-sm text-gray-600 mt-1">
                    {event.start.toLocaleDateString()} • {formatDateRange(event.start, event.end)}
                  </div>
                  {event.location && (
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                </div>
                <Badge className={getTypeBadgeColor(event.type)}>{event.type}</Badge>
              </div>
            </motion.div>
          ))}

          {upcomingEvents.length === 0 && <div className="p-8 text-center text-gray-500">No upcoming events</div>}
        </div>
      </div>
    )
  }

  const getViewTitle = () => {
    switch (view) {
      case "month":
        return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      case "week":
        const weekStart = getWeekData(currentDate)[0]
        const weekEnd = getWeekData(currentDate)[6]
        return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}`
      case "day":
        return currentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      case "agenda":
        return "Agenda"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Plan Board</h1>
          <p className="text-gray-600">Manage project timelines and milestones</p>
        </div>
        <Button onClick={() => openEventDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Navigation and View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigateDate("today")}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold ml-4">{getViewTitle()}</h2>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["month", "week", "day", "agenda"] as ViewType[]).map((viewType) => (
            <Button
              key={viewType}
              variant={view === viewType ? "default" : "ghost"}
              size="sm"
              onClick={() => setView(viewType)}
              className={view === viewType ? "bg-blue-600 text-white" : ""}
            >
              {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-0">
          {view === "month" && renderMonthView()}
          {view === "week" && renderWeekView()}
          {view === "day" && renderDayView()}
          {view === "agenda" && renderAgendaView()}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showDayEvents && selectedDate
                ? `Events for ${selectedDate.toLocaleDateString()}`
                : selectedEvent
                  ? "Event Details"
                  : "Add New Event"}
            </DialogTitle>
            <DialogDescription>
              {showDayEvents
                ? "All events for this day"
                : selectedEvent
                  ? "View and edit event details"
                  : "Create a new calendar event"}
            </DialogDescription>
          </DialogHeader>

          {showDayEvents && selectedDate ? (
            <div className="space-y-4">
              {getEventsForDate(selectedDate).map((event) => (
                <div key={event.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-gray-600">{formatDateRange(event.start, event.end)}</p>
                      {event.location && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setShowDayEvents(false)
                          openEventDialog(undefined, event)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteEvent(event.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                onClick={() => {
                  setShowDayEvents(false)
                  openEventDialog(selectedDate)
                }}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Event for This Day
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value: CalendarEvent["type"]) => setNewEvent({ ...newEvent, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="scan">Scan</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Start</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={newEvent.start.toISOString().slice(0, 16)}
                    onChange={(e) => setNewEvent({ ...newEvent, start: new Date(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={newEvent.end.toISOString().slice(0, 16)}
                    onChange={(e) => setNewEvent({ ...newEvent, end: new Date(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Event location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendees">Attendees</Label>
                <Input
                  id="attendees"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                  placeholder="Comma separated names"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event description"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveEvent} disabled={!newEvent.title.trim()} className="flex-1">
                  {selectedEvent ? "Update Event" : "Create Event"}
                </Button>
                {selectedEvent && (
                  <Button variant="outline" onClick={() => deleteEvent(selectedEvent.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
