"use client"

/**
 * Notification utilities for presence confirmation
 */

export interface NotificationPermissionResult {
    granted: boolean
    denied: boolean
    prompt: boolean
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
    if (!("Notification" in window)) {
        console.warn("This browser does not support notifications")
        return {granted: false, denied: true, prompt: false}
    }

    if (Notification.permission === "granted") {
        return {granted: true, denied: false, prompt: false}
    }

    if (Notification.permission === "denied") {
        return {granted: false, denied: true, prompt: false}
    }

    try {
        const permission = await Notification.requestPermission()
        return {
            granted: permission === "granted",
            denied: permission === "denied",
            prompt: permission === "default"
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error)
        return {granted: false, denied: true, prompt: false}
    }
}

/**
 * Show a presence confirmation notification
 */
export async function showPresenceNotification(volunteerId: string): Promise<void> {
    if (!("serviceWorker" in navigator)) {
        console.warn("Service Worker not supported")
        return
    }

    if (Notification.permission !== "granted") {
        console.warn("Notification permission not granted")
        return
    }

    try {
        const registration = await navigator.serviceWorker.ready
        // Use type assertion for notification options with actions
        // Actions are part of the Notification API but may not be in all TypeScript definitions
        await registration.showNotification("ESN Office - Are you still here?", {
            body: "Tap to confirm you're still in the office",
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: "presence-confirmation",
            requireInteraction: true, // Notification stays until user interacts
            actions: [
                {
                    action: "confirm",
                    title: "Yes, I'm here"
                },
                {
                    action: "checkout",
                    title: "No, check me out"
                }
            ],
            data: {
                volunteerId,
                timestamp: Date.now(),
                type: "presence-confirmation"
            }
        } as NotificationOptions)

        // Store notification timestamp
        const notificationState = {
            lastNotificationTime: Date.now(),
            volunteerId,
            awaitingConfirmation: true
        }
        localStorage.setItem("presence-notification-state", JSON.stringify(notificationState))
    } catch (error) {
        console.error("Error showing notification:", error)
    }
}

/**
 * Get notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!("Notification" in window)) {
        return "denied"
    }
    return Notification.permission
}

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported(): boolean {
    return "Notification" in window && "serviceWorker" in navigator
}
