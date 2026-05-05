"use client"

import React, {useState} from "react"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Coffee, Moon} from "lucide-react"
import {CheckInOutButton} from "@/components/check-in-out-button"
import type {Database} from "@/lib/database.types"

type Volunteer = Database['public']['Tables']['volunteers']['Row']

interface AutoCheckInSectionProps {
    autoCheckInOut: boolean
    volunteer: Volunteer
    updatingStatus: boolean
    isMonitoring: boolean
    onStatusChange: (status: 'available' | 'dnd' | 'break') => void
    onCheckInOutSuccess: () => void
}

export function AutoCheckInSection({
                                       autoCheckInOut,
                                       volunteer,
                                       updatingStatus,
                                       isMonitoring,
                                       onStatusChange,
                                       onCheckInOutSuccess,
                                   }: AutoCheckInSectionProps) {
    // Local optimistic state for status
    const [optimisticStatus, setOptimisticStatus] = useState<'available' | 'dnd' | 'break' | null>(null)
    const displayStatus = optimisticStatus ?? volunteer.status

    // Reset optimistic status when the real status matches our optimistic update
    // (meaning the update was successful and real data arrived)
    React.useEffect(() => {
        if (optimisticStatus !== null && volunteer.status === optimisticStatus) {
            setOptimisticStatus(null)
        }
    }, [volunteer.status, optimisticStatus])

    // Wrap onStatusChange to update local optimistic state
    const handleStatusChange = async (status: 'available' | 'dnd' | 'break') => {
        setOptimisticStatus(status)
        try {
            await onStatusChange(status)
        } catch (error) {
            // Revert on error
            console.error('Status change error:', error)
            setOptimisticStatus(null)
        }
    }

    return (
        <div className="space-y-4">
            {/* Header with toggle */}
            {/*<div className="flex items-center gap-2 justify-between sm:justify-start">*/}
            {/*    <div className="space-y-0.5">*/}
            {/*        <Label htmlFor={switchId} className="text-sm font-medium">*/}
            {/*            {showDescription ? "Automatic location-based check-in" : "Auto check-in"}*/}
            {/*        </Label>*/}
            {/*        {showDescription && (*/}
            {/*            <p className="text-xs text-muted-foreground">*/}
            {/*                {description || "Auto check in/out when you arrive or leave"}*/}
            {/*            </p>*/}
            {/*        )}*/}
            {/*    </div>*/}
            {/*    <Switch*/}
            {/*        id={switchId}*/}
            {/*        checked={autoCheckInOut}*/}
            {/*        onCheckedChange={setAutoCheckInOut}*/}
            {/*    />*/}
            {/*</div>*/}
            {/*<div className="flex items-center justify-between mb-4">*/}
            {/*    <div className="space-y-0.5 flex-1">*/}
            {/*        <Label htmlFor="auto-checkin" className="text-md font-medium">*/}
            {/*            Automatic location-based check-in*/}
            {/*        </Label>*/}
            {/*        <p className="text-xs text-muted-foreground">*/}
            {/*            Auto check in/out when you arrive or leave*/}
            {/*        </p>*/}
            {/*    </div>*/}
            {/*    <Switch*/}
            {/*        id={switchId}*/}
            {/*        checked={autoCheckInOut}*/}
            {/*        onCheckedChange={setAutoCheckInOut}*/}
            {/*    />*/}
            {/*</div>*/}

            {/* Auto check-in active state */}
            {autoCheckInOut ? (
                <div className="space-y-3">
                    {/* Status indicator */}
                    <div className={`p-4 rounded-lg border ${
                        volunteer.is_in_office
                            ? 'bg-primary/10 border-primary'
                            : 'bg-gray-50 border-gray-300 dark:bg-background'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-4 h-4 rounded-full ${volunteer.is_in_office ? 'bg-primary' : 'bg-gray-400'}`}/>
                            <div className="flex-1">
                                <p className="text-base font-semibold">
                                    {volunteer.is_in_office ? 'Checked In at Office' : 'Checked Out'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Status will update automatically
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Location Map - Show when checked in */}
                    {/*{volunteer.is_in_office && (*/}
                    {/*    <div className="pt-2">*/}
                    {/*        <OfficeLocationMap*/}
                    {/*            userLocation={currentLocation ? {*/}
                    {/*                latitude: currentLocation.latitude,*/}
                    {/*                longitude: currentLocation.longitude*/}
                    {/*            } : null}*/}
                    {/*            showUserLocation={!!currentLocation}*/}
                    {/*        />*/}
                    {/*        {currentLocation && (*/}
                    {/*            <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">*/}
                    {/*                <p><strong>Your*/}
                    {/*                    location:</strong> {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}*/}
                    {/*                </p>*/}
                    {/*                <p>Accuracy: ±{currentLocation.accuracy.toFixed(0)}m</p>*/}
                    {/*            </div>*/}
                    {/*        )}*/}
                    {/*    </div>*/}
                    {/*)}*/}

                    {/* Status Options */}
                    <div className="space-y-2">
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

                    {/* Monitoring Status */}
                    {isMonitoring && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>
                            <span>Monitoring your location</span>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <CheckInOutButton
                        volunteerId={volunteer.id}
                        isInOffice={volunteer.is_in_office}
                        onSuccess={onCheckInOutSuccess}
                    />
                </div>
            )}
        </div>
    )
}
