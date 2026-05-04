"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card} from "@/components/ui/card";
import {Calendar, Clock, Users, X} from "lucide-react";
import {useSchedules} from "@/hooks/useRealtime";

const timeToMinutes = (time: string) => {
    const [hoursStr = "0", minutesStr = "0"] = time.split(':')
    const hours = Number.parseInt(hoursStr, 10)
    const minutes = Number.parseInt(minutesStr, 10)
    return hours * 60 + minutes
}

type VolunteerStatus = "available" | "dnd" | "break" | "remote";
type ConfirmationType = "firm" | "flex" | "confirmed";

interface LocalVolunteer {
    id: string;
    name: string;
    status: VolunteerStatus;
    position?: string;
    note?: string;
    timestamp: Date;
    avatar: string;
    isInOffice: boolean;
    confirmationType: ConfirmationType;
}

// interface Schedule {
//     id: string;
//     volunteer_id: string;
//     date: string;
//     start_time: string;
//     end_time: string;
//     confirmation_type: ConfirmationType;
//     volunteer: DatabaseVolunteer;
// }

interface HourBucket {
    hour: number;
    time: string;
    volunteers: LocalVolunteer[];
    totalCount: number;
    visibleCount: number;
    overflowCount: number;
}

interface StackedAvatarTimelineProps {
    volunteers: LocalVolunteer[];
    maxAvatarsPerBucket?: number;
}

