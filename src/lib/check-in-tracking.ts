"use client"

/**
 * Helper utilities for tracking check-in method (manual vs automatic)
 */

const STORAGE_KEY = "check-in-method"

export interface CheckInMethod {
  volunteerId: string
  isManual: boolean
  timestamp: number
}

/**
 * Mark check-in as manual for a volunteer
 */
export function markManualCheckIn(volunteerId: string): void {
  const data: CheckInMethod = {
    volunteerId,
    isManual: true,
    timestamp: Date.now()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Mark check-in as automatic for a volunteer
 */
export function markAutomaticCheckIn(volunteerId: string): void {
  const data: CheckInMethod = {
    volunteerId,
    isManual: false,
    timestamp: Date.now()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Get current check-in method for a volunteer
 */
export function getCheckInMethod(volunteerId: string): CheckInMethod | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    const data = JSON.parse(stored) as CheckInMethod
    // Only return if it's for the same volunteer
    if (data.volunteerId === volunteerId) {
      return data
    }
    return null
  } catch {
    return null
  }
}

/**
 * Check if current check-in is manual
 */
export function isManualCheckIn(volunteerId: string): boolean {
  const method = getCheckInMethod(volunteerId)
  return method?.isManual ?? false
}

/**
 * Clear check-in method tracking
 */
export function clearCheckInMethod(): void {
  localStorage.removeItem(STORAGE_KEY)
}
