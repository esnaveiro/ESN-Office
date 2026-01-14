"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useThemeColors } from "@/hooks/useThemeColors";

interface PeriodData {
  period: string;
  points: number;
  events: number;
  meetings: number;
  socialEvents: number;
}

interface ComparisonMetricsProps {
  currentPeriod: PeriodData;
  previousPeriods: PeriodData[];
  periodType: 'month' | 'semester';
  className?: string;
}

export function ComparisonMetrics({ 
  currentPeriod, 
  previousPeriods, 
  periodType,
  className = "" 
}: ComparisonMetricsProps) {
  // Get dynamic colors based on CSS custom properties
  const colors = useThemeColors();
  
  // Get theme-aware colors for axes and text
  const getAxisColor = () => {
    if (typeof window === 'undefined') return '#666';
    
    // Create a temporary element to get the actual computed color
    const testDiv = document.createElement('div');
    testDiv.className = 'text-muted-foreground'; // Use Tailwind class
    testDiv.style.position = 'absolute';
    testDiv.style.visibility = 'hidden';
    document.body.appendChild(testDiv);
    
    const computedColor = getComputedStyle(testDiv).color;
    document.body.removeChild(testDiv);
    
    return computedColor || '#666';
  };
  
  const axisColor = getAxisColor();
  
  // Calculate trends
  const calculateTrend = (current: number, previous: number): { 
    percentage: number; 
    direction: 'up' | 'down' | 'same';
    icon: typeof TrendingUp;
  } => {
    if (previous === 0) {
      return { 
        percentage: current > 0 ? 100 : 0, 
        direction: current > 0 ? 'up' : 'same',
        icon: current > 0 ? TrendingUp : Minus
      };
    }
    
    const percentage = ((current - previous) / previous) * 100;
    
    if (Math.abs(percentage) < 1) {
      return { percentage: 0, direction: 'same', icon: Minus };
    }
    
    return {
      percentage: Math.abs(percentage),
      direction: percentage > 0 ? 'up' : 'down',
      icon: percentage > 0 ? TrendingUp : TrendingDown
    };
  };
  
  const lastPeriod = previousPeriods[previousPeriods.length - 1];
  
  const pointsTrend = calculateTrend(currentPeriod.points, lastPeriod?.points || 0);
  const eventsTrend = calculateTrend(currentPeriod.events, lastPeriod?.events || 0);
  
  // Prepare chart data
  const chartData = [...previousPeriods, currentPeriod].slice(-6); // Last 6 periods
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Performance Comparison
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your progress compared to previous {periodType}s
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Quick Stats Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Points Comparison */}
            <div className="p-4 bg-gradient-to-br from-muted/30 to-card border border-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Points This {periodType}</span>
                <div className="flex items-center gap-1">
                  {pointsTrend.icon === TrendingUp && (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  )}
                  {pointsTrend.icon === TrendingDown && (
                    <TrendingDown className="h-4 w-4 text-muted-foreground/70" />
                  )}
                  {pointsTrend.icon === Minus && (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      pointsTrend.direction === 'up' 
                        ? 'text-primary border-primary' 
                        : pointsTrend.direction === 'down'
                        ? 'text-muted-foreground/70 border-muted-foreground/70'
                        : 'text-muted-foreground border-border'
                    }`}
                  >
                    {pointsTrend.direction === 'same' ? '±' : ''}{pointsTrend.percentage.toFixed(0)}%
                  </Badge>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {currentPeriod.points}
              </div>
              <div className="text-sm text-muted-foreground">
                vs {lastPeriod?.points || 0} last {periodType}
              </div>
            </div>
            
            {/* Events Comparison */}
            <div className="p-4 bg-gradient-to-br from-muted/30 to-card border border-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Events This {periodType}</span>
                <div className="flex items-center gap-1">
                  {eventsTrend.icon === TrendingUp && (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  )}
                  {eventsTrend.icon === TrendingDown && (
                    <TrendingDown className="h-4 w-4 text-muted-foreground/70" />
                  )}
                  {eventsTrend.icon === Minus && (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      eventsTrend.direction === 'up' 
                        ? 'text-primary border-primary' 
                        : eventsTrend.direction === 'down'
                        ? 'text-muted-foreground/70 border-muted-foreground/70'
                        : 'text-muted-foreground border-border'
                    }`}
                  >
                    {eventsTrend.direction === 'same' ? '±' : ''}{eventsTrend.percentage.toFixed(0)}%
                  </Badge>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {currentPeriod.events}
              </div>
              <div className="text-sm text-muted-foreground">
                vs {lastPeriod?.events || 0} last {periodType}
              </div>
            </div>
          </div>
          
          {/* Points Trend Chart */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Points Trend</h4>
            <div className="h-48">
              <ResponsiveContainer width="95%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.2} />
                  <XAxis 
                    dataKey="period" 
                    stroke={axisColor}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={axisColor}
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="points" 
                    stroke={colors?.primary || '#00aeef'}
                    strokeWidth={3}
                    dot={{ fill: colors?.primary || '#00aeef', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Activity Breakdown Chart */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Activity Breakdown</h4>
            <div className="h-48">
              <ResponsiveContainer width="95%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={axisColor} opacity={0.2} />
                  <XAxis 
                    dataKey="period" 
                    stroke={axisColor}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={axisColor}
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="meetings" 
                    stackId="a" 
                    fill={colors?.light || '#33c1f2'}
                    name="Meetings"
                  />
                  <Bar 
                    dataKey="socialEvents" 
                    stackId="a" 
                    fill={colors?.primary || '#00aeef'}
                    name="Social Events"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Period Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {chartData.reduce((sum, period) => sum + period.points, 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Points ({chartData.length} {periodType}s)
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {chartData.reduce((sum, period) => sum + period.events, 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Events ({chartData.length} {periodType}s)
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {chartData.length > 0 ? Math.round(chartData.reduce((sum, period) => sum + period.points, 0) / chartData.length) : 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Average Points per {periodType}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}