import { ESN_OAUTH } from './constants'

export interface EsnUserInfo {
  sub: string
  email?: string
  name?: string
  preferred_username?: string
  // ESN-specific fields (may vary)
  section?: string
  roles?: string[]
  [key: string]: unknown
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

function getConfig() {
  const clientId = process.env.ESN_CLIENT_ID
  const clientSecret = process.env.ESN_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = `${appUrl}/auth/callback`

  if (!clientId || !clientSecret) {
    throw new Error('ESN_CLIENT_ID and ESN_CLIENT_SECRET must be set')
  }

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set')
  }

  return { clientId, clientSecret, redirectUri }
}

export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = Buffer.from(array).toString('base64url')

  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = Buffer.from(hash).toString('base64url')

  return { verifier, challenge }
}

export function buildAuthorizeUrl(challenge: string, state: string): string {
  const { clientId, redirectUri } = getConfig()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: ESN_OAUTH.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  return `${ESN_OAUTH.authorizeUrl}?${params}`
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getConfig()

  const response = await fetch(ESN_OAUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${text}`)
  }

  return response.json()
}

export async function getUserInfo(accessToken: string): Promise<EsnUserInfo> {
  const response = await fetch(ESN_OAUTH.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Userinfo fetch failed (${response.status})`)
  }

  return response.json()
}
