import { useState, useMemo } from "react"
import { format, addDays, startOfWeek } from "date-fns"

export type TimeView = "day" | "week"

interface ScheduleSlot {
  volunteer_id: string
  date: string
  start_time: string
  end_time: string
  confirmation_type: "firm" | "flex" | "confirmed"
}

interface Reservation {
  start_time: string
  end_time: string
  is_active: boolean
}

interface Volunteer {
  id: string
  name: string
  status?: string
  avatar?: string | null
  position?: string | null
}

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd")

const timeStringToMinutes = (time: string) => {
  const [hoursStr = "0", minutesStr = "0"] = time.split(':')
  const hours = Number.parseInt(hoursStr, 10)
  const minutes = Number.parseInt(minutesStr, 10)
  return hours * 60 + minutes
}

export function useTimeSchedule(
  schedules: ScheduleSlot[],
  reservations: Reservation[] | undefined,
  volunteers: Volunteer[]
) {
  const [timeView, setTimeView] = useState<TimeView>("day")
  const [currentDate, setCurrentDate] = useState(new Date())

  const currentDateKey = formatDateKey(currentDate)
  const actualTodayKey = formatDateKey(new Date())

  const navigateTime = (direction: 'prev' | 'next') => {
    if (timeView === "day") {
      setCurrentDate(prev => {
        const newDate = new Date(prev)
        newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1))
        return newDate
      })
    } else {
      setCurrentDate(prev => {
        const newDate = new Date(prev)
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7))
        return newDate
      })
    }
  }

  const formatTimeViewTitle = () => {
    if (timeView === "day") {
      const isToday = currentDateKey === actualTodayKey
      if (isToday) return "Today"
      return format(currentDate, "MMM d, yyyy")
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 6)
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    }
  }

  const timeIntervals = useMemo(() => {
    if (timeView === "day") {
      // Generate 30-minute intervals from 9 AM to 6 PM
      const intervals = []
      const daySchedules = schedules.filter(s => s.date === currentDateKey)

      for (let hour = 9; hour < 18; hour++) {
        for (const minute of [0, 30]) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const intervalStart = hour * 60 + minute
          const intervalEnd = intervalStart + 30

          // Check if this time slot is reserved
          const slotStart = new Date(`${currentDateKey}T${timeStr}:00`)
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

          const isReserved = reservations?.some(reservation => {
            if (!reservation.is_active) return false
            const reservationStart = new Date(reservation.start_time)
            const reservationEnd = new Date(reservation.end_time)
            return slotStart < reservationEnd && slotEnd > reservationStart
          }) || false

          // If reserved, don't count volunteers
          if (isReserved) {
            intervals.push({
              time: timeStr,
              hour,
              minute,
              status: 'reserved' as const,
              peopleCount: 0,
              volunteersPresent: []
            })
            continue
          }

          // Count volunteers scheduled during this interval
          const volunteersPresent = daySchedules.filter(schedule => {
            const startMinutes = timeStringToMinutes(schedule.start_time)
            const endMinutes = timeStringToMinutes(schedule.end_time)
            return intervalStart < endMinutes && intervalEnd > startMinutes
          }).map(schedule => {
            const vol = volunteers.find(v => v.id === schedule.volunteer_id)
            return vol ? {
              id: vol.id,
              name: vol.name
            } : null
          }).filter((v): v is { id: string; name: string } => v !== null)

          const peopleCount = volunteersPresent.length
          const isOfficeOpen = peopleCount > 0

          intervals.push({
            time: timeStr,
            hour,
            minute,
            status: isOfficeOpen ? 'open' as const : 'closed' as const,
            peopleCount,
            volunteersPresent
          })
        }
      }
      return intervals
    } else {
      // Week view
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekIntervals = []

      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i)
        const dateKey = formatDateKey(date)
        const daySchedules = schedules.filter(s => s.date === dateKey)
        const peopleCount = new Set(daySchedules.map(s => s.volunteer_id)).size

        weekIntervals.push({
          time: format(date, "EEE d"),
          date,
          status: peopleCount > 0 ? 'open' as const : 'closed' as const,
          peopleCount,
          isToday: dateKey === actualTodayKey,
          isSelected: dateKey === currentDateKey
        })
      }
      return weekIntervals
    }
  }, [timeView, currentDate, schedules, reservations, volunteers, currentDateKey, actualTodayKey])

  return {
    timeView,
    setTimeView,
    currentDate,
    setCurrentDate,
    currentDateKey,
    actualTodayKey,
    timeIntervals,
    navigateTime,
    formatTimeViewTitle
  }
}
