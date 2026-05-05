import {Card} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Calendar, Clock, FileText, MapPin, User, Users, X} from "lucide-react"
import {SECTION_NAME, OFFICE_ADDRESS} from "@/lib/constants"

type VolunteerStatus = "available" | "dnd" | "break" | "remote"

interface IntervalVolunteer {
    id: string
    name: string
    status?: VolunteerStatus
    avatar?: string
    position?: string
}

interface IntervalDetails {
    time: string
    hour?: number
    minute?: number
    status: "open" | "closed" | "reserved"
    peopleCount: number
    volunteersPresent?: IntervalVolunteer[]
}

interface Reservation {
    reserved_by_name: string
    start_time: string
    end_time: string
    reason?: string | null
}

interface TimeIntervalModalProps {
    interval: IntervalDetails | null
    currentHour: number
    currentMinute: number
    relevantReservation?: Reservation | null
    getStatusDisplay: (status: VolunteerStatus) => string
    onClose: () => void
}

export function TimeIntervalModal({
                                      interval,
                                      currentHour,
                                      currentMinute,
                                      relevantReservation,
                                      getStatusDisplay,
                                      onClose
                                  }: TimeIntervalModalProps) {
    if (!interval) return null

    const isReserved = interval.status === 'reserved'
    const isCurrentTime = typeof interval.hour === "number" &&
        typeof interval.minute === "number" &&
        interval.hour === currentHour &&
        Math.abs(interval.minute - currentMinute) < 30

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <Card className="max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Clock className={`h-5 w-5 ${isReserved ? 'text-destructive' : 'text-primary'}`}/>
                        {interval.time}
                        {isCurrentTime && <Badge className="text-xs">Now</Badge>}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4"/>
                    </Button>
                </div>

                <div className="space-y-4">
                    {/* Office Status */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Office Status</span>
                        <Badge
                            variant={interval.status === 'reserved' ? "destructive" : interval.status === 'open' ? "default" : "outline"}
                        >
                            {interval.status === 'reserved' ? 'Reserved' : interval.status === 'open' ? 'Open' : 'Closed'}
                        </Badge>
                    </div>

                    {isReserved && relevantReservation ? (
                        /* Reservation Details */
                        <div className="space-y-4">
                            <div className="p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
                                <h4 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
                                    <Calendar className="h-4 w-4"/>
                                    Office Reserved
                                </h4>

                                <div className="space-y-3">
                                    {/* Reserved By */}
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground"/>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Reserved by</p>
                                            <p className="font-medium">{relevantReservation.reserved_by_name}</p>
                                        </div>
                                    </div>

                                    {/* Time Range */}
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 text-muted-foreground"/>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Duration</p>
                                            <p className="font-medium">
                                                {new Date(relevantReservation.start_time).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })} - {new Date(relevantReservation.end_time).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    {relevantReservation.reason && (
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5"/>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Reason</p>
                                                <p className="font-medium">{relevantReservation.reason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    The office is closed during this reservation period.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* People Present (for non-reserved slots) */
                        <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4"/>
                                Volunteers Expected ({interval.peopleCount})
                            </h4>
                            {interval.volunteersPresent && interval.volunteersPresent.length > 0 ? (
                                <div className="space-y-2">
                                    {interval.volunteersPresent.map((volunteer) => {
                                        const initials = volunteer.avatar || volunteer.name.split(' ').map(n => n[0] || '').join('')
                                        return (
                                            <div key={volunteer.id}
                                                 className="flex items-center gap-3 p-3 border rounded-lg">
                                                <div
                                                    className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                                                    {initials}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm">{volunteer.name}</span>
                                                        {volunteer.status && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {getStatusDisplay(volunteer.status)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {volunteer.position || "Volunteer"}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                                    <p className="text-sm">No volunteers expected during this time</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4"/>
                            {SECTION_NAME} Office • {OFFICE_ADDRESS}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
