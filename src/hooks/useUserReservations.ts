import {useEffect, useState} from 'react'
import {supabaseClient} from '@/lib/auth-client'

interface Volunteer {
  id: string
  name: string
}

export interface UserReservation {
  id: string
  reserved_by_id: string | null
  reserved_by_name: string
  start_time: string
  end_time: string
  reason: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  additional_volunteers?: string[] | null
  additional_volunteers_details?: Volunteer[]
  cancelled_at?: string | null
  cancelled_by_id?: string | null
  cancelled_by_name?: string | null
  cancellation_reason?: string | null
  status?: 'pending' | 'approved' | 'rejected'
}

export function useUserReservations(userId?: string) {
  const [reservations, setReservations] = useState<UserReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchReservations = async () => {
    if (!userId) {
      setReservations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabaseClient
        .from('office_reservations')
        .select('*')
        .or(`reserved_by_id.eq.${userId},additional_volunteers.cs.{${userId}}`)
        .eq('is_active', true)
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      // Enrich reservations with volunteer details
      const enrichedReservations = await Promise.all(
          (data || []).map(async (reservation) => {
            if (reservation.additional_volunteers && reservation.additional_volunteers.length > 0) {
              const {data: volunteers} = await supabaseClient
                  .from('volunteers')
                  .select('id, name')
                  .in('id', reservation.additional_volunteers)

              return {
                ...reservation,
                additional_volunteers_details: volunteers || []
              }
            }
            return {
              ...reservation,
              additional_volunteers_details: []
            }
          })
      )

      setReservations(enrichedReservations)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservations()
  }, [userId])

  return {
    reservations,
    loading,
    error,
    refetch: fetchReservations
  }
}
