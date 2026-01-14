"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LogIn,
  LogOut,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Coffee,
  Home
} from "lucide-react"
import { updateVolunteerStatus, checkInVolunteer, checkOutVolunteer } from "@/lib/volunteers"

interface PresenceControlsProps {
  volunteerId: string
  currentStatus: "available" | "dnd" | "break" | "remote"
  isInOffice: boolean
  volunteerName: string
  onStatusUpdate?: () => void
}

export function PresenceControls({
  volunteerId,
  currentStatus,
  isInOffice,
  volunteerName,
  onStatusUpdate
}: PresenceControlsProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      await checkInVolunteer(volunteerId)
      onStatusUpdate?.()
    } catch (error) {
      console.error('Failed to check in:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setLoading(true)
    try {
      await checkOutVolunteer(volunteerId)
      onStatusUpdate?.()
    } catch (error) {
      console.error('Failed to check out:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: "available" | "dnd" | "break" | "remote") => {
    setLoading(true)
    try {
      await updateVolunteerStatus(volunteerId, newStatus)
      onStatusUpdate?.()
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />
      case 'dnd': return <AlertCircle className="h-4 w-4" />
      case 'break': return <Coffee className="h-4 w-4" />
      case 'remote': return <Home className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'available': return 'Available'
      case 'dnd': return 'Do Not Disturb'
      case 'break': return 'On Break'
      case 'remote': return 'Remote'
      default: return 'Unknown'
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
            {volunteerName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold">{volunteerName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant={isInOffice ? "default" : "outline"} className="text-xs">
                {isInOffice ? "In Office" : "Not in Office"}
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                {getStatusIcon(currentStatus)}
                {getStatusDisplay(currentStatus)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Check In/Out Controls */}
        <div className="flex gap-2">
          {!isInOffice ? (
            <Button
              onClick={handleCheckIn}
              disabled={loading}
              className="flex-1"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Check In
            </Button>
          ) : (
            <Button
              onClick={handleCheckOut}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          )}
        </div>

        {/* Status Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={currentStatus}
            onValueChange={handleStatusChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Available
                </div>
              </SelectItem>
              <SelectItem value="dnd">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Do Not Disturb
                </div>
              </SelectItem>
              <SelectItem value="break">
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-primary" />
                  On Break
                </div>
              </SelectItem>
              <SelectItem value="remote">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  Remote
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Last Update */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Status updates in real-time
        </div>
      </div>
    </Card>
  )
}