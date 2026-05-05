"use client"

import {useEffect, useState} from 'react'
import dynamic from 'next/dynamic'
import {getCurrentLocation} from '@/lib/presence-client'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {MapPin} from 'lucide-react'
import {OFFICE_ADDRESS} from '@/lib/constants'

interface OfficeLocationMapProps {
    userLocation?: { latitude: number; longitude: number } | null
    showUserLocation?: boolean
}

// Create the map component that will be dynamically imported
const MapComponent = dynamic(
    () => import('./map-component').then((mod) => mod.MapComponent),
    {
        ssr: false,
        loading: () => (
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Loading map...</p>
            </div>
        )
    }
)

export function OfficeLocationMap({userLocation, showUserLocation = false}: OfficeLocationMapProps) {
    const [isMounted, setIsMounted] = useState(false)
    const [currentLocation, setCurrentLocation] = useState<{
        latitude: number;
        longitude: number
    } | null>(userLocation || null)
    const [locationError, setLocationError] = useState<string | null>(null)

    // Only render map on client side
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Get user's current location
    useEffect(() => {
        if (!isMounted) return

        const getLocation = async () => {
            try {
                const location = await getCurrentLocation()
                setCurrentLocation({
                    latitude: location.latitude,
                    longitude: location.longitude
                })
                setLocationError(null)
            } catch (error: unknown) {
                console.error('Error getting location:', error)
                setLocationError('Unable to get your location')
            }
        }

        getLocation()
    }, [isMounted])

    if (!isMounted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5"/>
                        Office Location
                    </CardTitle>
                    <CardDescription>
                        {OFFICE_ADDRESS}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Loading map...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5"/>
                    Office Location
                </CardTitle>
                <CardDescription>
                    {OFFICE_ADDRESS}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <MapComponent
                    userLocation={currentLocation}
                    showUserLocation={showUserLocation || !!currentLocation}
                />
                <div className="mt-3 text-xs text-muted-foreground text-center">
                    <p>Circle shows the 12m check-in radius around the office</p>
                    {locationError && (
                        <p className="text-destructive mt-1">{locationError}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
