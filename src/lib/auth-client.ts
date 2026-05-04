import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase client for database queries only
export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// ── ESN OAuth ──────────────────────────────────────────────────────────────

export function signInWithESN() {
  window.location.href = '/api/auth/esn'
}

// ── Supabase email/password ────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/supabase?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
}

export async function signUpWithEmail(email: string, password: string, name: string): Promise<void> {
  const res = await fetch('/api/auth/supabase?action=signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Signup failed')
}

// ── Shared ─────────────────────────────────────────────────────────────────

export async function signOut() {
  await fetch('/api/auth/session', { method: 'DELETE' })
  window.location.href = '/auth/login'
}
