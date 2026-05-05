"use client"

import React, {useState} from "react"
import {Award, LayoutDashboard, Loader2, Users, X} from "lucide-react"
import {useQuery} from "@tanstack/react-query"
import {useRequireAuth} from "@/hooks/useRequireAuth"
import {getIcon} from "@/lib/icon-registry"
import {SiteHeader} from "@/components/site-header"
import {PageLoader} from "@/components/page-loader"
import {PersonalAnalyticsCard} from "@/components/personal-analytics-card"
import {DashboardSkeleton} from "@/components/dashboard-skeleton"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {type AnalyticsData, type Badge as BadgeType} from "@/lib/analytics"

interface BadgeHoldersData {
    count: number
    percentage: number
    totalVolunteers: number
    holders: Array<{ id: string; name: string }>
}

async function fetchAnalytics(volunteerId: string): Promise<AnalyticsData> {
    const res = await fetch(`/api/analytics?userId=${volunteerId}`)
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
}

export default function DashboardPage() {
    const {user, volunteer, loading: authLoading} = useRequireAuth()
    const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null)
    const [badgeHolders, setBadgeHolders] = useState<BadgeHoldersData | null>(null)
    const [loadingHolders, setLoadingHolders] = useState(false)

    // Shares the same query key as PersonalAnalyticsCard — no double fetch
    const {data: analytics, isLoading: loadingBadges} = useQuery({
        queryKey: ['analytics', volunteer?.id ?? ''],
        queryFn: () => fetchAnalytics(volunteer!.id),
        enabled: !!volunteer?.id,
        staleTime: 5 * 60 * 1000,
    })

    const badges = analytics?.badges ?? []
    const unlockedBadges = badges.filter(b => b.unlockedAt)
    const lockedBadges = badges.filter(b => !b.unlockedAt)

    const fetchBadgeHolders = async (badgeId: string) => {
        setLoadingHolders(true)
        try {
            const res = await fetch(`/api/analytics/badge-holders?badgeId=${badgeId}`)
            if (!res.ok) throw new Error('Failed to fetch badge holders')
            setBadgeHolders(await res.json())
        } catch {
            setBadgeHolders({count: 0, percentage: 0, totalVolunteers: 0, holders: []})
        } finally {
            setLoadingHolders(false)
        }
    }

    const handleBadgeClick = (badge: BadgeType) => {
        if (badge.unlockedAt) {
            setSelectedBadge(badge)
            fetchBadgeHolders(badge.id)
        }
    }

    const closeModal = () => {
        setSelectedBadge(null)
        setBadgeHolders(null)
    }

    if (authLoading) return <PageLoader/>
    if (!user || !volunteer) return <PageLoader message="Redirecting to sign in..."/>

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader/>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <LayoutDashboard className="h-8 w-8 text-primary"/>
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground">Your personal stats and achievements</p>
                </div>

                {loadingBadges ? (
                    <DashboardSkeleton/>
                ) : (
                    <div className="space-y-6">
                        {/* Stats + buddies — reads from same React Query cache */}
                        <PersonalAnalyticsCard volunteerId={volunteer.id}/>

                        {/* Unlocked Badges */}
                        {unlockedBadges.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Award className="h-5 w-5 text-primary"/>
                                        Unlocked Badges
                                        <span className="text-sm font-normal text-muted-foreground ml-auto">
                                            {unlockedBadges.length} out of {badges.length}
                                        </span>
                                    </CardTitle>
                                    <CardDescription>
                                        Badges you&apos;ve earned by staying active in the office
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {unlockedBadges.map((badge) => {
                                            const IconComponent = getIcon(badge.icon)
                                            return (
                                                <button
                                                    key={badge.id}
                                                    onClick={() => handleBadgeClick(badge)}
                                                    className="p-4 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer text-left"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-full bg-primary/20">
                                                            {IconComponent && <IconComponent className="h-6 w-6 text-primary"/>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm mb-1">{badge.name}</p>
                                                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                                                            {badge.unlockedAt && (
                                                                <p className="text-xs text-muted-foreground mt-2">
                                                                    Unlocked {new Date(badge.unlockedAt).toLocaleDateString('en-US', {
                                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                                })}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Locked Badges */}
                        {lockedBadges.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-muted-foreground">Locked Badges</CardTitle>
                                    <CardDescription>Keep checking in to unlock these achievements</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {lockedBadges.map((badge) => {
                                            const IconComponent = getIcon(badge.icon)
                                            return (
                                                <div key={badge.id} className="p-4 rounded-lg border bg-muted/20">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-full bg-muted/40 opacity-40">
                                                            {IconComponent && <IconComponent className="h-6 w-6 text-muted-foreground"/>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm mb-1 text-muted-foreground">{badge.name}</p>
                                                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                                                            {badge.progress !== undefined && badge.target !== undefined && (
                                                                <div className="mt-3">
                                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                                        <span className="text-muted-foreground">Progress</span>
                                                                        <span className="font-medium">{badge.progress}/{badge.target}</span>
                                                                    </div>
                                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-primary transition-all"
                                                                            style={{width: `${Math.min(100, (badge.progress / badge.target) * 100)}%`}}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {badges.length === 0 && (
                            <Card>
                                <CardContent className="py-12">
                                    <div className="text-center">
                                        <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50"/>
                                        <p className="text-sm text-muted-foreground mb-1">No badges yet</p>
                                        <p className="text-xs text-muted-foreground">
                                            Check in to the office to start earning badges!
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-full bg-primary/20">
                                        {(() => {
                                            const IconComponent = getIcon(selectedBadge.icon)
                                            return IconComponent ? <IconComponent className="h-8 w-8 text-primary"/> : null
                                        })()}
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{selectedBadge.name}</CardTitle>
                                        <CardDescription>{selectedBadge.description}</CardDescription>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8">
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedBadge.unlockedAt && (
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-sm font-medium mb-1">Unlocked</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(selectedBadge.unlockedAt).toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}

                            {selectedBadge.progress !== undefined && selectedBadge.target !== undefined && (
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-sm font-medium mb-2">Your Progress</p>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl font-bold text-primary">{selectedBadge.progress}</span>
                                        <span className="text-sm text-muted-foreground">/ {selectedBadge.target}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{width: `${Math.min(100, (selectedBadge.progress / selectedBadge.target) * 100)}%`}}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-primary"/>
                                    <p className="text-sm font-medium">Badge Holders</p>
                                </div>
                                {loadingHolders ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary"/>
                                        <span className="text-sm text-muted-foreground">Loading...</span>
                                    </div>
                                ) : badgeHolders ? (
                                    <>
                                        <p className="text-2xl font-bold text-primary mb-2">{badgeHolders.percentage}%</p>
                                        <p className="text-xs text-muted-foreground">
                                            {badgeHolders.count === 1
                                                ? '1 volunteer has unlocked this badge'
                                                : `${badgeHolders.count} volunteers have unlocked this badge`}
                                        </p>
                                        {badgeHolders.count > 0 && badgeHolders.holders.length > 0 && (
                                            <div className="mt-3 pt-3 border-t">
                                                <p className="text-xs font-medium text-muted-foreground mb-2">Recent holders:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {badgeHolders.holders.slice(0, 10).map((holder) => (
                                                        <Badge key={holder.id} variant="secondary" className="text-xs">
                                                            {holder.name}
                                                        </Badge>
                                                    ))}
                                                    {badgeHolders.holders.length > 10 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{badgeHolders.holders.length - 10} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
