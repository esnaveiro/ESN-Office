import { Card } from "@/components/ui/card"
import { Users } from "lucide-react"

interface LocalVolunteer {
  id: string
  name: string
  status: string
  avatar: string
  position?: string
  isInOffice?: boolean
  timestamp?: Date
  confirmationType?: "firm" | "flex" | "confirmed"
}

interface CurrentAttendanceCardProps {
  volunteersInOffice: LocalVolunteer[]
  onVolunteerClick: (volunteer: LocalVolunteer) => void
}

export function CurrentAttendanceCard({ volunteersInOffice, onVolunteerClick }: CurrentAttendanceCardProps) {
  return (
    <Card className="p-8">
      <div className="z-10 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Current Attendance</h2>
        </div>

        {/* Count Display */}
        <div className="text-center relative">
          <div className="text-8xl font-bold mb-2">
            {volunteersInOffice.length}
          </div>
          <div className="text-xl text-muted-foreground">
            {volunteersInOffice.length === 0 ? "volunteers in office" :
              volunteersInOffice.length === 1 ? "volunteer in office" :
                "volunteers in office"}
          </div>
        </div>

        {/* Volunteer Avatars */}
        {volunteersInOffice.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2 justify-center">
              {volunteersInOffice.slice(0, 8).map((volunteer) => (
                <div
                  key={volunteer.id}
                  className={`relative group cursor-pointer transition-all duration-500 ${volunteer.status === 'dnd' ? 'opacity-40' : ''}`}
                  title={volunteer.name}
                  onClick={() => onVolunteerClick(volunteer)}
                >
                  <div
                    className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-sm text-primary border-2 border-primary/40 hover:border-primary hover:scale-110 transition-all">
                    {volunteer.avatar}
                  </div>

                  {/* Tooltip */}
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div
                      className="bg-popover text-popover-foreground border border-border text-xs rounded px-2 py-1 whitespace-nowrap">
                      {volunteer.name}
                    </div>
                  </div>
                </div>
              ))}
              {volunteersInOffice.length > 8 && (
                <div
                  className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground border-2 border-border">
                  +{volunteersInOffice.length - 8}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
