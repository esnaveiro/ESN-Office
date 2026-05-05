import { SESSION_DURATION_SECONDS } from './constants'

export interface SessionPayload {
  sub: string       // volunteer UUID in our DB
  email: string
  name: string
  isAdmin: boolean
  iat: number
  exp: number
}

const enc = new TextEncoder()

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  return Buffer.from(buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str: string): Buffer {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signSession(
  payload: Omit<SessionPayload, 'iat' | 'exp'>
): Promise<string> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is not set')

  const now = Math.floor(Date.now() / 1000)
  const full: SessionPayload = { ...payload, iat: now, exp: now + SESSION_DURATION_SECONDS }

  const header = base64UrlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = base64UrlEncode(enc.encode(JSON.stringify(full)))
  const message = `${header}.${body}`

  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))

  return `${message}.${base64UrlEncode(sig)}`
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = process.env.SESSION_SECRET
    if (!secret) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, body, signature] = parts
    const message = `${header}.${body}`

    const key = await importKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      new Uint8Array(base64UrlDecode(signature)),
      enc.encode(message)
    )
    if (!valid) return null

    const payload = JSON.parse(base64UrlDecode(body).toString()) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export async function getSessionFromCookieHeader(cookieHeader: string | null): Promise<SessionPayload | null> {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)esn_session=([^;]+)/)
  if (!match) return null
  return verifySession(decodeURIComponent(match[1]))
}
