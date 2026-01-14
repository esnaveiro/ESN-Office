import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

type TimeView = "day" | "week"

interface IntervalDetails {
  time: string
  hour?: number
  minute?: number
  status: "open" | "closed" | "reserved"
  peopleCount: number
  volunteersPresent?: { id: string; name: string }[]
  date?: Date
  isToday?: boolean
  isSelected?: boolean
  isOfficeOpen?: boolean
}

interface OfficeScheduleCardProps {
  timeView: TimeView
  currentDate: Date
  timeIntervals: IntervalDetails[]
  currentHour: number
  currentMinute: number
  currentDateKey: string
  actualTodayKey: string
  isLoading: boolean
  onTimeViewChange: (view: TimeView) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onIntervalClick: (interval: IntervalDetails) => void
  onDayClick?: (date: Date) => void
  formatTimeViewTitle: () => string
}

export function OfficeScheduleCard({
  timeView,
  currentDate,
  timeIntervals,
  currentHour,
  currentMinute,
  currentDateKey,
  actualTodayKey,
  isLoading,
  onTimeViewChange,
  onNavigate,
  onIntervalClick,
  onDayClick,
  formatTimeViewTitle
}: OfficeScheduleCardProps) {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header with Day/Week Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Office Schedule</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Day/Week Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={timeView === "day" ? "default" : "outline"}
                onClick={(e) => {
                  e.preventDefault()
                  onTimeViewChange("day")
                }}
                className="rounded-none border-0"
                size="sm"
                type="button"
              >
                Day
              </Button>
              <Button
                variant={timeView === "week" ? "default" : "outline"}
                onClick={(e) => {
                  e.preventDefault()
                  onTimeViewChange("week")
                }}
                className="rounded-none border-0 border-l"
                size="sm"
                type="button"
              >
                Week
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate('prev')
                }}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-32 text-center">
                {formatTimeViewTitle()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate('next')
                }}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Time Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {timeView === "day" ? "Day Overview" : "Week Overview"}
            </h3>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>

          {timeView === "day" ? (
            // Day View Grid
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-9 gap-2">
              {timeIntervals.map((interval, index) => {
                const isCurrent = (
                  timeView === "day" &&
                  typeof interval.hour === "number" &&
                  typeof interval.minute === "number" &&
                  interval.hour === currentHour &&
                  Math.abs(interval.minute - currentMinute) < 30 &&
                  currentDateKey === actualTodayKey
                )

                const isPast = currentDateKey < actualTodayKey ||
                  (currentDateKey === actualTodayKey &&
                    typeof interval.hour === "number" &&
                    typeof interval.minute === "number" &&
                    (interval.hour * 60 + interval.minute + 30 <= currentHour * 60 + currentMinute))

                return (
                  <button
                    key={index}
                    onClick={() => onIntervalClick(interval)}
                    className={`
                      p-3 rounded-lg text-center transition-all border-2 focus:outline-none
                      ${isPast
                        ? 'bg-muted/30 text-muted-foreground/50 border-muted/50 opacity-60 cursor-default'
                        : interval.status === 'reserved'
                          ? 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90 hover:scale-105 hover:shadow-md focus:ring-destructive'
                          : interval.status === 'open'
                            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:scale-105 hover:shadow-md focus:ring-primary'
                            : 'bg-muted text-muted-foreground border-muted hover:bg-muted/80 hover:scale-105 hover:shadow-md focus:ring-muted'}
                      ${isCurrent ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium ${isPast ? 'line-through' : ''}`}>
                      {interval.time}
                    </div>
                    <div className="text-xs mt-1">
                      {interval.status === 'reserved' ? 'Reserved' : interval.peopleCount}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            // Week View Grid
            <div className="grid grid-cols-7 gap-2">
              {timeIntervals.map((interval, index) => {
                const isPastDay = interval.date && new Date(interval.date) < new Date(actualTodayKey)

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (interval.date && onDayClick) {
                        onDayClick(new Date(interval.date))
                      }
                    }}
                    className={`
                      p-4 rounded-lg text-center transition-all border-2 focus:outline-none
                      ${isPastDay
                        ? 'bg-muted/30 text-muted-foreground/50 border-muted/50 opacity-60'
                        : interval.status === 'open'
                          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 focus:ring-primary'
                          : 'bg-muted text-muted-foreground border-muted hover:bg-muted/80 focus:ring-muted'}
                      ${interval.isSelected ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium mb-2 ${isPastDay ? 'line-through' : ''}`}>
                      {interval.time}
                    </div>
                    <div className={`text-lg font-bold ${isPastDay ? 'line-through' : ''}`}>
                      {interval.peopleCount}
                    </div>
                    {interval.isToday && (
                      <Badge variant="outline" className="text-xs mt-2">
                        Today
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span className="text-muted-foreground">Open</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded"></div>
            <span className="text-muted-foreground">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded"></div>
            <span className="text-muted-foreground">Closed</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
