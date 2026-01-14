import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'
import { supabaseClient } from '@/lib/auth-client'
import { Database } from '@/lib/database.types'

type Volunteer = Database['public']['Tables']['volunteers']['Row']

// Export for use in other components
export type { Volunteer }

// Query keys
const authQueryKeys = {
  volunteer: (userId: string) => ['volunteer', userId] as const,
}

// Fetcher function for volunteer data
async function fetchVolunteer(userId: string): Promise<Volunteer | null> {
  // Add timeout to prevent infinite loading
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), 10000)
  )

  const fetchPromise = supabaseClient
    .from('volunteers')
    .select('*')
    .eq('id', userId)
    .single()

  const { data: volunteer, error } = await Promise.race([
    fetchPromise,
    timeoutPromise
  ]) as Awaited<typeof fetchPromise>

  if (error) {
    console.error('Error fetching volunteer:', error)
    return null
  }

  return volunteer
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const queryClient = useQueryClient()

  // Fetch volunteer data with React Query
  const {
    data: volunteer = null,
    isLoading: volunteerLoading,
  } = useQuery({
    queryKey: user ? authQueryKeys.volunteer(user.id) : ['volunteer', 'none'],
    queryFn: () => user ? fetchVolunteer(user.id) : null,
    enabled: !!user, // Only fetch if user is logged in
    staleTime: 0, // Always fetch fresh data
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      setUser(session?.user ?? null)
      setAuthLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (!session?.user) {
          // Clear volunteer cache on logout
          queryClient.removeQueries({ queryKey: ['volunteer'] })
        }

        setAuthLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [queryClient])

  const refreshVolunteer = async () => {
    if (user) {
      // Small delay to ensure database has propagated changes
      await new Promise(resolve => setTimeout(resolve, 100))

      // Force immediate refetch by fetching directly
      await queryClient.fetchQuery({
        queryKey: authQueryKeys.volunteer(user.id),
        queryFn: () => fetchVolunteer(user.id),
      })
    }
  }

  // Optimistically update volunteer in cache
  const updateVolunteerCache = (updates: Partial<Volunteer>) => {
    if (user && volunteer) {
      queryClient.setQueryData(
        authQueryKeys.volunteer(user.id),
        { ...volunteer, ...updates }
      )
    }
  }

  const loading = authLoading || volunteerLoading

  return {
    user,
    volunteer,
    loading,
    isAuthenticated: !!user,
    refreshVolunteer,
    updateVolunteerCache
  }
}