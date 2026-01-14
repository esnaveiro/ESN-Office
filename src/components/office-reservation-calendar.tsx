"use client"

import {useEffect, useState} from "react"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {Badge} from "@/components/ui/badge"
import {Checkbox} from "@/components/ui/checkbox"
import {Switch} from "@/components/ui/switch"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Loader2,
  Search,
  Send,
  Users,
  X
} from "lucide-react"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {supabaseClient} from "@/lib/auth-client"

interface OfficeReservationCalendarProps {
  volunteer: { id: string; name: string; email?: string }
  onSuccess?: () => void
}

interface Reservation {
  id: string
  reserved_by_id: string
  reserved_by_name: string
  start_time: string
  end_time: string
  reason: string | null
  additional_volunteers?: string[]
}

interface Volunteer {
  id: string
  name: string
  email: string
}

export function OfficeReservationCalendar({ volunteer, onSuccess }: OfficeReservationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<string>("")
  const [selectedEndTime, setSelectedEndTime] = useState<string>("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [allVolunteers, setAllVolunteers] = useState<Volunteer[]>([])
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([])
  const [showVolunteerSelector, setShowVolunteerSelector] = useState(false)
  const [volunteerSearchQuery, setVolunteerSearchQuery] = useState("")
  const [sendEmailNotification, setSendEmailNotification] = useState(false)

  // Fetch reservations
  useEffect(() => {
    fetchReservations()
  }, [currentDate])

  // Fetch all volunteers when a date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAllVolunteers()
    }
  }, [selectedDate])

  const fetchAllVolunteers = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('volunteers')
        .select('id, name, email')
        .neq('id', volunteer.id)
        .order('name')

      if (error) throw error
      setAllVolunteers(data || [])
    } catch (error) {
      console.error('Error fetching volunteers:', error)
    }
  }

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/office-reservation')
      if (response.ok) {
        const data = await response.json()
        setReservations(data.reservations || [])
      }
    } catch (error) {
      console.error('Error fetching reservations:', error)
    }
  }

  const getReservationsForDate = (date: Date | null) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return reservations.filter(res => {
      const resDate = new Date(res.start_time).toISOString().split('T')[0]
      return resDate === dateStr
    })
  }

  // Get days in current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const isPastDate = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  const handleDateClick = (date: Date | null) => {
    if (!date || isPastDate(date)) return

    // If clicking the same date, unselect it
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      setSelectedDate(null)
      setEditingReservation(null)
      setSelectedStartTime("")
      setSelectedEndTime("")
      setReason("")
      setSendEmailNotification(false)
      setSelectedVolunteers([])
      setShowVolunteerSelector(false)
      // setSendApprovalRequest(true)
      setMessage(null)
      return
    }

    setSelectedDate(date)
    setMessage(null)
    // Clear editing state when selecting a new date
    setEditingReservation(null)
    setSelectedStartTime("")
    setSelectedEndTime("")
    setReason("")
    setSendEmailNotification(false)
    setSelectedVolunteers([])
    setShowVolunteerSelector(false)
    // setSendApprovalRequest(true)
  }

  const handleEditReservation = (reservation: Reservation) => {
    const startTime = new Date(reservation.start_time)
    const endTime = new Date(reservation.end_time)

    setSelectedDate(startTime)
    // Extract HH:MM format
    setSelectedStartTime(startTime.toTimeString().slice(0, 5))
    setSelectedEndTime(endTime.toTimeString().slice(0, 5))
    setReason(reservation.reason || "")
    setSelectedVolunteers(reservation.additional_volunteers || [])
    setEditingReservation(reservation)
    setMessage(null)
  }

  const handleReserve = async () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setMessage({ type: 'error', text: 'Please select a date, start time, and end time' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const startDateTime = `${selectedDate.toISOString().split('T')[0]}T${selectedStartTime}:00`
      const endDateTime = `${selectedDate.toISOString().split('T')[0]}T${selectedEndTime}:00`

      if (new Date(endDateTime) <= new Date(startDateTime)) {
        setMessage({ type: 'error', text: 'End time must be after start time' })
        setLoading(false)
        return
      }

      const url = editingReservation
        ? `/api/office-reservation?id=${editingReservation.id}`
        : '/api/office-reservation'

      const response = await fetch(url, {
        method: editingReservation ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reserved_by_id: volunteer?.id,
          reserved_by_name: volunteer?.name || 'Unknown',
          start_time: startDateTime,
          end_time: endDateTime,
          reason,
          additional_volunteers: selectedVolunteers.length > 0 ? selectedVolunteers : null,
          send_email_notification: sendEmailNotification
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setMessage({
            type: 'error',
            text: `Time slot already reserved. Please choose a different time.`
          })
        } else {
          setMessage({ type: 'error', text: data.error || `Failed to ${editingReservation ? 'update' : 'create'} reservation` })
        }
        setLoading(false)
        return
      }

      setMessage({
        type: 'success',
        text: `Office ${editingReservation ? 'updated' : 'reserved'} successfully!${sendEmailNotification ? ' Notifications sent to volunteers.' : ''}`
      })

      // Reset form after short delay
      setTimeout(() => {
        setSelectedDate(null)
        setSelectedStartTime("")
        setSelectedEndTime("")
        setReason("")
        setSelectedVolunteers([])
        setShowVolunteerSelector(false)
        setSendEmailNotification(false)
        setEditingReservation(null)
        setMessage(null)
        fetchReservations()
        onSuccess?.()
      }, 2000)
    } catch (error) {
      console.error('Error creating reservation:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const days = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Reserve Office
        </CardTitle>
        <CardDescription>
          Click a date to reserve the office for a specific time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Calendar */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-bold">{monthName}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-3">
                {day}
              </div>
            ))}
            {days.map((date, index) => {
              const hasReservations = getReservationsForDate(date).length > 0
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  disabled={!date || isPastDate(date)}
                  className={`
                    h-10 rounded-lg text-sm font-medium transition-all relative
                    ${!date ? 'invisible' : ''}
                    ${isPastDate(date) ? 'text-muted-foreground/40 cursor-not-allowed' : ''}
                    ${isToday(date) && !isSelected(date) ? 'border border-esn-cyan bg-esn-cyan/5' : ''}
                    ${isSelected(date) ? 'bg-primary text-primary-foreground' : ''}
                    ${date && !isPastDate(date) && !isSelected(date) ? 'hover:bg-muted/50 border border-border hover:border-primary/50' : ''}
                    ${date && !isPastDate(date) && !isSelected(date) && !isToday(date) ? 'border border-border' : ''}
                  `}
                >
                  {date?.getDate()}
                  {hasReservations && !isPastDate(date) && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="space-y-4 border-t pt-4">
            <div className="p-3 rounded-lg border bg-muted/50">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Label>
            </div>

            {/* Show existing reservations for this date */}
            {!editingReservation && getReservationsForDate(selectedDate).length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Existing Reservations:</Label>
                {getReservationsForDate(selectedDate).map(res => (
                  <div key={res.id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{res.reserved_by_name}</p>
                        {res.additional_volunteers && res.additional_volunteers.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            +{res.additional_volunteers.length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(res.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(res.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                      {res.reason && <p className="text-xs text-muted-foreground mt-1">{res.reason}</p>}
                    </div>
                    {res.reserved_by_id === volunteer?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReservation(res)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {editingReservation && (
              <div className="p-3 rounded-lg border bg-primary/5">
                <Label className="text-sm font-medium">Editing Reservation</Label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={selectedStartTime}
                  onChange={(e) => setSelectedStartTime(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End Time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={selectedEndTime}
                  onChange={(e) => setSelectedEndTime(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Board meeting, Team event, Training session"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Additional Volunteers (Optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowVolunteerSelector(!showVolunteerSelector)
                    if (showVolunteerSelector) {
                      setVolunteerSearchQuery("")
                    }
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {selectedVolunteers.length > 0 ? `${selectedVolunteers.length} selected` : 'Add volunteers'}
                </Button>
              </div>
              {showVolunteerSelector && (
                <div className="border rounded-lg p-3 space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search volunteers..."
                      value={volunteerSearchQuery}
                      onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Volunteer List */}
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {allVolunteers.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Loading volunteers...</p>
                    ) : (() => {
                      const filteredVolunteers = allVolunteers.filter((v) =>
                        v.name.toLowerCase().includes(volunteerSearchQuery.toLowerCase()) ||
                        v.email.toLowerCase().includes(volunteerSearchQuery.toLowerCase())
                      )

                      if (filteredVolunteers.length === 0) {
                        return (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No volunteers found matching &quot;{volunteerSearchQuery}&quot;
                          </p>
                        )
                      }

                      return filteredVolunteers.map((v) => (
                        <div key={v.id} className="flex items-center gap-3">
                          <Checkbox
                            id={v.id}
                            checked={selectedVolunteers.includes(v.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedVolunteers([...selectedVolunteers, v.id])
                              } else {
                                setSelectedVolunteers(selectedVolunteers.filter(id => id !== v.id))
                              }
                            }}
                          />
                          <label htmlFor={v.id} className="text-sm cursor-pointer flex-1">
                            {v.name}
                          </label>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
              {selectedVolunteers.length > 0 && !showVolunteerSelector && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedVolunteers.map((id) => {
                    const volunteer = allVolunteers.find(v => v.id === id)
                    return volunteer ? (
                      <Badge key={id} variant="secondary" className="text-xs pl-2 pr-1 py-1 flex items-center gap-1.5">
                        {volunteer.name}
                        <button
                          type="button"
                          onClick={() => setSelectedVolunteers(selectedVolunteers.filter(vid => vid !== id))}
                          className="hover:bg-secondary/80 rounded-sm p-0.5 transition-colors"
                          title="Remove volunteer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>

            {/* Send Approval Request Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-primary"/>
                <div>
                  <Label htmlFor="send-email-notification" className="font-medium cursor-pointer text-sm">
                    Send email notification to assigned volunteers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify you and all assigned volunteers about this reservation
                  </p>
                </div>
              </div>
              <Switch
                  id="send-email-notification"
                  checked={sendEmailNotification}
                  onCheckedChange={setSendEmailNotification}
              />
            </div>

            {message && (
              <Alert className={message.type === 'success' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-primary' : 'text-destructive'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedDate(null)
                  setSelectedStartTime("")
                  setSelectedEndTime("")
                  setReason("")
                  setEditingReservation(null)
                  setMessage(null)
                  setSelectedVolunteers([])
                  setShowVolunteerSelector(false)
                  setSendEmailNotification(false)
                }}
                variant="outline"
                disabled={loading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleReserve}
                disabled={loading || !selectedStartTime || !selectedEndTime}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingReservation ? 'Updating...' : 'Reserving...'}
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    {editingReservation ? 'Update Reservation' : 'Reserve Office'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
