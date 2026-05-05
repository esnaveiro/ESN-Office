import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireSession, isNextResponse } from '@/lib/api-auth'
import { parseCheckInSessions, type OfficeBuddy } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetId = userId && auth.isAdmin ? userId : auth.sub

    // Fetch the target user's logs
    const { data: userLogs, error: userLogsError } = await supabaseServer
      .from('presence_logs')
      .select('action, timestamp')
      .eq('volunteer_id', targetId)
      .order('timestamp', { ascending: true })

    if (userLogsError) {
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    const userSessions = parseCheckInSessions(userLogs || []).filter(s => s.checkOut !== null)
    if (userSessions.length === 0) {
      return NextResponse.json({ officeBuddies: [] })
    }

    // Determine the date range we care about (earliest user check-in)
    const earliest = userSessions[0].checkIn.toISOString()

    // Fetch all other volunteers in one query
    const { data: volunteers, error: volunteersError } = await supabaseServer
      .from('volunteers')
      .select('id, name')
      .neq('id', targetId)

    if (volunteersError || !volunteers || volunteers.length === 0) {
      return NextResponse.json({ officeBuddies: [] })
    }

    const volunteerIds = volunteers.map(v => v.id)

    // Bulk fetch all presence logs for all other volunteers since user's first check-in
    const { data: allLogs, error: allLogsError } = await supabaseServer
      .from('presence_logs')
      .select('volunteer_id, action, timestamp')
      .in('volunteer_id', volunteerIds)
      .gte('timestamp', earliest)
      .order('timestamp', { ascending: true })

    if (allLogsError) {
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    // Group logs by volunteer_id
    const logsByVolunteer = new Map<string, Array<{ action: string; timestamp: string }>>()
    for (const log of allLogs || []) {
      const existing = logsByVolunteer.get(log.volunteer_id) ?? []
      existing.push({ action: log.action, timestamp: log.timestamp })
      logsByVolunteer.set(log.volunteer_id, existing)
    }

    const volunteerMap = new Map(volunteers.map(v => [v.id, v.name]))
    const buddies: OfficeBuddy[] = []

    for (const [vid, logs] of logsByVolunteer) {
      const theirSessions = parseCheckInSessions(logs).filter(s => s.checkOut !== null)
      if (theirSessions.length === 0) continue

      let overlapCount = 0
      let totalMinutesTogether = 0

      for (const userSession of userSessions) {
        for (const theirSession of theirSessions) {
          if (!userSession.checkOut || !theirSession.checkOut) continue
          const overlapStart = Math.max(userSession.checkIn.getTime(), theirSession.checkIn.getTime())
          const overlapEnd = Math.min(userSession.checkOut.getTime(), theirSession.checkOut.getTime())
          if (overlapStart >= overlapEnd) continue
          overlapCount++
          totalMinutesTogether += (overlapEnd - overlapStart) / (1000 * 60)
        }
      }

      if (overlapCount > 0) {
        buddies.push({
          volunteerId: vid,
          volunteerName: volunteerMap.get(vid) ?? 'Unknown',
          overlapCount,
          totalMinutesTogether: Math.round(totalMinutesTogether),
        })
      }
    }

    const top5 = buddies
      .sort((a, b) => b.totalMinutesTogether - a.totalMinutesTogether)
      .slice(0, 5)

    return NextResponse.json({ officeBuddies: top5 })
  } catch (error) {
    console.error('Error in buddies API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
