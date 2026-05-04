import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generatePKCE, buildAuthorizeUrl } from '@/lib/esn-oauth'
import { PKCE_COOKIE_MAX_AGE } from '@/lib/constants'

export async function GET() {
  const { verifier, challenge } = await generatePKCE()

  const stateBytes = new Uint8Array(16)
  crypto.getRandomValues(stateBytes)
  const state = Buffer.from(stateBytes).toString('base64url')

  const authorizeUrl = buildAuthorizeUrl(challenge, state)

  const cookieStore = await cookies()

  cookieStore.set('esn_pkce_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PKCE_COOKIE_MAX_AGE,
    path: '/',
  })

  cookieStore.set('esn_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PKCE_COOKIE_MAX_AGE,
    path: '/',
  })

  return NextResponse.redirect(authorizeUrl)
}
