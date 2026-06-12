import {useEffect, useState} from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {supabaseClient} from '@/lib/auth-client'
import {AUTH_PROVIDER} from '@/lib/auth-provider'
import {Database} from '@/lib/database.types'

type Volunteer = Database['public']['Tables']['volunteers']['Row']

export type { Volunteer }

interface SessionUser {
  id: string
  email: string
  name: string
  isAdmin: boolean
}

async function fetchSession(): Promise<SessionUser | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('/api/auth/session', {signal: controller.signal})
    const data = await res.json()
    return data.authenticated ? data.user : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchVolunteer(userId: string): Promise<Volunteer | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const { data, error } = await supabaseClient
      .from('volunteers')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching volunteer:', error)
      return null
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

export function useAuth() {

  const queryClient = useQueryClient()
  const [sessionChecked, setSessionChecked] = useState(false)

  // For Supabase auth: onAuthStateChange fires immediately with INITIAL_SESSION.
  // No session → show Sign In right away. Hard 1s fallback covers expired-token case.
  useEffect(() => {

    if (AUTH_PROVIDER !== 'supabase') return

    const fallback = setTimeout(() => setSessionChecked(true), 1000)
    const {data: {subscription}} = supabaseClient.auth.onAuthStateChange(
        (_event, session) => {
          if (!session) {
            clearTimeout(fallback)
            setSessionChecked(true)
          }
        }
    )
    return () => {
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  const {
    data: user = null,
    isLoading: sessionLoading,
  } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    staleTime: 0,
    retry: false,
  })

  useEffect(() => {
    if (!sessionLoading) setSessionChecked(true)
  }, [sessionLoading])

  const {
    data: volunteer = null,
    isLoading: volunteerLoading,
  } = useQuery({
    queryKey: user ? ['volunteer', user.id] : ['volunteer', 'none'],
    queryFn: () => (user ? fetchVolunteer(user.id) : null),
    enabled: !!user,
    staleTime: 0,
  })

  const refreshVolunteer = async () => {
    if (user) {
      await new Promise(resolve => setTimeout(resolve, 100))
      await queryClient.fetchQuery({
        queryKey: ['volunteer', user.id],
        queryFn: () => fetchVolunteer(user.id),
      })
    }
  }

  const updateVolunteerCache = (updates: Partial<Volunteer>) => {
    if (user && volunteer) {
      queryClient.setQueryData(['volunteer', user.id], { ...volunteer, ...updates })
    }
  }

  const loading = !sessionChecked || (!!user && volunteerLoading)

  return {
    user,
    volunteer,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin ?? false,
    refreshVolunteer,
    updateVolunteerCache,
  }
}
