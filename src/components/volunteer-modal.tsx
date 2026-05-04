import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Clock, User } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

type VolunteerStatus = "available" | "dnd" | "break" | "remote"

interface LocalVolunteer {
  id: string
  name: string
  status: VolunteerStatus
  position?: string
  avatar: string
  isInOffice: boolean
  timestamp: Date
}

interface ScheduleSlot {
  id: string
  volunteer_id: string
  date: string
  start_time: string
  end_time: string
  confirmation_type: "firm" | "flex" | "confirmed"
}

interface VolunteerModalProps {
  volunteer: LocalVolunteer | null
  schedules: ScheduleSlot[]
  formatDateKey: (date: Date) => string
  getStatusDisplay: (status: VolunteerStatus) => string
  onClose: () => void
}

export function VolunteerModal({
  volunteer,
  schedules,
  formatDateKey,
  getStatusDisplay,
  onClose
}: VolunteerModalProps) {
  if (!volunteer) return null

  const today = formatDateKey(new Date())
  const volunteerSchedules = schedules.filter(s => s.volunteer_id === volunteer.id)
  const upcomingSchedules = volunteerSchedules
    .filter(s => s.date >= today)
    .sort((a, b) => {
      if (a.date === b.date) {
        return a.start_time.localeCompare(b.start_time)
      }
      return a.date.localeCompare(b.date)
    })
    .slice(0, 5)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <Card className="max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Volunteer Details</h3>
          <div className="flex items-center gap-2">
            <Link href={`/profile?userId=${volunteer.id}`}>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Volunteer Header */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center font-bold text-2xl relative">
              {volunteer.avatar}
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-primary rounded-full border-4 border-background" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold">{volunteer.name}</h4>
              <p className="text-muted-foreground">{volunteer.position || "Volunteer"}</p>
              <Badge className="mt-2">{getStatusDisplay(volunteer.status)}</Badge>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="font-semibold">{getStatusDisplay(volunteer.status)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <p className="font-semibold">{volunteer.isInOffice ? "In Office" : "Remote"}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Last Seen</p>
              <p className="font-semibold">
                {(() => {
                  const minutesAgo = Math.floor((Date.now() - volunteer.timestamp.getTime()) / 60000)
                  const hoursAgo = Math.floor(minutesAgo / 60)
                  const daysAgo = Math.floor(hoursAgo / 24)

                  if (minutesAgo < 0) return 'Just now'
                  if (minutesAgo < 1) return 'Just now'
                  if (minutesAgo < 60) return `${minutesAgo}m ago`
                  if (hoursAgo < 24) return `${hoursAgo}h ago`
                  return `${daysAgo}d ago`
                })()}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Position</p>
              <p className="font-semibold">{volunteer.position || "Volunteer"}</p>
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div>
            <h5 className="font-semibold mb-3">Upcoming Schedule</h5>
            {upcomingSchedules.length > 0 ? (
              <div className="space-y-3">
                {upcomingSchedules.map((schedule) => {
                  const readableDate = format(new Date(`${schedule.date}T00:00:00`), "EEEE, MMMM d, yyyy")
                  const isToday = schedule.date === today

                  return (
                    <div key={schedule.id} className="border rounded-lg p-3 bg-muted/40">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {readableDate}
                        </p>
                        {isToday && <Badge variant="default" className="text-xs">Today</Badge>}
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                        <Clock className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {schedule.confirmation_type}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming scheduled shifts
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
