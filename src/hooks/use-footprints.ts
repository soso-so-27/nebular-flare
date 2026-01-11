"use client";

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

interface FootprintStats {
    userTotal: number;
    householdTotal: number;
    breakdown: Array<{
        user_id: string;
        display_name: string;
        total_points: number;
    }>;
}

interface UseFootprintsOptions {
    userId?: string;
    householdId?: string;
}

// =====================================================
// useFootprints - Main hook for footprint operations
// =====================================================

export function useFootprints({ userId, householdId }: UseFootprintsOptions = {}) {
    const [stats, setStats] = useState<FootprintStats>({
        userTotal: 0,
        householdTotal: 0,
        breakdown: [],
    });
    const [loading, setLoading] = useState(true);
    const [loginBonusAvailable, setLoginBonusAvailable] = useState(false);

    // Fetch statistics
    const fetchStats = useCallback(async () => {
        if (!userId || !householdId) return;

        const supabase = createClient();

        try {
            // Get user total
            const { data: userTotal } = await (supabase.rpc as any)('get_user_footprints', { target_user_id: userId });

            // Get household total
            const { data: householdTotal } = await (supabase.rpc as any)('get_household_footprints', { target_household_id: householdId });

            // Get breakdown by family member
            const { data: breakdown } = await (supabase.rpc as any)('get_household_footprints_breakdown', { target_household_id: householdId });

            setStats({
                userTotal: userTotal || 0,
                householdTotal: householdTotal || 0,
                breakdown: breakdown || [],
            });
        } catch (err) {
            console.error('[useFootprints] Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, householdId]);

    // Check if login bonus is available today
    const checkLoginBonus = useCallback(async () => {
        if (!userId) return;

        const supabase = createClient();

        try {
            const { data: alreadyClaimed } = await (supabase.rpc as any)('check_login_bonus_today', { target_user_id: userId });

            setLoginBonusAvailable(!alreadyClaimed);
        } catch (err) {
            console.error('[useFootprints] Error checking login bonus:', err);
        }
    }, [userId]);

    // Award footprints
    const awardFootprints = useCallback(async (
        actionType: 'login' | 'care' | 'observation' | 'photo' | 'incident',
        points: number = 1,
        catId?: string,
        actionId?: string
    ): Promise<boolean> => {
        if (!userId || !householdId) return false;

        const supabase = createClient();

        try {
            const { error } = await (supabase.from('cat_footprints') as any)
                .insert({
                    user_id: userId,
                    household_id: householdId,
                    cat_id: catId || null,
                    action_type: actionType,
                    action_id: actionId || null,
                    points,
                });

            if (error) {
                console.error('[useFootprints] Error awarding footprints:', error);
                return false;
            }

            // Refresh stats
            await fetchStats();

            // If login bonus was claimed, update state
            if (actionType === 'login') {
                setLoginBonusAvailable(false);
            }

            return true;
        } catch (err) {
            console.error('[useFootprints] Error awarding footprints:', err);
            return false;
        }
    }, [userId, householdId, fetchStats]);

    // Claim login bonus
    const claimLoginBonus = useCallback(async (): Promise<boolean> => {
        if (!loginBonusAvailable) return false;
        return awardFootprints('login', 1);
    }, [loginBonusAvailable, awardFootprints]);

    // Initial fetch
    useEffect(() => {
        fetchStats();
        checkLoginBonus();
    }, [fetchStats, checkLoginBonus]);

    return {
        stats,
        loading,
        loginBonusAvailable,
        awardFootprints,
        claimLoginBonus,
        refresh: fetchStats,
    };
}

// =====================================================
// Point values for each action type
// =====================================================

export const FOOTPRINT_POINTS = {
    login: 1,
    care: 1,
    observation: 1,
    photo: 2,
    incident: 2,
} as const;
