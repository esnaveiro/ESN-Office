"use client";

import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {Check, Palette} from 'lucide-react';
import {useTheme} from '@/lib/theme-store';

export function ThemeToggleMini() {
    const {currentTheme, setTheme, themes} = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Palette className="h-4 w-4"/>
                    {/*<span className="hidden sm:inline">Theme</span>*/}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {Object.values(themes).map((theme) => (
                    <DropdownMenuItem
                        key={theme.variant}
                        onClick={() => setTheme(theme.variant)}
                        className="flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{backgroundColor: theme.primaryColor}}
                                ></div>
                            </div>
                            <span className="text-sm">{theme.name}</span>
                        </div>
                        {currentTheme === theme.variant && (
                            <Check className="h-3 w-3"/>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}