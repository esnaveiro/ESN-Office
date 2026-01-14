"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Users,
  X,
  Wifi,
  Coffee,
  CheckCircle,
  AlertCircle,
  MapPin
} from "lucide-react";

type PresenceStatus = "In" | "Out" | "Remote" | "Break";

interface Person {
  id: string;
  name: string;
  status: PresenceStatus;
  note?: string;
  timestamp: Date;
  avatar: string;
  arrivalTime?: string;
  departureTime?: string;
}

interface TimeInterval {
  time: string;
  hour: number;
  minute: number;
  isOfficeOpen: boolean;
  peoplePresent: Person[];
  totalExpected: number;
}

interface InteractiveTimelineProps {
  intervals?: TimeInterval[];
  onIntervalClick?: (interval: TimeInterval) => void;
}

export function InteractiveTimeline({
  intervals = [],
  onIntervalClick
}: InteractiveTimelineProps) {
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval | null>(null);

  // Generate 30-minute intervals from 9 AM to 6 PM
  const generateTimeIntervals = (): TimeInterval[] => {
    const timeIntervals: TimeInterval[] = [];
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();

    // Sample people data with more realistic schedules
    const samplePeople: Person[] = [
      {
        id: "1",
        name: "Maria Silva",
        status: "In",
        note: "International Office hours",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        avatar: "MS",
        arrivalTime: "09:00",
        departureTime: "17:30"
      },
      {
        id: "2",
        name: "João Santos",
        status: "Break",
        note: "Back in 15 min",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        avatar: "JS",
        arrivalTime: "10:00",
        departureTime: "16:00"
      },
      {
        id: "3",
        name: "Ana Costa",
        status: "In",
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        avatar: "AC",
        arrivalTime: "11:00",
        departureTime: "15:00"
      },
      {
        id: "4",
        name: "Pedro Oliveira",
        status: "Out",
        note: "Arriving at 14:30",
        timestamp: new Date(),
        avatar: "PO",
        arrivalTime: "14:30",
        departureTime: "18:00"
      },
      {
        id: "5",
        name: "Sofia Mendes",
        status: "Out",
        note: "Available from 15:00",
        timestamp: new Date(),
        avatar: "SM",
        arrivalTime: "15:00",
        departureTime: "17:00"
      }
    ];

    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const intervalHour = hour;
        const intervalMinute = minute;

        // Determine office status
        const isOfficeOpen = hour >= 9 && hour < 18;

        // Calculate who should be present at this time
        const peoplePresent: Person[] = [];

        samplePeople.forEach(person => {
          if (person.arrivalTime && person.departureTime) {
            const [arriveHour, arriveMin] = person.arrivalTime.split(':').map(Number);
            const [departHour, departMin] = person.departureTime.split(':').map(Number);

            const arriveMinutes = arriveHour * 60 + arriveMin;
            const departMinutes = departHour * 60 + departMin;
            const currentMinutes = intervalHour * 60 + intervalMinute;

            // Check if person should be present during this interval
            if (currentMinutes >= arriveMinutes && currentMinutes < departMinutes) {
              // Adjust status based on current time for realism
              let status: PresenceStatus = person.status;
              if (currentMinutes < currentHour * 60 + currentMinute) {
                // Past intervals - assume they were in
                status = "In";
              } else if (currentMinutes === currentHour * 60 + currentMinute) {
                // Current interval - use actual status
                status = person.status;
              } else {
                // Future intervals - show as expected
                status = "Out"; // Will arrive
              }

              peoplePresent.push({
                ...person,
                status
              });
            }
          }
        });

        timeIntervals.push({
          time: timeString,
          hour: intervalHour,
          minute: intervalMinute,
          isOfficeOpen,
          peoplePresent,
          totalExpected: peoplePresent.length
        });
      }
    }

    return timeIntervals;
  };

  const timeIntervals = intervals.length > 0 ? intervals : generateTimeIntervals();
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  const getCurrentIntervalIndex = () => {
    return timeIntervals.findIndex(interval => {
      const intervalMinutes = interval.hour * 60 + interval.minute;
      const currentMinutes = currentHour * 60 + currentMinute;
      const nextIntervalMinutes = intervalMinutes + 30;

      return currentMinutes >= intervalMinutes && currentMinutes < nextIntervalMinutes;
    });
  };

  const currentIntervalIndex = getCurrentIntervalIndex();

  const getStatusColor = (status: PresenceStatus) => {
    return "bg-primary";
  };

  const getStatusIcon = (status: PresenceStatus) => {
    switch (status) {
      case "In": return <CheckCircle className="h-4 w-4" />;
      case "Break": return <Coffee className="h-4 w-4" />;
      case "Remote": return <Wifi className="h-4 w-4" />;
      case "Out": return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getIntervalStatus = (interval: TimeInterval) => {
    if (!interval.isOfficeOpen) {
      return { color: "bg-primary/10", label: "Closed", textColor: "text-primary/50" };
    }

    const presentCount = interval.peoplePresent.filter(p => p.status === "In" || p.status === "Break").length;

    if (presentCount === 0) {
      return { color: "bg-primary/10", label: "Empty", textColor: "text-primary/50" };
    } else if (presentCount <= 2) {
      return { color: "bg-primary/30", label: "Limited", textColor: "text-primary" };
    } else {
      return { color: "bg-primary/50", label: "Active", textColor: "text-primary" };
    }
  };

  const handleIntervalClick = (interval: TimeInterval) => {
    setSelectedInterval(interval);
    onIntervalClick?.(interval);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Office Timeline
          </h2>
          <Badge variant="outline" className="text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </Badge>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/50 text-primary-foreground border border-primary">
            Active (3+ people)
          </Badge>
          <Badge className="bg-primary/30 text-primary border border-primary/50">
            Limited (1-2 people)
          </Badge>
          <Badge className="bg-primary/10 text-primary/70 border border-primary/30">
            Empty
          </Badge>
          <Badge className="bg-primary/10 text-primary/50 border border-primary/30">
            Closed
          </Badge>
        </div>

        {/* Timeline Grid */}
        <div className="space-y-1">
          {/* Desktop View */}
          <div className="hidden md:block">
            <div className="grid grid-cols-6 lg:grid-cols-9 gap-1">
              {timeIntervals.map((interval, index) => {
                const status = getIntervalStatus(interval);
                const isCurrent = index === currentIntervalIndex;
                const isPast = index < currentIntervalIndex;

                return (
                  <button
                    key={`${interval.hour}-${interval.minute}`}
                    onClick={() => handleIntervalClick(interval)}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-md
                      ${status.color}
                      ${isCurrent ? 'border-primary ring-2 ring-primary/50' : 'border-transparent'}
                      ${isPast ? 'opacity-70' : ''}
                    `}
                  >
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                    )}

                    <div className="text-center">
                      <div className={`text-sm font-semibold ${status.textColor}`}>
                        {interval.time}
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {interval.peoplePresent.filter(p => p.status === "In" || p.status === "Break").length}
                        </span>
                      </div>
                      <div className={`text-xs font-medium mt-1 ${status.textColor}`}>
                        {status.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-2">
            {timeIntervals.filter((_, index) => index >= Math.max(0, currentIntervalIndex - 2) && index <= currentIntervalIndex + 6).map((interval, index) => {
              const status = getIntervalStatus(interval);
              const actualIndex = timeIntervals.indexOf(interval);
              const isCurrent = actualIndex === currentIntervalIndex;

              return (
                <button
                  key={`${interval.hour}-${interval.minute}`}
                  onClick={() => handleIntervalClick(interval)}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all
                    ${status.color}
                    ${isCurrent ? 'border-primary ring-2 ring-primary/50' : 'border-transparent'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-bold ${status.textColor}`}>
                        {interval.time}
                      </div>
                      {isCurrent && (
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          Now
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {interval.peoplePresent.filter(p => p.status === "In" || p.status === "Break").length}
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${status.textColor}`}>
                        {status.label}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Interval Details Modal */}
        {selectedInterval && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {selectedInterval.time}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInterval(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Office Status */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Office Status</span>
                  <Badge className={getIntervalStatus(selectedInterval).color}>
                    {getIntervalStatus(selectedInterval).label}
                  </Badge>
                </div>

                {/* People Present */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    People Expected ({selectedInterval.peoplePresent.length})
                  </h4>

                  {selectedInterval.peoplePresent.length > 0 ? (
                    <div className="space-y-2">
                      {selectedInterval.peoplePresent.map((person) => (
                        <div key={person.id} className="flex items-center gap-3 p-2 bg-card border rounded-lg">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                            {person.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{person.name}</span>
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(person.status)}`} />
                              <Badge variant="outline" className="text-xs">
                                {person.status}
                              </Badge>
                            </div>
                            {person.note && (
                              <p className="text-xs text-muted-foreground mt-1">{person.note}</p>
                            )}
                          </div>
                          {getStatusIcon(person.status)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No one expected during this time</p>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    ESN Aveiro Office • Campus Universitário de Santiago
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
}