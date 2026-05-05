import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { verifySession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase-server'

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'esn'

export async function GET() {
  try {
    const cookieStore = await cookies()

    if (AUTH_PROVIDER === 'supabase') {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cookiesToSet) => {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ authenticated: false })

      const { data: volunteer } = await supabaseServer
        .from('volunteers')
        .select('id, email, name, is_admin')
        .eq('id', user.id)
        .single()

      if (!volunteer) return NextResponse.json({ authenticated: false })

      return NextResponse.json({
        authenticated: true,
        user: {
          id: volunteer.id,
          email: volunteer.email,
          name: volunteer.name,
          isAdmin: volunteer.is_admin,
        },
      })
    }

    // ESN auth
    const token = cookieStore.get('esn_session')?.value
    if (!token) return NextResponse.json({ authenticated: false })

    const session = await verifySession(token)
    if (!session) {
      cookieStore.delete('esn_session')
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.sub,
        email: session.email,
        name: session.name,
        isAdmin: session.isAdmin,
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()

  if (AUTH_PROVIDER === 'supabase') {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.signOut()
  } else {
    cookieStore.delete('esn_session')
  }

  return NextResponse.json({ success: true })
}
