"use client"

import {useEffect, useMemo, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Checkbox} from "@/components/ui/checkbox"
import {Switch} from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {
    AlertCircle,
    Briefcase,
    CheckCircle,
    Clock,
    Edit,
    History,
    Loader2,
    LogOut,
    Mail,
    MapPin,
    Plus,
    Search,
    Settings as SettingsIcon,
    Shield,
    Trash2,
    User,
    Users,
    X,
} from "lucide-react"
import {supabaseClient} from "@/lib/auth-client"
import {checkOut} from "@/lib/presence-client"
import {useAuth} from "@/hooks/useAuth"
import {useRouter} from "next/navigation"
import Link from "next/link"
import {SiteHeader} from "@/components/site-header"
import {EsnRectangles} from "@/components/esn-rectangles"

interface OfficeHours {
    open: string
    close: string
    enabled: boolean
}

interface OfficeSetting {
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
    check_in_settings: {
        geolocation_radius_meters: number
        auto_checkout_hour: number
    }
    volunteer_positions: string[]
}

interface Volunteer {
    id: string
    name: string
    email: string
    position: string | null
    last_seen: string | null
    created_at: string
    is_in_office: boolean
}

interface InventoryLogDetails {
    inventory_id: string
}

interface InventoryLog {
    id: string
    item_name: string
    action: string
    changed_by_name: string
    created_at: string
    details: InventoryLogDetails
}

