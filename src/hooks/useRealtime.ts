import {useEffect, useState} from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {supabase} from '@/lib/supabase'
import {Database} from '@/lib/database.types'

type Volunteer = Database['public']['Tables']['volunteers']['Row']
type ScheduledCheckIn = Database['public']['Tables']['scheduled_checkins']['Row']
type PresenceLog = Database['public']['Tables']['presence_logs']['Row']

type ScheduledCheckInWithVolunteer = ScheduledCheckIn & {volunteer: Volunteer | null}

export type ScheduleSlot = {
  id: string
  volunteer_id: string
  date: string
  start_time: string
  end_time: string
  confirmation_type: 'firm' | 'flex' | 'confirmed'
  status: ScheduledCheckIn['status']
  notes: string | null
  auto_execute: boolean
  check_in_id: string
  check_out_id: string
  start_datetime: string
  end_datetime: string
  volunteer: Volunteer
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTimeString = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

const deriveConfirmationType = (
  checkIn: ScheduledCheckInWithVolunteer,
  checkOut: ScheduledCheckInWithVolunteer
): 'firm' | 'flex' | 'confirmed' => {
  if (checkIn.status === 'completed' || checkOut.status === 'completed') {
    return 'confirmed'
  }

  if (checkIn.auto_execute || checkOut.auto_execute) {
    return 'firm'
  }

  return 'flex'
}

const buildScheduleSlots = (entries: ScheduledCheckInWithVolunteer[]): ScheduleSlot[] => {
  const pendingByVolunteer = new Map<string, ScheduledCheckInWithVolunteer[]>()
  const slots: ScheduleSlot[] = []

  const sortedEntries = [...entries]
    .filter(entry => entry.status !== 'cancelled' && entry.status !== 'failed')
    .sort((a, b) =>
      new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime()
    )

  for (const entry of sortedEntries) {
    const queue = pendingByVolunteer.get(entry.volunteer_id) ?? []

    if (entry.action === 'check_in') {
      queue.push(entry)
      pendingByVolunteer.set(entry.volunteer_id, queue)
      continue
    }

    if (entry.action !== 'check_out') {
      continue
    }

    if (queue.length === 0) {
      continue
    }

    const checkIn = queue.shift()
    pendingByVolunteer.set(entry.volunteer_id, queue)

    if (!checkIn) {
      continue
    }

    const volunteer = entry.volunteer ?? checkIn.volunteer
    if (!volunteer) {
      continue
    }

    const start = new Date(checkIn.scheduled_datetime)
    const end = new Date(entry.scheduled_datetime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      continue
    }

    slots.push({
      id: `${checkIn.id}-${entry.id}`,
      volunteer_id: checkIn.volunteer_id,
      date: formatDateKey(start),
      start_time: formatTimeString(start),
      end_time: formatTimeString(end),
      confirmation_type: deriveConfirmationType(checkIn, entry),
      status: entry.status,
      notes: checkIn.notes ?? entry.notes ?? null,
      auto_execute: checkIn.auto_execute || entry.auto_execute,
      check_in_id: checkIn.id,
      check_out_id: entry.id,
      start_datetime: checkIn.scheduled_datetime,
      end_datetime: entry.scheduled_datetime,
      volunteer
    })
  }

  return slots.sort((a, b) => {
    if (a.date === b.date) {
      return a.start_time.localeCompare(b.start_time)
    }
    return a.date.localeCompare(b.date)
  })
}

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const fetchVolunteers = async () => {
      try {
        const {data, error} = await supabase
          .from('volunteers')
          .select('*')
          .order('name')

        if (!isActive) return

        if (error) {
          console.error('Error fetching volunteers:', error)
          setError(error.message)
        } else {
          setVolunteers(data || [])
          setError(null)
        }
      } catch (err) {
        if (!isActive) return
        console.error('Error fetching volunteers:', err)
        setError(err instanceof Error ? err.message : 'Failed to load volunteers')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchVolunteers()

    const channel = supabase
      .channel('volunteers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'volunteers'
        },
        (payload) => {
          setVolunteers(prev => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as Volunteer].sort((a, b) => a.name.localeCompare(b.name))
            }

            if (payload.eventType === 'UPDATE') {
              return prev
                .map(volunteer => volunteer.id === payload.new.id ? payload.new as Volunteer : volunteer)
                .sort((a, b) => a.name.localeCompare(b.name))
            }

            if (payload.eventType === 'DELETE') {
              return prev.filter(volunteer => volunteer.id !== payload.old.id)
            }

            return prev
          })
        }
      )
      .subscribe()

    return () => {
      isActive = false
      supabase.removeChannel(channel)
    }
  }, [])

  return {volunteers, loading, error}
}

