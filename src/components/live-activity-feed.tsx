"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Activity {
  id: string
  type: "check-in" | "check-out"
  volunteerName: string
  timestamp: Date
}

interface LocalVolunteer {
  id: string
  name: string
}

interface LiveActivityFeedProps {
  volunteers: LocalVolunteer[]
}

export function LiveActivityFeed({ volunteers }: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    // Fetch recent presence logs
    const fetchRecentLogs = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('presence_logs')
        .select(`
          id,
          action,
          timestamp,
          volunteer_id,
          volunteers (
            name
          )
        `)
        .gte('timestamp', fiveMinutesAgo)
        .order('timestamp', { ascending: false })
        .limit(10)

      if (!error && data) {
        const newActivities: Activity[] = data.map(log => {
          const volunteer = log.volunteers as { name?: string } | null
          return {
            id: log.id,
            type: log.action === 'check_in' ? 'check-in' : 'check-out',
            volunteerName: volunteer?.name ?? 'Unknown',
            timestamp: new Date(log.timestamp),
          }
        })
        setActivities(newActivities)
      }
    }

    fetchRecentLogs()

    // Set up real-time subscription for new presence logs
    const channel = supabase
      .channel('presence_logs_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'presence_logs'
        },
        (payload) => {
          // Look up volunteer name from volunteers array
          const volunteer = volunteers.find(v => v.id === payload.new.volunteer_id)

          if (volunteer) {
            const newActivity: Activity = {
              id: payload.new.id,
              type: payload.new.action === 'check_in' ? 'check-in' : 'check-out',
              volunteerName: volunteer.name,
              timestamp: new Date(payload.new.timestamp),
            }
            setActivities(prev => [newActivity, ...prev].slice(0, 10))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [volunteers])

  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Live Activity</h3>
      </div>
      <div className="space-y-3 overflow-y-auto flex-1">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted"
            >
              <div className="w-2 h-2 rounded-full bg-primary mt-2 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.volunteerName}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.type === "check-in" ? "checked in" : "checked out"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.floor((Date.now() - activity.timestamp.getTime()) / 60000)}m ago
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </Card>
  )
}
