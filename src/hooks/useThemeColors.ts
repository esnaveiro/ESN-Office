"use client"

import { useMemo } from "react"

type ThemeColors = {
  primary: string
  secondary: string
  muted: string
  accent: string
  light: string
}

function readCSSVariable(variable: string): string {
  if (typeof window === "undefined") return "#000000"
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable)
  return value.trim() || "#000000"
}

export function useThemeColors(): ThemeColors {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return {
        primary: "#2563eb",
        secondary: "#0ea5e9",
        muted: "#94a3b8",
        accent: "#f97316",
        light: "#bae6fd",
      }
    }

    return {
      primary: readCSSVariable("--primary") || "#2563eb",
      secondary: readCSSVariable("--secondary") || "#0ea5e9",
      muted: readCSSVariable("--muted") || "#94a3b8",
      accent: readCSSVariable("--accent") || "#f97316",
      light: readCSSVariable("--primary-foreground") || "#bae6fd",
    }
  }, [])
}
