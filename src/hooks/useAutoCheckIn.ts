import {useEffect, useRef, useState} from 'react'
import {checkIn, checkOut, isNearOffice} from '@/lib/presence-client'
import {markAutomaticCheckIn, clearCheckInMethod} from '@/lib/check-in-tracking'

interface UseAutoCheckInOptions {
    volunteerId: string
    isInOffice: boolean
    enabled: boolean
    onSuccess?: () => void
}

export function useAutoCheckIn({
                                   volunteerId,
                                   isInOffice,
                                   enabled,
                                   onSuccess
                               }: UseAutoCheckInOptions) {
    const [isMonitoring, setIsMonitoring] = useState(false)
    const watchIdRef = useRef<number | null>(null)
    const lastActionRef = useRef<{ action: 'check_in' | 'check_out', timestamp: number } | null>(null)

    useEffect(() => {
        if (!enabled) {
            // Stop monitoring if disabled
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
                setIsMonitoring(false)
            }
            return
        }

        // Start monitoring location
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported')
            return
        }

        setIsMonitoring(true)

        const handleLocationUpdate = async (position: GeolocationPosition) => {
            const nearOffice = isNearOffice(
                position.coords.latitude,
                position.coords.longitude
            )

            const now = Date.now()
            const cooldownPeriod = 5 * 60 * 1000 // 5 minutes cooldown

            // Check if we're near the office and not already checked in
            if (nearOffice && !isInOffice) {
                // Check cooldown to prevent rapid check-ins
                if (lastActionRef.current?.action === 'check_in' &&
                    now - lastActionRef.current.timestamp < cooldownPeriod) {
                    return
                }

                try {
                    await checkIn(volunteerId, {
                        location: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: new Date(position.timestamp)
                        }
                    })
                    // Mark as automatic check-in (no notifications)
                    markAutomaticCheckIn(volunteerId)
                    lastActionRef.current = {action: 'check_in', timestamp: now}
                    onSuccess?.()
                } catch (error) {
                    console.error('Auto check-in failed:', error)
                }
            }
            // Check if we're away from the office and currently checked in
            else if (!nearOffice && isInOffice) {
                // Check cooldown to prevent rapid check-outs
                if (lastActionRef.current?.action === 'check_out' &&
                    now - lastActionRef.current.timestamp < cooldownPeriod) {
                    return
                }

                try {
                    await checkOut(volunteerId, {
                        location: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: new Date(position.timestamp)
                        }
                    })
                    // Clear check-in tracking on automatic checkout
                    clearCheckInMethod()
                    lastActionRef.current = {action: 'check_out', timestamp: now}
                    onSuccess?.()
                } catch (error) {
                    console.error('Auto check-out failed:', error)
                }
            }
        }

        const handleError = (error: GeolocationPositionError) => {
            console.error('Location monitoring error:', error)
        }

        // Watch position with high accuracy
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleLocationUpdate,
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000 // Update at most every 30 seconds
            }
        )

        // Cleanup on unmount
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
                setIsMonitoring(false)
            }
        }
    }, [enabled, volunteerId, isInOffice, onSuccess])

    return {isMonitoring}
}
