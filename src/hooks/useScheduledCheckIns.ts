import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/auth-client'
import type { Database } from '@/lib/database.types'

export type ScheduledCheckIn = Database['public']['Tables']['scheduled_checkins']['Row']

export function useScheduledCheckIns(volunteerId: string) {
  const [scheduledCheckIns, setScheduledCheckIns] = useState<ScheduledCheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchScheduledCheckIns = async () => {
    try {
      setLoading(true)
      console.log('Fetching scheduled check-ins for volunteer:', volunteerId)

      const { data, error } = await supabaseClient
        .from('scheduled_checkins')
        .select('*')
        .eq('volunteer_id', volunteerId)
        .order('scheduled_datetime', { ascending: true })

      console.log('Fetch result:', { data, error })

      if (error) {
        console.error('Fetch error:', error)
        // Don't throw error, just set empty array if table doesn't exist
        setScheduledCheckIns([])
        setError(null)
      } else {
        setScheduledCheckIns(data || [])
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching scheduled check-ins:', err)
      setScheduledCheckIns([])
      setError(null) // Don't show error to user
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!volunteerId) return

    fetchScheduledCheckIns()

    // Set up realtime subscription
    const channel = supabaseClient
      .channel('scheduled_checkins_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_checkins',
          filter: `volunteer_id=eq.${volunteerId}`
        },
        () => {
          fetchScheduledCheckIns()
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [volunteerId])

  return {
    scheduledCheckIns,
    loading,
    error,
    refreshScheduledCheckIns: fetchScheduledCheckIns
  }
}
