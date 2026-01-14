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
      return NextResponse.json(
        { error: 'Badge ID required' },
        { status: 400 }
      )
    }

    // Fetch all volunteers
    const { data: volunteers, error: volunteersError } = await supabaseServer
      .from('volunteers')
      .select('id, name')

    if (volunteersError) {
      console.error('Error fetching volunteers:', volunteersError)
      return NextResponse.json(
        { error: 'Failed to fetch volunteers' },
        { status: 500 }
      )
    }

    if (!volunteers || volunteers.length === 0) {
      return NextResponse.json({ count: 0, holders: [] })
    }

    const holders: Array<{ id: string; name: string }> = []

    // Check each volunteer to see if they have this badge
    for (const volunteer of volunteers) {
      const { data: presenceLogs } = await supabaseServer
        .from('presence_logs')
        .select('action, timestamp')
        .eq('volunteer_id', volunteer.id)
        .order('timestamp', { ascending: true })

      if (!presenceLogs || presenceLogs.length === 0) continue

      const sessions = parseCheckInSessions(presenceLogs)
      const weeklyStats = calculateWeeklyStats(sessions)
      const monthlyStats = calculateMonthlyStats(sessions)
      const badges = calculateBadges(weeklyStats, monthlyStats, sessions)

      // Check if this volunteer has unlocked the badge
      const hasBadge = badges.find(b => b.id === badgeId && b.unlockedAt)
      if (hasBadge) {
        holders.push({
          id: volunteer.id,
          name: volunteer.name
        })
      }
    }

    const totalVolunteers = volunteers.length
    const percentage = totalVolunteers > 0 ? Math.round((holders.length / totalVolunteers) * 100) : 0

    return NextResponse.json({
      count: holders.length,
      percentage,
      totalVolunteers,
      holders
    })
  } catch (error) {
    console.error('Error in badge holders API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
