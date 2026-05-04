import { supabaseClient } from './auth-client'
import { OFFICE_COORDINATES } from './constants'

export { OFFICE_COORDINATES }

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: Date
}

export interface CheckInOptions {
  location?: LocationData
}

/**
 * Check in to the office
 * Updates volunteer status and creates a presence log entry
 */
export async function checkIn(volunteerId: string, options?: CheckInOptions) {
  const { location } = options || {}

  const logResult = await supabaseClient
    .from('presence_logs')
    .insert({ volunteer_id: volunteerId, action: 'check_in' })

  if (logResult.error) throw logResult.error

  const volunteerResult = await supabaseClient
    .from('volunteers')
    .update({ is_in_office: true, last_seen: new Date().toISOString() })
    .eq('id', volunteerId)

  if (volunteerResult.error) throw volunteerResult.error

  return { success: true, hasLocation: !!location }
}

/**
 * Check out from the office
 * Updates volunteer status and creates a presence log entry
 */
export async function checkOut(volunteerId: string, options?: CheckInOptions) {
  const { location } = options || {}

  const logResult = await supabaseClient
    .from('presence_logs')
    .insert({ volunteer_id: volunteerId, action: 'check_out' })

  if (logResult.error) throw logResult.error

  const volunteerResult = await supabaseClient
    .from('volunteers')
    .update({ is_in_office: false, last_seen: new Date().toISOString() })
    .eq('id', volunteerId)

  if (volunteerResult.error) throw volunteerResult.error

  return { success: true, hasLocation: !!location }
}

/**
 * Get current browser location
 * Returns a promise that resolves with location data or rejects if denied
 */
export async function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

/**
 * Get presence logs for a volunteer
 */
export async function getPresenceLogs(volunteerId: string, limit: number = 10) {
  const { data, error } = await supabaseClient
    .from('presence_logs')
    .select('*')
    .eq('volunteer_id', volunteerId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Calculate distance between two coordinates in meters
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Check if location is near the office (within 12 meters)
 */
export function isNearOffice(latitude: number, longitude: number): boolean {
  const distance = calculateDistance(
    latitude,
    longitude,
    OFFICE_COORDINATES.latitude,
    OFFICE_COORDINATES.longitude
  )
  return distance <= 12 // Within 12 meters
}