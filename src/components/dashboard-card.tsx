"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface DashboardCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  variant?: "primary" | "neutral"
  textColor?: string
}

export default function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "neutral",
  textColor,
}: DashboardCardProps) {
  const baseStyles =
    variant === "primary"
      ? "bg-primary/5 border-primary/10"
      : "bg-card border-border"

  return (
    <Card className={cn("border", baseStyles)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", textColor)}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
