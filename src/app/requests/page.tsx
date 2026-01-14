"use client"

import {useEffect, useMemo, useState} from "react"
import {useRouter} from "next/navigation"
import {SiteHeader} from "@/components/site-header"
import {useAuth} from "@/hooks/useAuth"
import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Checkbox} from "@/components/ui/checkbox"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {Skeleton} from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {AlertCircle, Calendar, CheckCircle, Clock, Download, History, Loader2, X} from "lucide-react"

interface Volunteer {
    id: string
    name: string
}

interface Reservation {
    id: string
    reserved_by_name: string
    start_time: string
    end_time: string
    reason: string | null
    send_email_notification: boolean
    additional_volunteers?: string[]
    additional_volunteers_details?: Volunteer[]
    created_at: string
    status: 'pending' | 'approved' | 'rejected'
}

export default function BoardPage() {
    const router = useRouter()
    const {user, loading: authLoading} = useAuth()
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [cancellingReservation, setCancellingReservation] = useState<Reservation | null>(null)
    const [sendNotification, setSendNotification] = useState(true)
    const [cancellationReason, setCancellationReason] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [showPastReservations, setShowPastReservations] = useState(false)

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login')
        }
    }, [authLoading, user, router])

    useEffect(() => {
        if (user) {
            fetchAllReservations()
        }
    }, [user])

    const fetchAllReservations = async () => {
        try {
            setLoading(true)

            // Fetch all reservations
            const response = await fetch('/api/office-reservation/all')
            if (response.ok) {
                const data = await response.json()
                const all = data.reservations || []

                // Only show approved (active) reservations
                setReservations(all.filter((r: Reservation) => r.status === 'approved'))
            }
        } catch (error) {
            console.error('Error fetching reservations:', error)
            setMessage({type: 'error', text: 'Failed to load reservations'})
        } finally {
            setLoading(false)
        }
    }

    const handleCancelClick = (reservation: Reservation) => {
        setCancellingReservation(reservation)
        setSendNotification(true)
        setCancellationReason('')
        setShowCancelDialog(true)
    }

    const handleCancelConfirm = async () => {
        if (!cancellingReservation) return

        try {
            setProcessingId(cancellingReservation.id)
            setMessage(null)

            const response = await fetch(`/api/admin/reservations?id=${cancellingReservation.id}&action=cancel`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    send_notification: sendNotification,
                    cancellation_reason: cancellationReason
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to cancel reservation')
            }

            setMessage({
                type: 'success',
                text: `Reservation cancelled successfully!${sendNotification ? ' Notifications sent.' : ''}`
            })

            setShowCancelDialog(false)
            setCancellingReservation(null)
            setSendNotification(true)
            setCancellationReason('')
            await fetchAllReservations()
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to cancel reservation'
            })
        } finally {
            setProcessingId(null)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    const getDuration = (start: string, end: string) => {
        const startDate = new Date(start)
        const endDate = new Date(end)
        const diffMs = endDate.getTime() - startDate.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        if (diffHours === 0) return `${diffMinutes}m`
        if (diffMinutes === 0) return `${diffHours}h`
        return `${diffHours}h ${diffMinutes}m`
    }

    // Calendar helper functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        return {daysInMonth, startingDayOfWeek, year, month}
    }

    const isSameDay = (date1: Date, date2: Date) => {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
    }

    const getReservationsForDay = (day: Date) => {
        return reservations.filter(r => isSameDay(new Date(r.start_time), day))
    }


    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    const goToToday = () => {
        setCurrentMonth(new Date())
    }

    const isPastReservation = (reservation: Reservation) => {
        const endTime = new Date(reservation.end_time)
        const now = new Date()
        return endTime < now
    }

    // Filter reservations based on past/upcoming toggle
    const filteredReservations = useMemo(() => {
        return reservations.filter(r =>
            showPastReservations ? isPastReservation(r) : !isPastReservation(r)
        )
    }, [reservations, showPastReservations])

    const exportToCSV = () => {
        const allReservations = reservations

        // CSV headers
        const headers = ['Name', 'Date', 'Start Time', 'End Time', 'Duration', 'Reason', 'Status', 'Additional Volunteers', 'Submitted']

        // CSV rows
        const rows = allReservations.map(r => [
            r.reserved_by_name,
            formatDate(r.start_time),
            formatTime(r.start_time),
            formatTime(r.end_time),
            getDuration(r.start_time, r.end_time),
            r.reason || '',
            r.status,
            r.additional_volunteers?.length || 0,
            formatDate(r.created_at)
        ])

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        // Create download
        const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'})
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `office-reservations-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }


    // Skeleton components
    const CalendarSkeleton = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-48"/>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24"/>
                    <Skeleton className="h-9 w-20"/>
                    <Skeleton className="h-9 w-20"/>
                </div>
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-4 w-20"/>
                <Skeleton className="h-4 w-24"/>
                <Skeleton className="h-4 w-20"/>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-muted">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {Array.from({length: 35}).map((_, i) => (
                        <div key={i} className="min-h-24 border p-2 border-border">
                            <Skeleton className="h-4 w-6 mb-2"/>
                            <div className="space-y-1">
                                {i % 5 === 0 && <Skeleton className="h-6 w-full"/>}
                                {i % 7 === 0 && <Skeleton className="h-6 w-full"/>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    const ReservationCardSkeleton = () => (
        <Card className="border">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-48"/>
                        <Skeleton className="h-4 w-36"/>
                    </div>
                    <Skeleton className="h-6 w-20"/>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12"/>
                        <Skeleton className="h-5 w-32"/>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12"/>
                        <Skeleton className="h-5 w-40"/>
                    </div>
                </div>

                <div className="space-y-2 mb-6 pb-6 border-b">
                    <Skeleton className="h-3 w-16"/>
                    <Skeleton className="h-4 w-full"/>
                    <Skeleton className="h-4 w-3/4"/>
                </div>

                <div className="flex gap-3">
                    <Skeleton className="h-10 flex-1"/>
                    <Skeleton className="h-10 flex-1"/>
                </div>
            </CardContent>
        </Card>
    )

    const renderCalendarView = () => {
        const {daysInMonth, startingDayOfWeek, year, month} = getDaysInMonth(currentMonth)
        const monthName = currentMonth.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
        const today = new Date()

        const days = []
        // Add empty cells for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-24 border border-transparent"/>)
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day)
            const reservations = getReservationsForDay(currentDate)
            const isToday = isSameDay(currentDate, today)

            days.push(
                <div
                    key={day}
                    className={`min-h-24 border p-2 ${isToday ? 'bg-primary/5 border-primary/30' : 'border-border'} hover:bg-muted/50 transition-colors`}
                >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {day}
                    </div>
                    <div className="space-y-1">
                        {reservations.map(reservation => (
                            <button
                                key={reservation.id}
                                onClick={() => {
                                    setSelectedReservation(reservation)
                                    setShowDetailDialog(true)
                                }}
                                className="w-full text-left text-xs px-2 py-1 rounded truncate bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors"
                            >
                                {formatTime(reservation.start_time)} {reservation.reserved_by_name}
                            </button>
                        ))}
                    </div>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                {/* Calendar Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{monthName}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={previousMonth}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={nextMonth}>
                            Next
                        </Button>
                    </div>
                </div>


                {/* Calendar Grid */}
                <div className="border rounded-lg overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 bg-muted">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>
                    {/* Calendar days */}
                    <div className="grid grid-cols-7">
                        {days}
                    </div>
                </div>
            </div>
        )
    }

    const renderReservationCard = (reservation: Reservation) => {
        const isPast = isPastReservation(reservation)

        return (
            <Card key={reservation.id}
                  className="border hover:border-muted-foreground/30 transition-colors">
                <CardContent className="p-6">

                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">
                                {reservation.reserved_by_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Submitted {formatDate(reservation.created_at)}
                            </p>
                        </div>
                    </div>

                    {/* Grid Layout for Details */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                        {/* Date */}
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</p>
                            <p className="text-sm font-medium">{formatDate(reservation.start_time)}</p>
                        </div>

                        {/* Time */}
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</p>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}</p>
                                <span
                                    className="text-xs text-muted-foreground">({getDuration(reservation.start_time, reservation.end_time)})</span>
                            </div>
                        </div>

                        {/* Volunteers */}
                        {reservation.additional_volunteers_details && reservation.additional_volunteers_details.length > 0 && (
                            <div className="space-y-1 col-span-2">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                    Additional Volunteers ({reservation.additional_volunteers_details.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {reservation.additional_volunteers_details.map((volunteer) => (
                                        <Badge
                                            key={volunteer.id}
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 cursor-pointer hover:bg-secondary/80 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/profile?userId=${volunteer.id}`)
                                            }}
                                        >
                                            {volunteer.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reason - Full Width */}
                    {reservation.reason && (
                        <div className="space-y-1 mb-6 pb-6 border-b">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Reason</p>
                            <p className="text-sm leading-relaxed">{reservation.reason}</p>
                        </div>
                    )}

                    {/* Cancel Button */}
                    {!isPast && (
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleCancelClick(reservation)}
                            disabled={processingId === reservation.id}
                        >
                            {processingId === reservation.id ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <X className="h-4 w-4 mr-2"/>
                                    Cancel Reservation
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        )
    }

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader/>

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Calendar className="h-8 w-8 text-primary"/>
                            Office Reservations
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            View and manage all office reservations
                        </p>
                    </div>
                    <Button onClick={exportToCSV} variant="outline" className="gap-2">
                        <Download className="h-4 w-4"/>
                        Export CSV
                    </Button>
                </div>

                {/* Message Alert */}
                {message && (
                    <Alert
                        className={`mb-6 ${message.type === 'success' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'}`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-primary"/>
                        ) : (
                            <AlertCircle className="h-4 w-4 text-destructive"/>
                        )}
                        <AlertDescription className={message.type === 'success' ? 'text-primary' : 'text-destructive'}>
                            {message.text}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Analytics Dashboard */}
                {/*{!loading && (*/}
                {/*    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">*/}
                {/*        /!* This Month *!/*/}
                {/*        <Card>*/}
                {/*            <CardContent className="p-6">*/}
                {/*                <div className="flex items-center justify-between">*/}
                {/*                    <div>*/}
                {/*                        <p className="text-sm text-muted-foreground">This Month</p>*/}
                {/*                        <p className="text-3xl font-bold mt-1">{analytics.totalThisMonth}</p>*/}
                {/*                        <p className="text-xs text-muted-foreground mt-1">reservations</p>*/}
                {/*                    </div>*/}
                {/*                    <Calendar className="h-8 w-8 text-muted-foreground opacity-50"/>*/}
                {/*                </div>*/}
                {/*            </CardContent>*/}
                {/*        </Card>*/}
                
                {/*        /!* Approval Rate *!/*/}
                {/*        <Card>*/}
                {/*            <CardContent className="p-6">*/}
                {/*                <div className="flex items-center justify-between">*/}
                {/*                    <div>*/}
                {/*                        <p className="text-sm text-muted-foreground">Approval Rate</p>*/}
                {/*                        <p className="text-3xl font-bold mt-1">{analytics.approvalRate}%</p>*/}
                {/*                        <p className="text-xs text-muted-foreground mt-1">*/}
                {/*                            {analytics.approvedCount} approved, {analytics.rejectedCount} rejected*/}
                {/*                        </p>*/}
                {/*                    </div>*/}
                {/*                    <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50"/>*/}
                {/*                </div>*/}
                {/*            </CardContent>*/}
                {/*        </Card>*/}
                
                {/*        /!* Most Active Volunteer *!/*/}
                {/*        <Card>*/}
                {/*            <CardContent className="p-6">*/}
                {/*                <div className="flex items-center justify-between">*/}
                {/*                    <div>*/}
                {/*                        <p className="text-sm text-muted-foreground">Most Active</p>*/}
                {/*                        <p className="text-lg font-semibold mt-1 truncate">{analytics.mostActiveVolunteer}</p>*/}
                {/*                        <p className="text-xs text-muted-foreground mt-1">volunteer</p>*/}
                {/*                    </div>*/}
                {/*                    <Award className="h-8 w-8 text-muted-foreground opacity-50"/>*/}
                {/*                </div>*/}
                {/*            </CardContent>*/}
                {/*        </Card>*/}
                
                {/*        /!* Office Utilization *!/*/}
                {/*        <Card>*/}
                {/*            <CardContent className="p-6">*/}
                {/*                <div className="flex items-center justify-between">*/}
                {/*                    <div>*/}
                {/*                        <p className="text-sm text-muted-foreground">Hours Booked</p>*/}
                {/*                        <p className="text-3xl font-bold mt-1">{analytics.hoursBooked}</p>*/}
                {/*                        <p className="text-xs text-muted-foreground mt-1">this month</p>*/}
                {/*                    </div>*/}
                {/*                    <BarChart3 className="h-8 w-8 text-muted-foreground opacity-50"/>*/}
                {/*                </div>*/}
                {/*            </CardContent>*/}
                {/*        </Card>*/}
                {/*    </div>*/}
                {/*)}*/}

                {/* Calendar View */}
                <div className="mb-8">
                    {loading ? <CalendarSkeleton/> : renderCalendarView()}
                </div>

                {/* Past/Upcoming Toggle */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={!showPastReservations ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowPastReservations(false)}
                        >
                            <Clock className="h-4 w-4 mr-2"/>
                            Upcoming
                        </Button>
                        <Button
                            variant={showPastReservations ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowPastReservations(true)}
                        >
                            <History className="h-4 w-4 mr-2"/>
                            Past
                        </Button>
                    </div>
                </div>

                {/* All Reservations */}
                {loading ? (
                    <div className="space-y-3">
                        <ReservationCardSkeleton/>
                        <ReservationCardSkeleton/>
                        <ReservationCardSkeleton/>
                    </div>
                ) : filteredReservations.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground"/>
                            <p className="text-muted-foreground">
                                No {showPastReservations ? 'past' : 'upcoming'} reservations
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredReservations.map(r => renderReservationCard(r))}
                    </div>
                )}
            </div>

            {/* Cancel Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <X className="h-5 w-5 text-destructive"/>
                            Cancel Reservation
                        </DialogTitle>
                        <DialogDescription>
                            Cancel this reservation and optionally notify volunteers
                        </DialogDescription>
                    </DialogHeader>

                    {cancellingReservation && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <p className="font-semibold">{cancellingReservation.reserved_by_name}</p>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div>{formatDate(cancellingReservation.start_time)}</div>
                                    <div>{formatTime(cancellingReservation.start_time)} - {formatTime(cancellingReservation.end_time)}</div>
                                    {cancellingReservation.reason && (
                                        <div className="mt-2">
                                            <strong>Reason:</strong> {cancellingReservation.reason}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cancellation-reason" className="text-sm font-medium">
                                    Cancellation Reason (Optional)
                                </Label>
                                <Textarea
                                    id="cancellation-reason"
                                    placeholder="Why is this reservation being cancelled?"
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    rows={3}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This reason will be sent to the volunteer who made the reservation
                                </p>
                            </div>

                            <div className="flex items-start space-x-3 p-4 border rounded-lg">
                                <Checkbox
                                    id="send-notification"
                                    checked={sendNotification}
                                    onCheckedChange={(checked) => setSendNotification(checked === true)}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label
                                        htmlFor="send-notification"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Send email notification
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Notify all assigned volunteers about this cancellation
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCancelDialog(false)
                                setCancellingReservation(null)
                                setSendNotification(true)
                                setCancellationReason('')
                            }}
                            disabled={processingId !== null}
                        >
                            Keep Reservation
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelConfirm}
                            disabled={processingId !== null}
                        >
                            {processingId !== null ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <X className="h-4 w-4 mr-2"/>
                                    Cancel Reservation
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog for Calendar View */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5"/>
                            Reservation Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedReservation && (
                        <div className="space-y-4">

                            {/* Details Grid */}
                            <div className="space-y-3 border-t pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Reserved
                                            by</p>
                                        <p className="text-sm font-medium">{selectedReservation.reserved_by_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Duration</p>
                                        <p className="text-sm font-medium">{getDuration(selectedReservation.start_time, selectedReservation.end_time)}</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Date</p>
                                    <p className="text-sm font-medium">{formatDate(selectedReservation.start_time)}</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Time</p>
                                    <p className="text-sm font-medium">
                                        {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}
                                    </p>
                                </div>

                                {selectedReservation.reason && (
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Reason</p>
                                        <p className="text-sm leading-relaxed">{selectedReservation.reason}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                        Additional Volunteers
                                        {selectedReservation.additional_volunteers_details && selectedReservation.additional_volunteers_details.length > 0 &&
                                            ` (${selectedReservation.additional_volunteers_details.length})`
                                        }
                                    </p>
                                    {selectedReservation.additional_volunteers_details && selectedReservation.additional_volunteers_details.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedReservation.additional_volunteers_details.map((volunteer) => (
                                                <Badge
                                                    key={volunteer.id}
                                                    variant="secondary"
                                                    className="text-xs px-2 py-0.5 cursor-pointer hover:bg-secondary/80 transition-colors"
                                                    onClick={() => {
                                                        setShowDetailDialog(false)
                                                        router.push(`/profile?userId=${volunteer.id}`)
                                                    }}
                                                >
                                                    {volunteer.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No additional volunteers</p>
                                    )}
                                </div>

                                <div className="space-y-1 pt-2 border-t">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Submitted</p>
                                    <p className="text-sm">{formatDate(selectedReservation.created_at)}</p>
                                </div>
                            </div>

                            {/* Cancel Button */}
                            {!isPastReservation(selectedReservation) && (
                                <div className="pt-2 border-t">
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => {
                                            setShowDetailDialog(false)
                                            handleCancelClick(selectedReservation)
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-2"/>
                                        Cancel Reservation
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDetailDialog(false)
                                setSelectedReservation(null)
                            }}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
