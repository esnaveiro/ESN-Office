"use client"

import {useQuery} from "@tanstack/react-query"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {BarChart3, Calendar, Clock, Flame, Star, TrendingUp, Users} from "lucide-react"
import {type AnalyticsData, type OfficeBuddy, formatDuration} from "@/lib/analytics"

interface PersonalAnalyticsCardProps {
    volunteerId: string
}

async function fetchAnalytics(volunteerId: string): Promise<AnalyticsData> {
    const res = await fetch(`/api/analytics?userId=${volunteerId}`)
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
}

async function fetchBuddies(volunteerId: string): Promise<OfficeBuddy[]> {
    const res = await fetch(`/api/analytics/buddies?userId=${volunteerId}`)
    if (!res.ok) throw new Error('Failed to fetch buddies')
    const data = await res.json()
    return data.officeBuddies ?? []
}

export function PersonalAnalyticsCard({volunteerId}: PersonalAnalyticsCardProps) {
    const {data: analytics, isLoading, isError} = useQuery({
        queryKey: ['analytics', volunteerId],
        queryFn: () => fetchAnalytics(volunteerId),
        staleTime: 5 * 60 * 1000, // 5 min
    })

    // Buddies loaded lazily — starts only after main analytics are ready
    const {data: buddies = [], isLoading: buddiesLoading} = useQuery({
        queryKey: ['analytics-buddies', volunteerId],
        queryFn: () => fetchBuddies(volunteerId),
        enabled: !!analytics,
        staleTime: 5 * 60 * 1000,
    })

    if (isLoading) {
        return (
            <>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted animate-pulse"/>
                            <div className="flex-1 space-y-2">
                                <div className="h-8 w-24 bg-muted rounded animate-pulse"/>
                                <div className="h-3 w-32 bg-muted rounded animate-pulse"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-muted rounded animate-pulse"/>
                            <div className="h-5 w-24 bg-muted rounded animate-pulse"/>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-4 rounded-lg border bg-card space-y-2">
                                    <div className="h-3 w-20 bg-muted rounded animate-pulse"/>
                                    <div className="h-8 w-16 bg-muted rounded animate-pulse"/>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-muted rounded animate-pulse"/>
                            <div className="h-5 w-32 bg-muted rounded animate-pulse"/>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2].map((i) => (
                                <div key={i} className="p-4 rounded-lg border bg-card space-y-2">
                                    <div className="h-3 w-20 bg-muted rounded animate-pulse"/>
                                    <div className="h-8 w-16 bg-muted rounded animate-pulse"/>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </>
        )
    }

    if (isError || !analytics) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-sm text-muted-foreground">Failed to load analytics data</p>
                </CardContent>
            </Card>
        )
    }

    const {weeklyStats, monthlyStats} = analytics

    return (
        <>
            {/* Current Streak */}
            {monthlyStats.currentStreak > 0 && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/20">
                                <Flame className="h-6 w-6 text-primary"/>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">
                                    {monthlyStats.currentStreak} Day{monthlyStats.currentStreak !== 1 ? 's' : ''}
                                </p>
                                <p className="text-sm text-muted-foreground">Current Streak</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Weekly Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5 text-primary"/>
                        This Week
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-muted-foreground"/>
                                <p className="text-xs text-muted-foreground">Total Hours</p>
                            </div>
                            <p className="text-2xl font-bold">{weeklyStats.totalHours}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                                <p className="text-xs text-muted-foreground">Check-ins</p>
                            </div>
                            <p className="text-2xl font-bold">{weeklyStats.totalCheckIns}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="h-4 w-4 text-muted-foreground"/>
                                <p className="text-xs text-muted-foreground">Avg Session</p>
                            </div>
                            <p className="text-2xl font-bold">{formatDuration(weeklyStats.averageSessionMinutes)}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <Star className="h-4 w-4 text-muted-foreground"/>
                                <p className="text-xs text-muted-foreground">Most Active</p>
                            </div>
                            <p className="text-2xl font-bold truncate">{weeklyStats.mostActiveDay}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Monthly Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5 text-primary"/>
                        Last 30 Days
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-muted-foreground"/>
                                <p className="text-xs text-muted-foreground">Total Hours</p>
                            </div>
                            <p className="text-2xl font-bold">{monthlyStats.totalHours}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-muted-foreground"/>
                                <p className="text-xs text-muted-foreground">Days Active</p>
                            </div>
                            <p className="text-2xl font-bold">{monthlyStats.daysActive}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Office Buddies — rendered once lazy load completes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-primary"/>
                        Your Top Office Buddies
                    </CardTitle>
                    <CardDescription>Volunteers you&apos;ve spent the most time with</CardDescription>
                </CardHeader>
                <CardContent>
                    {buddiesLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i}
                                     className="flex items-center justify-between p-4 rounded-lg border bg-card">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse"/>
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-muted rounded animate-pulse"/>
                                            <div className="h-3 w-24 bg-muted rounded animate-pulse"/>
                                        </div>
                                    </div>
                                    <div className="h-6 w-16 bg-muted rounded animate-pulse"/>
                                </div>
                            ))}
                        </div>
                    ) : buddies.length > 0 ? (
                        <div className="space-y-2">
                            {buddies.map((buddy, idx) => (
                                <div key={buddy.volunteerId}
                                     className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{buddy.volunteerName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDuration(buddy.totalMinutesTogether)} together
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {buddy.overlapCount} session{buddy.overlapCount !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50"/>
                            <p className="text-sm text-muted-foreground mb-1">No office buddies yet</p>
                            <p className="text-xs text-muted-foreground">
                                Check in when others are in the office to find your buddies!
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
