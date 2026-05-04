"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, LogIn } from "lucide-react"
import { signInWithESN, signInWithEmail } from "@/lib/auth-client"
import { useAuth } from "@/hooks/useAuth"
import { useSearchParams } from "next/navigation"

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'esn'

const ESN_ERROR_MESSAGES: Record<string, string> = {
  invalid_callback: "Invalid authentication callback. Please try again.",
  state_mismatch: "Security check failed. Please try again.",
  no_email: "Your ESN account does not have an email address. Contact your local administrator.",
  account_creation_failed: "Failed to create your account. Please contact an administrator.",
  auth_failed: "Authentication failed. Please try again.",
}

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorKey = searchParams.get("error")

  // ESN error from URL param
  const esnError = errorKey ? (ESN_ERROR_MESSAGES[errorKey] ?? "Authentication error. Please try again.") : null

  // Supabase email/password form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      router.replace("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) return null

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await signInWithEmail(email, password)
      window.location.href = '/'
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  const sectionName = process.env.NEXT_PUBLIC_SECTION_NAME ?? 'ESN'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Office Status
        </Link>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Access your {sectionName} volunteer dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(esnError || formError) && (
              <Alert variant="destructive">
                <AlertDescription>{esnError ?? formError}</AlertDescription>
              </Alert>
            )}

            {AUTH_PROVIDER === 'esn' ? (
              <>
                <Button className="w-full" onClick={signInWithESN}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in with ESN Accounts
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Uses your official ESN account (accounts.esn.org). Only {sectionName} members can sign in.
                </p>
              </>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.org"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
                  ) : (
                    <><LogIn className="mr-2 h-4 w-4" />Sign In</>
                  )}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  No account?{' '}
                  <Link href="/auth/signup" className="underline hover:text-foreground">
                    Sign up
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
