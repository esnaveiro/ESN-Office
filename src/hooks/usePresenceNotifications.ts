"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { showPresenceNotification, getNotificationPermission } from "@/lib/notifications"
import { checkOut } from "@/lib/presence-client"

interface PresenceNotificationState {
  isActive: boolean
  lastNotificationTime: number | null
  lastConfirmationTime: number | null
  awaitingConfirmation: boolean
}

interface UsePresenceNotificationsOptions {
  volunteerId: string
  isInOffice: boolean
  isManualCheckIn: boolean // Only send notifications for manual check-ins
  onAutoCheckout?: () => void
}

// const NOTIFICATION_INTERVAL = 60 * 60 * 1000 // 1 hour in milliseconds
// 30 seconds for testing
const NOTIFICATION_INTERVAL = 1 * 30 * 1000 // 30 seconds in milliseconds
const CONFIRMATION_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds
const STORAGE_KEY = "presence-notification-state"

/**
 * Hook to manage hourly presence confirmation notifications
 * Sends notifications every hour for manually checked-in users
 * Auto-checks out users who don't confirm within 5 minutes
 */
export function usePresenceNotifications({
  volunteerId,
  isInOffice,
  isManualCheckIn,
  onAutoCheckout
}: UsePresenceNotificationsOptions) {
  const [state, setState] = useState<PresenceNotificationState>({
    isActive: false,
    lastNotificationTime: null,
    lastConfirmationTime: null,
    awaitingConfirmation: false
  })

  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const checkoutTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)
  const volunteerIdRef = useRef(volunteerId)
  const onAutoCheckoutRef = useRef(onAutoCheckout)

  // Keep refs updated
  useEffect(() => {
    volunteerIdRef.current = volunteerId
    onAutoCheckoutRef.current = onAutoCheckout
  }, [volunteerId, onAutoCheckout])

  // Load state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setState(parsed)
      } catch (error) {
        console.error("Error parsing notification state:", error)
      }
    }
  }, [])

  // Handle confirmation from service worker
  const handleConfirmation = useCallback(() => {
    const now = Date.now()
    setState(prevState => {
      const newState = {
        ...prevState,
        lastConfirmationTime: now,
        awaitingConfirmation: false
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      return newState
    })

    // Clear checkout timeout
    if (checkoutTimeoutRef.current) {
      clearTimeout(checkoutTimeoutRef.current)
      checkoutTimeoutRef.current = null
    }
  }, [])

  // Handle auto-checkout
  const handleAutoCheckout = useCallback(async () => {
    try {
      await checkOut(volunteerIdRef.current)
      console.log("Auto-checked out due to no confirmation")

      // Clear notification state
      const newState = {
        isActive: false,
        lastNotificationTime: null,
        lastConfirmationTime: null,
        awaitingConfirmation: false
      }
      setState(newState)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))

      // Call callback if provided
      if (onAutoCheckoutRef.current) {
        onAutoCheckoutRef.current()
      }
    } catch (error) {
      console.error("Error during auto-checkout:", error)
    }
  }, [])

  // Listen for messages from service worker
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleMessage = (event: MessageEvent) => {
      const { type, volunteerId: messageVolunteerId } = event.data || {}

      // Only handle messages for this volunteer
      if (messageVolunteerId !== volunteerIdRef.current) return

      if (type === "PRESENCE_CONFIRMED") {
        handleConfirmation()
      } else if (type === "PRESENCE_CHECKOUT_REQUESTED") {
        handleAutoCheckout()
      } else if (type === "PRESENCE_NOTIFICATION_DISMISSED") {
        // Notification dismissed - will auto-checkout after timeout
        console.log("Notification dismissed, waiting for timeout...")
      }
    }

    navigator.serviceWorker?.addEventListener("message", handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage)
    }
  }, [handleConfirmation, handleAutoCheckout])

  // Start/stop notifications based on check-in status
  useEffect(() => {
    const shouldBeActive = isInOffice && isManualCheckIn

    if (shouldBeActive) {
      // Start notifications if not already active
      if (!isInitializedRef.current && getNotificationPermission() === "granted") {
        isInitializedRef.current = true

        // Clear any existing interval
        if (notificationIntervalRef.current) {
          clearInterval(notificationIntervalRef.current)
        }

        const now = Date.now()
        const newState = {
          isActive: true,
          lastNotificationTime: null,
          lastConfirmationTime: now,
          awaitingConfirmation: false
        }
        setState(newState)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))

        // Set up hourly interval
        notificationIntervalRef.current = setInterval(() => {
          if (getNotificationPermission() === "granted") {
            showPresenceNotification(volunteerIdRef.current).then(() => {
              setState(prevState => {
                const updatedState = {
                  ...prevState,
                  lastNotificationTime: Date.now(),
                  awaitingConfirmation: true
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState))
                return updatedState
              })

              // Set timeout for auto-checkout
              if (checkoutTimeoutRef.current) {
                clearTimeout(checkoutTimeoutRef.current)
              }
              checkoutTimeoutRef.current = setTimeout(() => {
                checkOut(volunteerIdRef.current).then(() => {
                  const clearedState = {
                    isActive: false,
                    lastNotificationTime: null,
                    lastConfirmationTime: null,
                    awaitingConfirmation: false
                  }
                  setState(clearedState)
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(clearedState))
                  if (onAutoCheckoutRef.current) {
                    onAutoCheckoutRef.current()
                  }
                }).catch(error => {
                  console.error("Error during auto-checkout:", error)
                })
              }, CONFIRMATION_TIMEOUT)
            })
          }
        }, NOTIFICATION_INTERVAL)
      }
    } else {
      // Stop notifications if active
      if (isInitializedRef.current) {
        isInitializedRef.current = false

        if (notificationIntervalRef.current) {
          clearInterval(notificationIntervalRef.current)
          notificationIntervalRef.current = null
        }

        if (checkoutTimeoutRef.current) {
          clearTimeout(checkoutTimeoutRef.current)
          checkoutTimeoutRef.current = null
        }

        const newState = {
          isActive: false,
          lastNotificationTime: null,
          lastConfirmationTime: null,
          awaitingConfirmation: false
        }
        setState(newState)
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    return () => {
      // Cleanup on unmount
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current)
        notificationIntervalRef.current = null
      }
      if (checkoutTimeoutRef.current) {
        clearTimeout(checkoutTimeoutRef.current)
        checkoutTimeoutRef.current = null
      }
    }
  }, [isInOffice, isManualCheckIn])


  return {
    isActive: state.isActive,
    awaitingConfirmation: state.awaitingConfirmation,
    lastNotificationTime: state.lastNotificationTime,
    lastConfirmationTime: state.lastConfirmationTime,
    manualConfirm: handleConfirmation,
    manualCheckout: handleAutoCheckout
  }
}
