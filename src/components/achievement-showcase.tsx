"use client";



import {Award, Star, Target, TrendingUp, Trophy, Users} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Progress} from "@/components/ui/progress";

interface FeaturedAchievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'milestone' | 'streak' | 'engagement' | 'special';
    pointsReward: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlockedBy: number; // Number of users who have unlocked this
    totalUsers: number;
    requirements: string[];
    isUnlocked: boolean;
    unlockedAt?: Date;
    progress?: {
        current: number;
        required: number;
        description: string;
    };
}

interface AchievementShowcaseProps {
    featuredAchievement: FeaturedAchievement;
    className?: string;
}

export function AchievementShowcase({featuredAchievement, className = ""}: AchievementShowcaseProps) {
    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common':
                return {
                    bg: 'bg-gray-500/20',
                    text: 'text-gray-600',
                    border: 'border-gray-500/30',
                    gradient: 'from-gray-500/20 to-gray-500/10'
                };
            case 'rare':
                return {
                    bg: 'bg-esn-cyan/20',
                    text: 'text-esn-cyan',
                    border: 'border-esn-cyan/30',
                    gradient: 'from-esn-cyan/20 to-esn-cyan/10'
                };
            case 'epic':
                return {
                    bg: 'bg-esn-magenta/20',
                    text: 'text-esn-magenta',
                    border: 'border-esn-magenta/30',
                    gradient: 'from-esn-magenta/20 to-esn-magenta/10'
                };
            case 'legendary':
                return {
                    bg: 'bg-gamification-gold/20',
                    text: 'text-gamification-gold',
                    border: 'border-gamification-gold/30',
                    gradient: 'from-gamification-gold/20 to-gamification-gold/10'
                };
            default:
                return {
                    bg: 'bg-muted',
                    text: 'text-muted-foreground',
                    border: 'border-border',
                    gradient: 'from-muted to-muted/50'
                };
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'milestone':
                return Trophy;
            case 'streak':
                return Target;
            case 'engagement':
                return Users;
            case 'special':
                return Star;
            default:
                return Award;
        }
    };

    const colors = getRarityColor(featuredAchievement.rarity);
    const CategoryIcon = getCategoryIcon(featuredAchievement.category);
    const completionPercentage = (featuredAchievement.unlockedBy / featuredAchievement.totalUsers) * 100;

    return (
        <Card className={`relative overflow-hidden ${className}`}>
            <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-2xl bg-gradient-to-br ${colors.gradient}`}>
                            <Trophy className={`h-5 w-5 ${colors.text}`}/>
                        </div>
                        <CardTitle className="text-lg">Achievement of the Month</CardTitle>
                    </div>
                    <Badge className={`${colors.bg} ${colors.text} ${colors.border} capitalize border`}>
                        {featuredAchievement.rarity}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Featured achievement for {new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
                </p>
            </CardHeader>

            <CardContent className="relative z-10">
                <div className="space-y-6">
                    {/* Achievement Display */}
                    <div
                        className="text-center p-6 bg-gradient-to-br from-muted/30 to-card border border-border rounded-2xl">
                        <div className="space-y-4">
                            {/* Icon */}
                            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                                <div
                                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center ${featuredAchievement.isUnlocked ? 'shadow-lg' : 'opacity-75'}`}>
                                    <CategoryIcon className={`h-10 w-10 ${colors.text}`}/>
                                </div>
                                {featuredAchievement.isUnlocked && (
                                    <div
                                        className="absolute -top-1 -right-1 w-6 h-6 bg-esn-green rounded-full flex items-center justify-center shadow-lg">
                                        <Star className="h-4 w-4 text-white fill-white"/>
                                    </div>
                                )}
                            </div>

                            {/* Title and Description */}
                            <div className="space-y-2">
                                <h3 className={`text-xl font-bold ${featuredAchievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {featuredAchievement.name}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                                    {featuredAchievement.description}
                                </p>
                            </div>

                            {/* Status */}
                            {featuredAchievement.isUnlocked ? (
                                <div className="space-y-2">
                                    <Badge className="bg-esn-green text-white border-0">
                                        <Award className="h-3 w-3 mr-1"/>
                                        Unlocked
                                    </Badge>
                                    {featuredAchievement.unlockedAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Earned on {featuredAchievement.unlockedAt.toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                                    Not Yet Unlocked
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Progress (if not unlocked) */}
                    {!featuredAchievement.isUnlocked && featuredAchievement.progress && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Your Progress</span>
                                <span className="text-sm text-muted-foreground">
                  {featuredAchievement.progress.current} / {featuredAchievement.progress.required}
                </span>
                            </div>
                            <div className="space-y-2">
                                <Progress
                                    value={(featuredAchievement.progress.current / featuredAchievement.progress.required) * 100}
                                    className="h-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {featuredAchievement.progress.description}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Requirements */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Target className="h-4 w-4"/>
                            Requirements
                        </h4>
                        <div className="space-y-2">
                            {featuredAchievement.requirements.map((requirement, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    <div
                                        className={`w-2 h-2 rounded-full ${featuredAchievement.isUnlocked ? 'bg-esn-green' : 'bg-muted-foreground'}`}/>
                                    <span
                                        className={featuredAchievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'}>
                    {requirement}
                  </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats and Reward */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Community Stats */}
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground"/>
                                    <span className="text-sm font-medium text-foreground">Community</span>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-foreground">
                                        {featuredAchievement.unlockedBy}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        users earned this ({completionPercentage.toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reward */}
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                                    <span className="text-sm font-medium text-foreground">Reward</span>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-foreground">
                                        {featuredAchievement.pointsReward}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        points
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}