"use client"

import React, {useEffect, useState, useRef} from "react"
import {useRouter} from "next/navigation"
import {Button} from "@/components/ui/button"
import {Card} from "@/components/ui/card"
import {AlertCircle, ClipboardCheck, Loader2, LogOut} from "lucide-react"
import {useRequireAuth} from "@/hooks/useRequireAuth"
import {signOut} from "@/lib/auth-client"
import {SiteHeader} from "@/components/site-header"
import {CheckInOutButton} from "@/components/check-in-out-button"
import {PageLoader} from "@/components/page-loader"
import {PWAInstallCard} from "@/components/pwa-install-card"
import {OfficeReservationCalendar} from "@/components/office-reservation-calendar"
import {MyReservations, type MyReservationsRef} from "@/components/my-reservations"

export default function CheckInsPage() {
    const router = useRouter()
    const {user, volunteer, loading: authLoading, refreshVolunteer} = useRequireAuth()
    const myReservationsRef = useRef<MyReservationsRef>(null)
    const [refreshingVolunteer, setRefreshingVolunteer] = useState(false)
    const [signingOut, setSigningOut] = useState(false)
    const [dismissedPWACard, setDismissedPWACard] = useState(false)

    // Load settings from localStorage on mount
    useEffect(() => {
        const dismissedPWA = localStorage.getItem('dismissedPWACard')
        if (dismissedPWA === 'true') {
            setDismissedPWACard(true)
        }
    }, [])

    const handleRefreshVolunteer = async () => {
        setRefreshingVolunteer(true)
        try {
            await refreshVolunteer()
        } catch (error) {
            console.error('Failed to refresh volunteer profile:', error)
        } finally {
            setRefreshingVolunteer(false)
        }
    }

    const handleSignOut = async () => {
        setSigningOut(true)
        try {
            await signOut()
            router.replace('/auth/login')
        } catch (error) {
            console.error('Sign out failed:', error)
            setSigningOut(false)
        }
    }

    // Show loading while checking auth
    if (authLoading) {
        return <PageLoader />
    }

    if (!user) {
        return <PageLoader message="Redirecting to sign in..." />
    }

    if (!volunteer) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader/>
                <div className="container mx-auto px-4 py-24 max-w-xl">
                    <Card className="p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                                <AlertCircle className="h-6 w-6"/>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">We couldn&apos;t load your profile</h2>
                                <p className="text-sm text-muted-foreground">
                                    Refresh your volunteer data or sign in again. Your account may need a moment
                                    to finish provisioning.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <Button
                                    className="flex-1"
                                    onClick={handleRefreshVolunteer}
                                    disabled={refreshingVolunteer}
                                >
                                    {refreshingVolunteer ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                            Retrying…
                                        </>
                                    ) : (
                                        'Try again'
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleSignOut}
                                    disabled={signingOut}
                                >
                                    {signingOut ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                            Signing out…
                                        </>
                                    ) : (
                                        <>
                                            <LogOut className="h-4 w-4 mr-2"/>
                                            Sign out
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader/>

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <ClipboardCheck className="h-8 w-8 text-primary" />
                            Check-Ins
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your office check-ins and reservations
                        </p>
                    </div>
                </div>

                {/* Main Check-in/out Card */}
                <div className="space-y-6">
                    {/* PWA Install Prompt */}
                    {!dismissedPWACard && (
                        <PWAInstallCard
                            onDismiss={() => {
                                setDismissedPWACard(true)
                                localStorage.setItem('dismissedPWACard', 'true')
                            }}
                            onInstalled={() => {
                                setDismissedPWACard(true)
                                localStorage.setItem('dismissedPWACard', 'true')
                            }}
                        />
                    )}

                    {/* Check In/Out Now */}
                    <CheckInOutButton
                        volunteerId={volunteer.id}
                        isInOffice={volunteer.is_in_office}
                        currentStatus={volunteer.status}
                        onSuccess={refreshVolunteer}
                    />

                    {/* Office Reservation - Calendar View */}
                    <OfficeReservationCalendar
                        volunteer={volunteer}
                        onSuccess={() => {
                            refreshVolunteer()
                            myReservationsRef.current?.refetch()
                        }}
                    />

                    {/* My Reservations */}
                    <MyReservations ref={myReservationsRef} userId={volunteer.id} />
                </div>
            </div>
        </div>
    )
}
