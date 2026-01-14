"use client"

import {useState} from "react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import {Label} from "@/components/ui/label"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {Switch} from "@/components/ui/switch"
import {Calendar, Loader2, AlertCircle, CheckCircle, Mail} from "lucide-react"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {useAuth} from "@/hooks/useAuth"

export function OfficeReservationCard() {
    const {user, volunteer} = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Form state
    const [startDate, setStartDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endDate, setEndDate] = useState("")
    const [endTime, setEndTime] = useState("")
    const [reason, setReason] = useState("")
    const [sendEmailNotification, setSendEmailNotification] = useState(false)

    const resetForm = () => {
        setStartDate("")
        setStartTime("")
        setEndDate("")
        setEndTime("")
        setReason("")
        setSendEmailNotification(false)
        setMessage(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            // Validate inputs
            if (!startDate || !startTime || !endDate || !endTime) {
                setMessage({type: 'error', text: 'Please fill in all date and time fields'})
                setLoading(false)
                return
            }

            // Combine date and time
            const start_time = `${startDate}T${startTime}:00`
            const end_time = `${endDate}T${endTime}:00`

            // Check if end time is after start time
            if (new Date(end_time) <= new Date(start_time)) {
                setMessage({type: 'error', text: 'End time must be after start time'})
                setLoading(false)
                return
            }

            const response = await fetch('/api/office-reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reserved_by_id: user?.id,
                    reserved_by_name: volunteer?.name || 'Unknown',
                    start_time,
                    end_time,
                    reason,
                    send_email_notification: sendEmailNotification
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 409) {
                    setMessage({
                        type: 'error',
                        text: `Time slot already reserved. Conflicts with existing reservation.`
                    })
                } else {
                    setMessage({type: 'error', text: data.error || 'Failed to create reservation'})
                }
                setLoading(false)
                return
            }

            setMessage({
                type: 'success',
                text: `Office reserved successfully! ${sendEmailNotification ? 'Email notifications will be sent to all members.' : ''}`
            })

            // Reset form after short delay and close dialog
            setTimeout(() => {
                resetForm()
                setIsOpen(false)
            }, 2000)
        } catch (error) {
            console.error('Error creating reservation:', error)
            setMessage({type: 'error', text: 'An unexpected error occurred'})
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-destructive"/>
                    Reserve Office
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Reserve the office for meetings or events. The office will be closed during the reservation.
                </p>

                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open)
                    if (!open) {
                        resetForm()
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                            <Calendar className="h-4 w-4 mr-2"/>
                            Reserve Office
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Reserve Office</DialogTitle>
                            <DialogDescription>
                                Reserve the office for a specific time period. The office will be closed to regular
                                check-ins during this time.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Start Date/Time */}
                            <div className="space-y-2">
                                <Label>Start Date & Time</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* End Date/Time */}
                            <div className="space-y-2">
                                <Label>End Date & Time</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        required
                                        min={startDate || new Date().toISOString().split('T')[0]}
                                    />
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason (Optional)</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="e.g., Board meeting, Team event, Training session"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {/* Email Notification Toggle */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-destructive"/>
                                    <div>
                                        <Label htmlFor="email-notification" className="font-medium cursor-pointer">
                                            Send Email Notification
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Notify all members about the reservation
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="email-notification"
                                    checked={sendEmailNotification}
                                    onCheckedChange={setSendEmailNotification}
                                />
                            </div>

                            {/* Message Alert */}
                            {message && (
                                <Alert
                                    className={message.type === 'success' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'}>
                                    {message.type === 'success' ? (
                                        <CheckCircle className="h-4 w-4 text-primary"/>
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-destructive"/>
                                    )}
                                    <AlertDescription
                                        className={message.type === 'success' ? 'text-primary' : 'text-destructive'}>
                                        {message.text}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        resetForm()
                                        setIsOpen(false)
                                    }}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" variant="destructive" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                            Reserving...
                                        </>
                                    ) : (
                                        <>
                                            <Calendar className="h-4 w-4 mr-2"/>
                                            Reserve Office
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}
