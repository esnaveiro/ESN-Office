import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  parseCheckInSessions,
  calculateWeeklyStats,
  calculateMonthlyStats,
  calculateBadges
} from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const badgeId = searchParams.get('badgeId')

    if (!badgeId) {
      return NextResponse.json({ error: 'Badge ID required' }, { status: 400 })
    }

    const { data: volunteers, error: volunteersError } = await supabaseServer
      .from('volunteers')
      .select('id, name')

    if (volunteersError || !volunteers || volunteers.length === 0) {
      return NextResponse.json({ count: 0, percentage: 0, totalVolunteers: 0, holders: [] })
    }

    // Bulk fetch all presence logs in one query instead of one per volunteer
    const { data: allLogs, error: logsError } = await supabaseServer
      .from('presence_logs')
      .select('volunteer_id, action, timestamp')
      .order('timestamp', { ascending: true })

    if (logsError) {
      console.error('Error fetching presence logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    // Group logs by volunteer
    const logsByVolunteer = new Map<string, Array<{ action: string; timestamp: string }>>()
    for (const log of allLogs || []) {
      const existing = logsByVolunteer.get(log.volunteer_id) ?? []
      existing.push({ action: log.action, timestamp: log.timestamp })
      logsByVolunteer.set(log.volunteer_id, existing)
    }

    const holders: Array<{ id: string; name: string }> = []

    for (const volunteer of volunteers) {
      const logs = logsByVolunteer.get(volunteer.id)
      if (!logs || logs.length === 0) continue

      const sessions = parseCheckInSessions(logs)
      const weeklyStats = calculateWeeklyStats(sessions)
      const monthlyStats = calculateMonthlyStats(sessions)
      const badges = calculateBadges(weeklyStats, monthlyStats, sessions)

      if (badges.find(b => b.id === badgeId && b.unlockedAt)) {
        holders.push({ id: volunteer.id, name: volunteer.name })
      }
    }

    const totalVolunteers = volunteers.length
    const percentage = Math.round((holders.length / totalVolunteers) * 100)

    return NextResponse.json({ count: holders.length, percentage, totalVolunteers, holders })
  } catch (error) {
    console.error('Error in badge holders API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
