"use client"

import {useCallback, useEffect, useMemo, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Textarea} from "@/components/ui/textarea"
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Calendar as CalendarIcon,
    CalendarClock,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Sun,
    Sunrise,
    Sunset,
    Trash2,
    Edit,
    AlertCircle
} from "lucide-react"
import {supabaseClient} from "@/lib/auth-client"
import {useScheduledCheckIns} from "@/hooks/useScheduledCheckIns"
import type {ScheduledCheckIn} from "@/hooks/useScheduledCheckIns"
import type {Database} from "@/lib/database.types"
import {
    addDays,
    addWeeks,
    format,
    isBefore,
    isSameDay,
    isToday,
    parseISO,
    startOfDay,
    startOfWeek,
    subWeeks
} from "date-fns"

interface CalendarScheduleCheckInProps {
    volunteerId: string
    volunteerName: string
}

type ViewMode = "day" | "week"
type TimeSlot = "morning" | "afternoon" | "evening" | "custom"

const TIME_SLOTS = {
    morning: {label: "Morning", icon: Sunrise, start: "09:00", end: "12:00", range: "09:00 - 12:00"},
    afternoon: {label: "Afternoon", icon: Sun, start: "14:00", end: "18:00", range: "14:00 - 18:00"},
    evening: {label: "Evening", icon: Sunset, start: "18:00", end: "22:00", range: "18:00 - 22:00"},
    custom: {label: "Custom Time", icon: Clock, start: "", end: "", range: "Pick exact time"}
} as const

type ScheduledCheckInInsert = Database['public']['Tables']['scheduled_checkins']['Insert']

