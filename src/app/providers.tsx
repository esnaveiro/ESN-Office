"use client";

import {ThemeProvider as NextThemeProvider} from 'next-themes';
import {ThemeProvider as ESNThemeProvider} from '@/lib/theme-store';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from '@/lib/react-query-client';

export function Providers({children}: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <NextThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                <ESNThemeProvider>
                    {children}
                </ESNThemeProvider>
            </NextThemeProvider>
        </QueryClientProvider>
    );
}