export function StackedAvatarTimeline({
                                          volunteers: _volunteers,
                                          maxAvatarsPerBucket = 3
                                      }: StackedAvatarTimelineProps) {
    const [selectedBucket, setSelectedBucket] = useState<HourBucket | null>(null);
    const {schedules} = useSchedules(new Date().toISOString().split('T')[0]);

    // Generate hour buckets from 9 AM to 6 PM based on real schedules
    const generateHourBuckets = (): HourBucket[] => {
        const buckets: HourBucket[] = [];

        for (let hour = 9; hour <= 18; hour++) {
            const time = `${hour.toString().padStart(2, '0')}:00`;
            const slotMinutes = hour * 60;

            // Find schedules that include this hour
            const hourVolunteers = schedules.filter(schedule => {
                const startMinutes = timeToMinutes(schedule.start_time);
                const endMinutes = timeToMinutes(schedule.end_time);
                return slotMinutes >= startMinutes && slotMinutes < endMinutes;
            }).map(schedule => ({
                id: schedule.volunteer.id,
                name: schedule.volunteer.name,
                status: schedule.volunteer.status,
                position: schedule.volunteer.position || undefined,
                timestamp: new Date(schedule.volunteer.last_seen || schedule.volunteer.created_at),
                avatar: schedule.volunteer.name.split(' ').map(n => n[0]).join('').toUpperCase(),
                isInOffice: schedule.volunteer.is_in_office,
                confirmationType: schedule.confirmation_type
            } as LocalVolunteer));

            const totalCount = hourVolunteers.length;
            const visibleCount = Math.min(totalCount, maxAvatarsPerBucket);
            const overflowCount = Math.max(0, totalCount - maxAvatarsPerBucket);

            buckets.push({
                hour,
                time,
                volunteers: hourVolunteers,
                totalCount,
                visibleCount,
                overflowCount
            });
        }

        return buckets;
    };

    const hourBuckets = generateHourBuckets();
    const currentHour = new Date().getHours();

    const handleBucketPress = (bucket: HourBucket) => {
        setSelectedBucket(bucket);
    };

    const getConfirmationGroups = (volunteers: LocalVolunteer[]) => {
        const groups = volunteers.reduce((acc, volunteer) => {
            if (!acc[volunteer.confirmationType]) {
                acc[volunteer.confirmationType] = [];
            }
            acc[volunteer.confirmationType].push(volunteer);
            return acc;
        }, {} as Record<ConfirmationType, LocalVolunteer[]>);

        return groups;
    };

    const getConfirmationColor = (type: ConfirmationType) => {
        switch (type) {
            case "confirmed":
                return "bg-primary text-primary-foreground";
            case "firm":
                return "bg-primary text-primary-foreground";
            case "flex":
                return "bg-yellow-500 text-black";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const getConfirmationDisplayName = (type: ConfirmationType) => {
        switch (type) {
            case "confirmed":
                return "Confirmed";
            case "firm":
                return "Firm";
            case "flex":
                return "Flex";
            default:
                return "Unknown";
        }
    };

    return (
        <Card className="p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-primary"/>
                        Today&apos;s Availability Track
                    </h2>
                    <Badge variant="outline" className="text-sm">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Badge>
                </div>

                {/* Timeline Track */}
                <div className="relative">
                    {/* Hour Labels */}
                    <div className="flex mb-4">
                        {hourBuckets.map((bucket) => (
                            <div key={bucket.hour} className="flex-1 text-center">
                                <div className={`text-sm font-medium ${
                                    bucket.hour === currentHour ? 'text-primary font-bold' : 'text-muted-foreground'
                                }`}>
                                    {bucket.time}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Avatar Buckets */}
                    <div className="flex gap-1">
                        {hourBuckets.map((bucket) => {
                            const isCurrent = bucket.hour === currentHour;
                            const isEmpty = bucket.totalCount === 0;

                            return (
                                <button
                                    key={bucket.hour}
                                    onClick={() => handleBucketPress(bucket)}
                                    onTouchStart={() => handleBucketPress(bucket)} // For mobile long-press
                                    className={`
                    flex-1 p-3 min-h-[80px] border-2 rounded-lg transition-all hover:shadow-md
                    ${isCurrent ? 'border-primary bg-primary/10' : 'border-border'}
                    ${isEmpty ? 'bg-muted/20' : 'bg-card hover:bg-muted/50'}
                  `}
                                >
                                    {isEmpty ? (
                                        <div className="text-center text-muted-foreground">
                                            <div className="text-xs">Empty</div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {/* Stacked Avatars */}
                                            <div className="flex flex-col items-center space-y-1">
                                                {bucket.volunteers.slice(0, maxAvatarsPerBucket).map((volunteer, index) => (
                                                    <div
                                                        key={volunteer.id}
                                                        className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs border border-white"
                                                        style={{zIndex: maxAvatarsPerBucket - index}}
                                                    >
                                                        {volunteer.avatar.charAt(0)}
                                                    </div>
                                                ))}

                                                {/* Overflow Indicator */}
                                                {bucket.overflowCount > 0 && (
                                                    <div
                                                        className="w-6 h-6 bg-muted border border-border rounded-full flex items-center justify-center text-xs font-medium">
                                                        +{bucket.overflowCount}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Count */}
                                            <div className="text-xs text-center text-muted-foreground">
                                                {bucket.totalCount}
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Time Indicator */}
                                    {isCurrent && (
                                        <div
                                            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-pulse"/>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Current Time Line */}
                    {currentHour >= 9 && currentHour <= 18 && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                            style={{
                                left: `${((currentHour - 9) / 10) * 100}%`,
                                transform: 'translateX(-50%)'
                            }}
                        >
                            <div
                                className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-primary rounded-full"/>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-primary/20 border border-primary rounded-full"></div>
                        <span>Volunteer Avatar</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div
                            className="w-3 h-3 bg-muted border rounded-full flex items-center justify-center text-xs">+
                        </div>
                        <span>More people</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-4 bg-primary"></div>
                        <span>Current time</span>
                    </div>
                </div>
            </div>

            {/* Bottom Sheet Modal */}
            {selectedBucket && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center p-4 z-50 md:items-center">
                    <Card className="w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary"/>
                                {selectedBucket.time} Availability
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBucket(null)}
                            >
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {/* Total Count */}
                            <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                    {selectedBucket.totalCount}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {selectedBucket.totalCount === 1 ? 'volunteer expected' : 'volunteers expected'}
                                </div>
                            </div>

                            {/* Confirmation Groups */}
                            {selectedBucket.volunteers.length > 0 && (
                                <div className="space-y-3">
                                    {Object.entries(getConfirmationGroups(selectedBucket.volunteers)).map(([type, groupVolunteers]) => (
                                        <div key={type} className="space-y-2">
                                            <Badge
                                                className={`${getConfirmationColor(type as ConfirmationType)} text-xs`}>
                                                {getConfirmationDisplayName(type as ConfirmationType)} ({groupVolunteers.length})
                                            </Badge>

                                            <div className="space-y-2">
                                                {groupVolunteers.map((volunteer) => (
                                                    <div key={volunteer.id}
                                                         className="flex items-center gap-3 p-2 border rounded-lg">
                                                        <div
                                                            className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                                                            {volunteer.avatar}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm">{volunteer.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {volunteer.position || "Volunteer"}
                                                            </div>
                                                            {volunteer.note && (
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    {volunteer.note}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">
                                                            {volunteer.status === 'available' ? 'Available' :
                                                                volunteer.status === 'dnd' ? 'Do Not Disturb' :
                                                                    volunteer.status === 'break' ? 'On Break' : 'Remote'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedBucket.volunteers.length === 0 && (
                                <div className="text-center py-6 text-muted-foreground">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                                    <p className="text-sm">No volunteers scheduled for this time</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </Card>
    );
}
