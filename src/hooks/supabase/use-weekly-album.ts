/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { WeeklyAlbumSettings } from '@/types';

/**
 * Hook for managing layout settings of the weekly album sharing feature.
 */
export function useWeeklyAlbumSettings() {
    const [settings, setSettings] = useState<WeeklyAlbumSettings[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        let subscription: any;

        async function fetchSettings() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userData } = await (supabase
                    .from('users')
                    .select('household_id')
                    .eq('id', user.id)
                    .single() as any);

                if (!userData?.household_id) return;

                const { data, error } = await supabase
                    .from('weekly_album_settings' as any)
                    .select('*')
                    .eq('household_id', userData.household_id);

                if (error) throw error;
                setSettings(data || []);

                subscription = supabase
                    .channel('weekly_album_settings_changes')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'weekly_album_settings',
                            filter: `household_id=eq.${userData.household_id}`
                        },
                        () => {
                            fetchSettings();
                        }
                    )
                    .subscribe();
            } catch (e) {
                console.error('Error fetching weekly album settings:', e);
            } finally {
                setLoading(false);
            }
        }

        fetchSettings();

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    const updateLayout = async (catId: string, weekKey: string, layoutType: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData } = await (supabase
                .from('users')
                .select('household_id')
                .eq('id', user.id)
                .single() as any);

            if (!userData?.household_id) throw new Error('No household ID');

            const { error } = await (supabase
                .from('weekly_album_settings' as any)
                .upsert({
                    household_id: userData.household_id,
                    cat_id: catId,
                    week_key: weekKey,
                    layout_type: layoutType,
                    user_id: user.id,
                    updated_at: new Date().toISOString()
                } as any, { onConflict: 'household_id,cat_id,week_key' } as any));

            if (error) throw error;
        } catch (e) {
            console.error('Error updating weekly album layout:', e);
            throw e;
        }
    };

    return { settings, loading, updateLayout };
}
