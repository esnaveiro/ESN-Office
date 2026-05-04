/**
 * Analytics utilities for calculating user statistics and achievements
 */

export interface CheckInSession {
  checkIn: Date
  checkOut: Date | null
  durationMinutes: number
}

export interface DailyStats {
  date: string
  totalMinutes: number
  checkInCount: number
}

export interface WeeklyStats {
  totalHours: number
  totalCheckIns: number
  averageSessionMinutes: number
  mostActiveDay: string
  daysActive: number
}

export interface MonthlyStats {
  totalHours: number
  totalCheckIns: number
  averageSessionMinutes: number
  mostActiveDay: string
  daysActive: number
  currentStreak: number
}

export interface OfficeBuddy {
  volunteerId: string
  volunteerName: string
  overlapCount: number
  totalMinutesTogether: number
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: Date
  progress?: number
  target?: number
}

export interface AnalyticsData {
  weeklyStats: WeeklyStats
  monthlyStats: MonthlyStats
  officeBuddies: OfficeBuddy[]
  badges: Badge[]
  recentSessions: CheckInSession[]
}

/**
 * Parse presence logs into check-in sessions
 */
export function parseCheckInSessions(logs: Array<{ action: string; timestamp: string }>): CheckInSession[] {
  const sessions: CheckInSession[] = []
  let currentCheckIn: Date | null = null

  // Sort by timestamp
  const sortedLogs = [...logs].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (const log of sortedLogs) {
    if (log.action === 'check_in') {
      currentCheckIn = new Date(log.timestamp)
    } else if (log.action === 'check_out' && currentCheckIn) {
      const checkOut = new Date(log.timestamp)
      const durationMinutes = Math.max(0, (checkOut.getTime() - currentCheckIn.getTime()) / (1000 * 60))

      sessions.push({
        checkIn: currentCheckIn,
        checkOut,
        durationMinutes
      })
      currentCheckIn = null
    }
  }

  // Handle ongoing session
  if (currentCheckIn) {
    sessions.push({
      checkIn: currentCheckIn,
      checkOut: null,
      durationMinutes: Math.max(0, (new Date().getTime() - currentCheckIn.getTime()) / (1000 * 60))
    })
  }

  return sessions
}

/**
 * Calculate weekly statistics
 */
export function calculateWeeklyStats(sessions: CheckInSession[]): WeeklyStats {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weeklySessions = sessions.filter(s => s.checkIn >= weekAgo)

  const totalMinutes = weeklySessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalHours = totalMinutes / 60

  // Calculate most active day
  const dayStats: Record<string, number> = {}
  const daysSet = new Set<string>()

  weeklySessions.forEach(session => {
    const dayName = session.checkIn.toLocaleDateString('en-US', { weekday: 'long' })
    const dateKey = session.checkIn.toISOString().split('T')[0]
    dayStats[dayName] = (dayStats[dayName] || 0) + session.durationMinutes
    daysSet.add(dateKey)
  })

  const mostActiveDay = Object.entries(dayStats).reduce(
    (max, [day, minutes]) => minutes > max.minutes ? { day, minutes } : max,
    { day: 'N/A', minutes: 0 }
  ).day

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalCheckIns: weeklySessions.length,
    averageSessionMinutes: weeklySessions.length > 0
      ? Math.round(totalMinutes / weeklySessions.length)
      : 0,
    mostActiveDay,
    daysActive: daysSet.size
  }
}

/**
 * Calculate monthly statistics
 */
