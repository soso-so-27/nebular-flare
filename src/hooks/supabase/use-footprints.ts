"use client";

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { dbLogger } from '@/lib/logger';

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
        if (!userId || !householdId) {
            setLoading(false);
            return;
        }

        const supabase = createClient();

        try {
            // Standard table query (much more reliable than custom RPCs in remote envs)
            const { data, error } = await (supabase.from('cat_footprints') as any)
                .select('user_id, points')
                .eq('household_id', householdId);

            if (error) {
                dbLogger.error('[useFootprints] fetchStats Error:', error);
                // Keep previous state on error to avoid 0 flickering
                return;
            }

            if (data) {
                const householdTotal = (data as any[]).reduce((sum, row) => sum + (row.points || 0), 0);
                const userTotal = (data as any[])
                    .filter(row => row.user_id === userId)
                    .reduce((sum, row) => sum + (row.points || 0), 0);

                // Group by user for breakdown (simplified)
                const userGroups: Record<string, number> = {};
                (data as any[]).forEach(row => {
                    userGroups[row.user_id] = (userGroups[row.user_id] || 0) + (row.points || 0);
                });

                // Note: display_name is not in cat_footprints, so we'd need a join or separate fetch for full breakdown.
                // For now, we prioritize the totals which are most critical.

                setStats(prev => ({
                    userTotal,
                    householdTotal,
                    breakdown: prev.breakdown, // Keep existing breakdown names to avoid layout thrashing
                }));
            }
        } catch (err) {
            dbLogger.error('[useFootprints] Unexpected error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, householdId]);

    // Initial fetch and periodic refresh
    useEffect(() => {
        if (userId && householdId) {
            fetchStats();
            checkLoginBonus();
        }
    }, [userId, householdId, fetchStats]);

    // Check if login bonus is available today
    const checkLoginBonus = useCallback(async () => {
        if (!userId) return;

        const supabase = createClient();

        try {
            // Simplified check using simple query
            const { data, error } = await supabase
                .from('cat_footprints')
                .select('id')
                .eq('user_id', userId)
                .eq('action_type', 'login')
                .gte('earned_at', new Date().toISOString().split('T')[0])
                .limit(1);

            if (!error) {
                setLoginBonusAvailable(!data || data.length === 0);
            }
        } catch (err) {
            dbLogger.error('[useFootprints] Error checking login bonus:', err);
        }
    }, [userId]);

    const awardFootprints = useCallback(async (
        actionType: 'login' | 'care' | 'observation' | 'photo' | 'incident' | 'exchange' | 'nyannlog',
        pointValue: number = 1,
        catId?: string,
        actionId?: string
    ): Promise<boolean> => {
        if (!userId || !householdId) return false;

        const supabase = createClient();

        try {
            // Ensure points is correctly used as column name
            const { error } = await (supabase.from('cat_footprints') as any)
                .insert({
                    user_id: userId,
                    household_id: householdId,
                    cat_id: catId || null,
                    action_type: actionType,
                    action_id: actionId || null,
                    points: pointValue, // CORRECT COLUMN NAME: points
                });

            if (error) {
                dbLogger.error('[useFootprints] Error awarding footprints:', error);
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
            dbLogger.error('[useFootprints] Error awarding footprints:', err);
            return false;
        }
    }, [userId, householdId, fetchStats]);

    const claimLoginBonus = useCallback(async (): Promise<boolean> => {
        if (!loginBonusAvailable) return false;
        return awardFootprints('login', 1);
    }, [loginBonusAvailable, awardFootprints]);

    // Consuming points without custom RPC dependency
    const consumeFootprints = useCallback(async (
        actionType: string,
        pointCost: number,
        description?: string
    ): Promise<boolean> => {
        if (!userId || !householdId) return false;

        const supabase = createClient();

        try {
            // 1. Fetch current total to ensure sufficiency (Client-side check as fallback)
            const { data: currentData, error: fetchError } = await (supabase.from('cat_footprints') as any)
                .select('points')
                .eq('household_id', householdId);

            if (fetchError || !currentData) {
                dbLogger.error('[useFootprints] Error verifying balance:', fetchError);
                return false;
            }

            const currentTotal = (currentData as any[]).reduce((sum, row) => sum + (row.points || 0), 0);

            if (currentTotal < Math.abs(pointCost)) {
                console.warn('[useFootprints] Insufficient points:', currentTotal);
                return false;
            }

            // 2. Perform consumption (insert negative points)
            const { error: insertError } = await (supabase.from('cat_footprints') as any)
                .insert({
                    user_id: userId,
                    household_id: householdId,
                    action_type: 'exchange', // Supported in check constraint
                    points: -Math.abs(pointCost),
                });

            if (insertError) {
                dbLogger.error('[useFootprints] Error inserting consumption record:', insertError);
                return false;
            }

            // 3. Sync state
            await fetchStats();
            return true;
        } catch (err) {
            dbLogger.error('[useFootprints] Unexpected error:', err);
            return false;
        }
    }, [userId, householdId, fetchStats]);

    return {
        stats,
        loading,
        loginBonusAvailable,
        awardFootprints,
        consumeFootprints,
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
    nyannlog: 2,
} as const;
