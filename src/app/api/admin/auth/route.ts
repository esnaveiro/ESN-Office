import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/session'

async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('esn_session')?.value
  if (!token) return null
  const session = await verifySession(token)
  if (!session?.isAdmin) return null
  return session
}

export async function GET() {
  const session = await getAdminSession()
  return NextResponse.json({ authenticated: !!session })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('esn_session')
  return NextResponse.json({ success: true })
}
