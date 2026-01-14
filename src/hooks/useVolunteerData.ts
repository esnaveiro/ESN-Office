import { useMemo } from "react"

type VolunteerStatus = "available" | "dnd" | "break" | "remote"

export interface DBVolunteer {
  id: string
  name: string
  email: string
  status: VolunteerStatus | null
  position: string | null
  is_in_office: boolean
  last_seen?: string | null
}

export interface LocalVolunteer {
  id: string
  name: string
  status: VolunteerStatus
  position?: string
  timestamp: Date
  avatar: string
  isInOffice: boolean
  confirmationType?: "firm" | "flex" | "confirmed"
}

const getInitials = (name: string) => (
  name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0] ?? "")
    .join("")
    .toUpperCase()
)

export function useVolunteerData(dbVolunteers: DBVolunteer[] | undefined) {
  const volunteers = useMemo(() => {
    if (!dbVolunteers) return []

    return dbVolunteers.map((v): LocalVolunteer => ({
      id: v.id,
      name: v.name,
      status: v.status || "available",
      position: v.position || undefined,
      timestamp: v.last_seen ? new Date(v.last_seen) : new Date(),
      avatar: getInitials(v.name),
      isInOffice: v.is_in_office
    }))
  }, [dbVolunteers])

  const volunteersInOffice = useMemo(() =>
    volunteers.filter(v => v.isInOffice),
    [volunteers]
  )

  const isOfficeOpen = volunteersInOffice.length > 0

  // Shuffle volunteers for display variety
  const shuffledVolunteersInOffice = useMemo(() => {
    const shuffled = [...volunteersInOffice]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [volunteersInOffice])

  return {
    volunteers,
    volunteersInOffice,
    shuffledVolunteersInOffice,
    isOfficeOpen
  }
}
