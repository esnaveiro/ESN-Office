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
      durationMinutes: (new Date().getTime() - currentCheckIn.getTime()) / (1000 * 60)
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
  const badges: Badge[] = []

  // First Check-in
  if (allTimeSessions.length > 0) {
    badges.push({
      id: 'first-checkin',
      name: 'First Step',
      description: 'Completed your first check-in',
      icon: 'Sparkles',
      unlockedAt: allTimeSessions[0].checkIn
    })
  }

  // Early Bird (checked in before 9 AM)
  const earlyCheckIns = allTimeSessions.filter(s => s.checkIn.getHours() < 9)
  if (earlyCheckIns.length >= 5) {
    badges.push({
      id: 'early-bird',
      name: 'Early Bird',
      description: 'Checked in before 9 AM at least 5 times',
      icon: 'Sunrise',
      unlockedAt: earlyCheckIns[4].checkIn
    })
  } else if (earlyCheckIns.length > 0) {
    badges.push({
      id: 'early-bird',
      name: 'Early Bird',
      description: 'Check in before 9 AM 5 times',
      icon: 'Sunrise',
      progress: earlyCheckIns.length,
      target: 5
    })
  }

  // Night Owl (checked out after 8 PM)
  const lateCheckOuts = allTimeSessions.filter(s => s.checkOut && s.checkOut.getHours() >= 20)
  if (lateCheckOuts.length >= 5) {
    badges.push({
      id: 'night-owl',
      name: 'Night Owl',
      description: 'Checked out after 8 PM at least 5 times',
      icon: 'Moon',
      unlockedAt: lateCheckOuts[4].checkOut || undefined
    })
  } else if (lateCheckOuts.length > 0) {
    badges.push({
      id: 'night-owl',
      name: 'Night Owl',
      description: 'Check out after 8 PM 5 times',
      icon: 'Moon',
      progress: lateCheckOuts.length,
      target: 5
    })
  }

  // Consistent Contributor (7+ days active in a month)
  if (monthlyStats.daysActive >= 7) {
    badges.push({
      id: 'consistent',
      name: 'Consistent Contributor',
      description: 'Active for 7+ days this month',
      icon: 'Star',
      unlockedAt: new Date()
    })
  } else {
    badges.push({
      id: 'consistent',
      name: 'Consistent Contributor',
      description: 'Be active for 7 days in a month',
      icon: 'Star',
      progress: monthlyStats.daysActive,
      target: 7
    })
  }

  // Marathon (4+ hours in a single session)
  const marathonSession = allTimeSessions.find(s => s.durationMinutes >= 240)
  if (marathonSession) {
    badges.push({
      id: 'marathon',
      name: 'Marathon',
      description: 'Stayed in office for 4+ hours in one session',
      icon: 'Zap',
      unlockedAt: marathonSession.checkOut || undefined
    })
  }

  // Streak badges
  if (monthlyStats.currentStreak >= 3) {
    badges.push({
      id: 'streak-3',
      name: '3-Day Streak',
      description: 'Checked in for 3 consecutive days',
      icon: 'Flame',
      unlockedAt: new Date()
    })
  }

  if (monthlyStats.currentStreak >= 7) {
    badges.push({
      id: 'streak-7',
      name: 'Week Warrior',
      description: 'Checked in for 7 consecutive days',
      icon: 'Flame',
      unlockedAt: new Date()
    })
  }

  if (monthlyStats.currentStreak >= 14) {
    badges.push({
      id: 'streak-14',
      name: 'Fortnight Fighter',
      description: 'Checked in for 14 consecutive days',
      icon: 'Flame',
      unlockedAt: new Date()
    })
  }

  // Total check-ins milestones
  if (allTimeSessions.length >= 10) {
    badges.push({
      id: 'checkins-10',
      name: 'Regular',
      description: 'Completed 10 check-ins',
      icon: 'CheckCircle',
      unlockedAt: allTimeSessions[9].checkIn
    })
  } else if (allTimeSessions.length >= 1) {
    badges.push({
      id: 'checkins-10',
      name: 'Regular',
      description: 'Complete 10 check-ins',
      icon: 'CheckCircle',
      progress: allTimeSessions.length,
      target: 10
    })
  }

  if (allTimeSessions.length >= 25) {
    badges.push({
      id: 'checkins-25',
      name: 'Committed',
      description: 'Completed 25 check-ins',
      icon: 'Target',
      unlockedAt: allTimeSessions[24].checkIn
    })
  } else if (allTimeSessions.length >= 10) {
    badges.push({
      id: 'checkins-25',
      name: 'Committed',
      description: 'Complete 25 check-ins',
      icon: 'Target',
      progress: allTimeSessions.length,
      target: 25
    })
  }

  if (allTimeSessions.length >= 50) {
    badges.push({
      id: 'checkins-50',
      name: 'Dedicated',
      description: 'Completed 50 check-ins',
      icon: 'Award',
      unlockedAt: allTimeSessions[49].checkIn
    })
  } else if (allTimeSessions.length >= 25) {
    badges.push({
      id: 'checkins-50',
      name: 'Dedicated',
      description: 'Complete 50 check-ins',
      icon: 'Award',
      progress: allTimeSessions.length,
      target: 50
    })
  }

  if (allTimeSessions.length >= 100) {
    badges.push({
      id: 'checkins-100',
      name: 'Legend',
      description: 'Completed 100 check-ins',
      icon: 'Trophy',
      unlockedAt: allTimeSessions[99].checkIn
    })
  } else if (allTimeSessions.length >= 50) {
    badges.push({
      id: 'checkins-100',
      name: 'Legend',
      description: 'Complete 100 check-ins',
      icon: 'Trophy',
      progress: allTimeSessions.length,
      target: 100
    })
  }

  if (allTimeSessions.length >= 200) {
    badges.push({
      id: 'checkins-200',
      name: 'Office Hero',
      description: 'Completed 200 check-ins',
      icon: 'Medal',
      unlockedAt: allTimeSessions[199].checkIn
    })
  } else if (allTimeSessions.length >= 100) {
    badges.push({
      id: 'checkins-200',
      name: 'Office Hero',
      description: 'Complete 200 check-ins',
      icon: 'Medal',
      progress: allTimeSessions.length,
      target: 200
    })
  }

  // Calculate total hours spent in office
  const totalHours = allTimeSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60

  // Time-based achievements
  if (totalHours >= 10) {
    badges.push({
      id: 'hours-10',
      name: 'Time Keeper',
      description: 'Spent 10+ hours in the office',
      icon: 'Clock',
      unlockedAt: new Date()
    })
  } else if (totalHours >= 1) {
    badges.push({
      id: 'hours-10',
      name: 'Time Keeper',
      description: 'Spend 10 hours in the office',
      icon: 'Clock',
      progress: Math.floor(totalHours),
      target: 10
    })
  }

  if (totalHours >= 50) {
    badges.push({
      id: 'hours-50',
      name: 'Time Master',
      description: 'Spent 50+ hours in the office',
      icon: 'Hourglass',
      unlockedAt: new Date()
    })
  } else if (totalHours >= 10) {
    badges.push({
      id: 'hours-50',
      name: 'Time Master',
      description: 'Spend 50 hours in the office',
      icon: 'Hourglass',
      progress: Math.floor(totalHours),
      target: 50
    })
  }

  if (totalHours >= 100) {
    badges.push({
      id: 'hours-100',
      name: 'Century Club',
      description: 'Spent 100+ hours in the office',
      icon: 'CalendarClock',
      unlockedAt: new Date()
    })
  } else if (totalHours >= 50) {
    badges.push({
      id: 'hours-100',
      name: 'Century Club',
      description: 'Spend 100 hours in the office',
      icon: 'CalendarClock',
      progress: Math.floor(totalHours),
      target: 100
    })
  }

  // Weekend warrior
  const weekendSessions = allTimeSessions.filter(s => {
    const day = s.checkIn.getDay()
    return day === 0 || day === 6 // Sunday or Saturday
  })

  if (weekendSessions.length >= 5) {
    badges.push({
      id: 'weekend-warrior',
      name: 'Weekend Warrior',
      description: 'Checked in on weekends 5+ times',
      icon: 'CalendarDays',
      unlockedAt: weekendSessions[4].checkIn
    })
  } else if (weekendSessions.length >= 1) {
    badges.push({
      id: 'weekend-warrior',
      name: 'Weekend Warrior',
      description: 'Check in on weekends 5 times',
      icon: 'CalendarDays',
      progress: weekendSessions.length,
      target: 5
    })
  }

  // Speed demon (quick sessions - under 30 minutes)
  const quickSessions = allTimeSessions.filter(s => s.durationMinutes <= 30 && s.durationMinutes >= 5)
  if (quickSessions.length >= 10) {
    badges.push({
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Completed 10 quick visits (5-30 min)',
      icon: 'Zap',
      unlockedAt: quickSessions[9].checkIn
    })
  } else if (quickSessions.length >= 1) {
    badges.push({
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Complete 10 quick visits (5-30 min)',
      icon: 'Zap',
      progress: quickSessions.length,
      target: 10
    })
  }

  // Long haul (sessions over 6 hours)
  const longSessions = allTimeSessions.filter(s => s.durationMinutes >= 360)
  if (longSessions.length >= 3) {
    badges.push({
      id: 'long-haul',
      name: 'The Long Haul',
      description: 'Stayed 6+ hours on 3 occasions',
      icon: 'Timer',
      unlockedAt: longSessions[2].checkOut || undefined
    })
  } else if (longSessions.length >= 1) {
    badges.push({
      id: 'long-haul',
      name: 'The Long Haul',
      description: 'Stay 6+ hours on 3 occasions',
      icon: 'Timer',
      progress: longSessions.length,
      target: 3
    })
  }

  // Perfect week (checked in every weekday in a week)
  // This is a simplified check - could be improved to check actual consecutive weekdays
  if (weeklyStats.daysActive >= 5) {
    badges.push({
      id: 'perfect-week',
      name: 'Perfect Week',
      description: 'Active 5+ days this week',
      icon: 'CalendarCheck',
      unlockedAt: new Date()
    })
  } else if (weeklyStats.daysActive >= 1) {
    badges.push({
      id: 'perfect-week',
      name: 'Perfect Week',
      description: 'Be active 5 days in a week',
      icon: 'CalendarCheck',
      progress: weeklyStats.daysActive,
      target: 5
    })
  }

  // Month master (15+ days active in a month)
  if (monthlyStats.daysActive >= 15) {
    badges.push({
      id: 'month-master',
      name: 'Month Master',
      description: 'Active 15+ days in a month',
      icon: 'Calendar',
      unlockedAt: new Date()
    })
  } else if (monthlyStats.daysActive >= 7) {
    badges.push({
      id: 'month-master',
      name: 'Month Master',
      description: 'Be active 15 days in a month',
      icon: 'Calendar',
      progress: monthlyStats.daysActive,
      target: 15
    })
  }

  // Super early bird (before 8 AM)
  const superEarlyCheckIns = allTimeSessions.filter(s => s.checkIn.getHours() < 8)
  if (superEarlyCheckIns.length >= 3) {
    badges.push({
      id: 'super-early-bird',
      name: 'Super Early Bird',
      description: 'Checked in before 8 AM at least 3 times',
      icon: 'Sun',
      unlockedAt: superEarlyCheckIns[2].checkIn
    })
  } else if (superEarlyCheckIns.length >= 1) {
    badges.push({
      id: 'super-early-bird',
      name: 'Super Early Bird',
      description: 'Check in before 8 AM 3 times',
      icon: 'Sun',
      progress: superEarlyCheckIns.length,
      target: 3
    })
  }

  // Midnight oil (checked out after 10 PM)
  const veryLateCheckOuts = allTimeSessions.filter(s => s.checkOut && s.checkOut.getHours() >= 22)
  if (veryLateCheckOuts.length >= 3) {
    badges.push({
      id: 'midnight-oil',
      name: 'Burning Midnight Oil',
      description: 'Checked out after 10 PM at least 3 times',
      icon: 'Flame',
      unlockedAt: veryLateCheckOuts[2].checkOut || undefined
    })
  } else if (veryLateCheckOuts.length >= 1) {
    badges.push({
      id: 'midnight-oil',
      name: 'Burning Midnight Oil',
      description: 'Check out after 10 PM 3 times',
      icon: 'Flame',
      progress: veryLateCheckOuts.length,
      target: 3
    })
  }

  // Social butterfly (check in when 3+ others are present) - requires office buddies data
  // This would need access to overlap data, skipping for now

  // Monthly streak badges (additional to 3, 7, 14 day streaks)
  if (monthlyStats.currentStreak >= 30) {
    badges.push({
      id: 'streak-30',
      name: 'Month Long Dedication',
      description: 'Checked in for 30 consecutive days',
      icon: 'Flame',
      unlockedAt: new Date()
    })
  }

  if (monthlyStats.currentStreak >= 60) {
    badges.push({
      id: 'streak-60',
      name: 'Unstoppable',
      description: 'Checked in for 60 consecutive days',
      icon: 'Rocket',
      unlockedAt: new Date()
    })
  }

  if (monthlyStats.currentStreak >= 100) {
    badges.push({
      id: 'streak-100',
      name: 'Century Streak',
      description: 'Checked in for 100 consecutive days',
      icon: 'Crown',
      unlockedAt: new Date()
    })
  }

  // Sort: unlocked first, then by progress
  return badges.sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1
    if (!a.unlockedAt && b.unlockedAt) return 1
    if (a.progress !== undefined && b.progress !== undefined) {
      return b.progress - a.progress
    }
    return 0
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
