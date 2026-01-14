"use client"

import { useEffect, useState } from "react"

interface UsePwaResult {
  canInstall: boolean
  isInstalled: boolean
  install: () => Promise<boolean>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function usePWA(): UsePwaResult {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      deferredPrompt = event as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      deferredPrompt = null
      setCanInstall(false)
      setIsInstalled(true)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", handleBeforeInstall)
      window.addEventListener("appinstalled", handleAppInstalled)

      // Detect standalone mode
      const mediaQuery = window.matchMedia("(display-mode: standalone)")
      setIsInstalled(mediaQuery.matches)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
        window.removeEventListener("appinstalled", handleAppInstalled)
      }
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    setCanInstall(false)
    return outcome === "accepted"
  }

  return { canInstall, isInstalled, install }
}