export function CalendarScheduleCheckIn({volunteerId, volunteerName}: CalendarScheduleCheckInProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("week")
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
    const [customStartTime, setCustomStartTime] = useState("")
    const [customEndTime, setCustomEndTime] = useState("")
    const [action, setAction] = useState<"check_in" | "check_out">("check_in")
    const [notes, setNotes] = useState("")
    const [showDialog, setShowDialog] = useState(false)
    const [loading, setLoading] = useState(false)
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ids: string[], isPaired: boolean} | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [showOverlapDialog, setShowOverlapDialog] = useState(false)
    const [overlappingSchedules, setOverlappingSchedules] = useState<ScheduledCheckIn[]>([])
    const [pendingScheduleRange, setPendingScheduleRange] = useState<{start: Date, end: Date} | null>(null)
    const [overlapPreview, setOverlapPreview] = useState<ScheduledCheckIn[]>([])

    const {scheduledCheckIns, refreshScheduledCheckIns} = useScheduledCheckIns(volunteerId)

    // Calculate week days
    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, {weekStartsOn: 1}) // Monday
        return Array.from({length: 7}, (_, i) => addDays(start, i))
    }, [currentDate])

    // Get scheduled check-ins for a specific date
    const getScheduledForDate = (date: Date) => {
        return scheduledCheckIns.filter(scheduled =>
            isSameDay(parseISO(scheduled.scheduled_datetime), date) && scheduled.status === 'pending'
        )
    }

    const getExcludeIds = useCallback((scheduleId: string | null) => {
        if (!scheduleId) return []

        const exclude = [scheduleId]
        const editingSchedule = scheduledCheckIns.find(s => s.id === scheduleId)

        if (!editingSchedule) {
            return exclude
        }

        const editingTime = parseISO(editingSchedule.scheduled_datetime)

        if (editingSchedule.action === 'check_in') {
            const matchingOut = scheduledCheckIns.find(s =>
                s.status === 'pending' &&
                s.action === 'check_out' &&
                s.volunteer_id === editingSchedule.volunteer_id &&
                isSameDay(parseISO(s.scheduled_datetime), editingTime) &&
                parseISO(s.scheduled_datetime) > editingTime
            )

            if (matchingOut) {
                exclude.push(matchingOut.id)
            }
        } else if (editingSchedule.action === 'check_out') {
            const matchingIn = scheduledCheckIns.find(s =>
                s.status === 'pending' &&
                s.action === 'check_in' &&
                s.volunteer_id === editingSchedule.volunteer_id &&
                isSameDay(parseISO(s.scheduled_datetime), editingTime) &&
                parseISO(s.scheduled_datetime) < editingTime
            )

            if (matchingIn) {
                exclude.push(matchingIn.id)
            }
        }

        return exclude
    }, [scheduledCheckIns])

    const findOverlappingSchedules = useCallback((checkInTime: Date, checkOutTime: Date, excludeIds: string[] = []) => {
        const pendingSchedules = scheduledCheckIns.filter(scheduled => scheduled.status === 'pending')
        const excludeSet = new Set(excludeIds)
        const overlaps = new Map<string, ScheduledCheckIn>()

        const schedulesByKey = new Map<string, ScheduledCheckIn[]>()
        const keyForSchedule = (schedule: ScheduledCheckIn) => {
            const scheduleDate = parseISO(schedule.scheduled_datetime)
            return `${schedule.volunteer_id}-${format(scheduleDate, 'yyyy-MM-dd')}`
        }

        pendingSchedules.forEach(schedule => {
            const key = keyForSchedule(schedule)
            const list = schedulesByKey.get(key) ?? []
            list.push(schedule)
            schedulesByKey.set(key, list)
        })

        schedulesByKey.forEach(list => {
            list.sort((a, b) =>
                parseISO(a.scheduled_datetime).getTime() - parseISO(b.scheduled_datetime).getTime()
            )
        })

        const findNextCheckOut = (schedule: ScheduledCheckIn) => {
            const key = keyForSchedule(schedule)
            const list = schedulesByKey.get(key) ?? []
            const startTime = parseISO(schedule.scheduled_datetime).getTime()
            return list.find(item =>
                item.action === 'check_out' &&
                parseISO(item.scheduled_datetime).getTime() > startTime
            )
        }

        const findPreviousCheckIn = (schedule: ScheduledCheckIn) => {
            const key = keyForSchedule(schedule)
            const list = schedulesByKey.get(key) ?? []
            const endTime = parseISO(schedule.scheduled_datetime).getTime()
            for (let i = list.length - 1; i >= 0; i--) {
                const item = list[i]
                if (item.action === 'check_in' && parseISO(item.scheduled_datetime).getTime() < endTime) {
                    return item
                }
            }
            return undefined
        }

        pendingSchedules.forEach(schedule => {
            if (excludeSet.has(schedule.id)) return

            if (schedule.action === 'check_in') {
                const start = parseISO(schedule.scheduled_datetime)
                const matchingOut = findNextCheckOut(schedule)
                const end = matchingOut ? parseISO(matchingOut.scheduled_datetime) : start

                if (start < checkOutTime && end > checkInTime) {
                    overlaps.set(schedule.id, schedule)
                    if (matchingOut && !excludeSet.has(matchingOut.id)) {
                        overlaps.set(matchingOut.id, matchingOut)
                    }
                }
            } else {
                const matchingIn = findPreviousCheckIn(schedule)
                if (!matchingIn) {
                    const end = parseISO(schedule.scheduled_datetime)
                    if (end > checkInTime && end < checkOutTime) {
                        overlaps.set(schedule.id, schedule)
                    }
                }
            }
        })

        return Array.from(overlaps.values()).sort(
            (a, b) => parseISO(a.scheduled_datetime).getTime() - parseISO(b.scheduled_datetime).getTime()
        )
    }, [scheduledCheckIns])

    const handleDateClick = (date: Date) => {
        if (isBefore(startOfDay(date), startOfDay(new Date()))) return
        setSelectedDate(date)
        setShowDialog(true)
        setSelectedTimeSlot(null)
        setCustomStartTime("")
        setCustomEndTime("")
        setNotes("")
    }

    // Check if a time slot would be in the past
    const isTimeSlotInPast = (slot: TimeSlot, dateOverride?: Date) => {
        const referenceDate = dateOverride ?? selectedDate
        if (!referenceDate) return false

        const now = new Date()
        const selectedStartOfDay = startOfDay(referenceDate)
        const todayStart = startOfDay(now)

        if (selectedStartOfDay < todayStart) {
            return true
        }

        if (slot === 'custom') return false

        const selectedDay = format(referenceDate, 'yyyy-MM-dd')
        const slotInfo = TIME_SLOTS[slot as keyof typeof TIME_SLOTS]
        const checkInDatetime = new Date(`${selectedDay}T${slotInfo.start}`)

        return checkInDatetime <= now
    }

    const getScheduleRange = useCallback((): {start: Date, end: Date} | null => {
        if (!selectedDate || !selectedTimeSlot) return null

        const dateString = format(selectedDate, 'yyyy-MM-dd')

        if (selectedTimeSlot === "custom") {
            if (!customStartTime) {
                return null
            }

            const start = new Date(`${dateString}T${customStartTime}`)
            const end = new Date(`${dateString}T${customEndTime || "18:00"}`)

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
                return null
            }

            return {start, end}
        }

        const slotInfo = TIME_SLOTS[selectedTimeSlot]
        const start = new Date(`${dateString}T${slotInfo.start}`)
        const end = new Date(`${dateString}T${slotInfo.end}`)

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return null
        }

        return {start, end}
    }, [customEndTime, customStartTime, selectedDate, selectedTimeSlot])

    useEffect(() => {
        const range = getScheduleRange()

        if (!range) {
            setOverlapPreview([])
            return
        }

        const overlaps = findOverlappingSchedules(range.start, range.end, getExcludeIds(editingScheduleId))
        setOverlapPreview(prev => {
            if (prev.length === overlaps.length && prev.every((item, index) => item.id === overlaps[index].id)) {
                return prev
            }
            return overlaps
        })
    }, [getScheduleRange, findOverlappingSchedules, getExcludeIds, editingScheduleId])

    const handleSchedule = async (forceOverwrite = false) => {
        if (!selectedDate || !selectedTimeSlot) return

        setLoading(true)

        try {
            // If editing, update the existing schedule
            if (editingScheduleId) {
                const timeStr = selectedTimeSlot === "custom"
                    ? (action === 'check_in' ? customStartTime : customEndTime)
                    : TIME_SLOTS[selectedTimeSlot].start

                if (!timeStr) {
                    setLoading(false)
                    return
                }

                const scheduledDatetime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${timeStr}`)

                const { error } = await supabaseClient
                    .from('scheduled_checkins')
                    .update({
                        scheduled_datetime: scheduledDatetime.toISOString(),
                        notes: notes || null
                    })
                    .eq('id', editingScheduleId)

                if (error) throw error

                setShowDialog(false)
                setEditingScheduleId(null)
                setSelectedDate(null)
                setSelectedTimeSlot(null)
                setCustomStartTime("")
                setCustomEndTime("")
                setNotes("")
                refreshScheduledCheckIns()
                setLoading(false)
                return
            }

            const scheduleRange = getScheduleRange()
            if (!scheduleRange) {
                setLoading(false)
                return
            }

            const {start: checkInDatetime, end: finalCheckOutTime} = scheduleRange

            const now = new Date()

            if (checkInDatetime <= now || finalCheckOutTime <= now || finalCheckOutTime <= checkInDatetime) {
                setLoading(false)
                return
            }

            const excludeIds = getExcludeIds(editingScheduleId)

            const overlaps = findOverlappingSchedules(checkInDatetime, finalCheckOutTime, excludeIds)

            if (overlaps.length > 0) {
                if (!forceOverwrite) {
                    setOverlappingSchedules(overlaps)
                    setPendingScheduleRange({
                        start: checkInDatetime,
                        end: finalCheckOutTime
                    })
                    setShowOverlapDialog(true)
                    setLoading(false)
                    return
                }

                const deletePromises = overlaps.map(schedule =>
                    supabaseClient
                        .from('scheduled_checkins')
                        .delete()
                        .eq('id', schedule.id)
                )

                const deleteResults = await Promise.all(deletePromises)

                const errorResponse = deleteResults.find(result => result.error)
                if (errorResponse?.error) {
                    throw new Error(`Failed to delete overlapping schedules: ${errorResponse.error.message}`)
                }

                await refreshScheduledCheckIns()
            }

            const insertData: ScheduledCheckInInsert[] = []

            insertData.push({
                volunteer_id: volunteerId,
                scheduled_datetime: checkInDatetime.toISOString(),
                action: 'check_in',
                notes: notes || null,
                status: 'pending',
                auto_execute: true
            })

            insertData.push({
                volunteer_id: volunteerId,
                scheduled_datetime: finalCheckOutTime.toISOString(),
                action: 'check_out',
                notes: notes || null,
                status: 'pending',
                auto_execute: true
            })

            const insertPromise = supabaseClient
                .from('scheduled_checkins')
                .insert(insertData)
                .select()

            const timeoutPromise: Promise<never> = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
            )

            type InsertResult = Awaited<typeof insertPromise>
            const insertResult: InsertResult = await Promise.race([insertPromise, timeoutPromise])

            if (insertResult.error) {
                console.error('Database error:', insertResult.error)

                if (insertResult.error.message?.includes('does not exist') || insertResult.error.code === '42P01') {
                    throw new Error('The scheduled_checkins table has not been created yet. Please run the database migration first (add-scheduled-checkins.sql)')
                }

                throw new Error(insertResult.error.message || 'Database error')
            }

            setShowDialog(false)
            setSelectedDate(null)
            setSelectedTimeSlot(null)
            setCustomStartTime("")
            setCustomEndTime("")
            setNotes("")
            setOverlappingSchedules([])
            setPendingScheduleRange(null)
            refreshScheduledCheckIns()
        } catch (error: unknown) {
            console.error('Error scheduling check-in:', error)
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
            alert(`Failed to schedule: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    const handleOverwriteConfirm = async () => {
        setShowOverlapDialog(false)
        setOverlappingSchedules([])
        setPendingScheduleRange(null)
        await handleSchedule(true)
    }

    const handleEdit = (scheduled: ScheduledCheckIn) => {
        const scheduledDate = parseISO(scheduled.scheduled_datetime)
        setEditingScheduleId(scheduled.id)
        setSelectedDate(scheduledDate)
        setAction(scheduled.action)
        setNotes(scheduled.notes || "")

        // Set time based on scheduled datetime
        const timeStr = format(scheduledDate, 'HH:mm')
        setSelectedTimeSlot("custom")
        if (scheduled.action === 'check_in') {
            setCustomStartTime(timeStr)
        } else {
            setCustomEndTime(timeStr)
        }

        setShowDialog(true)
    }

    const handleDeleteClick = (ids: string[], isPaired: boolean = false) => {
        setDeleteTarget({ ids, isPaired })
        setShowDeleteDialog(true)
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return

        setDeleteLoading(true)
        try {
            const deleteResults = await Promise.all(
                deleteTarget.ids.map(id =>
                    supabaseClient
                        .from('scheduled_checkins')
                        .delete()
                        .eq('id', id)
                )
            )

            const errorResponse = deleteResults.find(result => result.error)
            if (errorResponse?.error) {
                throw new Error(errorResponse.error.message)
            }

            setShowDeleteDialog(false)
            setDeleteTarget(null)
            await refreshScheduledCheckIns()
        } catch (error: unknown) {
            console.error('Error deleting scheduled check-in:', error)
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
            alert(`Failed to delete: ${errorMessage}`)
        } finally {
            setDeleteLoading(false)
        }
    }

    const navigateWeek = (direction: "prev" | "next") => {
        setCurrentDate(prev => direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1))
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5"/>
                            Schedule Check-ins
                        </CardTitle>
                        <CardDescription>
                            Click to schedule check-in/check-out for {volunteerName}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={viewMode === "day" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("day")}
                        >
                            Day
                        </Button>
                        <Button
                            variant={viewMode === "week" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("week")}
                        >
                            Week
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Week Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                        <ChevronLeft className="h-4 w-4"/>
                    </Button>
                    <h3 className="font-semibold text-lg">
                        {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                        <ChevronRight className="h-4 w-4"/>
                    </Button>
                </div>

                {/* Week View */}
                {viewMode === "week" && (
                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map((day, idx) => {
                            const scheduled = getScheduledForDate(day)
                            const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                            const todayClass = isToday(day)
                            const hasScheduled = scheduled.length > 0

                            return (
                                <div key={idx} className="min-h-[100px]">
                                    <button
                                        onClick={() => handleDateClick(day)}
                                        disabled={isPast}
                                        className={`w-full h-full p-3 rounded-lg border-2 transition-all ${
                                            isPast
                                                ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                                                : todayClass
                                                ? "border-esn-cyan bg-esn-cyan/5"
                                                : "border-border hover:border-esn-cyan/50 hover:bg-muted/50 cursor-pointer"
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className={`text-xs font-medium ${isPast ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                                                {format(day, 'EEE')}
                                            </div>
                                            <div className={`text-lg font-bold ${isPast ? 'text-muted-foreground/50 line-through' : todayClass ? 'text-esn-cyan' : ''}`}>
                                                {format(day, 'd')}
                                            </div>
                                            {hasScheduled && (
                                                <div className="mt-2 flex justify-center">
                                                    <div className={`w-2 h-2 rounded-full ${isPast ? 'bg-muted-foreground/30' : 'bg-esn-cyan animate-pulse'}`}/>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Day View */}
                {viewMode === "day" && (
                    <div className="space-y-4">
                        <div className="text-center mb-4">
                            <h3 className="text-2xl font-bold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
                        </div>
                        {/* Time slots for the day */}
                        <div className="grid grid-cols-1 gap-3">
                            {Object.entries(TIME_SLOTS).slice(0, 3).map(([key, slot]) => {
                                const slotKey = key as TimeSlot
                                const isPastSlot = isTimeSlotInPast(slotKey, currentDate)
                                return (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setSelectedDate(currentDate)
                                            setSelectedTimeSlot(slotKey)
                                            setShowDialog(true)
                                        }}
                                        disabled={isPastSlot}
                                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                                            isPastSlot
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:border-esn-cyan hover:bg-esn-cyan/5"
                                        }`}
                                        aria-disabled={isPastSlot}
                                    >
                                        <div className="flex items-center gap-3">
                                            <slot.icon className={`h-6 w-6 ${isPastSlot ? "text-muted-foreground" : "text-esn-cyan"}`}/>
                                            <div>
                                                <div className="font-semibold">{slot.label}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {slot.range}
                                                    {isPastSlot && " • Past"}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Scheduled Check-ins List - Grouped by Date with Time Ranges */}
                {scheduledCheckIns.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4"/>
                            All Scheduled Times ({scheduledCheckIns.length} items)
                        </h4>
                        <div className="space-y-3">
                            {(() => {
                                // Group schedules by date and find check-in/check-out pairs
                                const schedulesByDate = scheduledCheckIns.reduce((acc, scheduled) => {
                                    const date = format(parseISO(scheduled.scheduled_datetime), 'yyyy-MM-dd')
                                    if (!acc[date]) acc[date] = []
                                    acc[date].push(scheduled)
                                    return acc
                                }, {} as Record<string, typeof scheduledCheckIns>)

                                // Sort dates
                                const sortedDates = Object.keys(schedulesByDate).sort()

                                return sortedDates.map(dateKey => {
                                    const daySchedules = schedulesByDate[dateKey].sort((a, b) =>
                                        new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime()
                                    )

                                    // Check if this date is in the past
                                    const isDatePast = isBefore(startOfDay(parseISO(dateKey)), startOfDay(new Date()))

                                    // Try to pair check-ins with check-outs
                                    const pairs: Array<{checkIn?: ScheduledCheckIn, checkOut?: ScheduledCheckIn, unpaired?: ScheduledCheckIn}> = []
                                    const used = new Set<string>()

                                    daySchedules.forEach(schedule => {
                                        if (used.has(schedule.id)) return

                                        if (schedule.action === 'check_in') {
                                            // Find corresponding check-out
                                            const checkOut = daySchedules.find(s =>
                                                s.action === 'check_out' &&
                                                !used.has(s.id) &&
                                                new Date(s.scheduled_datetime) > new Date(schedule.scheduled_datetime)
                                            )

                                            if (checkOut) {
                                                pairs.push({ checkIn: schedule, checkOut })
                                                used.add(schedule.id)
                                                used.add(checkOut.id)
                                            } else {
                                                pairs.push({ unpaired: schedule })
                                                used.add(schedule.id)
                                            }
                                        } else if (!used.has(schedule.id)) {
                                            pairs.push({ unpaired: schedule })
                                            used.add(schedule.id)
                                        }
                                    })

                                    return (
                                        <div key={dateKey} className={`border rounded-lg p-3 ${isDatePast ? 'bg-muted/20 opacity-60' : 'bg-muted/30'}`}>
                                            <div className={`font-medium text-sm mb-3 ${isDatePast ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'}`}>
                                                {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                                                {isDatePast && <span className="ml-2 text-xs">(Past)</span>}
                                            </div>
                                            <div className="space-y-2">
                                                {pairs.map((pair) => {
                                                    if (pair.checkIn && pair.checkOut) {
                                                        const checkIn = pair.checkIn
                                                        const checkOut = pair.checkOut
                                                        const checkInTime = parseISO(checkIn.scheduled_datetime)
                                                        const checkOutTime = parseISO(checkOut.scheduled_datetime)
                                                        return (
                                                            <div key={`${checkIn.id}-${checkOut.id}`}
                                                                className={`flex items-center justify-between p-3 bg-background rounded-lg border ${isDatePast ? 'opacity-70' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className={`p-2 rounded-lg ${isDatePast ? 'bg-muted-foreground/10 text-muted-foreground/50' : 'bg-esn-cyan/20 text-esn-cyan'}`}>
                                                                        <Clock className="h-4 w-4"/>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className={`font-medium text-sm ${isDatePast ? 'text-muted-foreground/70 line-through' : ''}`}>
                                                                            {format(checkInTime, 'HH:mm')} - {format(checkOutTime, 'HH:mm')}
                                                                        </div>
                                                                        {checkIn.notes && (
                                                                            <div className={`text-xs mt-1 ${isDatePast ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                                                                                {checkIn.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {!isDatePast && (
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleEdit(checkIn)}
                                                                            className="text-muted-foreground hover:text-foreground"
                                                                        >
                                                                            <Edit className="h-4 w-4"/>
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteClick([checkIn.id, checkOut.id], true)}
                                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        >
                                                                            <Trash2 className="h-4 w-4"/>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    } else if (pair.unpaired) {
                                                        const scheduled = pair.unpaired
                                                        const scheduledDate = parseISO(scheduled.scheduled_datetime)
                                                        return (
                                                            <div key={scheduled.id}
                                                                className={`flex items-center justify-between p-3 bg-background rounded-lg border ${isDatePast ? 'opacity-70 border-muted' : 'border-yellow-200 dark:border-yellow-900'}`}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className={`p-2 rounded-lg ${
                                                                        isDatePast
                                                                            ? 'bg-muted-foreground/10 text-muted-foreground/50'
                                                                            : scheduled.action === 'check_in'
                                                                            ? 'bg-esn-cyan/20 text-esn-cyan'
                                                                            : 'bg-muted-foreground/20 text-muted-foreground'
                                                                    }`}>
                                                                        {scheduled.action === 'check_in' ? (
                                                                            <CheckCircle className="h-4 w-4"/>
                                                                        ) : (
                                                                            <Clock className="h-4 w-4"/>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`font-medium text-sm ${isDatePast ? 'text-muted-foreground/70 line-through' : ''}`}>
                                                                                {scheduled.action === 'check_in' ? 'Check In' : 'Check Out'} at {format(scheduledDate, 'HH:mm')}
                                                                            </span>
                                                                            {!isDatePast && (
                                                                                <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950">
                                                                                    Unpaired
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        {scheduled.notes && (
                                                                            <div className={`text-xs mt-1 ${isDatePast ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                                                                                {scheduled.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {!isDatePast && (
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleEdit(scheduled)}
                                                                            className="text-muted-foreground hover:text-foreground"
                                                                        >
                                                                            <Edit className="h-4 w-4"/>
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteClick([scheduled.id], false)}
                                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        >
                                                                            <Trash2 className="h-4 w-4"/>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                })}
                                            </div>
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    </div>
                )}
            </CardContent>

            {/* Scheduling Dialog */}
            <Dialog open={showDialog} onOpenChange={(open) => {
                setShowDialog(open)
                if (!open) {
                    setEditingScheduleId(null)
                    setSelectedDate(null)
                    setSelectedTimeSlot(null)
                    setCustomStartTime("")
                    setCustomEndTime("")
                    setNotes("")
                    setOverlappingSchedules([])
                    setShowOverlapDialog(false)
                    setPendingScheduleRange(null)
                    setOverlapPreview([])
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingScheduleId ? 'Edit Scheduled Time' : 'Schedule Office Time'}</DialogTitle>
                        <DialogDescription>
                            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Time Slot Selection */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Time Interval</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(TIME_SLOTS).map(([key, slot]) => {
                                    const isPast = isTimeSlotInPast(key as TimeSlot)
                                    return (
                                        <Button
                                            key={key}
                                            variant={selectedTimeSlot === key ? "default" : "outline"}
                                            onClick={() => {
                                                setSelectedTimeSlot(key as TimeSlot)
                                                if (key !== "custom") {
                                                    setCustomStartTime("")
                                                    setCustomEndTime("")
                                                }
                                            }}
                                            disabled={isPast}
                                            className={`flex flex-col items-start h-auto py-3 ${
                                                selectedTimeSlot === key && key !== "custom" ? "bg-esn-cyan hover:bg-esn-cyan/90" : ""
                                            } ${isPast ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <slot.icon className="h-4 w-4"/>
                                                <span className="font-medium">{slot.label}</span>
                                            </div>
                                            <span className="text-xs opacity-70">
                        {slot.range}
                                                {isPast && " (Past)"}
                      </span>
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Custom Time Interval Inputs */}
                        {selectedTimeSlot === "custom" && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Check-in Time *</label>
                                    <input
                                        type="time"
                                        value={customStartTime}
                                        onChange={(e) => setCustomStartTime(e.target.value)}
                                        min={
                                            selectedDate && isToday(selectedDate)
                                                ? format(new Date(), 'HH:mm')
                                                : undefined
                                        }
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                        required
                                    />
                                    {selectedDate && isToday(selectedDate) && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Must be after current time
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Check-out Time <span className="text-muted-foreground font-normal">(optional, defaults to 18:00)</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={customEndTime}
                                        onChange={(e) => setCustomEndTime(e.target.value)}
                                        min={customStartTime || undefined}
                                        placeholder="18:00"
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                    />
                                    {customStartTime && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Must be after check-in time
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Info message */}
                        {selectedTimeSlot && selectedTimeSlot !== "custom" && (
                            <div className="bg-esn-cyan/10 border border-esn-cyan/20 rounded-lg p-3 text-sm">
                                <p className="text-esn-cyan font-medium">
                                    ✓ This will schedule both check-in and check-out for this time period
                                </p>
                            </div>
                        )}

                        {overlapPreview.length > 0 && (
                            <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-100">
                                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-200"/>
                                <AlertTitle>Overlapping schedule detected</AlertTitle>
                                <AlertDescription>
                                    <div className="text-xs text-yellow-900 dark:text-yellow-100">
                                        <p className="mb-2">
                                            Saving will remove the existing times below and replace them with the new interval.
                                        </p>
                                        <div className="space-y-1">
                                            {Array.from(new Set(overlapPreview.map(schedule => {
                                                const schedTime = parseISO(schedule.scheduled_datetime)
                                                const label = schedule.action === 'check_in' ? 'Check In' : 'Check Out'
                                                return `${label} • ${format(schedTime, 'dd MMM yyyy, HH:mm')}`
                                            }))).map(text => (
                                                <div key={text}>{text}</div>
                                            ))}
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g., Meeting with international students"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleSchedule()}
                            disabled={loading || !selectedTimeSlot || (selectedTimeSlot === "custom" && !customStartTime)}
                            className="bg-gradient-to-r from-esn-cyan to-esn-cyan/90 hover:from-esn-cyan/90 hover:to-esn-cyan"
                        >
                            {loading ? (editingScheduleId ? "Updating..." : "Scheduling...") : (editingScheduleId ? "Update Time" : "Schedule Office Time")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Overlap Confirmation Dialog */}
            <Dialog
                open={showOverlapDialog}
                onOpenChange={(open) => {
                    setShowOverlapDialog(open)
                    if (!open) {
                        setOverlappingSchedules([])
                        setPendingScheduleRange(null)
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Overlapping Schedule Detected</DialogTitle>
                        <DialogDescription>
                            The time interval you selected overlaps with existing scheduled times.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-100">
                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-200"/>
                            <AlertTitle>This will replace an existing schedule</AlertTitle>
                            <AlertDescription>
                                {pendingScheduleRange ? (
                                    <>
                                        Creating a {format(pendingScheduleRange.start, 'HH:mm')} - {format(pendingScheduleRange.end, 'HH:mm')} slot will remove the overlapping times listed below.
                                    </>
                                ) : (
                                    <>Creating this schedule will remove the overlapping times listed below.</>
                                )}
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            {overlappingSchedules.map((schedule) => {
                                const schedTime = parseISO(schedule.scheduled_datetime)
                                return (
                                    <div key={schedule.id} className="text-xs text-muted-foreground flex items-center gap-2 border rounded-md px-3 py-2">
                                        <Clock className="h-3 w-3"/>
                                        <span>
                                            {schedule.action === 'check_in' ? 'Check In' : 'Check Out'} at {format(schedTime, 'HH:mm')}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowOverlapDialog(false)
                                setOverlappingSchedules([])
                                setPendingScheduleRange(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleOverwriteConfirm}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            Overwrite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Scheduled Time</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.isPaired
                                ? 'Are you sure you want to delete this scheduled time interval? This will remove both the check-in and check-out.'
                                : 'Are you sure you want to delete this scheduled item?'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                            <p className="text-sm text-red-900 dark:text-red-100">
                                This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteDialog(false)
                                setDeleteTarget(null)
                            }}
                            disabled={deleteLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelete}
                            variant="destructive"
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