export function useSchedules(date?: string) {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const fetchSchedules = async () => {
      try {
        setLoading(true)

        let query = supabase
          .from('scheduled_checkins')
          .select(`
            *,
            volunteer:volunteers(*)
          `)
          .order('scheduled_datetime', {ascending: true})

        if (date) {
          const startOfDay = new Date(`${date}T00:00:00`)
          const endOfDay = new Date(startOfDay)
          endOfDay.setDate(endOfDay.getDate() + 1)

          query = query
            .gte('scheduled_datetime', startOfDay.toISOString())
            .lt('scheduled_datetime', endOfDay.toISOString())
        }

        const {data, error} = await query

        if (!isActive) return

        if (error) {
          console.error('Error fetching scheduled check-ins:', error)
          setSchedules([])
          setError(error.message)
        } else {
          const slots = buildScheduleSlots((data || []) as ScheduledCheckInWithVolunteer[])
          setSchedules(slots)
          setError(null)
        }
      } catch (err) {
        if (!isActive) return
        console.error('Unexpected error fetching scheduled check-ins:', err)
        setSchedules([])
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchSchedules()

    const channel = supabase
      .channel('scheduled_checkins_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_checkins'
        },
        () => {
          fetchSchedules()
        }
      )
      .subscribe()

    return () => {
      isActive = false
      supabase.removeChannel(channel)
    }
  }, [date])

  return {schedules, loading, error}
}

export function usePresenceLogs() {
  const [logs, setLogs] = useState<PresenceLog[]>([])

  useEffect(() => {
    const channel = supabase
      .channel('presence_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'presence_logs'
        },
        (payload) => {
          setLogs(prev => [payload.new as PresenceLog, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {logs}
}

// Query keys for React Query
export const queryKeys = {
  volunteers: ['volunteers'] as const,
  schedules: (date?: string) => ['schedules', date] as const,
  dashboardData: (date?: string) => ['dashboardData', date] as const,
}

// Fetcher functions
async function fetchVolunteers(): Promise<Volunteer[]> {
  const {data, error} = await supabase
    .from('volunteers')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

async function fetchSchedules(date?: string): Promise<ScheduleSlot[]> {
  let query = supabase
    .from('scheduled_checkins')
    .select(`
      *,
      volunteer:volunteers(*)
    `)
    .order('scheduled_datetime', {ascending: true})

  if (date) {
    const startOfDay = new Date(`${date}T00:00:00`)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    query = query
      .gte('scheduled_datetime', startOfDay.toISOString())
      .lt('scheduled_datetime', endOfDay.toISOString())
  }

  const {data, error} = await query

  if (error) throw error
  return buildScheduleSlots((data || []) as ScheduledCheckInWithVolunteer[])
}

// Combined hook for parallel fetching of volunteers and schedules with React Query
export function useDashboardData(date?: string) {
  const queryClient = useQueryClient()

  // Fetch volunteers with React Query
  const {
    data: volunteers = [],
    isLoading: volunteersLoading,
    error: volunteersError
  } = useQuery({
    queryKey: queryKeys.volunteers,
    queryFn: fetchVolunteers,
    staleTime: 0, // Always consider data fresh to trigger re-renders
  })

  // Fetch schedules with React Query
  const {
    data: schedules = [],
    isLoading: schedulesLoading,
    error: schedulesError
  } = useQuery({
    queryKey: queryKeys.schedules(date),
    queryFn: () => fetchSchedules(date),
  })

  // Set up real-time subscriptions
  useEffect(() => {
    // Set up volunteers subscription
    const volunteersChannel = supabase
      .channel('volunteers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'volunteers'
        },
        (payload) => {
          console.log('Realtime volunteer update:', payload.eventType, payload.new)
          // Update the volunteers query cache
          queryClient.setQueryData<Volunteer[]>(queryKeys.volunteers, (old = []) => {
            if (payload.eventType === 'INSERT') {
              return [...old, payload.new as Volunteer].sort((a, b) => a.name.localeCompare(b.name))
            }
            if (payload.eventType === 'UPDATE') {
              return old.map(v => v.id === payload.new.id ? payload.new as Volunteer : v).sort((a, b) => a.name.localeCompare(b.name))
            }
            if (payload.eventType === 'DELETE') {
              return old.filter(v => v.id !== payload.old.id)
            }
            return old
          })
        }
      )
      .subscribe()

    // Set up schedules subscription
    const schedulesChannel = supabase
      .channel('schedules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_checkins'
        },
        () => {
          // Invalidate and refetch schedules when any change occurs
          queryClient.invalidateQueries({queryKey: queryKeys.schedules(date)})
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(volunteersChannel)
      supabase.removeChannel(schedulesChannel)
    }
  }, [queryClient, date])

  const loading = volunteersLoading || schedulesLoading
  const error = volunteersError?.message || schedulesError?.message || null

  return {volunteers, schedules, loading, error}
}
