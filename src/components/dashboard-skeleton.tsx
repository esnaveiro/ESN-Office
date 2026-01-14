import {Card, CardContent, CardHeader} from "@/components/ui/card"

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Current Streak Skeleton */}
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

            {/* Weekly Stats Skeleton */}
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

            {/* Monthly Stats Skeleton */}
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

            {/* Office Buddies Skeleton */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-muted rounded animate-pulse"/>
                        <div className="h-5 w-40 bg-muted rounded animate-pulse"/>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card">
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
                </CardContent>
            </Card>

            {/* Unlocked Badges Skeleton */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-5 bg-muted rounded animate-pulse"/>
                        <div className="h-6 w-32 bg-muted rounded animate-pulse"/>
                        <div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto"/>
                    </div>
                    <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2"/>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 rounded-lg border bg-muted/20">
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse"/>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-24 bg-muted rounded animate-pulse"/>
                                        <div className="h-3 w-full bg-muted rounded animate-pulse"/>
                                        <div className="h-3 w-20 bg-muted rounded animate-pulse"/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Locked Badges Skeleton */}
            <Card>
                <CardHeader>
                    <div className="h-6 w-32 bg-muted rounded animate-pulse"/>
                    <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2"/>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="p-4 rounded-lg border bg-muted/20">
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse"/>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-24 bg-muted rounded animate-pulse"/>
                                        <div className="h-3 w-full bg-muted rounded animate-pulse"/>
                                        <div className="h-1.5 w-full bg-muted rounded animate-pulse mt-3"/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
