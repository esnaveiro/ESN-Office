"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  Grid3X3,
  LayoutGrid
} from "lucide-react";

interface AvailabilitySlot {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  startTime: string;
  endTime: string;
  note?: string;
  type: "office_hours" | "consultation" | "meeting" | "available";
  date: Date;
}

interface OfficeCalendarProps {
  availabilitySlots?: AvailabilitySlot[];
  onSlotClick?: (slot: AvailabilitySlot) => void;
}

export function OfficeCalendar({
  availabilitySlots = [],
  onSlotClick
}: OfficeCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  // Sample data for demonstration - more slots for week view
  const sampleSlots: AvailabilitySlot[] = [
    // Today
    {
      id: "1",
      userId: "1",
      userName: "Maria Silva",
      userAvatar: "MS",
      startTime: "09:00",
      endTime: "12:00",
      note: "International Office hours",
      type: "office_hours",
      date: new Date()
    },
    {
      id: "2",
      userId: "2",
      userName: "João Santos",
      userAvatar: "JS",
      startTime: "14:00",
      endTime: "17:00",
      note: "Student consultations",
      type: "consultation",
      date: new Date()
    },
    // Tomorrow
    {
      id: "3",
      userId: "3",
      userName: "Ana Costa",
      userAvatar: "AC",
      startTime: "10:00",
      endTime: "15:00",
      note: "Available for meetings",
      type: "available",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    // Day after tomorrow
    {
      id: "4",
      userId: "4",
      userName: "Pedro Oliveira",
      userAvatar: "PO",
      startTime: "13:00",
      endTime: "16:00",
      note: "Event planning session",
      type: "meeting",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    },
    // Next week - more variety
    {
      id: "5",
      userId: "5",
      userName: "Sofia Mendes",
      userAvatar: "SM",
      startTime: "11:00",
      endTime: "14:00",
      note: "Student support hours",
      type: "consultation",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: "6",
      userId: "1",
      userName: "Maria Silva",
      userAvatar: "MS",
      startTime: "15:00",
      endTime: "18:00",
      note: "Project coordination",
      type: "meeting",
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
    },
    {
      id: "7",
      userId: "6",
      userName: "Miguel Torres",
      userAvatar: "MT",
      startTime: "09:30",
      endTime: "12:30",
      note: "General availability",
      type: "available",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  ];

  const slots = availabilitySlots.length > 0 ? availabilitySlots : sampleSlots;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];

  // Week view helpers
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // First day is Sunday
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date: Date) => {
    const weekStart = getWeekStart(date);
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  };

  const getWeekDays = (date: Date) => {
    const weekStart = getWeekStart(date);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      days.push(day);
    }
    return days;
  };

  // Month view helpers
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const previousPeriod = () => {
    if (viewMode === "week") {
      const newDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === "week") {
      const newDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatWeekRange = (date: Date) => {
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);
    const startMonth = monthNames[weekStart.getMonth()];
    const endMonth = monthNames[weekEnd.getMonth()];

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    } else {
      return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    }
  };

  const getSlotsForDate = (date: Date) => {
    return slots.filter(slot => {
      const slotDate = new Date(slot.date);
      return slotDate.toDateString() === date.toDateString();
    });
  };

  const getSlotsForDateNumber = (date: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    return getSlotsForDate(targetDate);
  };

  const getTypeColor = (type: string) => {
    return "bg-primary text-primary-foreground";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "office_hours": return <MapPin className="h-3 w-3" />;
      case "consultation": return <Users className="h-3 w-3" />;
      case "meeting": return <CalendarIcon className="h-3 w-3" />;
      case "available": return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTodayNumber = (date: number) => {
    const today = new Date();
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    return targetDate.toDateString() === today.toDateString();
  };

  // Generate calendar days
  const calendarDays = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Planned Schedules
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="flex items-center gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex border rounded-lg overflow-hidden mr-4">
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="rounded-none border-0"
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Week
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="rounded-none border-0 border-l"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Month
              </Button>
            </div>

            <span className="text-lg font-semibold mr-4">
              {viewMode === "week" ? formatWeekRange(currentDate) : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={previousPeriod}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPeriod}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary text-primary-foreground">
            <MapPin className="h-3 w-3 mr-1" />
            Office Hours
          </Badge>
          <Badge className="bg-primary/80 text-primary-foreground">
            <Users className="h-3 w-3 mr-1" />
            Consultations
          </Badge>
          <Badge className="bg-primary/60 text-primary-foreground">
            <CalendarIcon className="h-3 w-3 mr-1" />
            Meetings
          </Badge>
          <Badge className="bg-primary/40 text-primary">
            <Clock className="h-3 w-3 mr-1" />
            Available
          </Badge>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-lg overflow-hidden border">
          {viewMode === "week" ? (
            // Week View
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-muted/50">
                {getWeekDays(currentDate).map((day, index) => (
                  <div
                    key={day.toISOString()}
                    className="p-3 text-center border-r border-border last:border-r-0"
                  >
                    <div className="text-sm font-medium text-muted-foreground">
                      {dayNames[index]}
                    </div>
                    <div className={`text-lg font-bold mt-1 ${
                      isToday(day) ? "text-primary" : "text-foreground"
                    }`}>
                      {day.getDate()}
                    </div>
                    {isToday(day) && (
                      <div className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full mt-1">
                        Today
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Week Days */}
              <div className="grid grid-cols-7">
                {getWeekDays(currentDate).map((day) => {
                  const daySlots = getSlotsForDate(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[160px] p-2 border-r border-b border-border last:border-r-0 ${
                        isToday(day) ? "bg-primary/5" : "bg-card"
                      }`}
                    >
                      <div className="space-y-1">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => onSlotClick?.(slot)}
                            className={`w-full text-left p-2 rounded text-xs font-medium transition-all hover:scale-105 hover:shadow-sm ${getTypeColor(slot.type)}`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {getTypeIcon(slot.type)}
                              <span>{slot.startTime} - {slot.endTime}</span>
                            </div>
                            <div className="font-semibold">
                              {slot.userName}
                            </div>
                            {slot.note && (
                              <div className="text-xs opacity-90 mt-1 line-clamp-2">
                                {slot.note}
                              </div>
                            )}
                          </button>
                        ))}

                        {daySlots.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <div className="text-xs">No plans</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // Month View
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-muted/50">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="p-3 text-center text-sm font-medium border-r border-border last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[120px] p-2 border-r border-b border-border bg-muted/20 last:border-r-0"
                      />
                    );
                  }

                  const daySlots = getSlotsForDateNumber(day);
                  const today = isTodayNumber(day);

                  return (
                    <div
                      key={day}
                      className={`min-h-[120px] p-2 border-r border-b border-border last:border-r-0 ${
                        today ? "bg-primary/5" : "bg-card"
                      }`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        today ? "text-primary font-bold" : "text-foreground"
                      }`}>
                        {day}
                        {today && (
                          <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {daySlots.slice(0, 3).map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => onSlotClick?.(slot)}
                            className={`w-full text-left p-1.5 rounded text-xs font-medium transition-all hover:scale-105 hover:shadow-sm ${getTypeColor(slot.type)}`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {getTypeIcon(slot.type)}
                              <span>{slot.startTime}</span>
                            </div>
                            <div className="truncate font-semibold">
                              {slot.userName}
                            </div>
                            {slot.note && (
                              <div className="truncate text-xs opacity-90 mt-1">
                                {slot.note}
                              </div>
                            )}
                          </button>
                        ))}

                        {daySlots.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            +{daySlots.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Mobile Events List */}
        <div className="lg:hidden space-y-4">
          <h3 className="text-lg font-semibold">
            {viewMode === "week" ? "This Week's Schedules" : "This Month's Schedules"}
          </h3>
          <div className="space-y-3">
            {slots
              .filter(slot => {
                const slotDate = new Date(slot.date);
                if (viewMode === "week") {
                  const weekStart = getWeekStart(currentDate);
                  const weekEnd = getWeekEnd(currentDate);
                  return slotDate >= weekStart && slotDate <= weekEnd;
                } else {
                  return slotDate.getMonth() === currentDate.getMonth() &&
                         slotDate.getFullYear() === currentDate.getFullYear();
                }
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 10)
              .map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => onSlotClick?.(slot)}
                  className="w-full p-4 bg-card border rounded-lg text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                      {slot.userAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {slot.userName}
                        </h4>
                        <Badge className={`text-xs ${getTypeColor(slot.type)}`}>
                          {slot.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {slot.date.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                      {slot.note && (
                        <div className="text-xs text-muted-foreground">
                          {slot.note}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </Card>
  );
}