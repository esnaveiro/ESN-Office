import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForToken, getUserInfo } from '@/lib/esn-oauth'
import { signSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase-server'
import { SESSION_DURATION_SECONDS } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const verifier = cookieStore.get('esn_pkce_verifier')?.value
  const savedState = cookieStore.get('esn_oauth_state')?.value

  // Clean up PKCE cookies regardless of outcome
  cookieStore.delete('esn_pkce_verifier')
  cookieStore.delete('esn_oauth_state')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esn-office.vercel.app'

  if (error) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (!code || !verifier) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=invalid_callback`)
  }

  if (state !== savedState) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=state_mismatch`)
  }

  try {
    const tokens = await exchangeCodeForToken(code, verifier)
    const userInfo = await getUserInfo(tokens.access_token)

    const email = userInfo.email || userInfo.preferred_username
    const name = userInfo.name || email || 'ESN Member'

    if (!email) {
      return NextResponse.redirect(`${appUrl}/auth/login?error=no_email`)
    }

    // Upsert volunteer by ESN sub or email
    const { data: existing } = await supabaseServer
      .from('volunteers')
      .select('id, is_admin, name')
      .or(`esn_sub.eq.${userInfo.sub},email.eq.${email}`)
      .maybeSingle()

    let volunteerId: string
    let isAdmin: boolean

    if (existing) {
      volunteerId = existing.id
      isAdmin = existing.is_admin ?? false

      // Update ESN sub and name if changed
      await supabaseServer
        .from('volunteers')
        .update({ esn_sub: userInfo.sub, name })
        .eq('id', volunteerId)
    } else {
      // Check if this email is in the bootstrap admin list
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
      isAdmin = adminEmails.includes(email.toLowerCase())

      const { data: created, error: insertError } = await supabaseServer
        .from('volunteers')
        .insert({
          name,
          email,
          esn_sub: userInfo.sub,
          is_admin: isAdmin,
          status: 'available',
          is_in_office: false,
        })
        .select('id')
        .single()

      if (insertError || !created) {
        console.error('Failed to create volunteer:', insertError)
        return NextResponse.redirect(`${appUrl}/auth/login?error=account_creation_failed`)
      }

      volunteerId = created.id
    }

    const token = await signSession({ sub: volunteerId, email, name, isAdmin })

    cookieStore.set('esn_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
    })

    return NextResponse.redirect(`${appUrl}/`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/auth/login?error=auth_failed`)
  }
}
