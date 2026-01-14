import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  parseCheckInSessions,
  calculateWeeklyStats,
  calculateMonthlyStats,
  calculateBadges,
  type AnalyticsData,
  type OfficeBuddy
} from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Fetch all presence logs for this user
    const { data: presenceLogs, error: logsError } = await supabaseServer
      .from('presence_logs')
      .select('action, timestamp')
      .eq('volunteer_id', userId)
      .order('timestamp', { ascending: true })

    if (logsError) {
      console.error('Error fetching presence logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch presence logs' },
        { status: 500 }
      )
    }

    // Parse into sessions
    const sessions = parseCheckInSessions(presenceLogs || [])

    // Calculate statistics
    const weeklyStats = calculateWeeklyStats(sessions)
    const monthlyStats = calculateMonthlyStats(sessions)
    const badges = calculateBadges(weeklyStats, monthlyStats, sessions)

    // Get recent sessions (last 5)
    const recentSessions = sessions
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime())
      .slice(0, 5)

    // Calculate office buddies (volunteers with overlapping sessions)
    const officeBuddies = await calculateOfficeBuddies(userId, sessions)

    const analyticsData: AnalyticsData = {
      weeklyStats,
      monthlyStats,
      badges,
      recentSessions,
      officeBuddies
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error in analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate office buddies - volunteers who have overlapped with the user
 */
async function calculateOfficeBuddies(
  userId: string,
  userSessions: Array<{ checkIn: Date; checkOut: Date | null }>
): Promise<OfficeBuddy[]> {
  try {
    // Get all other volunteers
    const { data: volunteers, error } = await supabaseServer
      .from('volunteers')
      .select('id, name')
      .neq('id', userId)

    if (error || !volunteers) {
      return []
    }

    const buddies: OfficeBuddy[] = []

    for (const volunteer of volunteers) {
      // Fetch their presence logs
      const { data: theirLogs } = await supabaseServer
        .from('presence_logs')
        .select('action, timestamp')
        .eq('volunteer_id', volunteer.id)
        .order('timestamp', { ascending: true })

      if (!theirLogs || theirLogs.length === 0) continue

      const theirSessions = parseCheckInSessions(theirLogs)

      // Calculate overlap
      let overlapCount = 0
      let totalMinutesTogether = 0

      for (const userSession of userSessions) {
        for (const theirSession of theirSessions) {
          const overlap = calculateSessionOverlap(userSession, theirSession)
          if (overlap > 0) {
            overlapCount++
            totalMinutesTogether += overlap
          }
        }
      }

      if (overlapCount > 0) {
        buddies.push({
          volunteerId: volunteer.id,
          volunteerName: volunteer.name,
          overlapCount,
          totalMinutesTogether: Math.round(totalMinutesTogether)
        })
      }
    }

    // Sort by total time together
    return buddies
      .sort((a, b) => b.totalMinutesTogether - a.totalMinutesTogether)
      .slice(0, 5) // Top 5 buddies
  } catch (error) {
    console.error('Error calculating office buddies:', error)
    return []
  }
}

/**
 * Calculate overlap in minutes between two sessions
 */
function calculateSessionOverlap(
  session1: { checkIn: Date; checkOut: Date | null },
  session2: { checkIn: Date; checkOut: Date | null }
): number {
  const start1 = session1.checkIn.getTime()
  const end1 = session1.checkOut?.getTime() || new Date().getTime()
  const start2 = session2.checkIn.getTime()
  const end2 = session2.checkOut?.getTime() || new Date().getTime()

  const overlapStart = Math.max(start1, start2)
  const overlapEnd = Math.min(end1, end2)

  if (overlapStart >= overlapEnd) {
    return 0
  }

  return (overlapEnd - overlapStart) / (1000 * 60)
}
