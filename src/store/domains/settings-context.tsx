"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { AppSettings, LayoutType } from '@/types';
import { useNotificationPreferences } from '@/hooks/use-supabase-data';

interface SettingsContextType {
    isPro: boolean;
    setIsPro: (v: boolean) => void;
    aiEnabled: boolean;
    setAiEnabled: (v: boolean) => void;
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    lastSeenAt: string;
    setLastSeenAt: (v: string) => void;
    fcmToken: string | null;
    setFcmToken: (token: string | null) => void;
    updateSettings: (updates: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [aiEnabled, _setAiEnabled] = useState(true);
    const [lastSeenAt, setLastSeenAt] = useState(new Date().toISOString());
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    const [settings, setSettings] = useState<AppSettings>(() => {
        let savedViewMode: 'story' | 'parallax' | 'icon' = 'story';
        let savedLayoutType: LayoutType = 'v2-island';
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('homeViewMode');
            if (saved === 'story' || saved === 'parallax' || saved === 'icon') {
                savedViewMode = saved;
            }
            const savedLayout = localStorage.getItem('layoutType');
            if (savedLayout === 'v2-classic') {
                localStorage.setItem('layoutType', 'v2-island');
                savedLayoutType = 'v2-island';
            } else if (savedLayout === 'v2-island') {
                savedLayoutType = savedLayout;
            }

            const savedButtonMode = localStorage.getItem('homeButtonMode');
            const finalButtonMode = (savedLayoutType === 'v2-island') ? 'separated' : (savedButtonMode as 'unified' | 'separated' || 'separated');

            return {
                plan: 'Free',
                aiEnabled: true,
                engagement: 'passive',
                homeMode: 'checklist',
                homeViewMode: savedViewMode,
                layoutType: savedLayoutType,
                weeklySummaryEnabled: true,
                quietHours: { start: 23, end: 7 },
                invThresholds: { soon: 7, urgent: 3, critical: 1 },
                seasonalDeckEnabled: true,
                skinPackOwned: false,
                skinMode: 'default',
                photoTagAssist: true,
                dayStartHour: 4,
                lastSeenPhotoAt: localStorage.getItem('lastSeenPhotoAt') || new Date(0).toISOString(),
                homeButtonMode: finalButtonMode,
            };
        }
        return {
            plan: 'Free', aiEnabled: true, engagement: 'passive', homeMode: 'checklist',
            homeViewMode: 'story', layoutType: 'v2-island', weeklySummaryEnabled: true,
            quietHours: { start: 23, end: 7 }, invThresholds: { soon: 7, urgent: 3, critical: 1 },
            seasonalDeckEnabled: true, skinPackOwned: false, skinMode: 'default',
            photoTagAssist: true, dayStartHour: 4, lastSeenPhotoAt: new Date(0).toISOString(),
            homeButtonMode: 'separated',
        };
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('homeViewMode', settings.homeViewMode);
            localStorage.setItem('homeButtonMode', settings.homeButtonMode);
            localStorage.setItem('layoutType', settings.layoutType);
            if (settings.lastSeenPhotoAt) {
                localStorage.setItem('lastSeenPhotoAt', settings.lastSeenPhotoAt);
            }
        }
    }, [settings.homeViewMode, settings.homeButtonMode, settings.layoutType, settings.lastSeenPhotoAt]);

    const { preferences, updatePreference } = useNotificationPreferences();

    useEffect(() => {
        if (preferences?.day_start_hour !== undefined) {
            setSettings(s => ({ ...s, dayStartHour: preferences.day_start_hour }));
        }
    }, [preferences?.day_start_hour]);

    useEffect(() => {
        if (settings.dayStartHour !== undefined && settings.dayStartHour !== (preferences?.day_start_hour || 0)) {
            updatePreference('day_start_hour', settings.dayStartHour);
        }
    }, [settings.dayStartHour]);

    const value = useMemo(() => ({
        isPro: settings.plan === 'Pro',
        setIsPro: (v: boolean) => setSettings(s => ({ ...s, plan: v ? 'Pro' : 'Free' })),
        aiEnabled: settings.aiEnabled,
        setAiEnabled: (v: boolean) => setSettings(s => ({ ...s, aiEnabled: v })),
        settings,
        setSettings,
        lastSeenAt,
        setLastSeenAt,
        fcmToken,
        setFcmToken,
        updateSettings: (updates: Partial<AppSettings>) => setSettings(s => ({ ...s, ...updates }))
    }), [settings, lastSeenAt, fcmToken]);

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettingsContext must be used within SettingsProvider');
    return context;
}
