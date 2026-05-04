"use client"

import React, {useEffect, useMemo, useState} from "react"
import {format} from "date-fns"
import {useRouter} from "next/navigation"
import {Button} from "@/components/ui/button"
import {Card} from "@/components/ui/card"
import {Skeleton} from "@/components/ui/skeleton"
import {AlertCircle, Building2, RefreshCw} from "lucide-react"
import {SiteHeader} from "@/components/site-header"
import {OfficeMap} from "@/components/office-map"
import type {ScheduleSlot} from "@/hooks/useRealtime"
import {useDashboardData} from "@/hooks/useRealtime"
import {useAuth} from "@/hooks/useAuth"
import {useAutoCheckIn} from "@/hooks/useAutoCheckIn"
import {supabaseClient} from "@/lib/auth-client"
import {AutoCheckInSection} from "@/components/auto-check-in-section"
import {OfficeReservedBanner} from "@/components/office-reserved-banner"
import {UpcomingReservations} from "@/components/upcoming-reservations"
import {useOfficeReservation} from "@/hooks/useOfficeReservation"
import {OfficeStatusCard} from "@/components/office-status-card"
import {CurrentAttendanceCard} from "@/components/current-attendance-card"
import {LiveActivityFeed} from "@/components/live-activity-feed"
import {VolunteersListCard} from "@/components/volunteers-list-card"
import {VolunteerModal} from "@/components/volunteer-modal"
import {OfficeScheduleCard} from "@/components/office-schedule-card"
import {TimeIntervalModal} from "@/components/time-interval-modal"
import {useVolunteerData, type LocalVolunteer} from "@/hooks/useVolunteerData"
import {useTimeSchedule} from "@/hooks/useTimeSchedule"

type VolunteerStatus = "available" | "dnd" | "break" | "remote"

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

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd")

const timeStringToMinutes = (time: string) => {
    const [hoursStr = "0", minutesStr = "0"] = time.split(':')
    const hours = Number.parseInt(hoursStr, 10)
    const minutes = Number.parseInt(minutesStr, 10)
    return hours * 60 + minutes
}

