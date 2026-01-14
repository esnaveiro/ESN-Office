"use client"

import React, {useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {Label} from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {AlertCircle, CheckCircle, Coffee, Loader2, MapPin, MapPinned, Moon} from "lucide-react"
import {
    checkIn,
    CheckInOptions,
    checkOut,
    getCurrentLocation,
    isNearOffice,
    type LocationData,
    OFFICE_COORDINATES
} from "@/lib/presence-client"
import {OfficeLocationMap} from "@/components/office-location-map"
import {supabaseClient} from "@/lib/auth-client"
import {markManualCheckIn, clearCheckInMethod} from "@/lib/check-in-tracking"
import {useAuth} from "@/hooks/useAuth"
import {useQueryClient} from "@tanstack/react-query"
import {queryKeys} from "@/hooks/useRealtime"
// import {requestNotificationPermission} from "@/lib/notifications"

interface CheckInOutButtonProps {
    volunteerId: string
    isInOffice: boolean
    currentStatus?: "available" | "dnd" | "break" | "remote"
    onSuccess?: () => void
    requireLocation?: boolean
}

export function CheckInOutButton({
                                     volunteerId,
                                     isInOffice,
                                     currentStatus = "available",
                                     onSuccess,
                                     requireLocation = false
                                 }: CheckInOutButtonProps) {
    const {updateVolunteerCache} = useAuth()
    const queryClient = useQueryClient()
    const [loading, setLoading] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [showLocationDialog, setShowLocationDialog] = useState(false)
    const [locationStatus, setLocationStatus] = useState<{
        type: 'success' | 'warning' | 'error' | null
        message: string
    }>({type: null, message: ''})
    const [location, setLocation] = useState<LocationData | null>(null)

    // Local optimistic state for status
    const [optimisticStatus, setOptimisticStatus] = useState<"available" | "dnd" | "break" | "remote" | null>(null)
    const displayStatus = optimisticStatus ?? currentStatus

    // Debug logging
    React.useEffect(() => {
        console.log('Status state - optimistic:', optimisticStatus, 'current:', currentStatus, 'display:', displayStatus)
    }, [optimisticStatus, currentStatus, displayStatus])

    // Reset optimistic status when the real status matches our optimistic update
    // (meaning the update was successful and real data arrived)
    React.useEffect(() => {
        if (optimisticStatus !== null && currentStatus === optimisticStatus) {
            console.log('Resetting optimistic status - real data arrived')
            setOptimisticStatus(null)
        }
    }, [currentStatus, optimisticStatus])

    const handleStatusChange = async (newStatus: 'available' | 'dnd' | 'break') => {
        console.log('Changing status to:', newStatus)
        setUpdatingStatus(true)

        // Set local optimistic state immediately
        setOptimisticStatus(newStatus)

        // Optimistically update global cache
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
                .eq('id', volunteerId)

            if (error) {
                console.error('Database error updating status:', error)
                throw error
            }

            console.log('Status updated successfully in database')

            // Invalidate volunteers query to update home page
            queryClient.invalidateQueries({queryKey: queryKeys.volunteers})

            // Refetch to ensure consistency
            onSuccess?.()
        } catch (error) {
            console.error('Error updating status:', error)
            // Revert optimistic update on error
            setOptimisticStatus(null)
            onSuccess?.()
        } finally {
            setUpdatingStatus(false)
        }
    }

    const handleQuickAction = async () => {
        // If location is required, use location action instead
        if (requireLocation) {
            handleLocationAction()
            return
        }

        // Quick action without location
        setLoading(true)

        // Optimistically update UI
        updateVolunteerCache({
            is_in_office: !isInOffice,
            last_seen: new Date().toISOString()
        })

        try {
            if (isInOffice) {
                await checkOut(volunteerId)
                // Clear manual check-in tracking on checkout
                clearCheckInMethod()
            } else {
                await checkIn(volunteerId)
                // Mark as manual check-in
                markManualCheckIn(volunteerId)
                // Request notification permission for hourly confirmations
                // await requestNotificationPermission()
            }

            // Invalidate volunteers query to update home page
            queryClient.invalidateQueries({queryKey: queryKeys.volunteers})

            // Refetch to ensure consistency
            onSuccess?.()
        } catch (error: unknown) {
            console.error('Check-in/out error:', error)
            const message = error instanceof Error ? error.message || 'Failed to update status' : 'Failed to update status'
            setLocationStatus({
                type: 'error',
                message
            })
            // Revert optimistic update on error
            updateVolunteerCache({
                is_in_office: isInOffice,
                last_seen: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }

    const handleLocationAction = async () => {
        setShowLocationDialog(true)
        setLocationStatus({type: null, message: ''})
        setLocation(null)

        try {
            // Get current location
            const currentLocation = await getCurrentLocation()
            setLocation(currentLocation)

            // Check if near office
            const nearOffice = isNearOffice(currentLocation.latitude, currentLocation.longitude)

            if (isInOffice) {
                // Checking out - just confirm location
                setLocationStatus({
                    type: 'success',
                    message: `Location confirmed (${currentLocation.accuracy.toFixed(0)}m accuracy)`
                })
            } else if (nearOffice) {
                // Checking in and at office
                setLocationStatus({
                    type: 'success',
                    message: `You're at the office! (${currentLocation.accuracy.toFixed(0)}m accuracy)`
                })
            } else {
                // Checking in but not at office
                setLocationStatus({
                    type: 'warning',
                    message: `You're ${calculateDistanceFromOffice(currentLocation)}m from the office. Check in anyway?`
                })
            }
        } catch (error: unknown) {
            console.error('Location error:', error)
            let message = 'Unable to get your location. '

            if (typeof error === 'object' && error !== null && 'code' in error) {
                const code = Number((error as { code?: number }).code)
                const errorMessage = typeof (error as { message?: string }).message === 'string'
                    ? (error as { message?: string }).message
                    : 'Please try again.'

                if (code === 1) {
                    message += 'Location permission denied.'
                } else if (code === 2) {
                    message += 'Location unavailable.'
                } else if (code === 3) {
                    message += 'Location request timed out.'
                } else {
                    message += errorMessage
                }
            } else if (error instanceof Error) {
                message += error.message
            } else {
                message += 'Please try again.'
            }

            setLocationStatus({
                type: 'error',
                message
            })
        }
    }

    const confirmLocationAction = async () => {
        // Set location to office coordinates if none available
        const loc: CheckInOptions = {
            location: {
                latitude: OFFICE_COORDINATES.latitude,
                longitude: OFFICE_COORDINATES.longitude,
                accuracy: 0,
                timestamp: new Date()
            }
        }

        setLoading(true)

        // Optimistically update UI
        updateVolunteerCache({
            is_in_office: !isInOffice,
            last_seen: new Date().toISOString()
        })

        try {
            if (isInOffice) {
                await checkOut(volunteerId, loc)
                // Clear manual check-in tracking on checkout
                clearCheckInMethod()
            } else {
                await checkIn(volunteerId, loc)
                // Mark as manual check-in
                markManualCheckIn(volunteerId)
                // Request notification permission for hourly confirmations
                // await requestNotificationPermission()
            }
            setShowLocationDialog(false)

            // Invalidate volunteers query to update home page
            queryClient.invalidateQueries({queryKey: queryKeys.volunteers})

            // Refetch to ensure consistency
            onSuccess?.()
        } catch (error: unknown) {
            console.error('Check-in/out error:', error)
            const message = error instanceof Error ? error.message || 'Failed to update status' : 'Failed to update status'
            setLocationStatus({
                type: 'error',
                message
            })
            // Revert optimistic update on error
            updateVolunteerCache({
                is_in_office: isInOffice,
                last_seen: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }

    const calculateDistanceFromOffice = (loc: LocationData): number => {
        const R = 6371e3
        const φ1 = (loc.latitude * Math.PI) / 180
        const φ2 = (OFFICE_COORDINATES.latitude * Math.PI) / 180
        const Δφ = ((OFFICE_COORDINATES.latitude - loc.latitude) * Math.PI) / 180
        const Δλ = ((OFFICE_COORDINATES.longitude - loc.longitude) * Math.PI) / 180

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        return Math.round(R * c)
    }

    return (
        <>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isInOffice ? 'bg-primary' : 'bg-gray-400'}`}/>
                                <span className="text-sm font-medium">
                  {isInOffice ? 'In Office' : 'Out of Office'}
                </span>
                            </div>
                            {/*<Badge variant="outline" className="text-xs">*/}
                            {/*    <MapPin className="size-3 mr-1"/>*/}
                            {/*    Location verified*/}
                            {/*</Badge>*/}
                        </div>

                        {/* Main Check-in/out button */}
                        <Button
                            onClick={handleQuickAction}
                            disabled={loading}
                            className="w-full h-14"
                            variant={isInOffice ? "outline" : "default"}
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="size-5 mr-2 animate-spin"/>
                                    Processing...
                                </>
                            ) : isInOffice ? (
                                <>
                                    <MapPin className="size-5 mr-2"/>
                                    Check Out
                                </>
                            ) : (
                                <>
                                    <MapPinned className="size-5 mr-2"/>
                                    Check In
                                </>
                            )}
                        </Button>

                        {/* Status Options */}
                        <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs text-muted-foreground">Change status:</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={displayStatus === 'available' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusChange('available')}
                                    disabled={updatingStatus}
                                    className="flex-1"
                                >
                                    Available
                                </Button>
                                <Button
                                    variant={displayStatus === 'dnd' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusChange('dnd')}
                                    disabled={updatingStatus}
                                    className="flex-1"
                                >
                                    <Moon className="h-4 w-4 mr-1"/>
                                    Do Not Disturb
                                </Button>
                                <Button
                                    variant={displayStatus === 'break' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusChange('break')}
                                    disabled={updatingStatus}
                                    className="flex-1"
                                >
                                    <Coffee className="h-4 w-4 mr-1"/>
                                    Break
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Location Confirmation Dialog - COMMENTED OUT FOR INSTANT CHECK-IN/OUT */}
            {/*<Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>*/}
            {/*    <DialogContent className="max-w-2xl">*/}
            {/*        <DialogHeader>*/}
            {/*            <DialogTitle>*/}
            {/*                {isInOffice ? "Check Out" : "Check In"} with Location*/}
            {/*            </DialogTitle>*/}
            {/*            <DialogDescription>*/}
            {/*                We&apos;ll record your location to verify you&apos;re at the office*/}
            {/*            </DialogDescription>*/}
            {/*        </DialogHeader>*/}

            {/*        <div className="space-y-4 py-4">*/}
            {/*            {locationStatus.type === 'success' && (*/}
            {/*                <Alert className="border-primary bg-primary/5">*/}
            {/*                    <CheckCircle className="h-4 w-4 text-primary"/>*/}
            {/*                    <AlertDescription>{locationStatus.message}</AlertDescription>*/}
            {/*                </Alert>*/}
            {/*            )}*/}

            {/*            {locationStatus.type === 'warning' && (*/}
            {/*                <Alert className="border-yellow-500 bg-yellow-500/5">*/}
            {/*                    <AlertCircle className="h-4 w-4 text-yellow-500"/>*/}
            {/*                    <AlertDescription>{locationStatus.message}</AlertDescription>*/}
            {/*                </Alert>*/}
            {/*            )}*/}

            {/*            {locationStatus.type === 'error' && (*/}
            {/*                <Alert variant="destructive">*/}
            {/*                    <AlertCircle className="h-4 w-4"/>*/}
            {/*                    <AlertDescription>{locationStatus.message}</AlertDescription>*/}
            {/*                </Alert>*/}
            {/*            )}*/}

            {/*            {!locationStatus.type && (*/}
            {/*                <div className="flex items-center justify-center py-8">*/}
            {/*                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>*/}
            {/*                </div>*/}
            {/*            )}*/}

            {/*            /!* Map showing office and user location *!/*/}
            {/*            <OfficeLocationMap*/}
            {/*                userLocation={location ? {*/}
            {/*                    latitude: location.latitude,*/}
            {/*                    longitude: location.longitude*/}
            {/*                } : null}*/}
            {/*                showUserLocation={!!location}*/}
            {/*            />*/}

            {/*            /!*{location && (*!/*/}
            {/*            /!*    <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">*!/*/}
            {/*            /!*        <p><strong>Your coordinates:</strong></p>*!/*/}
            {/*            /!*        <p>Latitude: {location.latitude.toFixed(6)}</p>*!/*/}
            {/*            /!*        <p>Longitude: {location.longitude.toFixed(6)}</p>*!/*/}
            {/*            /!*        <p>Accuracy: ±{location.accuracy.toFixed(0)}m</p>*!/*/}
            {/*            /!*    </div>*!/*/}
            {/*            /!*)}*!/*/}
            {/*        </div>*/}

            {/*        <DialogFooter>*/}
            {/*            <Button*/}
            {/*                variant="outline"*/}
            {/*                onClick={() => setShowLocationDialog(false)}*/}
            {/*                disabled={loading}*/}
            {/*            >*/}
            {/*                Cancel*/}
            {/*            </Button>*/}
            {/*            <Button*/}
            {/*                onClick={confirmLocationAction}*/}
            {/*                disabled={loading}*/}
            {/*            >*/}
            {/*                {loading ? (*/}
            {/*                    <>*/}
            {/*                        <Loader2 className="h-4 w-4 mr-2 animate-spin"/>*/}
            {/*                        Processing...*/}
            {/*                    </>*/}
            {/*                ) : (*/}
            {/*                    <>Confirm {isInOffice ? "Check Out" : "Check In"}</>*/}
            {/*                )}*/}
            {/*            </Button>*/}
            {/*        </DialogFooter>*/}
            {/*    </DialogContent>*/}
            {/*</Dialog>*/}
        </>
    )
}
