import * as Icons from 'lucide-react'
import { LucideIcon } from 'lucide-react'

// Type-safe icon registry
const iconRegistry: Record<string, LucideIcon> = {
    Trophy: Icons.Trophy,
    Star: Icons.Star,
    Award: Icons.Award,
    Flame: Icons.Flame,
    Zap: Icons.Zap,
    Target: Icons.Target,
    Crown: Icons.Crown,
    Heart: Icons.Heart,
    Calendar: Icons.Calendar,
    Clock: Icons.Clock,
    CheckCircle: Icons.CheckCircle,
    Shield: Icons.Shield,
    TrendingUp: Icons.TrendingUp,
    Users: Icons.Users,
    Sparkles: Icons.Sparkles,
    Medal: Icons.Medal,
    Rocket: Icons.Rocket,
    Sun: Icons.Sun,
    Moon: Icons.Moon,
    Coffee: Icons.Coffee,
    BookOpen: Icons.BookOpen,
    Briefcase: Icons.Briefcase,
    Gift: Icons.Gift,
    Mountain: Icons.Mountain,
    Sunrise: Icons.Sunrise,
    Sunset: Icons.Sunset,
    Timer: Icons.Timer,
    Hourglass: Icons.Hourglass,
    CalendarClock: Icons.CalendarClock,
    CalendarDays: Icons.CalendarDays,
    CalendarCheck: Icons.CalendarCheck,
}

/**
 * Get a Lucide icon component by name (type-safe)
 * @param iconName - The name of the icon
 * @returns The icon component or undefined if not found
 */
export function getIcon(iconName: string): LucideIcon | undefined {
    return iconRegistry[iconName]
}

/**
 * Check if an icon exists in the registry
 * @param iconName - The name of the icon
 * @returns True if icon exists, false otherwise
 */
export function hasIcon(iconName: string): boolean {
    return iconName in iconRegistry
}

// Export all available icon names as a type
export type AvailableIconName = keyof typeof iconRegistry

// Export the registry for advanced use cases
export { iconRegistry }
