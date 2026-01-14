"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, Search, Filter, Users } from "lucide-react"
import { useMemo, useState } from "react"

type VolunteerStatus = "available" | "dnd" | "break" | "remote"

export interface LocalVolunteer {
  id: string
  name: string
  status: VolunteerStatus
  position?: string
  avatar: string
  isInOffice: boolean
  timestamp?: Date
  confirmationType?: "firm" | "flex" | "confirmed"
}

interface VolunteersListCardProps {
  volunteers: LocalVolunteer[]
  onVolunteerClick: (volunteer: LocalVolunteer) => void
  getStatusDisplay: (status: VolunteerStatus) => string
}

export function VolunteersListCard({
  volunteers,
  onVolunteerClick,
  getStatusDisplay
}: VolunteersListCardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | "all">("all")

  // Filter volunteers - only show those in office and apply search/status filters
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => {
      // Only show volunteers in office
      if (!v.isInOffice) return false

      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.position?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || v.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [volunteers, searchQuery, statusFilter])

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Eye className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Who&apos;s Here</h2>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search volunteers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            <Filter className="h-4 w-4 mr-1" />
            All
          </Button>
          <Button
            variant={statusFilter === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("available")}
          >
            Available
          </Button>
          <Button
            variant={statusFilter === "break" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("break")}
          >
            Break
          </Button>
        </div>
      </div>

      {filteredVolunteers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredVolunteers.map((volunteer) => (
            <div
              key={volunteer.id}
              className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:shadow-lg hover:border-primary transition-all cursor-pointer"
              onClick={() => onVolunteerClick(volunteer)}
            >
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center font-bold text-lg relative">
                {volunteer.avatar}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{volunteer.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {volunteer.position || "Volunteer"}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {getStatusDisplay(volunteer.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || statusFilter !== "all" ? "No matches found" : "Office is currently empty"}
          </h3>
          <p className="text-sm">
            {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Check back later or view office hours below"}
          </p>
        </div>
      )}
    </Card>
  )
}
