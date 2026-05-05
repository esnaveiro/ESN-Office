import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireSession, isNextResponse } from '@/lib/api-auth'
import {
  parseCheckInSessions,
  calculateWeeklyStats,
  calculateMonthlyStats,
  calculateBadges,
  type AnalyticsData,
} from '@/lib/analytics'

export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetId = userId && auth.isAdmin ? userId : auth.sub

    const { data: presenceLogs, error: logsError } = await supabaseServer
      .from('presence_logs')
      .select('action, timestamp')
      .eq('volunteer_id', targetId)
      .order('timestamp', { ascending: true })

    if (logsError) {
      console.error('Error fetching presence logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch presence logs' }, { status: 500 })
    }

    const sessions = parseCheckInSessions(presenceLogs || [])
    const weeklyStats = calculateWeeklyStats(sessions)
    const monthlyStats = calculateMonthlyStats(sessions)
    const badges = calculateBadges(weeklyStats, monthlyStats, sessions)

    const recentSessions = sessions
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime())
      .slice(0, 5)

    const analyticsData: Omit<AnalyticsData, 'officeBuddies'> & { officeBuddies: [] } = {
      weeklyStats,
      monthlyStats,
      badges,
      recentSessions,
      officeBuddies: [], // loaded separately via /api/analytics/buddies
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error in analytics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
