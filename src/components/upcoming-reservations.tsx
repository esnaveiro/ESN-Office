"use client"

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Calendar, Clock, FileText, Loader2, User, Users} from "lucide-react"
import {OfficeReservation, useOfficeReservation} from "@/hooks/useOfficeReservation"
import {useState} from "react"
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {supabaseClient} from "@/lib/auth-client"

interface Volunteer {
    id: string
    name: string
    email: string
}

export function UpcomingReservations() {

    const {upcoming, loading} = useOfficeReservation()
    const [selectedReservation, setSelectedReservation] = useState<OfficeReservation | null>(null)
    const [additionalVolunteers, setAdditionalVolunteers] = useState<Volunteer[]>([])
    const [loadingVolunteers, setLoadingVolunteers] = useState(false)

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString)
        return {
            date: date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            }),
            time: date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
        }
    }

    const getDuration = (start: string, end: string) => {
        const startDate = new Date(start)
        const endDate = new Date(end)
        const diffMs = endDate.getTime() - startDate.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        if (diffHours > 0) {
            return `${diffHours}h ${diffMins > 0 ? `${diffMins}m` : ''}`
        }
        return `${diffMins}m`
    }

    const isToday = (dateString: string) => {
        const date = new Date(dateString)
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    const isTomorrow = (dateString: string) => {
        const date = new Date(dateString)
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return date.toDateString() === tomorrow.toDateString()
    }

    const handleReservationClick = async (reservation: OfficeReservation) => {
        setSelectedReservation(reservation)

        // Fetch additional volunteer details if any
        if (reservation.additional_volunteers && reservation.additional_volunteers.length > 0) {
            setLoadingVolunteers(true)
            try {
                const {data, error} = await supabaseClient
                    .from('volunteers')
                    .select('id, name, email')
                    .in('id', reservation.additional_volunteers)

                if (!error && data) {
                    setAdditionalVolunteers(data)
                }
            } catch (error) {
                console.error('Error fetching volunteers:', error)
            } finally {
                setLoadingVolunteers(false)
            }
        } else {
            setAdditionalVolunteers([])
        }
    }

    const closeModal = () => {
        setSelectedReservation(null)
        setAdditionalVolunteers([])
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-destructive"/>
                        Upcoming Reservations
                        <div className="h-5 w-8 bg-muted rounded animate-pulse ml-auto"/>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1].map((i) => (
                        <div
                            key={i}
                            className="p-4 border-2 border-muted rounded-lg"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 w-20 bg-muted rounded animate-pulse"/>
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 bg-muted rounded animate-pulse"/>
                                        <div className="h-4 w-32 bg-muted rounded animate-pulse"/>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 bg-muted rounded animate-pulse"/>
                                    <div className="h-4 w-28 bg-muted rounded animate-pulse"/>
                                </div>
                                {i === 1 && (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 bg-muted rounded animate-pulse"/>
                                        <div className="h-4 w-24 bg-muted rounded animate-pulse"/>
                                    </div>
                                )}
                                {i <= 2 && (
                                    <div className="flex items-start gap-2">
                                        <div className="h-4 w-4 bg-muted rounded animate-pulse"/>
                                        <div className="h-4 w-full bg-muted rounded animate-pulse"/>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (!upcoming || upcoming.length === 0) {
        return (
            <Card className="pb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-destructive"/>
                        Upcoming Reservations
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-destructive opacity-30"/>
                    <p className="text-sm text-muted-foreground">
                        No upcoming office reservations
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-destructive"/>
                    Upcoming Reservations
                    <Badge variant="destructive" className="ml-auto">
                        {upcoming.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {upcoming.map((reservation) => {
                    const start = formatDateTime(reservation.start_time)
                    const end = formatDateTime(reservation.end_time)
                    const duration = getDuration(reservation.start_time, reservation.end_time)

                    return (
                        <div
                            key={reservation.id}
                            onClick={() => handleReservationClick(reservation)}
                            className="p-4 border-2 border-destructive/50 rounded-lg hover:border-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {isToday(reservation.start_time) && (
                                            <Badge variant="destructive">Today</Badge>
                                        )}
                                        {isTomorrow(reservation.start_time) && (
                                            <Badge variant="destructive">Tomorrow</Badge>
                                        )}
                                        {!isToday(reservation.start_time) && !isTomorrow(reservation.start_time) && (
                                            <Badge variant="destructive">{start.date}</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4"/>
                                        <span>
                      {start.time} - {end.time} ({duration})
                    </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground"/>
                                    <span className="font-medium">{reservation.reserved_by_name}</span>
                                </div>

                                {reservation.additional_volunteers && reservation.additional_volunteers.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground"/>
                                        <span className="text-muted-foreground">
                                            +{reservation.additional_volunteers.length} volunteer{reservation.additional_volunteers.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}

                                {reservation.reason && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5"/>
                                        <span className="text-muted-foreground line-clamp-2">{reservation.reason}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </CardContent>

            {/* Details Modal */}
            <Dialog open={selectedReservation !== null} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reservation Details</DialogTitle>
                        <DialogDescription>
                            Complete information about this office reservation
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReservation && (
                        <div className="space-y-4">
                            {/* Date and Time */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    {isToday(selectedReservation.start_time) && (
                                        <Badge variant="destructive">Today</Badge>
                                    )}
                                    {isTomorrow(selectedReservation.start_time) && (
                                        <Badge variant="destructive">Tomorrow</Badge>
                                    )}
                                    {!isToday(selectedReservation.start_time) && !isTomorrow(selectedReservation.start_time) && (
                                        <Badge variant="destructive">
                                            {formatDateTime(selectedReservation.start_time).date}
                                        </Badge>
                                    )}
                                </div>

                                <div className="p-3 rounded-lg border bg-muted/50">
                                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                        <Clock className="h-4 w-4 text-muted-foreground"/>
                                        Time
                                    </div>
                                    <div className="text-sm">
                                        {formatDateTime(selectedReservation.start_time).time} - {formatDateTime(selectedReservation.end_time).time}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Duration: {getDuration(selectedReservation.start_time, selectedReservation.end_time)}
                                    </div>
                                </div>
                            </div>

                            {/* Reserved By */}
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                    <User className="h-4 w-4 text-muted-foreground"/>
                                    Reserved By
                                </div>
                                <div className="text-sm font-medium">
                                    {selectedReservation.reserved_by_name}
                                </div>
                            </div>

                            {/* Additional Volunteers */}
                            {selectedReservation.additional_volunteers && selectedReservation.additional_volunteers.length > 0 && (
                                <div className="p-3 rounded-lg border bg-muted/50">
                                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <Users className="h-4 w-4 text-muted-foreground"/>
                                        Additional Volunteers ({selectedReservation.additional_volunteers.length})
                                    </div>
                                    {loadingVolunteers ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {additionalVolunteers.map((volunteer) => (
                                                <div key={volunteer.id} className="text-sm">
                                                    {volunteer.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reason */}
                            {selectedReservation.reason && (
                                <div className="p-3 rounded-lg border bg-muted/50">
                                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <FileText className="h-4 w-4 text-muted-foreground"/>
                                        Reason
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {selectedReservation.reason}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
