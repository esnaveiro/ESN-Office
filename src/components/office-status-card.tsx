import { Card } from "@/components/ui/card"
import { Activity, CheckCircle, XCircle, Clock, MapPin } from "lucide-react"

interface NextScheduledVolunteer {
  volunteer: { name: string }
  time: string
  minutesUntil: number
}

interface OfficeStatusCardProps {
  isOfficeOpen: boolean
  nextScheduledVolunteer: NextScheduledVolunteer | null
}

export function OfficeStatusCard({ isOfficeOpen, nextScheduledVolunteer }: OfficeStatusCardProps) {
  return (
    <Card className="p-8 relative overflow-hidden">
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Office Status</h2>
        </div>

        {/* Status Display */}
        <div className="flex items-center gap-4">
          {isOfficeOpen ? (
            <>
              <CheckCircle className="h-16 w-16 text-primary animate-pulse" />
              <div>
                <h3 className="text-4xl font-bold mb-1">Open</h3>
                <p className="text-muted-foreground">Volunteers are available</p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-4xl font-bold text-muted-foreground mb-1">Closed</h3>
                <p className="text-muted-foreground">
                  {nextScheduledVolunteer ? (
                    <>
                      <span className="font-medium text-foreground">
                        {nextScheduledVolunteer.volunteer.name}
                      </span>
                      {' '}arriving at {nextScheduledVolunteer.time}
                      {nextScheduledVolunteer.minutesUntil < 60 && (
                        <span className="text-primary"> ({nextScheduledVolunteer.minutesUntil}m)</span>
                      )}
                    </>
                  ) : (
                    'Come back during office hours'
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Office Info */}
        <div className="pt-6 border-t space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Hours: Monday - Friday, 9:00 AM - 6:00 PM</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Campus Universitário de Santiago</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
