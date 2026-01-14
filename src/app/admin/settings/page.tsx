"use client"

import {useEffect, useState} from "react"
import {useRouter} from "next/navigation"
import {SiteHeader} from "@/components/site-header"
import {useAuth} from "@/hooks/useAuth"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import {Switch} from "@/components/ui/switch"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Package,
  Plus,
  Settings as SettingsIcon,
  X,
} from "lucide-react"

interface OfficeHours {
  open: string
  close: string
  enabled: boolean
}

interface Settings {
  board_emails: string[]
  office_hours: Record<string, OfficeHours>
  reservation_rules: {
    max_per_user_per_month: number
    advance_booking_days: number
    min_duration_minutes: number
    max_duration_hours: number
  }
  inventory_defaults: {
    low_stock_threshold: number
    categories: string[]
  }
  email_settings: {
    from_name: string
    reply_to: string
  }
  check_in_settings: {
    geolocation_radius_meters: number
    auto_checkout_hour: number
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Temporary state for editing
  const [newEmail, setNewEmail] = useState("")
  const [newCategory, setNewCategory] = useState("")

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
    }
  }, [authLoading, user, router])

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (response.ok) {
        setSettings(data.settings)
      } else {
        console.error('Failed to fetch settings:', data.error)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  const updateSetting = async (key: string, value: string | number | boolean | string[] | Record<string, unknown>) => {
    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        await fetchSettings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving settings' })
    } finally {
      setSaving(false)
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleAddEmail = () => {
    if (!newEmail || !settings) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setMessage({ type: 'error', text: 'Invalid email format' })
      return
    }

    const updatedEmails = [...settings.board_emails, newEmail]
    updateSetting('board_emails', updatedEmails)
    setNewEmail("")
  }

  const handleRemoveEmail = (email: string) => {
    if (!settings) return
    const updatedEmails = settings.board_emails.filter(e => e !== email)
    updateSetting('board_emails', updatedEmails)
  }

  const handleAddCategory = () => {
    if (!newCategory || !settings) return
    const updatedCategories = [...settings.inventory_defaults.categories, newCategory]
    updateSetting('inventory_defaults', {
      ...settings.inventory_defaults,
      categories: updatedCategories
    })
    setNewCategory("")
  }

  const handleRemoveCategory = (category: string) => {
    if (!settings) return
    const updatedCategories = settings.inventory_defaults.categories.filter(c => c !== category)
    updateSetting('inventory_defaults', {
      ...settings.inventory_defaults,
      categories: updatedCategories
    })
  }

  const handleOfficeHoursChange = (day: string, field: 'open' | 'close' | 'enabled', value: string | boolean) => {
    if (!settings) return

    const updatedHours = {
      ...settings.office_hours,
      [day]: {
        ...settings.office_hours[day],
        [field]: value
      }
    }
    updateSetting('office_hours', updatedHours)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load settings</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-8 w-8 text-primary" />
              System Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your ESN Office Management System
            </p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'}`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-primary" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-primary' : 'text-destructive'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Tabs */}
        <Tabs defaultValue="board" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="board">
              <Mail className="h-4 w-4 mr-2" />
              Board
            </TabsTrigger>
            <TabsTrigger value="office">
              <Clock className="h-4 w-4 mr-2" />
              Office Hours
            </TabsTrigger>
            <TabsTrigger value="reservations">
              <Calendar className="h-4 w-4 mr-2" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="checkin">
              <MapPin className="h-4 w-4 mr-2" />
              Check-In
            </TabsTrigger>
          </TabsList>

          {/* Board Members Tab */}
          <TabsContent value="board">
            <Card>
              <CardHeader>
                <CardTitle>Board Member Emails</CardTitle>
                <CardDescription>
                  Manage who receives reservation approval requests and system notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Board Emails</Label>
                  <div className="flex flex-wrap gap-2">
                    {settings.board_emails.map((email, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1.5 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {email}
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="hover:bg-destructive/20 rounded-sm p-0.5 transition-colors"
                          title="Remove email"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="board@esnaveiro.org"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                  />
                  <Button onClick={handleAddEmail} disabled={saving || !newEmail}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Office Hours Tab */}
          <TabsContent value="office">
            <Card>
              <CardHeader>
                <CardTitle>Office Hours</CardTitle>
                <CardDescription>
                  Set when the office is open and available for reservations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.office_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3 w-32">
                      <Switch
                        checked={hours.enabled}
                        onCheckedChange={(checked) => handleOfficeHoursChange(day, 'enabled', checked)}
                      />
                      <Label className="capitalize font-medium">{day}</Label>
                    </div>
                    {hours.enabled && (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Open:</Label>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleOfficeHoursChange(day, 'open', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Close:</Label>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleOfficeHoursChange(day, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    )}
                    {!hours.enabled && (
                      <span className="text-sm text-muted-foreground italic">Closed</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reservation Rules Tab */}
          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle>Reservation Rules</CardTitle>
                <CardDescription>
                  Configure limits and rules for office reservations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-reservations">Max Reservations per User/Month</Label>
                    <Input
                      id="max-reservations"
                      type="number"
                      min="1"
                      value={settings.reservation_rules.max_per_user_per_month}
                      onChange={(e) => updateSetting('reservation_rules', {
                        ...settings.reservation_rules,
                        max_per_user_per_month: parseInt(e.target.value) || 10
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="advance-days">Advance Booking Days</Label>
                    <Input
                      id="advance-days"
                      type="number"
                      min="1"
                      value={settings.reservation_rules.advance_booking_days}
                      onChange={(e) => updateSetting('reservation_rules', {
                        ...settings.reservation_rules,
                        advance_booking_days: parseInt(e.target.value) || 30
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-duration">Min Duration (minutes)</Label>
                    <Input
                      id="min-duration"
                      type="number"
                      min="15"
                      step="15"
                      value={settings.reservation_rules.min_duration_minutes}
                      onChange={(e) => updateSetting('reservation_rules', {
                        ...settings.reservation_rules,
                        min_duration_minutes: parseInt(e.target.value) || 30
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-duration">Max Duration (hours)</Label>
                    <Input
                      id="max-duration"
                      type="number"
                      min="1"
                      max="24"
                      value={settings.reservation_rules.max_duration_hours}
                      onChange={(e) => updateSetting('reservation_rules', {
                        ...settings.reservation_rules,
                        max_duration_hours: parseInt(e.target.value) || 8
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Settings</CardTitle>
                <CardDescription>
                  Configure default settings for inventory management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="low-stock">Default Low Stock Threshold</Label>
                  <Input
                    id="low-stock"
                    type="number"
                    min="0"
                    value={settings.inventory_defaults.low_stock_threshold}
                    onChange={(e) => updateSetting('inventory_defaults', {
                      ...settings.inventory_defaults,
                      low_stock_threshold: parseInt(e.target.value) || 5
                    })}
                    className="w-48"
                  />
                  <p className="text-xs text-muted-foreground">
                    Items with quantity at or below this number will be marked as low stock
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Inventory Categories</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {settings.inventory_defaults.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1.5 flex items-center gap-2">
                        {category}
                        <button
                          onClick={() => handleRemoveCategory(category)}
                          className="hover:bg-destructive/20 rounded-sm p-0.5 transition-colors"
                          title="Remove category"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="New category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Button onClick={handleAddCategory} disabled={saving || !newCategory}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Check-In Tab */}
          <TabsContent value="checkin">
            <Card>
              <CardHeader>
                <CardTitle>Check-In Settings</CardTitle>
                <CardDescription>
                  Configure geolocation and auto-checkout settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="geo-radius">Geolocation Radius (meters)</Label>
                    <Input
                      id="geo-radius"
                      type="number"
                      min="10"
                      value={settings.check_in_settings.geolocation_radius_meters}
                      onChange={(e) => updateSetting('check_in_settings', {
                        ...settings.check_in_settings,
                        geolocation_radius_meters: parseInt(e.target.value) || 100
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum distance from office to allow check-in
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto-checkout">Auto Check-Out Hour (24h format)</Label>
                    <Input
                      id="auto-checkout"
                      type="number"
                      min="0"
                      max="23"
                      value={settings.check_in_settings.auto_checkout_hour}
                      onChange={(e) => updateSetting('check_in_settings', {
                        ...settings.check_in_settings,
                        auto_checkout_hour: parseInt(e.target.value) || 5
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Hour when all users are automatically checked out (currently {settings.check_in_settings.auto_checkout_hour}:00 AM)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