export function calculateMonthlyStats(sessions: CheckInSession[]): MonthlyStats {
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const monthlySessions = sessions.filter(s => s.checkIn >= monthAgo)

  const totalMinutes = monthlySessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalHours = totalMinutes / 60

  // Calculate most active day
  const dayStats: Record<string, number> = {}
  const daysSet = new Set<string>()

  monthlySessions.forEach(session => {
    const dayName = session.checkIn.toLocaleDateString('en-US', { weekday: 'long' })
    const dateKey = session.checkIn.toISOString().split('T')[0]
    dayStats[dayName] = (dayStats[dayName] || 0) + session.durationMinutes
    daysSet.add(dateKey)
  })

  const mostActiveDay = Object.entries(dayStats).reduce(
    (max, [day, minutes]) => minutes > max.minutes ? { day, minutes } : max,
    { day: 'N/A', minutes: 0 }
  ).day

  // Calculate streak
  const currentStreak = calculateCurrentStreak(monthlySessions)

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalCheckIns: monthlySessions.length,
    averageSessionMinutes: monthlySessions.length > 0
      ? Math.round(totalMinutes / monthlySessions.length)
      : 0,
    mostActiveDay,
    daysActive: daysSet.size,
    currentStreak
  }
}

/**
 * Calculate current check-in streak (consecutive days)
 */