export default function HomePage() {
    const router = useRouter()
    const {user, volunteer, refreshVolunteer, updateVolunteerCache} = useAuth()
    const [selectedInterval, setSelectedInterval] = useState<IntervalDetails | null>(null)
    const [selectedVolunteer, setSelectedVolunteer] = useState<LocalVolunteer | null>(null)
    const [autoCheckInOut, setAutoCheckInOut] = useState(false)

    const handleVolunteerClick = (volunteer: LocalVolunteer) => setSelectedVolunteer(volunteer)
    const [updatingStatus, setUpdatingStatus] = useState(false)

    // Load auto check-in setting from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('autoCheckInOut')
        if (saved !== null) {
            setAutoCheckInOut(saved === 'true')
        }
    }, [])

    // Save auto check-in setting to localStorage
    useEffect(() => {
        localStorage.setItem('autoCheckInOut', String(autoCheckInOut))
    }, [autoCheckInOut])

    // Auto check-in/out monitoring
    const {isMonitoring} = useAutoCheckIn({
        volunteerId: volunteer?.id || '',
        isInOffice: volunteer?.is_in_office || false,
        enabled: autoCheckInOut && !!volunteer,
        onSuccess: refreshVolunteer
    })

    // Fetch both volunteers and schedules in parallel
    const {volunteers: dbVolunteers, schedules, loading: isLoading, error: hasError} = useDashboardData()

    // Fetch office reservations
    const {upcoming: reservations} = useOfficeReservation()

    // Process volunteer data using custom hook
    const {volunteers, volunteersInOffice, shuffledVolunteersInOffice, isOfficeOpen} = useVolunteerData(dbVolunteers)

    // Use time schedule hook for calendar logic
    const {
        timeView,
        setTimeView,
        currentDate,
        setCurrentDate,
        currentDateKey,
        actualTodayKey,
        timeIntervals,
        navigateTime,
        formatTimeViewTitle
    } = useTimeSchedule(schedules, reservations, volunteers)

    const currentHour = new Date().getHours()
    const currentMinute = new Date().getMinutes()

    // Find next scheduled volunteer
    const nextScheduledVolunteer = useMemo(() => {
        if (volunteersInOffice.length > 0) return null // Only show when office is empty

        const now = new Date()
        const currentTime = now.getHours() * 60 + now.getMinutes()
        const currentDateStr = formatDateKey(now)

        // Find schedules starting after current time today
        const upcomingToday = schedules
            .filter(slot => slot.date === currentDateStr)
            .map(slot => {
                const startMinutes = timeStringToMinutes(slot.start_time)
                const volunteer = volunteers.find(v => v.id === slot.volunteer_id) || null
                return {slot, startMinutes, volunteer}
            })
            .filter((item): item is {slot: ScheduleSlot, startMinutes: number, volunteer: LocalVolunteer} => {
                return item.startMinutes > currentTime && Boolean(item.volunteer)
            })
            .sort((a, b) => a.startMinutes - b.startMinutes)

        if (upcomingToday.length > 0) {
            const next = upcomingToday[0]
            const minutesUntil = next.startMinutes - currentTime
            return {
                volunteer: next.volunteer,
                time: next.slot.start_time.slice(0, 5),
                minutesUntil
            }
        }

        return null
    }, [schedules, volunteers, volunteersInOffice.length])



    const handleStatusChange = async (newStatus: 'available' | 'dnd' | 'break') => {
        if (!volunteer) return

        setUpdatingStatus(true)

        // Optimistically update UI
        updateVolunteerCache({
            status: newStatus,
            last_seen: new Date().toISOString()
        })

        try {
            const {error} = await supabaseClient
                .from('volunteers')
                .update({
                    status: newStatus,
                    last_seen: new Date().toISOString()
                })
                .eq('id', volunteer.id)

            if (error) throw error

            // Refetch to ensure consistency
            await refreshVolunteer()
        } catch (error) {
            console.error('Error updating status:', error)
            // Revert optimistic update on error
            await refreshVolunteer()
        } finally {
            setUpdatingStatus(false)
        }
    }

    const getStatusDisplay = (status: VolunteerStatus) => {
        switch (status) {
            case 'available':
                return 'Available'
            case 'dnd':
                return 'Do Not Disturb'
            case 'break':
                return 'On Break'
            case 'remote':
                return 'Remote'
            default:
                return 'Unknown'
        }
    }

    // Error State
    if (hasError) {
        const errorMessage = hasError || ''
        const isSchemaError = errorMessage.toLowerCase().includes('schema') ||
            errorMessage.toLowerCase().includes('table') ||
            errorMessage.toLowerCase().includes('relation')

        return (
            <div className="min-h-screen bg-background">
                <SiteHeader/>
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <Card className="p-12">
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="p-4 bg-destructive/10 rounded-full">
                                    <AlertCircle className="h-12 w-12 text-destructive"/>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {isSchemaError ? 'Database Setup Required' : 'Unable to Load Data'}
                                </h2>
                                <p className="text-muted-foreground mb-4">
                                    {isSchemaError
                                        ? 'The database tables have not been set up yet.'
                                        : errorMessage
                                    }
                                </p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    {isSchemaError
                                        ? 'Please contact your administrator to run the database setup script.'
                                        : 'Please check your internet connection and try again.'
                                    }
                                </p>
                            </div>
                            {!isSchemaError && (
                                <Button onClick={() => router.refresh()}>
                                    <RefreshCw className="h-4 w-4 mr-2"/>
                                    Retry
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader/>
                <div className="container mx-auto px-4 py-8 max-w-6xl space-y-12">
                    {/* Header Skeleton */}
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-14 w-14 rounded-full"/>
                            <Skeleton className="h-12 w-72"/>
                        </div>
                        <Skeleton className="h-5 w-[26rem]"/>
                    </div>

                    {/* Hero Section Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-6 w-6 rounded-full"/>
                                <Skeleton className="h-8 w-40"/>
                            </div>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-16 w-16 rounded-full"/>
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-10 w-32"/>
                                    <Skeleton className="h-4 w-48"/>
                                </div>
                            </div>
                            <div className="space-y-3 pt-6 border-t">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-4 w-4 rounded-full"/>
                                    <Skeleton className="h-4 w-56"/>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-4 w-4 rounded-full"/>
                                    <Skeleton className="h-4 w-52"/>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-6 w-6 rounded-full"/>
                                <Skeleton className="h-8 w-48"/>
                            </div>
                            <div className="text-center space-y-3">
                                <Skeleton className="h-24 w-24 mx-auto"/>
                                <Skeleton className="h-4 w-48 mx-auto"/>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {Array.from({length: 8}).map((_, index) => (
                                    <Skeleton key={index} className="h-10 w-10 rounded-full"/>
                                ))}
                                <Skeleton className="h-10 w-10 rounded-full"/>
                            </div>
                        </Card>
                    </div>

                    {/* Map and Activity Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="p-0 overflow-hidden lg:col-span-2">
                            <Skeleton className="h-[360px] w-full"/>
                        </Card>
                        <Card className="p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-5 rounded-full"/>
                                <Skeleton className="h-6 w-32"/>
                            </div>
                            <div className="space-y-3">
                                {Array.from({length: 4}).map((_, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <Skeleton className="h-2 w-2 rounded-full mt-2"/>
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32"/>
                                            <Skeleton className="h-3 w-24"/>
                                            <Skeleton className="h-3 w-20"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Who's Here Skeleton */}
                    <Card className="p-6 space-y-6">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-6 w-6 rounded-full"/>
                            <Skeleton className="h-8 w-44"/>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Skeleton className="h-10 w-full sm:flex-1"/>
                            <Skeleton className="h-10 w-36"/>
                            <Skeleton className="h-10 w-32"/>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {Array.from({length: 4}).map((_, index) => (
                                <div key={index} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-12 w-12 rounded-full"/>
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-36"/>
                                            <Skeleton className="h-3 w-28"/>
                                            <Skeleton className="h-3 w-20"/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader/>

            <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
                {/* Office Reserved Banner */}
                <OfficeReservedBanner/>

                {/* Enhanced Hero Section */}
                <section>
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Building2 className="h-12 w-12 text-primary"/>
                            <h1 className="text-5xl font-bold">ESN Office</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Real-time office presence and volunteer availability
                        </p>
                    </div>

                    {/* Quick Check-in for logged-in users */}
                    {user && volunteer && (
                        <div className="mb-6">
                            <div className="space-y-4">
                                <AutoCheckInSection
                                    autoCheckInOut={autoCheckInOut}
                                    volunteer={volunteer}
                                    updatingStatus={updatingStatus}
                                    isMonitoring={isMonitoring}
                                    onStatusChange={handleStatusChange}
                                    onCheckInOutSuccess={refreshVolunteer}
                                />
                            </div>
                        </div>
                    )}

                    {/* Main Hero Content - Side by Side Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <OfficeStatusCard
                            isOfficeOpen={isOfficeOpen}
                            nextScheduledVolunteer={nextScheduledVolunteer}
                        />
                        <CurrentAttendanceCard
                            volunteersInOffice={shuffledVolunteersInOffice}
                            onVolunteerClick={(v) => setSelectedVolunteer(v as LocalVolunteer)}
                        />
                    </div>
                </section>

                {/* Activity Feed & Who's Here */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2">
                        {/* Office Map */}
                        <OfficeMap volunteers={volunteers} onVolunteerClick={handleVolunteerClick}/>
                    </section>

                    {/* Live Activity Feed */}
                    <section className="lg:col-span-1">
                        <LiveActivityFeed volunteers={volunteers}/>
                    </section>
                </div>

                {/* Who's in Office with Search & Filters */}
                <VolunteersListCard
                    volunteers={volunteers}
                    onVolunteerClick={(v) => setSelectedVolunteer(v as LocalVolunteer)}
                    getStatusDisplay={getStatusDisplay}
                />

                {/* Office Hours & Schedule */}
                <OfficeScheduleCard
                    timeView={timeView}
                    currentDate={currentDate}
                    timeIntervals={timeIntervals as IntervalDetails[]}
                    currentHour={currentHour}
                    currentMinute={currentMinute}
                    currentDateKey={currentDateKey}
                    actualTodayKey={actualTodayKey}
                    isLoading={isLoading}
                    onTimeViewChange={setTimeView}
                    onNavigate={navigateTime}
                    onIntervalClick={(i) => setSelectedInterval(i as IntervalDetails)}
                    onDayClick={(date) => {
                        setCurrentDate(date)
                        setTimeView("day")
                        setSelectedInterval(null)
                    }}
                    formatTimeViewTitle={formatTimeViewTitle}
                />

                {/* Upcoming Reservations */}
                <UpcomingReservations/>
            </div>

            {/* Volunteer Detail Modal */}
            <VolunteerModal
                volunteer={selectedVolunteer}
                schedules={schedules}
                formatDateKey={formatDateKey}
                getStatusDisplay={getStatusDisplay}
                onClose={() => setSelectedVolunteer(null)}
            />

            {/* Time Interval Details Modal */}
            <TimeIntervalModal
                interval={selectedInterval}
                currentHour={currentHour}
                currentMinute={currentMinute}
                relevantReservation={selectedInterval && typeof selectedInterval.hour === "number" && typeof selectedInterval.minute === "number" ? (() => {
                    const slotStart = new Date(`${currentDateKey}T${selectedInterval.hour.toString().padStart(2, '0')}:${selectedInterval.minute.toString().padStart(2, '0')}:00`)
                    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
                    return reservations?.find(reservation => {
                        const reservationStart = new Date(reservation.start_time)
                        const reservationEnd = new Date(reservation.end_time)
                        return slotStart < reservationEnd && slotEnd > reservationStart
                    })
                })() : null}
                getStatusDisplay={getStatusDisplay}
                onClose={() => setSelectedInterval(null)}
            />
        </div>
    )
}
