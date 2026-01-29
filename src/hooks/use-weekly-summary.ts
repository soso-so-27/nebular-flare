"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfISOWeek, getISOWeek } from "date-fns";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import type { AlbumLayoutType } from "@/types";

export function useWeeklySummary(catId: string, photoCount: number = 0, customDate?: Date) {
    const { weeklyAlbumSettings, updateWeeklyAlbumLayout } = useAppState();
    const [weekKey, setWeekKey] = useState("");

    // 1. Calculate Week Key (e.g., "2026-W05")
    useEffect(() => {
        const date = customDate || new Date();
        const start = startOfISOWeek(date);
        const year = start.getFullYear();
        const week = getISOWeek(start);
        const key = `${year}-W${week.toString().padStart(2, "0")}`;
        setWeekKey(key);
    }, [customDate]);

    // 2. Derive layout from global state
    const layout = useMemo(() => {
        if (!catId || !weekKey) return "hero3";

        const setting = weeklyAlbumSettings.find(s => s.cat_id === catId && s.week_key === weekKey);
        if (setting) return setting.layout_type as AlbumLayoutType;

        // Intelligent selection based on photo density
        if (photoCount >= 8) return "grid4";
        if (photoCount >= 3) return "filmstrip";
        return "hero3";
    }, [catId, weekKey, weeklyAlbumSettings, photoCount]);

    // 3. Update Layout (and persist via store)
    const updateLayout = useCallback(async (newLayout: AlbumLayoutType) => {
        if (!catId || !weekKey) return;
        await updateWeeklyAlbumLayout(catId, weekKey, newLayout);
    }, [catId, weekKey, updateWeeklyAlbumLayout]);

    return {
        layout,
        weekKey,
        loading: false, // Loading is handled by store now
        updateLayout
    };
}
