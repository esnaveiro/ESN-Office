import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

/**
 * Hook that redirects to login if user is not authenticated
 * @param redirectTo - Path to redirect to if not authenticated (default: '/auth/login')
 * @returns Auth state from useAuth hook
 */
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace(redirectTo)
    }
  }, [auth.loading, auth.user, router, redirectTo])

  return auth
}
