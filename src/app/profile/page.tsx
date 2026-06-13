"use client"

import React, {useState, useEffect} from "react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {AlertCircle, ArrowLeft, CheckCircle, Loader2, Mail, MapPin, Save, Settings, User} from "lucide-react"
import {useAuth} from "@/hooks/useAuth"
import {AuthGuard} from "@/components/auth-guard"
import {supabaseClient} from "@/lib/auth-client"
import {SiteHeader} from "@/components/site-header";
import {EsnRectangles} from "@/components/esn-rectangles";
import {useRouter, useSearchParams} from "next/navigation";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'esn'

interface ViewedVolunteer {
    id: string
    name: string
    email: string
    position: string | null
    created_at: string
    last_seen: string | null
}

function ProfileContent() {
    const {volunteer, loading: authLoading, refreshVolunteer} = useAuth()
    const searchParams = useSearchParams()
    const userId = searchParams.get('userId')
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [retryingProfile, setRetryingProfile] = useState(false)
    const [viewedVolunteer, setViewedVolunteer] = useState<ViewedVolunteer | null>(null)
    const [fetchingUser, setFetchingUser] = useState(false)

    // Check if viewing another user's profile
    const isViewingOtherUser = userId && userId !== volunteer?.id

    // Profile form state
    const [name, setName] = useState(volunteer?.name || "")

    // Password change state (Supabase provider only)
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordError(null)
        setPasswordSuccess(false)

        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords do not match")
            return
        }
        if (newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters")
            return
        }

        setPasswordLoading(true)
        try {
            // Re-authenticate with current password first
            const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: volunteer!.email,
                password: currentPassword,
            })
            if (signInError) {
                setPasswordError("Current password is incorrect")
                return
            }
            const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword })
            if (updateError) throw updateError
            setPasswordSuccess(true)
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : "Failed to update password")
        } finally {
            setPasswordLoading(false)
        }
    }

    // Fetch viewed user's data
    useEffect(() => {
        if (userId && userId !== volunteer?.id) {
            const fetchUserData = async () => {
                setFetchingUser(true)
                try {
                    const { data, error } = await supabaseClient
                        .from('volunteers')
                        .select('id, name, email, position, created_at, last_seen')
                        .eq('id', userId)
                        .single()

                    if (error) throw error
                    setViewedVolunteer(data)
                } catch (err) {
                    console.error('Error fetching user data:', err)
                    setError('Failed to load user profile')
                } finally {
                    setFetchingUser(false)
                }
            }
            fetchUserData()
        } else {
            setViewedVolunteer(null)
        }
    }, [userId, volunteer?.id])

    // Update name when volunteer data loads
    useEffect(() => {
        if (volunteer?.name) {
            setName(volunteer.name)
        }
    }, [volunteer?.name])


    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            if (!volunteer?.id) {
                throw new Error("Volunteer profile is not available yet")
            }
            const {error} = await supabaseClient
                .from('volunteers')
                .update({
                    name: name.trim()
                    // Position is not updated - only admins should be able to change positions
                })
                .eq('id', volunteer.id)

            if (error) throw error

            await refreshVolunteer()
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message || "Failed to update profile")
            } else {
                setError("Failed to update profile")
            }
        } finally {
            setLoading(false)
        }
    }

    if (authLoading || fetchingUser) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <EsnRectangles/>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </div>
            </div>
        )
    }

    // Determine which profile to display
    const displayVolunteer = isViewingOtherUser ? viewedVolunteer : volunteer

    if (!volunteer) {
        return (
            <div className="min-h-screen bg-background">
                <EsnRectangles/>
                <SiteHeader/>
                <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-24 max-w-xl">
                    <Card className="p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                                <AlertCircle className="h-6 w-6"/>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Your volunteer profile is still loading</h2>
                                <p className="text-sm text-muted-foreground">
                                    This can happen right after sign-up or if the profile failed to sync. Try again or
                                    go
                                    back to the dashboard.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <Button
                                    className="flex-1"
                                    onClick={async () => {
                                        setRetryingProfile(true)
                                        try {
                                            await refreshVolunteer()
                                        } catch (refreshError) {
                                            console.error('Failed to refresh volunteer profile:', refreshError)
                                        } finally {
                                            setRetryingProfile(false)
                                        }
                                    }}
                                    disabled={retryingProfile}
                                >
                                    {retryingProfile ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                                            Retrying…
                                        </>
                                    ) : (
                                        'Try again'
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => router.replace('/dashboard')}
                                >
                                    Back to dashboard
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    // Show error if user not found
    if (isViewingOtherUser && !viewedVolunteer) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader/>
                <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-24 max-w-xl">
                    <Card className="p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                                <AlertCircle className="h-6 w-6"/>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">User not found</h2>
                                <p className="text-sm text-muted-foreground">
                                    The user you&apos;re looking for doesn&apos;t exist or has been removed.
                                </p>
                            </div>
                            <Button onClick={() => router.back()} variant="outline">
                                <ArrowLeft className="h-4 w-4 mr-2"/>
                                Go Back
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader/>

            <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-8 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <User className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                            {isViewingOtherUser ? 'User Profile' : 'Profile Settings'}
                        </h1>
                        <p className="text-muted-foreground">
                            {isViewingOtherUser
                                ? `Viewing ${displayVolunteer?.name}'s profile`
                                : 'Manage your account information and preferences'
                            }
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {!isViewingOtherUser && success && (
                    <Alert className="mb-6">
                        <CheckCircle className="h-4 w-4"/>
                        <AlertDescription>
                            Your changes have been saved successfully.
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4"/>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Profile Overview */}
                {displayVolunteer && (
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                                    {displayVolunteer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold">{displayVolunteer.name}</h2>
                                    <p className="text-muted-foreground flex items-center gap-2">
                                        <Mail className="h-4 w-4"/>
                                        {displayVolunteer.email}
                                    </p>
                                    <p className="text-muted-foreground flex items-center gap-2">
                                        <MapPin className="h-4 w-4"/>
                                        {displayVolunteer.position || "Volunteer"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Settings Tabs - Only show tabs for own profile */}
                {isViewingOtherUser ? (
                    // Read-only view for other users
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5"/>
                                Profile Information
                            </CardTitle>
                            <CardDescription>
                                Viewing {displayVolunteer?.name}&apos;s profile
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={displayVolunteer?.name || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                    value={displayVolunteer?.email || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Position</Label>
                                <Input
                                    value={displayVolunteer?.position || 'Volunteer'}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            <div className="mt-6 pt-6 border-t">
                                <h3 className="text-sm font-medium mb-2">Account Information</h3>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>Created: {displayVolunteer?.created_at ? new Date(displayVolunteer.created_at).toLocaleString() : 'N/A'}</p>
                                    {displayVolunteer?.last_seen && (
                                        <p>Last activity: {new Date(displayVolunteer.last_seen).toLocaleString()}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs defaultValue={searchParams.get('tab') ?? 'profile'} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="profile">Profile Information</TabsTrigger>
                            <TabsTrigger value="security">Security</TabsTrigger>
                        </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5"/>
                                    Profile Information
                                </CardTitle>
                                <CardDescription>
                                    Update your personal information and display preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    {/*<div className="grid grid-cols-1 md:grid-cols-2 gap-4">*/}
                                    {/*    <div className="space-y-2">*/}
                                    {/*        <Label htmlFor="name">Full Name</Label>*/}
                                    {/*        <Input*/}
                                    {/*            id="name"*/}
                                    {/*            type="text"*/}
                                    {/*            value={name}*/}
                                    {/*            onChange={(e) => setName(e.target.value)}*/}
                                    {/*            placeholder="Maria Silva"*/}
                                    {/*            required*/}
                                    {/*            disabled={loading}*/}
                                    {/*        />*/}
                                    {/*    </div>*/}

                                    {/*    <div className="space-y-2">*/}
                                    {/*        <Label htmlFor="position">Position (Optional)</Label>*/}
                                    {/*        <Input*/}
                                    {/*            id="position"*/}
                                    {/*            type="text"*/}
                                    {/*            value={position}*/}
                                    {/*            onChange={(e) => setPosition(e.target.value)}*/}
                                    {/*            placeholder="President, Volunteer, etc."*/}
                                    {/*            disabled={loading}*/}
                                    {/*        />*/}
                                    {/*    </div>*/}
                                    {/*</div>*/}

                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Maria Silva"
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={volunteer.email}
                                            disabled
                                            className="bg-muted"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Email cannot be changed. Contact your administrator if you need to update
                                            your email.
                                        </p>
                                    </div>

                                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                                        {loading ? (
                                            <>
                                                <Settings className="mr-2 h-4 w-4 animate-spin"/>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4"/>
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5"/>
                                    Security Settings
                                </CardTitle>
                                <CardDescription>
                                    Update your password and security preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {AUTH_PROVIDER === 'esn' ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">
                                            Your password is managed by your ESN account. To change it, visit your ESN profile.
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open('https://accounts.esn.org/user', '_blank', 'noopener')}
                                        >
                                            Manage on ESN Accounts
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handlePasswordChange} className="space-y-4">
                                        {passwordError && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4"/>
                                                <AlertDescription>{passwordError}</AlertDescription>
                                            </Alert>
                                        )}
                                        {passwordSuccess && (
                                            <Alert>
                                                <CheckCircle className="h-4 w-4"/>
                                                <AlertDescription>Password updated successfully.</AlertDescription>
                                            </Alert>
                                        )}
                                        <div className="space-y-2">
                                            <Label htmlFor="currentPassword">Current Password</Label>
                                            <Input
                                                id="currentPassword"
                                                type="password"
                                                value={currentPassword}
                                                onChange={e => setCurrentPassword(e.target.value)}
                                                required
                                                disabled={passwordLoading}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">New Password</Label>
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                disabled={passwordLoading}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                                disabled={passwordLoading}
                                            />
                                        </div>
                                        <Button type="submit" disabled={passwordLoading}>
                                            {passwordLoading ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Updating…</>
                                            ) : (
                                                'Update Password'
                                            )}
                                        </Button>
                                    </form>
                                )}

                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="text-sm font-medium mb-2">Account Information</h3>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>Account ID: {volunteer.id}</p>
                                        <p>Created: {new Date(volunteer.created_at).toLocaleString()}</p>
                                        {volunteer.last_seen && (
                                            <p>Last activity: {new Date(volunteer.last_seen).toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                )}
            </div>
        </div>
    )
}

export default function ProfilePage() {
    return (
        <AuthGuard>
            <ProfileContent/>
        </AuthGuard>
    )
}
