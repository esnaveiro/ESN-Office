import { useEffect, useState } from 'react'

export interface OfficeReservation {
  id: string
  reserved_by_name: string
  reserved_by_id: string | null
  start_time: string
  end_time: string
  reason: string | null
  additional_volunteers?: string[]
  is_active: boolean
}

export interface OfficeReservationData {
  current: OfficeReservation | null
  upcoming: OfficeReservation[]
  is_office_reserved: boolean
}

export function useOfficeReservation() {
  const [data, setData] = useState<OfficeReservationData>({
    current: null,
    upcoming: [],
    is_office_reserved: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchReservation = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/office-reservation')

      if (!response.ok) {
        throw new Error('Failed to fetch office reservation')
      }

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservation()

    // Refresh every minute to keep status up-to-date
    const interval = setInterval(fetchReservation, 60000)

    return () => clearInterval(interval)
  }, [])

  return {
    ...data,
    loading,
    error,
    refetch: fetchReservation
  }
}
