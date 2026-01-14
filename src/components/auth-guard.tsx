"use client"

import React, {useEffect} from "react"
import {useRouter} from "next/navigation"
import {useAuth} from "@/hooks/useAuth"
import {Loader2} from "lucide-react"
import {EsnRectangles} from "@/components/esn-rectangles";

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = "/auth/login"
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push(redirectTo)
      } else if (!requireAuth && user) {
        // Use redirectTo as the destination for logged-in users on auth pages
        router.push(redirectTo)
      }
    }
  }, [user, loading, requireAuth, redirectTo, router])

  if (loading) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
          <EsnRectangles/>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
          </div>
        </div>
    )
  }

  if (requireAuth && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <EsnRectangles/>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary"/>
          <div>
            <h2 className="text-lg font-semibold">Redirecting to sign in…</h2>
            <p className="text-sm text-muted-foreground">
              If nothing happens, please navigate to {redirectTo}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!requireAuth && user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <EsnRectangles/>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary"/>
          <div>
            <h2 className="text-lg font-semibold">You’re already signed in</h2>
            <p className="text-sm text-muted-foreground">
              Taking you to {redirectTo}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
