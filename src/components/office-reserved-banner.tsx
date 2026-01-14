"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Calendar, Clock } from "lucide-react"
import { useOfficeReservation } from "@/hooks/useOfficeReservation"

export function OfficeReservedBanner() {
  const { current, is_office_reserved, loading } = useOfficeReservation()

  if (loading || !is_office_reserved || !current) {
    return null
  }

  const startTime = new Date(current.start_time)
  const endTime = new Date(current.end_time)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isSameDay = startTime.toDateString() === endTime.toDateString()

  return (
    <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <div className="flex flex-col gap-1">
          <div className="font-semibold">
            Office Reserved - Closed for Check-ins
          </div>
          <div className="text-sm flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>
                {isSameDay ? (
                  `${formatDate(startTime)}`
                ) : (
                  `${formatDate(startTime)} - ${formatDate(endTime)}`
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
            </div>
            <div className="mt-1">
              Reserved by: <span className="font-medium">{current.reserved_by_name}</span>
              {current.reason && (
                <span className="ml-2 text-xs opacity-80">({current.reason})</span>
              )}
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
