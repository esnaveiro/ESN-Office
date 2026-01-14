"use client"

import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { OFFICE_COORDINATES } from '@/lib/presence-client'

// Fix for default marker icon in react-leaflet
// Use CDN URLs instead of importing the images
type DefaultIconPrototype = typeof L.Icon.Default.prototype & {
  _getIconUrl?: () => string
}

delete (L.Icon.Default.prototype as DefaultIconPrototype)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface MapComponentProps {
  userLocation?: { latitude: number; longitude: number } | null
  showUserLocation?: boolean
}

// Component to recenter map when user location changes
function RecenterMap({ center }: { center: LatLngExpression }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export function MapComponent({ userLocation, showUserLocation = false }: MapComponentProps) {
  const officePosition: LatLngExpression = [
    OFFICE_COORDINATES.latitude,
    OFFICE_COORDINATES.longitude
  ]

  const userPosition: LatLngExpression | null = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : null

  // Calculate center point between office and user if user location is available
  const centerPosition: LatLngExpression = userPosition && showUserLocation && userLocation
    ? [
        (OFFICE_COORDINATES.latitude + userLocation.latitude) / 2,
        (OFFICE_COORDINATES.longitude + userLocation.longitude) / 2
      ]
    : officePosition

  return (
    <div className="h-64 rounded-lg overflow-hidden border relative z-0">
      <MapContainer
        center={centerPosition}
        zoom={userPosition && showUserLocation ? 17 : 18}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Office location marker */}
        <Marker position={officePosition}>
          <Popup>
            <div className="text-sm">
              <strong>ESN Aveiro Office</strong>
              <br />
              Edifício Central da Reitoria
              <br />
              Campus Universitário de Santiago
            </div>
          </Popup>
        </Marker>

        {/* 12m radius circle around office */}
        <Circle
          center={officePosition}
          radius={12}
          pathOptions={{
            color: '#00aeef',
            fillColor: '#00aeef',
            fillOpacity: 0.2,
            weight: 2
          }}
        />

        {/* User location marker if available */}
        {userPosition && showUserLocation && (
          <Marker
            position={userPosition}
            icon={L.icon({
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" fill="#00aeef" stroke="white" stroke-width="3"/>
                </svg>
              `),
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        <RecenterMap center={centerPosition} />
      </MapContainer>
    </div>
  )
}
