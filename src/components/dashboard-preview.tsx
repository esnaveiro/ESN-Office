"use client";

import React from 'react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
    Calendar as CalendarIcon,
    CalendarDays,
    CheckCircle,
    ChevronRight,
    Clock,
    MapPin,
    MessageSquare,
    QrCode,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';
import DashboardCard from '@/components/dashboard-card';

const mockDashboardData = {
    user: {
        name: "Maria Silva",
        role: "volunteer",
        section: "ESN Aveiro"
    },
    stats: {
        totalPoints: 1847,
        pointsThisMonth: 280,
        eventsAttended: 23,
        eventsThisMonth: 4,
        currentStreak: 3,
        feedbackSubmitted: 8,
        level: 4
    },
    upcomingEvents: [
        {
            id: "1",
            title: "International Dinner",
            date: "Nov 15",
            time: "19:00",
            location: "Aveiro Campus",
            type: "social"
        },
        {
            id: "2",
            title: "General Meeting #3",
            date: "Nov 18",
            time: "18:30",
            location: "Meeting Room A",
            type: "meeting"
        }
    ],
    recentActivity: [
        {
            id: "1",
            eventTitle: "Welcome Week Aveiro",
            date: "Nov 10",
            eventType: "trip",
            pointsEarned: 150,
            checkedInAt: new Date("2024-11-10")
        },
        {
            id: "2",
            eventTitle: "Buddy Training",
            date: "Nov 8",
            eventType: "training",
            pointsEarned: 100,
            checkedInAt: new Date("2024-11-08")
        }
    ]
};

interface DashboardPreviewProps {
    className?: string;
}

export function DashboardPreview({className = ""}: DashboardPreviewProps) {
    const {user, stats, upcomingEvents, recentActivity} = mockDashboardData;

    return (
        <div className={`bg-background ${className}`}>
            <div className="container mx-auto px-4 py-6 space-y-8 md:space-y-12 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Welcome back, {user.name}!
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {user.section} • {user.role}
                        </p>
                    </div>
                    {/*<Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 w-fit">*/}
                    {/*    Level {stats.level}*/}
                    {/*</Badge>*/}
                </div>

                {/* Personal Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardCard
                        title="Total Points"
                        value={stats.totalPoints}
                        description={`+${stats.pointsThisMonth} this month`}
                        icon={TrendingUp}
                        variant="primary"
                    />

                    <DashboardCard
                        title="Events Attended"
                        value={stats.eventsAttended}
                        description={`${stats.eventsThisMonth} this month`}
                        icon={Users}
                        textColor="text-esn-magenta"
                    />

                    <DashboardCard
                        title="Current Streak"
                        value={stats.currentStreak}
                        description="weeks in a row"
                        icon={Target}
                        textColor="text-esn-green"
                    />

                    <DashboardCard
                        title="Feedback Submitted"
                        value={stats.feedbackSubmitted}
                        description="forms completed"
                        icon={MessageSquare}
                        textColor="text-esn-orange"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
                    {/* Upcoming Events */}
                    <div className="bg-card border border-border rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-esn-cyan/20 to-esn-cyan/10 rounded-2xl">
                                    <CalendarDays className="h-5 w-5 text-esn-cyan"/>
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    Upcoming Events
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-2xl"
                            >
                                View All <ChevronRight className="h-4 w-4 ml-1"/>
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {upcomingEvents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div
                                        className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                                        <CalendarDays className="h-8 w-8 text-muted-foreground"/>
                                    </div>
                                    <p className="text-muted-foreground">No upcoming events. Check back later!</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
                                    >
                                        Browse Events
                                    </Button>
                                </div>
                            ) : (
                                upcomingEvents.map((event) => (
                                    <div key={event.id}
                                         className="group relative overflow-hidden dark:bg-muted/50 border border-border rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 space-y-2">
                                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                    {event.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <CalendarIcon className="h-4 w-4"/>
                                                    <span>{event.date}</span>
                                                    <span>•</span>
                                                    <MapPin className="h-4 w-4"/>
                                                    <span>{event.location}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs bg-muted text-muted-foreground border-border"
                                                    >
                                                        {event.type.replace('_', ' ')}
                                                    </Badge>
                                                    <div
                                                        className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3"/>
                                                        <span>{event.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="bg-gradient-to-r from-esn-cyan to-esn-cyan/90 hover:from-esn-cyan/90 hover:to-esn-cyan text-white rounded-2xl shadow-lg hover:shadow-esn-cyan/25 transition-all duration-300"
                                            >
                                                <QrCode className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Check-ins */}
                    <div className="bg-card border border-border rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-br from-esn-green/20 to-esn-green/10 rounded-2xl">
                                <CheckCircle className="h-5 w-5 text-esn-green"/>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Recent Check-ins
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-12">
                                    <div
                                        className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="h-8 w-8 text-muted-foreground"/>
                                    </div>
                                    <p className="text-muted-foreground">
                                        No check-ins yet. Start attending events to see your activity here!
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {recentActivity.map((attendance, index) => (
                                        <div key={attendance.id || `mock-${index}`} className="group">
                                            <div
                                                className="flex items-center justify-between p-4 dark:bg-muted/50 border border-border rounded-2xl transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="hidden md:flex w-3 h-3 bg-gradient-to-r from-esn-green to-esn-green/80 rounded-full shadow-lg shadow-esn-green/30"></div>
                                                    <div className="space-y-1">
                                                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                            Checked in to {attendance.eventTitle}
                                                        </h4>
                                                        <div
                                                            className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {attendance.checkedInAt
                                    ? attendance.checkedInAt.toLocaleDateString()
                                    : attendance.date
                                }
                              </span>
                                                            <span>•</span>
                                                            <span
                                                                className="capitalize">{attendance.eventType.replace('_', ' ')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge
                                                    className="bg-gradient-to-r from-esn-green to-esn-green/90 text-white border-0 rounded-full px-3 py-1">
                                                    +{attendance.pointsEarned} pts
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}