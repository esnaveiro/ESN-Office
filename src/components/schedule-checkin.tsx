"use client"

import {useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {Calendar as CalendarIcon, CalendarClock, Clock, Trash2} from "lucide-react"
import {supabaseClient} from "@/lib/auth-client"
import {useScheduledCheckIns} from "@/hooks/useScheduledCheckIns"

interface ScheduleCheckInProps {
    volunteerId: string
    volunteerName: string
}

export function ScheduleCheckIn({volunteerId, volunteerName}: ScheduleCheckInProps) {
    const [selectedDate, setSelectedDate] = useState("")
    const [selectedTime, setSelectedTime] = useState("")
    const [action, setAction] = useState<"check_in" | "check_out">("check_in")
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

    const {scheduledCheckIns, refreshScheduledCheckIns} = useScheduledCheckIns(volunteerId)

    const handleSchedule = async () => {
        if (!selectedDate || !selectedTime) {
            setMessage({type: "error", text: "Please select both date and time"})
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            const scheduledDatetime = new Date(`${selectedDate}T${selectedTime}`)

            // Check if the datetime is in the future
            if (scheduledDatetime <= new Date()) {
                setMessage({type: "error", text: "Scheduled time must be in the future"})
                setLoading(false)
                return
            }

            const {error} = await supabaseClient
                .from('scheduled_checkins')
                .insert({
                    volunteer_id: volunteerId,
                    scheduled_datetime: scheduledDatetime.toISOString(),
                    action,
                    notes: notes || null,
                    status: 'pending',
                    auto_execute: true
                })

            if (error) throw error

            setMessage({
                type: "success",
                text: `${action === 'check_in' ? 'Check-in' : 'Check-out'} scheduled successfully!`
            })
            setSelectedDate("")
            setSelectedTime("")
            setNotes("")
            refreshScheduledCheckIns()
        } catch (error: unknown) {
            console.error('Error scheduling check-in:', error)
            const errorMessage = error instanceof Error ? error.message : "Failed to schedule check-in"
            setMessage({type: "error", text: errorMessage})
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = async (id: string) => {
        try {
            const {error} = await supabaseClient
                .from('scheduled_checkins')
                .update({status: 'cancelled'})
                .eq('id', id)

            if (error) throw error

            refreshScheduledCheckIns()
        } catch (error: unknown) {
            console.error('Error cancelling scheduled check-in:', error)
        }
    }

    const pendingCheckIns = scheduledCheckIns.filter(c => c.status === 'pending')

    return (
        <div className="space-y-6">
            {/* Schedule New Check-in */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5"/>
                        Schedule Check-in
                    </CardTitle>
                    <CardDescription>
                        Plan office check-ins ahead of time for {volunteerName}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="action">Action</Label>
                            <Select value={action}
                                    onValueChange={(value: "check_in" | "check_out") => setAction(value)}>
                                <SelectTrigger id="action">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="check_in">Check In</SelectItem>
                                    <SelectItem value="check_out">Check Out</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <Input
                                id="time"
                                type="time"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Input
                                id="notes"
                                type="text"
                                placeholder="e.g., Morning shift"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg ${
                            message.type === 'success'
                                ? 'bg-esn-green/10 text-esn-green border border-esn-green/20'
                                : 'bg-destructive/10 text-destructive border border-destructive/20'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <Button
                        onClick={handleSchedule}
                        disabled={loading || !selectedDate || !selectedTime}
                        className="w-full bg-gradient-to-r from-esn-cyan to-esn-cyan/90 hover:from-esn-cyan/90 hover:to-esn-cyan"
                    >
                        <CalendarClock className="h-4 w-4 mr-2"/>
                        {loading ? "Scheduling..." : "Schedule Check-in"}
                    </Button>
                </CardContent>
            </Card>

            {/* Upcoming Scheduled Check-ins */}
            {pendingCheckIns.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Scheduled Check-ins</CardTitle>
                        <CardDescription>
                            Your scheduled automatic check-ins
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pendingCheckIns.map((scheduled) => (
                                <div
                                    key={scheduled.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={scheduled.action === 'check_in' ? 'default' : 'outline'}>
                                                {scheduled.action === 'check_in' ? 'Check In' : 'Check Out'}
                                            </Badge>
                                            {scheduled.status === 'pending' && (
                                                <Badge variant="secondary"
                                                       className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3"/>
                          {new Date(scheduled.scheduled_datetime).toLocaleDateString()}
                      </span>
                                            <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3"/>
                                                {new Date(scheduled.scheduled_datetime).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })}
                      </span>
                                        </div>
                                        {scheduled.notes && (
                                            <p className="text-xs text-muted-foreground">{scheduled.notes}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCancel(scheduled.id)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
