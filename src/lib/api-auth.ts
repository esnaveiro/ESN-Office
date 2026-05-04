import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifySession, SessionPayload } from './session'
import { supabaseServer } from './supabase-server'

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'esn'

async function requireESNSession(): Promise<SessionPayload | NextResponse> {
  const cookieStore = await cookies()
  const token = cookieStore.get('esn_session')?.value

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await verifySession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return session
}

async function requireSupabaseSession(): Promise<SessionPayload | NextResponse> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: volunteer } = await supabaseServer
    .from('volunteers')
    .select('id, email, name, is_admin')
    .eq('id', user.id)
    .single()

  if (!volunteer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = Math.floor(Date.now() / 1000)
  return {
    sub: volunteer.id,
    email: volunteer.email,
    name: volunteer.name,
    isAdmin: volunteer.is_admin,
    iat: now,
    exp: now,
  }
}

export async function requireSession(): Promise<SessionPayload | NextResponse> {
  if (AUTH_PROVIDER === 'supabase') return requireSupabaseSession()
  return requireESNSession()
}

export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const result = await requireSession()
  if (result instanceof NextResponse) return result

  if (!result.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return result
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}
