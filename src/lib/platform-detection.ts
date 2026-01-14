"use client"

/**
 * Utilities for detecting user's platform and browser
 */

export interface PlatformInfo {
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  isDesktop: boolean
  isSafari: boolean
  isChrome: boolean
  browser: string
  os: string
}

/**
 * Detect the user's platform and browser
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === "undefined") {
    return {
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isDesktop: true,
      isSafari: false,
      isChrome: false,
      browser: "unknown",
      os: "unknown"
    }
  }

  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  const isAndroid = /Android/.test(ua)
  const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
  const isChrome = /Chrome/.test(ua)

  let browser = "unknown"
  if (isChrome) browser = "chrome"
  else if (isSafari) browser = "safari"
  else if (/Firefox/.test(ua)) browser = "firefox"
  else if (/Edge/.test(ua)) browser = "edge"

  let os = "unknown"
  if (isIOS) os = "ios"
  else if (isAndroid) os = "android"
  else if (/Mac/.test(ua)) os = "macos"
  else if (/Win/.test(ua)) os = "windows"
  else if (/Linux/.test(ua)) os = "linux"

  return {
    isIOS,
    isAndroid,
    isMobile,
    isDesktop: !isMobile,
    isSafari,
    isChrome,
    browser,
    os
  }
}

/**
 * Check if the device is running iOS
 */
export function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
}

/**
 * Check if the device is running Android
 */
export function isAndroidDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android/.test(window.navigator.userAgent)
}

/**
 * Check if the app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false

  // Check if running as PWA
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    document.referrer.includes("android-app://")
  )
}
