"use client";

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { useWeeklyAlbumSettings } from '@/hooks/use-supabase-data';
import { createClient } from '@/lib/supabase';

interface AlbumContextType {
    weeklyAlbumSettings: any[];
    updateWeeklyAlbumLayout: (catId: string, weekKey: string, layoutType: string) => Promise<void>;
}

const AlbumContext = createContext<AlbumContextType | undefined>(undefined);

export function AlbumProvider({ children, householdId, isDemo }: { children: ReactNode; householdId: string | null; isDemo: boolean }) {
    const supabase = createClient() as any;
    const { settings: weeklyAlbumSettings, updateLayout: sUpLayout } = useWeeklyAlbumSettings();

    const updateWeeklyAlbumLayout = useCallback(async (catId: string, weekKey: string, layoutType: string) => {
        if (isDemo) return;
        await sUpLayout(catId, weekKey, layoutType);
    }, [isDemo, sUpLayout]);

    const value = useMemo(() => ({ weeklyAlbumSettings: weeklyAlbumSettings || [], updateWeeklyAlbumLayout }), [weeklyAlbumSettings, updateWeeklyAlbumLayout]);
    return <AlbumContext.Provider value={value}>{children}</AlbumContext.Provider>;
}

export function useAlbumContext() {
    const context = useContext(AlbumContext);
    if (!context) throw new Error('useAlbumContext must be used within AlbumProvider');
    return context;
}
