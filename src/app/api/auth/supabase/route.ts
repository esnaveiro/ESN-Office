import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { supabaseServer } from '@/lib/supabase-server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

function createAuthClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  outCookies: CookieToSet[],
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          outCookies.push(...cookiesToSet)
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// POST /api/auth/supabase?action=login
// POST /api/auth/supabase?action=signup
export async function POST(request: NextRequest) {
  const action = new URL(request.url).searchParams.get('action')
  const cookieStore = await cookies()
  const outCookies: CookieToSet[] = []
  const supabase = createAuthClient(cookieStore, outCookies)

  function jsonResponse(body: object, init?: ResponseInit) {
    const res = NextResponse.json(body, init)
    outCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  if (action === 'login') {
    const { email, password } = await request.json()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return jsonResponse({ error: error.message }, { status: 401 })
    }

    // Create volunteer record on first login
    const { data: existing } = await supabaseServer
      .from('volunteers')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!existing) {
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
      const isAdmin = adminEmails.includes(data.user.email?.toLowerCase() ?? '')
      const name = (data.user.user_metadata?.name as string | undefined)
        || data.user.email?.split('@')[0]
        || 'Volunteer'

      const { error: insertError } = await supabaseServer.from('volunteers').insert({
        id: data.user.id,
        name,
        email: data.user.email!,
        is_admin: isAdmin,
        status: 'available',
        is_in_office: false,
      })

      if (insertError) {
        console.error('Failed to create volunteer profile:', insertError)
        return jsonResponse({ error: 'Login succeeded but failed to create your profile. Contact an administrator.' }, { status: 500 })
      }
    }

    return jsonResponse({ success: true })
  }

  if (action === 'signup') {
    if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === 'true') {
      return jsonResponse({ error: 'Sign up is disabled' }, { status: 403 })
    }

    const { email, password, name } = await request.json()

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required' }, { status: 400 })
    }

    // Use admin API to create user immediately (skips email confirmation)
    const { data: userData, error: createError } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError) {
      return jsonResponse({ error: createError.message }, { status: 400 })
    }

    const userId = userData.user.id
    const displayName = (name as string | undefined)?.trim() || email.split('@')[0]

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    const isAdmin = adminEmails.includes(email.toLowerCase())

    const { error: insertError } = await supabaseServer.from('volunteers').insert({
      id: userId,
      name: displayName,
      email,
      is_admin: isAdmin,
      status: 'available',
      is_in_office: false,
    })

    if (insertError) {
      console.error('Failed to create volunteer:', insertError)
      await supabaseServer.auth.admin.deleteUser(userId)
      return jsonResponse({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Sign in immediately after creation
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      return jsonResponse(
        { error: 'Account created. Please sign in.' },
        { status: 201 }
      )
    }

    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: 'Invalid action' }, { status: 400 })
}
