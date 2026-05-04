"use client"

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {
    AlertCircle,
    Calendar,
    Clock,
    Edit,
    FileText,
    History,
    Loader2,
    Mail,
    Search,
    Send,
    Trash2,
    Users,
    X
} from "lucide-react"
import {useUserReservations, type UserReservation} from "@/hooks/useUserReservations"
import {forwardRef, useEffect, useImperativeHandle, useState} from "react"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {Switch} from "@/components/ui/switch"
import {Checkbox} from "@/components/ui/checkbox"
import {Input} from "@/components/ui/input"
import {supabaseClient} from "@/lib/auth-client"

interface MyReservationsProps {
    userId?: string
}

export interface MyReservationsRef {
    refetch: () => Promise<void>
}

export const MyReservations = forwardRef<MyReservationsRef, MyReservationsProps>(({userId}, ref) => {
    const {reservations, loading, refetch} = useUserReservations(userId)

    useImperativeHandle(ref, () => ({
        refetch
    }))

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [reservationToDelete, setReservationToDelete] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteSendEmailNotification, setDeleteSendEmailNotification] = useState(false)

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [reservationToEdit, setReservationToEdit] = useState<UserReservation | null>(null)
    const [editDate, setEditDate] = useState("")
    const [editStartTime, setEditStartTime] = useState("")
    const [editEndTime, setEditEndTime] = useState("")
    const [editReason, setEditReason] = useState("")
    const [editSendEmailNotification, setEditSendEmailNotification] = useState(false)
    const [updatingReservation, setUpdatingReservation] = useState(false)

    // Volunteer selector state for edit modal
    const [editSelectedVolunteers, setEditSelectedVolunteers] = useState<string[]>([])
    const [editShowVolunteerSelector, setEditShowVolunteerSelector] = useState(false)
    const [editVolunteerSearchQuery, setEditVolunteerSearchQuery] = useState("")
    const [allVolunteers, setAllVolunteers] = useState<{ id: string; name: string; email: string }[]>([])

    // Detail view modal state
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [reservationToView, setReservationToView] = useState<UserReservation | null>(null)

    // Request approval state
    const [requestingApproval, setRequestingApproval] = useState<string | null>(null)

    const [error, setError] = useState<string | null>(null)

    // Fetch all volunteers when edit modal is opened
    useEffect(() => {
        const fetchAllVolunteers = async () => {
            try {
                const { data, error } = await supabaseClient
                    .from('volunteers')
                    .select('id, name, email')
                    .neq('id', reservationToEdit?.reserved_by_id ?? '')
                    .order('name')

                if (error) throw error
                setAllVolunteers(data || [])
            } catch (error) {
                console.error('Error fetching volunteers:', error)
            }
        }

        if (editModalOpen && reservationToEdit) {
            fetchAllVolunteers()
        }
    }, [editModalOpen, reservationToEdit])

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', {
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
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        if (diffHours > 0) {
            return `${diffHours}h ${diffMins > 0 ? `${diffMins}m` : ''}`
        }
        return `${diffMins}m`
    }

    const isUpcoming = (dateString: string) => {
        return new Date(dateString) > new Date()
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

    const openDeleteModal = (id: string) => {
        setReservationToDelete(id)
        setDeleteSendEmailNotification(false)
        setDeleteModalOpen(true)
        setError(null)
    }

    const handleCancelReservation = async () => {
        if (!reservationToDelete) return

        setDeletingId(reservationToDelete)
        setError(null)

        try {
            const response = await fetch(`/api/office-reservation?id=${reservationToDelete}&send_email_notification=${deleteSendEmailNotification}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to cancel reservation')
            }

            await refetch()
            setDeleteModalOpen(false)
            setReservationToDelete(null)
            setDeleteSendEmailNotification(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel reservation')
        } finally {
            setDeletingId(null)
        }
    }

    const handleRequestApproval = async (reservationId: string) => {
        setRequestingApproval(reservationId)
        setError(null)

        try {
            const response = await fetch(`/api/office-reservation/request-approval?id=${reservationId}`, {
                method: 'POST'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to send approval request')
            }

            // Show success message or notification
            alert('Approval request sent successfully to board members!')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send approval request')
            alert('Failed to send approval request. Please try again.')
        } finally {
            setRequestingApproval(null)
        }
    }

    const openDetailModal = (reservation: UserReservation) => {
        setReservationToView(reservation)
        setDetailModalOpen(true)
    }

    const openEditModal = (reservation: UserReservation) => {
        setReservationToEdit(reservation)
        const startDate = new Date(reservation.start_time)
        const endDate = new Date(reservation.end_time)
        const localDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
        setEditDate(localDateStr)
        setEditStartTime(startDate.toTimeString().slice(0, 5))
        setEditEndTime(endDate.toTimeString().slice(0, 5))
        setEditReason(reservation.reason || "")
        setEditSendEmailNotification(false)
        setEditSelectedVolunteers(reservation.additional_volunteers || [])
        setEditShowVolunteerSelector(false)
        setEditVolunteerSearchQuery("")
        setEditModalOpen(true)
        setError(null)
    }

    const handleUpdateReservation = async () => {
        if (!reservationToEdit || !editDate || !editStartTime || !editEndTime) {
            setError('Please fill in all required fields')
            return
        }

        setUpdatingReservation(true)
        setError(null)

        try {
            const startDateTime = `${editDate}T${editStartTime}:00`
            const endDateTime = `${editDate}T${editEndTime}:00`

            if (new Date(endDateTime) <= new Date(startDateTime)) {
                setError('End time must be after start time')
                setUpdatingReservation(false)
                return
            }

            const response = await fetch(`/api/office-reservation?id=${reservationToEdit.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reserved_by_id: reservationToEdit.reserved_by_id,
                    reserved_by_name: reservationToEdit.reserved_by_name,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    reason: editReason,
                    send_email_notification: editSendEmailNotification,
                    additional_volunteers: editSelectedVolunteers.length > 0 ? editSelectedVolunteers : null,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update reservation')
            }

            await refetch()
            setEditModalOpen(false)
            setReservationToEdit(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update reservation')
        } finally {
            setUpdatingReservation(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </CardContent>
            </Card>
        )
    }

    // Filter for upcoming and past reservations
    const upcomingReservations = reservations.filter(r => isUpcoming(r.start_time))
    const pastReservations = reservations.filter(r => !isUpcoming(r.start_time))

    return (
        <div className="space-y-6">
            {error && (
                <Alert variant="destructive" className="border">
                    <AlertCircle className="h-4 w-4"/>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Upcoming Reservations */}
            <Card className="border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5"/>
                        <p>My Reservations</p>
                        {upcomingReservations.length > 0 && (
                            <Badge>{upcomingReservations.length}</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        View and manage your office reservations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingReservations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="p-4 rounded-full bg-muted inline-block mb-4">
                                <Calendar className="h-12 w-12 text-muted-foreground"/>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                                No upcoming reservations
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingReservations.map(reservation => (
                                <div
                                    key={reservation.id}
                                    className="p-5 border rounded-lg hover:border-primary transition cursor-pointer"
                                    onClick={() => openDetailModal(reservation)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {isToday(reservation.start_time) && (
                                                    <Badge className="bg-primary shadow-md font-semibold">Today</Badge>
                                                )}
                                                {isTomorrow(reservation.start_time) && (
                                                    <Badge
                                                        className="bg-primary/80 shadow-md font-semibold">Tomorrow</Badge>
                                                )}
                                                {!isToday(reservation.start_time) && !isTomorrow(reservation.start_time) && (
                                                    <Badge variant="outline"
                                                           className="border font-semibold">{formatDate(reservation.start_time)}</Badge>
                                                )}
                                                {/* Status Badge */}
                                                {reservation.status === 'pending' && (
                                                    <Badge variant="outline" className="bg-secondary/10 border-secondary/20 text-secondary-foreground">
                                                        Pending
                                                    </Badge>
                                                )}
                                                {reservation.status === 'approved' && (
                                                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                                                        ✓ Approved
                                                    </Badge>
                                                )}
                                                {reservation.status === 'rejected' && (
                                                    <Badge variant="outline" className="bg-destructive/10 border-destructive/20 text-destructive">
                                                        Rejected
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-primary/10">
                                                    <Clock className="h-4 w-4 text-primary"/>
                                                </div>
                                                <span className="font-bold text-sm">
                          {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                        </span>
                                                <span className="text-sm text-muted-foreground font-medium">
                          ({getDuration(reservation.start_time, reservation.end_time)})
                        </span>
                                            </div>

                                            {reservation.reason && (
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-primary/10">
                                                        <FileText className="h-4 w-4 text-primary"/>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {reservation.reason}
                                                    </span>
                                                </div>
                                            )}

                                            {reservation.additional_volunteers && reservation.additional_volunteers.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-primary/10">
                                                        <Users className="h-4 w-4 text-primary"/>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        +{reservation.additional_volunteers.length} volunteer{reservation.additional_volunteers.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {/* Request Approval button for pending reservations */}
                                            {reservation.status === 'pending' && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleRequestApproval(reservation.id)}
                                                    disabled={requestingApproval === reservation.id}
                                                    className="w-full"
                                                >
                                                    {requestingApproval === reservation.id ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                                            Sending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="h-4 w-4 mr-2"/>
                                                            Request Approval
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditModal(reservation)}
                                                    className="hover:bg-primary/10 hover:border-primary transition-all flex-1"
                                                >
                                                    <Edit className="h-4 w-4 mr-2"/>
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDeleteModal(reservation.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border hover:border-destructive/50 transition-all flex-1"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2"/>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Past Reservations */}
            {pastReservations.length > 0 && (
                <Card className="border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5"/>
                            <p>Past Reservations</p>
                            <Badge variant="outline">{pastReservations.length}</Badge>
                        </CardTitle>
                        <CardDescription>
                            Your previous office reservations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {pastReservations.map(reservation => (
                                <div
                                    key={reservation.id}
                                    className="p-5 border rounded-lg opacity-60 cursor-pointer hover:opacity-100 transition"
                                    onClick={() => openDetailModal(reservation)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline"
                                                       className="border font-semibold">{formatDate(reservation.start_time)}</Badge>
                                                {/* Status Badge */}
                                                {reservation.status === 'pending' && (
                                                    <Badge variant="outline" className="bg-secondary/10 border-secondary/20 text-secondary-foreground">
                                                        Pending
                                                    </Badge>
                                                )}
                                                {reservation.status === 'approved' && (
                                                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                                                        ✓ Approved
                                                    </Badge>
                                                )}
                                                {reservation.status === 'rejected' && (
                                                    <Badge variant="outline" className="bg-destructive/10 border-destructive/20 text-destructive">
                                                        Rejected
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-muted">
                                                    <Clock className="h-4 w-4 text-muted-foreground"/>
                                                </div>
                                                <span className="font-bold text-sm">
                                                    {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                                </span>
                                                <span className="text-sm text-muted-foreground font-medium">
                                                    ({getDuration(reservation.start_time, reservation.end_time)})
                                                </span>
                                            </div>

                                            {reservation.reason && (
                                                <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-lg border">
                                                    {reservation.reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Reservation</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this reservation? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <Label htmlFor="delete-email-notification" className="text-sm cursor-pointer">
                                    Send Email Notification
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Notify you and all assigned volunteers about this cancellation
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="delete-email-notification"
                            checked={deleteSendEmailNotification}
                            onCheckedChange={setDeleteSendEmailNotification}
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive" className="border">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteModalOpen(false)
                                setReservationToDelete(null)
                                setDeleteSendEmailNotification(false)
                                setError(null)
                            }}
                            disabled={deletingId !== null}
                        >
                            Keep Reservation
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelReservation}
                            disabled={deletingId !== null}
                        >
                            {deletingId ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2"/>
                                    Cancel Reservation
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Reservation Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Reservation</DialogTitle>
                        <DialogDescription>
                            Update the time and details for your reservation
                        </DialogDescription>
                    </DialogHeader>

                    {reservationToEdit && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-date" className="text-sm flex items-center gap-2">
                                    <Calendar className="h-4 w-4"/>
                                    Date
                                </Label>
                                <input
                                    id="edit-date"
                                    type="date"
                                    value={editDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full p-2 border rounded-lg bg-background hover:border-primary/50 focus:border-primary transition-all text-sm [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-start-time" className="text-sm flex items-center gap-2">
                                        <Clock className="h-4 w-4"/>
                                        Start Time (24h)
                                    </Label>
                                    <input
                                        id="edit-start-time"
                                        type="time"
                                        value={editStartTime}
                                        onChange={(e) => setEditStartTime(e.target.value)}
                                        className="w-full p-2 border rounded-lg bg-background hover:border-primary/50 focus:border-primary transition-all text-sm [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                        step="3600"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-end-time" className="text-sm flex items-center gap-2">
                                        <Clock className="h-4 w-4"/>
                                        End Time (24h)
                                    </Label>
                                    <input
                                        id="edit-end-time"
                                        type="time"
                                        value={editEndTime}
                                        onChange={(e) => setEditEndTime(e.target.value)}
                                        className="w-full p-2 border rounded-lg bg-background hover:border-primary/50 focus:border-primary transition-all text-sm [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                        step="3600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-reason" className="text-sm">Reason (Optional)</Label>
                                <Textarea
                                    id="edit-reason"
                                    placeholder="e.g., Board meeting, Team event, Training session"
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    rows={3}
                                    className="resize-none text-sm"
                                />
                            </div>

                            {/* Additional Volunteers */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Additional Volunteers (Optional)</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditShowVolunteerSelector(!editShowVolunteerSelector)
                                            if (editShowVolunteerSelector) {
                                                setEditVolunteerSearchQuery("")
                                            }
                                        }}
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        {editSelectedVolunteers.length > 0 ? `${editSelectedVolunteers.length} selected` : 'Add volunteers'}
                                    </Button>
                                </div>
                                {editShowVolunteerSelector && (
                                    <div className="border rounded-lg p-3 space-y-3">
                                        {/* Search Input */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Search volunteers..."
                                                value={editVolunteerSearchQuery}
                                                onChange={(e) => setEditVolunteerSearchQuery(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>

                                        {/* Volunteer List */}
                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {allVolunteers.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-2">Loading volunteers...</p>
                                            ) : (() => {
                                                const filteredVolunteers = allVolunteers.filter((v) =>
                                                    v.name.toLowerCase().includes(editVolunteerSearchQuery.toLowerCase()) ||
                                                    v.email.toLowerCase().includes(editVolunteerSearchQuery.toLowerCase())
                                                )

                                                if (filteredVolunteers.length === 0) {
                                                    return (
                                                        <p className="text-xs text-muted-foreground text-center py-4">
                                                            No volunteers found matching &quot;{editVolunteerSearchQuery}&quot;
                                                        </p>
                                                    )
                                                }

                                                return filteredVolunteers.map((v) => (
                                                    <div key={v.id} className="flex items-center gap-3">
                                                        <Checkbox
                                                            id={`edit-${v.id}`}
                                                            checked={editSelectedVolunteers.includes(v.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setEditSelectedVolunteers([...editSelectedVolunteers, v.id])
                                                                } else {
                                                                    setEditSelectedVolunteers(editSelectedVolunteers.filter(id => id !== v.id))
                                                                }
                                                            }}
                                                        />
                                                        <label htmlFor={`edit-${v.id}`} className="text-sm cursor-pointer flex-1">
                                                            {v.name}
                                                        </label>
                                                    </div>
                                                ))
                                            })()}
                                        </div>
                                    </div>
                                )}
                                {editSelectedVolunteers.length > 0 && !editShowVolunteerSelector && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {editSelectedVolunteers.map((id) => {
                                            const volunteer = allVolunteers.find(v => v.id === id)
                                            return volunteer ? (
                                                <Badge key={id} variant="secondary" className="text-xs pl-2 pr-1 py-1 flex items-center gap-1.5">
                                                    {volunteer.name}
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditSelectedVolunteers(editSelectedVolunteers.filter(vid => vid !== id))}
                                                        className="hover:bg-secondary/80 rounded-sm p-0.5 transition-colors"
                                                        title="Remove volunteer"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ) : null
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <Label htmlFor="edit-email-notification" className="text-sm cursor-pointer">
                                        Send Email Notification
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Notify you and all assigned volunteers about this update
                                    </p>
                                </div>
                                <Switch
                                    id="edit-email-notification"
                                    checked={editSendEmailNotification}
                                    onCheckedChange={setEditSendEmailNotification}
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive" className="border">
                                    <AlertCircle className="h-4 w-4"/>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditModalOpen(false)
                                setReservationToEdit(null)
                                setError(null)
                            }}
                            disabled={updatingReservation}
                        >
                            <X className="h-4 w-4 mr-2"/>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateReservation}
                            disabled={updatingReservation || !editDate || !editStartTime || !editEndTime}
                        >
                            {updatingReservation ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Edit className="h-4 w-4 mr-2"/>
                                    Update Reservation
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail View Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary"/>
                            Reservation Details
                        </DialogTitle>
                        <DialogDescription>
                            View complete information about this reservation
                        </DialogDescription>
                    </DialogHeader>

                    {reservationToView && (
                        <div className="space-y-4">
                            {/* Status Badge */}
                            <div className="flex items-center">
                                {reservationToView.status === 'pending' && (
                                    <Badge variant="outline" className="bg-secondary/10 border-secondary/20 text-secondary-foreground text-xs px-2 py-1">
                                        Pending Approval
                                    </Badge>
                                )}
                                {reservationToView.status === 'approved' && (
                                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-xs px-2 py-1">
                                        Approved
                                    </Badge>
                                )}
                                {reservationToView.status === 'rejected' && (
                                    <Badge variant="outline" className="bg-destructive/10 border-destructive/20 text-destructive text-xs px-2 py-1">
                                        Rejected
                                    </Badge>
                                )}
                            </div>

                            {/* Date */}
                            <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-primary/10">
                                        <Calendar className="h-5 w-5 text-primary"/>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Date</p>
                                        <p className="font-semibold">{formatDate(reservationToView.start_time)}</p>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-primary/10">
                                        <Clock className="h-5 w-5 text-primary"/>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Time</p>
                                        <p className="font-semibold">
                                            {formatTime(reservationToView.start_time)} - {formatTime(reservationToView.end_time)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Duration: {getDuration(reservationToView.start_time, reservationToView.end_time)}
                                        </p>
                                    </div>
                                </div>

                                {/* Reason */}
                                {reservationToView.reason && (
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-md bg-primary/10">
                                            <FileText className="h-5 w-5 text-primary"/>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">Reason</p>
                                            <p className="text-sm">{reservationToView.reason}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Additional Volunteers */}
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-md bg-primary/10">
                                        <Users className="h-5 w-5 text-primary"/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">
                                            Additional Volunteers
                                            {reservationToView.additional_volunteers_details && reservationToView.additional_volunteers_details.length > 0 &&
                                                ` (${reservationToView.additional_volunteers_details.length})`
                                            }
                                        </p>
                                        {reservationToView.additional_volunteers_details && reservationToView.additional_volunteers_details.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {reservationToView.additional_volunteers_details.map((volunteer: { id: string; name: string }) => (
                                                    <Badge
                                                        key={volunteer.id}
                                                        variant="secondary"
                                                        className="text-xs px-2 py-0.5 cursor-pointer hover:bg-secondary/80 transition-colors"
                                                        onClick={() => {
                                                            setDetailModalOpen(false)
                                                            window.location.href = `/profile?userId=${volunteer.id}`
                                                        }}
                                                    >
                                                        {volunteer.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No additional
                                                volunteers</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
                                <p>Created: {new Date(reservationToView.created_at).toLocaleString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                })}</p>
                                {reservationToView.updated_at && reservationToView.updated_at !== reservationToView.created_at && (
                                    <p>Last updated: {new Date(reservationToView.updated_at).toLocaleString('en-US', {
                                        weekday: 'short',
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    })}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="sm:justify-between">
                        {reservationToView && isUpcoming(reservationToView.start_time) && (
                            <div className="flex flex-col gap-2 w-full">
                                {/* Request Approval button for pending reservations */}
                                {reservationToView.status === 'pending' && (
                                    <Button
                                        variant="default"
                                        onClick={() => handleRequestApproval(reservationToView.id)}
                                        disabled={requestingApproval === reservationToView.id}
                                        className="w-full"
                                    >
                                        {requestingApproval === reservationToView.id ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2"/>
                                                Request Approval
                                            </>
                                        )}
                                    </Button>
                                )}

                                <div className="flex gap-2 w-full">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setDetailModalOpen(false)
                                            openEditModal(reservationToView)
                                        }}
                                        className="flex-1"
                                    >
                                        <Edit className="h-4 w-4 mr-2"/>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            setDetailModalOpen(false)
                                            openDeleteModal(reservationToView.id)
                                        }}
                                        className="flex-1"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2"/>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                        {reservationToView && !isUpcoming(reservationToView.start_time) && (
                            <Button
                                variant="outline"
                                onClick={() => setDetailModalOpen(false)}
                                className="w-full"
                            >
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
})

MyReservations.displayName = 'MyReservations'
