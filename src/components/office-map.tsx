"use client";

import {useEffect, useMemo, useState} from "react";
import {Card} from "@/components/ui/card";
import {Users} from "lucide-react";
import {SECTION_NAME} from "@/lib/constants";

type VolunteerStatus = "available" | "dnd" | "break" | "remote";

interface LocalVolunteer {
    id: string;
    name: string;
    status: VolunteerStatus;
    position?: string;
    note?: string;
    timestamp: Date;
    avatar: string;
    isInOffice: boolean;
}

interface Position {
    x: number;
    y: number;
}

interface OfficeMapProps {
    volunteers: LocalVolunteer[];
    onVolunteerClick?: (volunteer: LocalVolunteer) => void;
}

export function OfficeMap({volunteers, onVolunteerClick}: OfficeMapProps) {
    const [volunteerPositions, setVolunteerPositions] = useState<Record<string, Position>>({});

    const volunteersInOffice = useMemo(() => volunteers.filter(v => v.isInOffice), [volunteers]);

    // Generate random positions for volunteers based on actual office layout
    useEffect(() => {
        const newPositions: Record<string, Position> = {};

        // Define walkable areas based on the actual office floor plan (avoiding furniture except couch)
        const walkableAreas = [
            // Top area between storage and table
            {minX: 30, maxX: 48, minY: 24, maxY: 30},
            // Right side of top table
            {minX: 35, maxX: 65, minY: 24, maxY: 32},
            // Center corridor between closets
            {minX: 40, maxX: 60, minY: 43, maxY: 48},
            // Left side near bottom table (not on table)
            {minX: 32, maxX: 40, minY: 50, maxY: 68},
            // Right side near table (not on table)
            {minX: 35, maxX: 55, minY: 67, maxY: 75},
            // Center open area
            {minX: 40, maxX: 60, minY: 67, maxY: 75},
            // Couch area (volunteers can be on couch)
            {minX: 8, maxX: 20, minY: 72, maxY: 90},
        ];

        // Minimum distance between volunteers (in percentage points)
        // Avatars are 40px, container is ~400-450px, so 40px ≈ 9-10%
        const MIN_DISTANCE = 8;
        const MAX_ATTEMPTS = 50;

        // Helper function to check if a position overlaps with existing positions
        const isPositionValid = (pos: Position, existingPositions: Position[]): boolean => {
            for (const existing of existingPositions) {
                const dx = pos.x - existing.x;
                const dy = pos.y - existing.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < MIN_DISTANCE) {
                    return false;
                }
            }
            return true;
        };

        // Generate position for each volunteer with collision detection
        volunteersInOffice.forEach(volunteer => {
            let position: Position | null = null;
            let attempts = 0;

            // Try to find a non-overlapping position
            while (!position && attempts < MAX_ATTEMPTS) {
                const randomArea = walkableAreas[Math.floor(Math.random() * walkableAreas.length)];

                const candidate: Position = {
                    x: randomArea.minX + Math.random() * (randomArea.maxX - randomArea.minX),
                    y: randomArea.minY + Math.random() * (randomArea.maxY - randomArea.minY),
                };

                // Check if this position is valid (doesn't overlap with existing volunteers)
                const existingPositions = Object.values(newPositions);
                if (isPositionValid(candidate, existingPositions)) {
                    position = candidate;
                } else {
                    attempts++;
                }
            }

            // If we couldn't find a non-overlapping position after max attempts,
            // just use the last candidate (fallback)
            if (!position) {
                const randomArea = walkableAreas[Math.floor(Math.random() * walkableAreas.length)];
                position = {
                    x: randomArea.minX + Math.random() * (randomArea.maxX - randomArea.minX),
                    y: randomArea.minY + Math.random() * (randomArea.maxY - randomArea.minY),
                };
            }

            newPositions[volunteer.id] = position;
        });

        setVolunteerPositions(newPositions);
    }, [volunteersInOffice]);

    const getStatusColor = (status: VolunteerStatus) => {
        switch (status) {
            case "available":
                return "bg-esn-green";
            case "dnd":
                return "bg-destructive";
            case "break":
                return "bg-amber-500";
            case "remote":
                return "bg-blue-400";
            default:
                return "bg-primary";
        }
    };

    const getStatusDisplay = (status: VolunteerStatus) => {
        switch (status) {
            case "available":
                return "Available";
            case "dnd":
                return "Do Not Disturb";
            case "break":
                return "On Break";
            case "remote":
                return "Remote";
            default:
                return "Unknown";
        }
    };

    // Calculate tooltip position based on volunteer location to prevent cutoff
    const getTooltipPosition = (position: Position) => {
        const isNearTop = position.y < 25;
        const isNearLeft = position.x < 25;
        const isNearRight = position.x > 75;

        let positionClasses = "";
        let arrowClasses = "";

        // Vertical positioning
        if (isNearTop) {
            // Show below when near top
            positionClasses = "top-full mt-2";
            arrowClasses = "bottom-full border-4 border-transparent border-b-border";
        } else {
            // Default: show above
            positionClasses = "bottom-full mb-2";
            arrowClasses = "top-full border-4 border-transparent border-t-border";
        }

        // Horizontal positioning and arrow alignment
        if (isNearLeft) {
            positionClasses += " left-0";
            arrowClasses += " left-6";
        } else if (isNearRight) {
            positionClasses += " right-0";
            arrowClasses += " right-6";
        } else {
            positionClasses += " left-1/2 -translate-x-1/2";
            arrowClasses += " left-1/2 -translate-x-1/2";
        }

        return { positionClasses, arrowClasses };
    };

    return (
        <Card className="p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">{SECTION_NAME} Office Layout</h3>
                    <p className="text-sm text-muted-foreground">
                        Live view of volunteer positions in the office
                    </p>
                </div>

                {/* Office Layout - Based on actual floor plan */}
                <div
                    className="relative bg-muted/30 rounded-lg border-2 border-border max-w-md mx-auto">
                    <div className="relative w-full overflow-hidden" style={{aspectRatio: '4/5', minHeight: '350px'}}>

                        {/* Office Outer Walls */}
                        <div className="absolute inset-1 border-2 border-muted-foreground/40"></div>

                        {/* STORAGE - Top Left (large rectangle, full height with padding) */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '3%', left: '5%', width: '23%', height: '29%'}}>
                            {/* Storage shelves */}
                            <div className="absolute top-1/4 left-0 right-0 h-px bg-muted-foreground/40"></div>
                            <div className="absolute top-2/4 left-0 right-0 h-px bg-muted-foreground/40"></div>
                            <div className="absolute top-3/4 left-0 right-0 h-px bg-muted-foreground/40"></div>
                        </div>

                        {/* TABLE - Top Right */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '8%', right: '8%', width: '24%', height: '11%'}}>
                        </div>

                        {/* Chairs around top right table */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '4.5%', right: '12%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '4.5%', right: '24%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '20.5%', right: '12%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '20.5%', right: '24%', width: '4%', height: '2.5%'}}>
                        </div>

                        {/* LEFT CLOSET - Middle (touching left wall) */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '34%', left: '1%', width: '38%', height: '8%'}}>
                        </div>

                        {/* RIGHT CLOSET - Middle (touching right wall) */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '34%', right: '1%', width: '38%', height: '8%'}}>
                        </div>

                        {/* TABLE - Behind left closet */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '50%', left: '5%', width: '24%', height: '11%'}}>
                        </div>

                        {/* Chairs around left table */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '46.5%', left: '9%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '46.5%', left: '21%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '62.5%', left: '9%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '62.5%', left: '21%', width: '4%', height: '2.5%'}}>
                        </div>

                        {/* TABLE - Behind right closet with 4 chairs */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '55%', right: '8%', width: '24%', height: '11%'}}>
                        </div>

                        {/* Chairs around right table */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '51.5%', right: '12%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '51.5%', right: '24%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '67.5%', right: '12%', width: '4%', height: '2.5%'}}>
                        </div>
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '67.5%', right: '24%', width: '4%', height: '2.5%'}}>
                        </div>

                        {/* COUCH - Bottom Left */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{top: '70%', left: '5%', width: '17%', height: '22%'}}>
                            {/* Couch back (against left wall) */}
                            <div
                                className="absolute top-0 left-0 bottom-0 w-1/5 bg-muted-foreground/20 border-r border-muted-foreground/40"></div>
                        </div>

                        {/* DISPLAY - Bottom Right (longer, touching front wall) */}
                        <div className="absolute bg-muted border border-muted-foreground/40"
                             style={{bottom: '1%', right: '8%', width: '35%', height: '15%'}}>
                            {/* Display shelves - vertical divisions */}
                            <div className="absolute top-0 left-1/4 bottom-0 w-px bg-muted-foreground/40"></div>
                            <div className="absolute top-0 left-2/4 bottom-0 w-px bg-muted-foreground/40"></div>
                            <div className="absolute top-0 left-3/4 bottom-0 w-px bg-muted-foreground/40"></div>
                        </div>

                        {/* ENTRANCE - Bottom Center */}
                        <div className="absolute bg-background border border-muted-foreground/40"
                             style={{bottom: '1%', left: '32%', width: '16%', height: '6%'}}>
                        </div>

                        {/* Volunteers */}
                        {volunteersInOffice.map((volunteer) => {
                            const position = volunteerPositions[volunteer.id];
                            if (!position) return null;

                            const { positionClasses, arrowClasses } = getTooltipPosition(position);

                            return (
                                <div
                                    key={volunteer.id}
                                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out z-10 ${volunteer.status === 'dnd' ? 'opacity-40' : ''}`}
                                    style={{
                                        left: `${position.x}%`,
                                        top: `${position.y}%`,
                                    }}
                                >
                                    {/* Character Avatar */}
                                    <div
                                        className="relative group cursor-pointer"
                                        onClick={() => onVolunteerClick?.(volunteer)}
                                    >
                                        {/* Status Ring */}
                                        <div
                                            className={`absolute -inset-1 rounded-full ${getStatusColor(volunteer.status)} animate-pulse opacity-60`}></div>

                                        {/* Avatar */}
                                        <div
                                            className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm border-2 border-background shadow-lg hover:scale-110 transition-transform">
                                            {volunteer.avatar}
                                        </div>

                                        {/* Hover Tooltip */}
                                        <div
                                            className={`absolute ${positionClasses} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[30]`}>
                                            <div
                                                className="bg-popover text-popover-foreground border border-border text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                                                <div className="font-medium text-sm">{volunteer.name}</div>
                                                <div
                                                    className="text-xs text-muted-foreground mt-1">{volunteer.position || "Volunteer"}</div>
                                                <div className="text-xs mt-1">
                                                    <span
                                                        className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(volunteer.status)}`}></span>
                                                    {getStatusDisplay(volunteer.status)}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1 italic">Click for
                                                    details
                                                </div>
                                            </div>
                                            {/* Tooltip Arrow */}
                                            <div className={`absolute ${arrowClasses}`}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {volunteersInOffice.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Users className="h-16 w-16 mx-auto mb-4 opacity-30"/>
                                    <p className="text-lg font-medium mb-2">Office is currently empty</p>
                                    <p className="text-sm">Volunteers will appear here when they check in</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center text-xs">
                    {/* Volunteer Status */}
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span className="text-muted-foreground">Volunteer</span>
                    </div>

                    {/* Office Areas */}
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-muted border border-foreground"></div>
                        <span className="text-muted-foreground">Furniture</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="text-center">
                    <div className="text-2xl font-bold">
                        {volunteersInOffice.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {volunteersInOffice.length === 1 ? 'volunteer' : 'volunteers'} currently in office
                    </div>
                </div>
            </div>
        </Card>
    );
}
