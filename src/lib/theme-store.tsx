"use client";

import {createContext, ReactNode, useContext, useEffect, useState} from 'react';

export type ThemeVariant = 'cyan' | 'magenta' | 'green' | 'orange';

interface ThemeConfig {
  variant: ThemeVariant;
  name: string;
  description: string;
  primaryColor: string;
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    muted?: string;
  };
}

const themeConfigs: Record<ThemeVariant, ThemeConfig> = {
  cyan: {
    variant: 'cyan',
    name: 'Cyan',
    description: 'ESN Cyan focused theme',
    primaryColor: '#00aeef',
    colors: {
      primary: '#00aeef',
    },
  },
  magenta: {
    variant: 'magenta',
    name: 'Magenta',
    description: 'ESN Magenta focused theme',
    primaryColor: '#ec008c',
    colors: {
      primary: '#ec008c',
    },
  },
  green: {
    variant: 'green',
    name: 'Green',
    description: 'ESN Green focused theme',
    primaryColor: '#7ac143',
    colors: {
      primary: '#7ac143',
    },
  },
  orange: {
    variant: 'orange',
    name: 'Orange',
    description: 'ESN Orange focused theme',
    primaryColor: '#f47b20',
    colors: {
      primary: '#f47b20',
    },
  },
};

interface ThemeContextType {
  currentTheme: ThemeVariant;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeVariant) => void;
  themes: Record<ThemeVariant, ThemeConfig>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeVariant>('cyan');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('esn-theme') as ThemeVariant;
    if (savedTheme && themeConfigs[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    const config = themeConfigs[currentTheme];
    
    // Set CSS custom properties
    root.style.setProperty('--theme-primary', config.colors.primary);
    
    // Single color theme - use primary color for all ESN colors
    root.style.setProperty('--esn-cyan', config.colors.primary);
    root.style.setProperty('--esn-magenta', config.colors.primary);
    root.style.setProperty('--esn-green', config.colors.primary);
    root.style.setProperty('--esn-orange', config.colors.primary);
    
    // Set theme class on body (preserve existing classes like 'dark')
    const existingClasses = document.body.className
      .split(' ')
      .filter(cls => !cls.startsWith('theme-'));
    
    document.body.className = [...existingClasses, `theme-${currentTheme}`].join(' ');
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', config.primaryColor);
    }
    
    // Save to localStorage
    localStorage.setItem('esn-theme', currentTheme);
  }, [currentTheme]);

  const setTheme = (theme: ThemeVariant) => {
    setCurrentTheme(theme);
  };

  const value = {
    currentTheme,
    themeConfig: themeConfigs[currentTheme],
    setTheme,
    themes: themeConfigs,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}