export default function AdminPage() {

    const { user, isAdmin, loading: authLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.replace('/')
        }
    }, [user, isAdmin, authLoading, router])
    const [positionTypes, setPositionTypes] = useState<string[]>(['WPA', 'VP', 'Treasurer', 'Secretary', 'Member'])
    const [newPositionInput, setNewPositionInput] = useState("")

    const handleAddPositionType = () => {
        const trimmed = newPositionInput.trim()
        if (!trimmed || positionTypes.includes(trimmed)) return
        const updated = [...positionTypes, trimmed]
        setPositionTypes(updated)
        setNewPositionInput("")
        fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({key: 'volunteer_positions', value: updated})
        })
    }
    // Office settings
    const [officeSettings, setOfficeSettings] = useState<OfficeSetting | null>(null)
    const [settingsSaving, setSettingsSaving] = useState(false)

    const [volunteers, setVolunteers] = useState<Volunteer[]>([])
    const [allVolunteers, setAllVolunteers] = useState<Volunteer[]>([])
    const [logs, setLogs] = useState<InventoryLog[]>([])
    const [loading, setLoading] = useState(false)
    const [checkingOut, setCheckingOut] = useState<string | null>(null)
    const [checkingOutAll, setCheckingOutAll] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Search
    const [searchQuery, setSearchQuery] = useState("")
    const [logSearchQuery, setLogSearchQuery] = useState("")

    // Edit volunteer dialog
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null)
    const [editName, setEditName] = useState("")
    const [editEmail, setEditEmail] = useState("")
    const [editPosition, setEditPosition] = useState("")
    const [saving, setSaving] = useState(false)

    // Delete volunteer dialog
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deletingVolunteer, setDeletingVolunteer] = useState<Volunteer | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Delete log dialog
    const [showDeleteLogDialog, setShowDeleteLogDialog] = useState(false)
    const [deletingLog, setDeletingLog] = useState<InventoryLog | null>(null)
    const [deletingLogItem, setDeletingLogItem] = useState(false)

    // Bulk delete logs dialog
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
    const [bulkDeleteDays, setBulkDeleteDays] = useState<string>("30")
    const [deleteAllLogs, setDeleteAllLogs] = useState(false)
    const [bulkDeleting, setBulkDeleting] = useState(false)


    // Board settings
    const [boardEmails, setBoardEmails] = useState<string[]>([])
    const [newEmail, setNewEmail] = useState("")
    const [loadingSettings, setLoadingSettings] = useState(false)
    const [savingSettings, setSavingSettings] = useState(false)
    const [showVolunteerPicker, setShowVolunteerPicker] = useState(false)
    const [volunteerPickerSearch, setVolunteerPickerSearch] = useState("")

    useEffect(() => {
        if (!user) return
        Promise.all([
            fetchVolunteers(),
            fetchAllVolunteers(),
            fetchLogs(),
            fetchBoardSettings(),
            fetchOfficeSettings(),
        ])
    }, [user])

    const fetchVolunteers = async () => {
        setLoading(true)
        try {
            const {data, error} = await supabaseClient
                .from('volunteers')
                .select('id, name, email, position, last_seen, created_at, is_in_office')
                .eq('is_in_office', true)
                .order('name')

            if (error) throw error

            setVolunteers(data || [])
        } catch (error) {
            console.error('Error fetching volunteers:', error)
            setMessage({type: 'error', text: 'Failed to fetch volunteers'})
        } finally {
            setLoading(false)
        }
    }

    const fetchAllVolunteers = async () => {
        try {
            const {data, error} = await supabaseClient
                .from('volunteers')
                .select('id, name, email, position, last_seen, created_at, is_in_office')
                .order('name')

            if (error) throw error
            setAllVolunteers(data || [])
        } catch (error) {
            console.error('Error fetching all volunteers:', error)
        }
    }

    const fetchLogs = async () => {
        try {
            const {data, error} = await supabaseClient
                .from('inventory_logs')
                .select('inventory_id, action, changed_by_name, changes_description, created_at, id')
                .order('created_at', {ascending: false})
                .limit(100)

            if (error) {
                // Table might not exist if inventory system isn't set up
                console.log('Inventory logs not available:', error.message)
                setLogs([])
                return
            }

            // Map the data to match our interface
            const mappedLogs = (data || []).map(log => ({
                id: log.id,
                item_name: log.changes_description || 'Unknown Item',
                action: log.action,
                changed_by_name: log.changed_by_name,
                created_at: log.created_at,
                details: { inventory_id: log.inventory_id }
            }))

            setLogs(mappedLogs)
        } catch {
            console.log('Inventory logs not available')
            setLogs([])
        }
    }

    const handleCheckOut = async (volunteerId: string, volunteerName: string) => {
        setCheckingOut(volunteerId)
        setMessage(null)
        try {
            await checkOut(volunteerId)
            setMessage({type: 'success', text: `${volunteerName} checked out successfully`})
            await fetchVolunteers() // Refresh the list
            await fetchAllVolunteers() // Refresh all volunteers
        } catch (error) {
            console.error('Error checking out volunteer:', error)
            setMessage({type: 'error', text: `Failed to check out ${volunteerName}`})
        } finally {
            setCheckingOut(null)
        }
    }

    const handleCheckOutAll = async () => {
        if (!volunteers.length) return

        const confirmed = window.confirm(
            `Are you sure you want to check out all ${volunteers.length} volunteer(s)?`
        )

        if (!confirmed) return

        setCheckingOutAll(true)
        setMessage(null)

        try {
            // Check out all volunteers in parallel
            const checkOutPromises = volunteers.map(v => checkOut(v.id))
            await Promise.all(checkOutPromises)

            setMessage({
                type: 'success',
                text: `Successfully checked out ${volunteers.length} volunteer(s)`
            })
            await fetchVolunteers() // Refresh the list
            await fetchAllVolunteers() // Refresh all volunteers
        } catch (error) {
            console.error('Error checking out all volunteers:', error)
            setMessage({type: 'error', text: 'Failed to check out all volunteers'})
        } finally {
            setCheckingOutAll(false)
        }
    }

    const handleEditClick = (volunteer: Volunteer) => {
        setEditingVolunteer(volunteer)
        setEditName(volunteer.name)
        setEditEmail(volunteer.email)
        setEditPosition(volunteer.position || 'none')
        setShowEditDialog(true)
    }

    const handleEditSave = async () => {
        if (!editingVolunteer) return

        setSaving(true)
        try {
            const {error} = await supabaseClient
                .from('volunteers')
                .update({
                    name: editName,
                    email: editEmail,
                    position: editPosition === 'none' ? null : editPosition,
                })
                .eq('id', editingVolunteer.id)

            if (error) throw error

            setMessage({type: 'success', text: 'Volunteer updated successfully'})
            setShowEditDialog(false)
            await fetchAllVolunteers()
            await fetchVolunteers()
        } catch (error) {
            console.error('Error updating volunteer:', error)
            setMessage({type: 'error', text: 'Failed to update volunteer'})
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteClick = (volunteer: Volunteer) => {
        setDeletingVolunteer(volunteer)
        setShowDeleteDialog(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deletingVolunteer) return

        setDeleting(true)
        try {
            const {error} = await supabaseClient
                .from('volunteers')
                .delete()
                .eq('id', deletingVolunteer.id)

            if (error) throw error

            setMessage({type: 'success', text: 'Volunteer deleted successfully'})
            setShowDeleteDialog(false)
            await fetchAllVolunteers()
            await fetchVolunteers()
        } catch (error) {
            console.error('Error deleting volunteer:', error)
            setMessage({type: 'error', text: 'Failed to delete volunteer'})
        } finally {
            setDeleting(false)
        }
    }

    const handleDeleteLogClick = (log: InventoryLog) => {
        setDeletingLog(log)
        setShowDeleteLogDialog(true)
    }

    const handleDeleteLogConfirm = async () => {
        if (!deletingLog) return

        setDeletingLogItem(true)
        try {
            const res = await fetch(`/api/inventory/logs?id=${deletingLog.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error)

            setMessage({type: 'success', text: 'Log entry deleted successfully'})
            setShowDeleteLogDialog(false)
            await fetchLogs()
        } catch (error) {
            console.error('Error deleting log:', error)
            setMessage({type: 'error', text: 'Failed to delete log entry'})
        } finally {
            setDeletingLogItem(false)
        }
    }

    const handleBulkDeleteLogs = async () => {
        setBulkDeleting(true)
        setMessage(null)

        try {
            if (deleteAllLogs) {
                const res = await fetch('/api/inventory/logs?all=true', { method: 'DELETE' })
                if (!res.ok) throw new Error((await res.json()).error)
                setMessage({type: 'success', text: 'All logs deleted successfully'})
            } else {
                const days = parseInt(bulkDeleteDays)
                if (isNaN(days) || days < 0) {
                    setMessage({type: 'error', text: 'Please enter a valid number of days'})
                    setBulkDeleting(false)
                    return
                }
                const res = await fetch(`/api/inventory/logs?older_than_days=${days}`, { method: 'DELETE' })
                if (!res.ok) throw new Error((await res.json()).error)
                setMessage({type: 'success', text: `Logs older than ${days} days deleted successfully`})
            }

            setShowBulkDeleteDialog(false)
            await fetchLogs()
        } catch (error) {
            console.error('Error bulk deleting logs:', error)
            setMessage({type: 'error', text: 'Failed to delete logs'})
        } finally {
            setBulkDeleting(false)
        }
    }

    const fetchBoardSettings = async () => {
        try {
            setLoadingSettings(true)
            const response = await fetch('/api/admin/board-settings')
            if (!response.ok) throw new Error('Failed to fetch board settings')

            const data = await response.json()
            setBoardEmails(data.board_emails || [])
        } catch (error) {
            console.error('Error fetching board settings:', error)
            setMessage({ type: 'error', text: 'Failed to load board settings' })
        } finally {
            setLoadingSettings(false)
        }
    }

    const fetchOfficeSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings')
            const data = await response.json()
            if (response.ok) {
                setOfficeSettings(data.settings)
                if (data.settings?.volunteer_positions?.length) {
                    setPositionTypes(data.settings.volunteer_positions)
                }
            }
        } catch (error) {
            console.error('Error fetching office settings:', error)
        }
    }

    const updateOfficeSetting = async (key: string, value: unknown) => {
        setSettingsSaving(true)
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({key, value})
            })
            if (response.ok) {
                await fetchOfficeSettings()
                setMessage({type: 'success', text: 'Settings saved successfully!'})
                setTimeout(() => setMessage(null), 3000)
            } else {
                const data = await response.json()
                setMessage({type: 'error', text: data.error || 'Failed to save settings'})
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            setMessage({type: 'error', text: 'Failed to save settings'})
        } finally {
            setSettingsSaving(false)
        }
    }

    const handleOfficeHoursChange = (day: string, field: 'open' | 'close' | 'enabled', value: string | boolean) => {
        if (!officeSettings) return
        updateOfficeSetting('office_hours', {
            ...officeSettings.office_hours,
            [day]: {...officeSettings.office_hours[day], [field]: value}
        })
    }



    const handleAddEmail = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!newEmail.trim()) {
            setMessage({ type: 'error', text: 'Please enter an email address' })
            return
        }
        if (!emailRegex.test(newEmail)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' })
            return
        }
        if (boardEmails.includes(newEmail)) {
            setMessage({ type: 'error', text: 'Email already exists' })
            return
        }

        setBoardEmails([...boardEmails, newEmail])
        setNewEmail("")
        setMessage(null)
    }

    const handleAddVolunteerEmail = (email: string) => {
        if (boardEmails.includes(email)) {
            setMessage({ type: 'error', text: 'Email already exists' })
            return
        }

        setBoardEmails([...boardEmails, email])
        setMessage(null)
    }

    const filteredVolunteersForBoard = useMemo(() => {
        const query = volunteerPickerSearch.toLowerCase()
        return allVolunteers.filter(v =>
            !boardEmails.includes(v.email) &&
            (v.name.toLowerCase().includes(query) ||
            v.email.toLowerCase().includes(query) ||
            v.position?.toLowerCase().includes(query))
        )
    }, [allVolunteers, boardEmails, volunteerPickerSearch])

    const handleRemoveEmail = (email: string) => {
        setBoardEmails(boardEmails.filter(e => e !== email))
    }

    const handleSaveBoardEmails = async () => {
        try {
            setSavingSettings(true)
            setMessage(null)

            const response = await fetch('/api/admin/board-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ board_emails: boardEmails })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to save board emails')
            }

            setMessage({ type: 'success', text: 'Board emails saved successfully!' })
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to save board emails'
            })
        } finally {
            setSavingSettings(false)
        }
    }

    const filteredVolunteers = useMemo(() => {
        const query = searchQuery.toLowerCase()
        return allVolunteers.filter(v =>
            v.name.toLowerCase().includes(query) ||
            v.email.toLowerCase().includes(query) ||
            v.position?.toLowerCase().includes(query)
        )
    }, [allVolunteers, searchQuery])

    const filteredLogs = useMemo(() => {
        const query = logSearchQuery.toLowerCase()
        return logs.filter(log =>
            log.item_name.toLowerCase().includes(query) ||
            log.changed_by_name.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query)
        )
    }, [logs, logSearchQuery])

    if (authLoading || !user || !isAdmin) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <EsnRectangles/>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </div>
            </div>
        )
    }

    // Admin panel
    return (
        <div className="min-h-screen bg-background">
            <SiteHeader/>

            <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-8 max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary"/>
                            Admin Panel
                        </h1>
                        <p className="text-muted-foreground">
                            Manage volunteers, check-outs, and inventory changelog
                        </p>
                    </div>
                </div>

                {/* Message Alert */}
                {message && (
                    <Alert
                        className={`mb-6 ${message.type === 'success' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'}`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-primary"/>
                        ) : (
                            <AlertCircle className="h-4 w-4 text-destructive"/>
                        )}
                        <AlertDescription className={message.type === 'success' ? 'text-primary' : 'text-destructive'}>
                            {message.text}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Tabs */}
                <Tabs defaultValue="checkouts" className="space-y-6">
                    <TabsList className="grid grid-cols-5 w-full">
                        <TabsTrigger value="checkouts">
                            <LogOut className="h-4 w-4 sm:mr-2"/>
                            <span className="hidden sm:inline">Check-Outs</span>
                        </TabsTrigger>
                        <TabsTrigger value="accounts">
                            <Users className="h-4 w-4 sm:mr-2"/>
                            <span className="hidden sm:inline">Accounts</span>
                        </TabsTrigger>
                        <TabsTrigger value="logs">
                            <History className="h-4 w-4 sm:mr-2"/>
                            <span className="hidden sm:inline">Logs</span>
                        </TabsTrigger>
                        <TabsTrigger value="board">
                            <Mail className="h-4 w-4 sm:mr-2"/>
                            <span className="hidden sm:inline">Board</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <SettingsIcon className="h-4 w-4 sm:mr-2"/>
                            <span className="hidden sm:inline">Settings</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Check-Outs Tab */}
                    <TabsContent value="checkouts" className="space-y-4">
                        {/* Stats Card */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-full bg-primary/10">
                                            <Users className="h-6 w-6 text-primary"/>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{volunteers.length}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Volunteer{volunteers.length !== 1 ? 's' : ''} currently checked in
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={fetchVolunteers}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                                    Refreshing...
                                                </>
                                            ) : (
                                                'Refresh'
                                            )}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleCheckOutAll}
                                            disabled={checkingOutAll || volunteers.length === 0}
                                        >
                                            {checkingOutAll ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                                    Checking out...
                                                </>
                                            ) : (
                                                <>
                                                    <LogOut className="h-4 w-4 mr-2"/>
                                                    Check Out All
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Volunteers List */}
                        {loading ? (
                            <Card>
                                <CardContent className="p-12 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                </CardContent>
                            </Card>
                        ) : volunteers.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground"/>
                                    <h3 className="text-lg font-semibold mb-2">No volunteers checked in</h3>
                                    <p className="text-sm text-muted-foreground">
                                        All volunteers are currently checked out
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {volunteers.map((volunteer) => (
                                    <Card key={volunteer.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-primary"/>
                                                        <h3 className="font-semibold">{volunteer.name}</h3>
                                                    </div>
                                                    <div className="ml-4 mt-1 space-y-0.5">
                                                        <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                                                        {volunteer.position && (
                                                            <p className="text-sm text-muted-foreground">{volunteer.position}</p>
                                                        )}
                                                        {volunteer.last_seen && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Last
                                                                seen: {new Date(volunteer.last_seen).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Link href={`/profile?userId=${volunteer.id}`} target="_blank">
                                                        <Button variant="outline" size="sm">
                                                            <User className="h-4 w-4 mr-2"/>
                                                            Profile
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCheckOut(volunteer.id, volunteer.name)}
                                                        disabled={checkingOut === volunteer.id}
                                                    >
                                                        {checkingOut === volunteer.id ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                                                Checking out...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <LogOut className="h-4 w-4 mr-2"/>
                                                                Check Out
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Account Management Tab */}
                    <TabsContent value="accounts" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Position Types</CardTitle>
                                <CardDescription>Manage the positions available when editing a volunteer</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {positionTypes.map((p) => (
                                        <Badge key={p} variant="secondary" className="px-3 py-1.5 flex items-center gap-2">
                                            {p}
                                            <button
                                                onClick={() => {
                                                    const updated = positionTypes.filter(x => x !== p)
                                                    setPositionTypes(updated)
                                                    fetch('/api/admin/settings', {
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json'},
                                                        body: JSON.stringify({key: 'volunteer_positions', value: updated})
                                                    })
                                                }}
                                                className="hover:bg-destructive/20 rounded-sm p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3"/>
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="New position (e.g. Marketing)"
                                        value={newPositionInput}
                                        onChange={e => setNewPositionInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddPositionType()}
                                        className="max-w-xs"
                                    />
                                    <Button variant="outline" onClick={handleAddPositionType} disabled={!newPositionInput.trim()}>
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Add
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Volunteer Accounts</CardTitle>
                                    <Badge>{filteredVolunteers.length} accounts</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        placeholder="Search by name, email, or position..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Volunteers List */}
                                {filteredVolunteers.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50"/>
                                        <p>No volunteers found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredVolunteers.map((v) => (
                                            <Card key={v.id} className="border-2">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold">{v.name}</h3>
                                                                {v.is_in_office && (
                                                                    <Badge>In Office</Badge>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    <Mail className="h-3 w-3"/>
                                                                    {v.email}
                                                                </div>
                                                                {v.position && (
                                                                    <div className="flex items-center gap-2">
                                                                        <Briefcase className="h-3 w-3"/>
                                                                        {v.position}
                                                                    </div>
                                                                )}
                                                                <div className="text-xs">
                                                                    Created: {new Date(v.created_at).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Link href={`/profile?userId=${v.id}`} target="_blank">
                                                                <Button variant="outline" size="sm">
                                                                    <User className="h-4 w-4"/>
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEditClick(v)}
                                                            >
                                                                <Edit className="h-4 w-4"/>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteClick(v)}
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Inventory Changelog Tab */}
                    <TabsContent value="logs" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <CardTitle>Recent Inventory Changes</CardTitle>
                                        <Badge>{filteredLogs.length} entries</Badge>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowBulkDeleteDialog(true)}
                                        disabled={logs.length === 0}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2"/>
                                        Clear Logs
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        placeholder="Search by item name, user, or action..."
                                        value={logSearchQuery}
                                        onChange={(e) => setLogSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Logs List */}
                                {filteredLogs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <History className="h-12 w-12 mx-auto mb-3 opacity-50"/>
                                        <p>No inventory changes found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredLogs.map((log) => (
                                            <Card key={log.id} className="border-2">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant={log.action === 'deleted' ? 'destructive' : 'default'}
                                                                    className="capitalize">
                                                                    {log.action}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm">{log.item_name}</p>
                                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="h-3 w-3"/>
                                                                    {log.changed_by_name}
                                                                </div>
                                                                <div>
                                                                    {new Date(log.created_at).toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteLogClick(log)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>


                    {/* Board Settings Tab */}
                    <TabsContent value="board" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Board Email Settings</CardTitle>
                                <CardDescription>
                                    Manage the list of email addresses that receive reservation approval requests
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {loadingSettings ? (
                                    <div className="py-12 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                    </div>
                                ) : (
                                    <>
                                        {/* Add Options */}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setShowVolunteerPicker(!showVolunteerPicker)}
                                            >
                                                <Users className="h-4 w-4 mr-2"/>
                                                {showVolunteerPicker ? 'Hide' : 'Select from'} Volunteers
                                            </Button>
                                        </div>

                                        {/* Volunteer Picker */}
                                        {showVolunteerPicker && (
                                            <Card className="border-2 border-primary">
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                                        <Input
                                                            placeholder="Search volunteers..."
                                                            value={volunteerPickerSearch}
                                                            onChange={(e) => setVolunteerPickerSearch(e.target.value)}
                                                            className="pl-10"
                                                        />
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                                        {filteredVolunteersForBoard.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                                {allVolunteers.length === boardEmails.length
                                                                    ? 'All volunteers already added'
                                                                    : 'No volunteers found'}
                                                            </p>
                                                        ) : (
                                                            filteredVolunteersForBoard.map((vol) => (
                                                                <Card
                                                                    key={vol.id}
                                                                    className="cursor-pointer hover:border-primary transition-colors"
                                                                    onClick={() => handleAddVolunteerEmail(vol.email)}
                                                                >
                                                                    <CardContent className="p-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <p className="font-medium text-sm">{vol.name}</p>
                                                                                <p className="text-xs text-muted-foreground">{vol.email}</p>
                                                                                {vol.position && (
                                                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                                                        {vol.position}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <Plus className="h-4 w-4 text-primary"/>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            ))
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Manual Email Entry */}
                                        <div className="space-y-2">
                                            <Label htmlFor="new-email">Or add email manually</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="new-email"
                                                    type="email"
                                                    placeholder="email@example.com"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            handleAddEmail()
                                                        }
                                                    }}
                                                />
                                                <Button onClick={handleAddEmail}>
                                                    <Plus className="h-4 w-4 mr-2"/>
                                                    Add
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Current Board Emails */}
                                        <div className="space-y-3">
                                            <Label>Current Board Members ({boardEmails.length})</Label>
                                            {boardEmails.length === 0 ? (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-50"/>
                                                    <p>No board emails configured</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {boardEmails.map((email, index) => (
                                                        <Card key={index} className="border-2">
                                                            <CardContent className="p-3">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Mail className="h-4 w-4 text-muted-foreground"/>
                                                                        <span className="text-sm">{email}</span>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveEmail(email)}
                                                                        className="text-destructive hover:text-destructive"
                                                                    >
                                                                        <X className="h-4 w-4"/>
                                                                    </Button>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Save Button */}
                                        <Button
                                            className="w-full"
                                            onClick={handleSaveBoardEmails}
                                            disabled={savingSettings}
                                        >
                                            {savingSettings ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                                    Saving...
                                                </>
                                            ) : (
                                                'Save Board Emails'
                                            )}
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4">
                        {/* Office Hours */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5"/>
                                    Office Hours
                                </CardTitle>
                                <CardDescription>Set when the office is open and available for reservations</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {officeSettings ? (
                                    Object.entries(officeSettings.office_hours).map(([day, hours]) => (
                                        <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                                            <div className="flex items-center gap-3 w-36">
                                                <Switch
                                                    checked={hours.enabled}
                                                    onCheckedChange={(checked) => handleOfficeHoursChange(day, 'enabled', checked)}
                                                    disabled={settingsSaving}
                                                />
                                                <Label className="capitalize font-medium">{day}</Label>
                                            </div>
                                            {hours.enabled ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-sm text-muted-foreground">Open:</Label>
                                                        <Input
                                                            type="time"
                                                            value={hours.open}
                                                            onChange={(e) => handleOfficeHoursChange(day, 'open', e.target.value)}
                                                            className="w-32"
                                                            disabled={settingsSaving}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-sm text-muted-foreground">Close:</Label>
                                                        <Input
                                                            type="time"
                                                            value={hours.close}
                                                            onChange={(e) => handleOfficeHoursChange(day, 'close', e.target.value)}
                                                            className="w-32"
                                                            disabled={settingsSaving}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-sm text-muted-foreground italic">Closed</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Check-In Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5"/>
                                    Check-In
                                </CardTitle>
                                <CardDescription>Geolocation and auto-checkout settings</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {officeSettings ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="geo-radius">Geolocation Radius (meters)</Label>
                                            <Input
                                                id="geo-radius"
                                                type="number"
                                                min="10"
                                                defaultValue={officeSettings.check_in_settings.geolocation_radius_meters}
                                                onBlur={(e) => updateOfficeSetting('check_in_settings', {
                                                    ...officeSettings.check_in_settings,
                                                    geolocation_radius_meters: parseInt(e.target.value) || 100
                                                })}
                                                disabled={settingsSaving}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Maximum distance from office to prompt check-in
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="auto-checkout">Auto Check-Out Hour (24h)</Label>
                                            <Input
                                                id="auto-checkout"
                                                type="number"
                                                min="0"
                                                max="23"
                                                defaultValue={officeSettings.check_in_settings.auto_checkout_hour}
                                                onBlur={(e) => updateOfficeSetting('check_in_settings', {
                                                    ...officeSettings.check_in_settings,
                                                    auto_checkout_hour: parseInt(e.target.value) || 5
                                                })}
                                                disabled={settingsSaving}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Hour when all users are automatically checked out
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>

            {/* Edit Volunteer Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Volunteer</DialogTitle>
                        <DialogDescription>
                            Update volunteer account information
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Volunteer name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Position</label>
                            <Select value={editPosition || "none"}
                                    onValueChange={(val) => setEditPosition(val === "none" ? "" : val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select position"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {positionTypes.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            className="sm:mr-auto"
                            onClick={() => {
                                if (editingVolunteer) {
                                    window.open(`/profile?userId=${editingVolunteer.id}`, '_blank', 'noopener')
                                }
                            }}
                        >
                            <User className="h-4 w-4 mr-2"/>
                            View Profile
                        </Button>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Volunteer Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5"/>
                            Delete Volunteer Account
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this account? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {deletingVolunteer && (
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="font-semibold">{deletingVolunteer.name}</p>
                            <p className="text-sm text-muted-foreground">{deletingVolunteer.email}</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Deleting...
                                </>
                            ) : (
                                'Delete Account'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Log Dialog */}
            <Dialog open={showDeleteLogDialog} onOpenChange={setShowDeleteLogDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5"/>
                            Delete Log Entry
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this changelog entry?
                        </DialogDescription>
                    </DialogHeader>

                    {deletingLog && (
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="font-semibold">{deletingLog.item_name}</p>
                            <p className="text-sm text-muted-foreground">
                                {deletingLog.action} by {deletingLog.changed_by_name}
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteLogDialog(false)}
                                disabled={deletingLogItem}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteLogConfirm} disabled={deletingLogItem}>
                            {deletingLogItem ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Deleting...
                                </>
                            ) : (
                                'Delete Entry'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Logs Dialog */}
            <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5"/>
                            Clear Inventory Logs
                        </DialogTitle>
                        <DialogDescription>
                            Choose how you want to clear the inventory changelog
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Delete All Option */}
                        <div className="flex items-start space-x-3 p-4 border rounded-lg">
                            <Checkbox
                                id="delete-all"
                                checked={deleteAllLogs}
                                onCheckedChange={(checked) => {
                                    setDeleteAllLogs(checked === true)
                                    if (checked) {
                                        setBulkDeleteDays("30")
                                    }
                                }}
                            />
                            <div className="flex-1 space-y-1">
                                <Label
                                    htmlFor="delete-all"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Delete all logs
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    This will permanently delete all inventory changelog entries
                                </p>
                            </div>
                        </div>

                        {/* Keep Last X Days Option */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="days-to-keep" className={deleteAllLogs ? 'opacity-50' : ''}>
                                    Keep logs from the last
                                </Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="days-to-keep"
                                    type="number"
                                    min="0"
                                    value={bulkDeleteDays}
                                    onChange={(e) => setBulkDeleteDays(e.target.value)}
                                    disabled={deleteAllLogs}
                                    className="flex-1"
                                    placeholder="30"
                                />
                                <span className={`text-sm ${deleteAllLogs ? 'text-muted-foreground' : ''}`}>
                                    days
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {deleteAllLogs
                                    ? 'Disabled when "Delete all logs" is checked'
                                    : `Logs older than ${bulkDeleteDays || '0'} days will be deleted`
                                }
                            </p>
                        </div>

                        {/* Warning */}
                        <Alert className="border-destructive bg-destructive/10">
                            <AlertCircle className="h-4 w-4 text-destructive"/>
                            <AlertDescription className="text-destructive">
                                <strong>Warning:</strong> This action cannot be undone.
                                {deleteAllLogs
                                    ? ' All inventory logs will be permanently deleted.'
                                    : ` Logs older than ${bulkDeleteDays || '0'} days will be permanently deleted.`
                                }
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowBulkDeleteDialog(false)
                                setDeleteAllLogs(false)
                                setBulkDeleteDays("30")
                            }}
                            disabled={bulkDeleting}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDeleteLogs} disabled={bulkDeleting}>
                            {bulkDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2"/>
                                    {deleteAllLogs ? 'Delete All' : 'Delete Old Logs'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
