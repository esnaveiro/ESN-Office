"use client"

import {useEffect, useState} from "react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Clock, Edit, History, Loader2, Plus, Trash2, User} from "lucide-react"

interface InventoryLog {
  id: string
  inventory_id: string
  action: 'created' | 'updated' | 'deleted'
  changed_by_id: string | null
  changed_by_name: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changes_description: string
  created_at: string
}

export function InventoryChangelog() {
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/inventory/logs')
      const data = await response.json()

      if (response.ok) {
        setLogs(data.logs || [])
      } else {
        console.error('Failed to fetch logs:', data.error)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4" />
      case 'updated':
        return <Edit className="h-4 w-4" />
      case 'deleted':
        return <Trash2 className="h-4 w-4" />
      default:
        return <History className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-primary'
      case 'updated':
        return 'bg-primary'
      case 'deleted':
        return 'bg-destructive'
      default:
        return 'bg-muted-foreground'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
          <p className="text-sm text-muted-foreground">
            Inventory changes will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Recent Changes
          <Badge variant="secondary" className="ml-auto">
            {logs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Action Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getActionColor(log.action)} flex items-center justify-center text-white`}>
                  {getActionIcon(log.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {log.changes_description}
                    </p>
                    <Badge variant="outline" className="capitalize text-xs shrink-0">
                      {log.action}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{log.changed_by_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(log.created_at)}</span>
                    </div>
                  </div>

                  {/* Show detailed changes for updates */}
                  {log.action === 'updated' && log.old_values && log.new_values && (
                    <div className="mt-2 pt-2 border-t space-y-1 text-xs">
                      {log.old_values.quantity !== log.new_values.quantity && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="line-through text-muted-foreground">
                            {String(log.old_values.quantity)}
                          </span>
                          <span>→</span>
                          <span className="font-medium">{String(log.new_values.quantity)}</span>
                        </div>
                      )}
                      {log.old_values.location !== log.new_values.location && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Location:</span>
                          <span className="line-through text-muted-foreground">
                            {String(log.old_values.location)}
                          </span>
                          <span>→</span>
                          <span className="font-medium">{String(log.new_values.location)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