export function calculateCurrentStreak(sessions: CheckInSession[]): number {
  if (sessions.length === 0) return 0

  const sortedSessions = [...sessions].sort((a, b) =>
    b.checkIn.getTime() - a.checkIn.getTime()
  )

  const uniqueDates = new Set(
    sortedSessions.map(s => s.checkIn.toISOString().split('T')[0])
  )
  const sortedDates = Array.from(uniqueDates).sort().reverse()

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < sortedDates.length; i++) {
    const dateToCheck = new Date(today)
    dateToCheck.setDate(dateToCheck.getDate() - i)
    const dateStr = dateToCheck.toISOString().split('T')[0]

    if (sortedDates.includes(dateStr)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Determine badges/achievements based on stats
 */
export function calculateBadges(
  weeklyStats: WeeklyStats,
  monthlyStats: MonthlyStats,
  allTimeSessions: CheckInSession[]
): Badge[] {
  const totalCheckIns = allTimeSessions.length
  const totalHours = Math.max(0, allTimeSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60)
  const streak = monthlyStats.currentStreak

  const earlyCheckIns = allTimeSessions.filter(s => s.checkIn.getHours() < 9)
  const superEarlyCheckIns = allTimeSessions.filter(s => s.checkIn.getHours() < 8)
  const lateCheckOuts = allTimeSessions.filter(s => s.checkOut && s.checkOut.getHours() >= 20)
  const veryLateCheckOuts = allTimeSessions.filter(s => s.checkOut && s.checkOut.getHours() >= 22)
  const weekendSessions = allTimeSessions.filter(s => {
    const d = s.checkIn.getDay();
    return d === 0 || d === 6
  })
  const quickSessions = allTimeSessions.filter(s => s.durationMinutes >= 5 && s.durationMinutes <= 30)
  const longSessions = allTimeSessions.filter(s => s.durationMinutes >= 360)
  const marathonSession = allTimeSessions.find(s => s.durationMinutes >= 240)

  function unlocked<T>(list: T[], idx: number, date: Date | null | undefined): Badge['unlockedAt'] {
    return list.length > idx ? (date ?? new Date()) : undefined
  }

  const definitions: Badge[] = [
    // ── First check-in ──────────────────────────────────────────────────
    {
      id: 'first-checkin',
      name: 'First Step',
      description: 'Complete your first check-in',
      icon: 'Sparkles',
      unlockedAt: totalCheckIns >= 1 ? allTimeSessions[0].checkIn : undefined,
      progress: Math.min(totalCheckIns, 1),
      target: 1,
    },

    // ── Check-in milestones ──────────────────────────────────────────────
    {
      id: 'checkins-10',
      name: 'Regular',
      description: 'Complete 10 check-ins',
      icon: 'CheckCircle',
      unlockedAt: totalCheckIns >= 10 ? allTimeSessions[9].checkIn : undefined,
      progress: Math.min(totalCheckIns, 10),
      target: 10,
    },
    {
      id: 'checkins-25',
      name: 'Committed',
      description: 'Complete 25 check-ins',
      icon: 'Target',
      unlockedAt: totalCheckIns >= 25 ? allTimeSessions[24].checkIn : undefined,
      progress: Math.min(totalCheckIns, 25),
      target: 25,
    },
    {
      id: 'checkins-50',
      name: 'Dedicated',
      description: 'Complete 50 check-ins',
      icon: 'Award',
      unlockedAt: totalCheckIns >= 50 ? allTimeSessions[49].checkIn : undefined,
      progress: Math.min(totalCheckIns, 50),
      target: 50,
    },
    {
      id: 'checkins-100',
      name: 'Legend',
      description: 'Complete 100 check-ins',
      icon: 'Trophy',
      unlockedAt: totalCheckIns >= 100 ? allTimeSessions[99].checkIn : undefined,
      progress: Math.min(totalCheckIns, 100),
      target: 100,
    },
    {
      id: 'checkins-200',
      name: 'Office Hero',
      description: 'Complete 200 check-ins',
      icon: 'Medal',
      unlockedAt: totalCheckIns >= 200 ? allTimeSessions[199].checkIn : undefined,
      progress: Math.min(totalCheckIns, 200),
      target: 200,
    },

    // ── Time milestones ──────────────────────────────────────────────────
    {
      id: 'hours-10',
      name: 'Time Keeper',
      description: 'Spend 10 hours in the office',
      icon: 'Clock',
      unlockedAt: totalHours >= 10 ? new Date() : undefined,
      progress: Math.min(Math.floor(totalHours), 10),
      target: 10,
    },
    {
      id: 'hours-50',
      name: 'Time Master',
      description: 'Spend 50 hours in the office',
      icon: 'Hourglass',
      unlockedAt: totalHours >= 50 ? new Date() : undefined,
      progress: Math.min(Math.floor(totalHours), 50),
      target: 50,
    },
    {
      id: 'hours-100',
      name: 'Century Club',
      description: 'Spend 100 hours in the office',
      icon: 'CalendarClock',
      unlockedAt: totalHours >= 100 ? new Date() : undefined,
      progress: Math.min(Math.floor(totalHours), 100),
      target: 100,
    },

    // ── Streak badges ────────────────────────────────────────────────────
    {
      id: 'streak-3',
      name: '3-Day Streak',
      description: 'Check in for 3 consecutive days',
      icon: 'Flame',
      unlockedAt: streak >= 3 ? new Date() : undefined,
      progress: Math.min(streak, 3),
      target: 3,
    },
    {
      id: 'streak-7',
      name: 'Week Warrior',
      description: 'Check in for 7 consecutive days',
      icon: 'Flame',
      unlockedAt: streak >= 7 ? new Date() : undefined,
      progress: Math.min(streak, 7),
      target: 7,
    },
    {
      id: 'streak-14',
      name: 'Fortnight Fighter',
      description: 'Check in for 14 consecutive days',
      icon: 'Flame',
      unlockedAt: streak >= 14 ? new Date() : undefined,
      progress: Math.min(streak, 14),
      target: 14,
    },
    {
      id: 'streak-30',
      name: 'Month Long Dedication',
      description: 'Check in for 30 consecutive days',
      icon: 'Flame',
      unlockedAt: streak >= 30 ? new Date() : undefined,
      progress: Math.min(streak, 30),
      target: 30,
    },
    {
      id: 'streak-60',
      name: 'Unstoppable',
      description: 'Check in for 60 consecutive days',
      icon: 'Rocket',
      unlockedAt: streak >= 60 ? new Date() : undefined,
      progress: Math.min(streak, 60),
      target: 60,
    },
    {
      id: 'streak-100',
      name: 'Century Streak',
      description: 'Check in for 100 consecutive days',
      icon: 'Crown',
      unlockedAt: streak >= 100 ? new Date() : undefined,
      progress: Math.min(streak, 100),
      target: 100,
    },

    // ── Consistency ──────────────────────────────────────────────────────
    {
      id: 'consistent',
      name: 'Consistent Contributor',
      description: 'Be active for 7 days in a month',
      icon: 'Star',
      unlockedAt: monthlyStats.daysActive >= 7 ? new Date() : undefined,
      progress: Math.min(monthlyStats.daysActive, 7),
      target: 7,
    },
    {
      id: 'perfect-week',
      name: 'Perfect Week',
      description: 'Be active 5 days in a week',
      icon: 'CalendarCheck',
      unlockedAt: weeklyStats.daysActive >= 5 ? new Date() : undefined,
      progress: Math.min(weeklyStats.daysActive, 5),
      target: 5,
    },
    {
      id: 'month-master',
      name: 'Month Master',
      description: 'Be active 15 days in a month',
      icon: 'Calendar',
      unlockedAt: monthlyStats.daysActive >= 15 ? new Date() : undefined,
      progress: Math.min(monthlyStats.daysActive, 15),
      target: 15,
    },

    // ── Session types ────────────────────────────────────────────────────
    {
      id: 'marathon',
      name: 'Marathon',
      description: 'Stay in the office for 4+ hours in one session',
      icon: 'Zap',
      unlockedAt: marathonSession ? (marathonSession.checkOut ?? new Date()) : undefined,
      progress: marathonSession ? 1 : 0,
      target: 1,
    },
    {
      id: 'long-haul',
      name: 'The Long Haul',
      description: 'Stay 6+ hours on 3 occasions',
      icon: 'Timer',
      unlockedAt: unlocked(longSessions, 2, longSessions[2]?.checkOut),
      progress: Math.min(longSessions.length, 3),
      target: 3,
    },
    {
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Complete 10 quick visits (5–30 min)',
      icon: 'Zap',
      unlockedAt: unlocked(quickSessions, 9, quickSessions[9]?.checkIn),
      progress: Math.min(quickSessions.length, 10),
      target: 10,
    },

    // ── Time of day ──────────────────────────────────────────────────────
    {
      id: 'early-bird',
      name: 'Early Bird',
      description: 'Check in before 9 AM 5 times',
      icon: 'Sunrise',
      unlockedAt: unlocked(earlyCheckIns, 4, earlyCheckIns[4]?.checkIn),
      progress: Math.min(earlyCheckIns.length, 5),
      target: 5,
    },
    {
      id: 'super-early-bird',
      name: 'Super Early Bird',
      description: 'Check in before 8 AM 3 times',
      icon: 'Sun',
      unlockedAt: unlocked(superEarlyCheckIns, 2, superEarlyCheckIns[2]?.checkIn),
      progress: Math.min(superEarlyCheckIns.length, 3),
      target: 3,
    },
    {
      id: 'night-owl',
      name: 'Night Owl',
      description: 'Check out after 8 PM 5 times',
      icon: 'Moon',
      unlockedAt: unlocked(lateCheckOuts, 4, lateCheckOuts[4]?.checkOut),
      progress: Math.min(lateCheckOuts.length, 5),
      target: 5,
    },
    {
      id: 'midnight-oil',
      name: 'Burning Midnight Oil',
      description: 'Check out after 10 PM 3 times',
      icon: 'Flame',
      unlockedAt: unlocked(veryLateCheckOuts, 2, veryLateCheckOuts[2]?.checkOut),
      progress: Math.min(veryLateCheckOuts.length, 3),
      target: 3,
    },

    // ── Other ────────────────────────────────────────────────────────────
    {
      id: 'weekend-warrior',
      name: 'Weekend Warrior',
      description: 'Check in on weekends 5 times',
      icon: 'CalendarDays',
      unlockedAt: unlocked(weekendSessions, 4, weekendSessions[4]?.checkIn),
      progress: Math.min(weekendSessions.length, 5),
      target: 5,
    },
  ]

  // Sort: unlocked first (by unlock date desc), then locked by descending progress ratio
  return definitions.sort((a, b) => {
    if (a.unlockedAt && b.unlockedAt) return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    if (a.unlockedAt) return -1
    if (b.unlockedAt) return 1
    const aRatio = (a.progress ?? 0) / (a.target ?? 1)
    const bRatio = (b.progress ?? 0) / (b.target ?? 1)
    return bRatio - aRatio
  })
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
