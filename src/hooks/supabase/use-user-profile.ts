/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { dbLogger } from "@/lib/logger";

/**
 * Hook for fetching and managing the current user's profile and household context.
 */
export function useUserProfile(currentUser?: any) {
    const [profile, setProfile] = useState<{ householdId: string | null; displayName: string | null; userId: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient() as any;

    const fetchProfile = async () => {
        try {
            if (!profile) {
                setLoading(true);
            }

            let user = currentUser;
            if (!user) {
                const { data } = await supabase.auth.getUser();
                user = data.user;
            }

            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('users')
                .select('id, household_id, display_name')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    setProfile({ householdId: null, displayName: null, userId: null });
                } else {
                    setError(fetchError.message);
                }
            } else if (data) {
                setProfile({
                    householdId: data.household_id,
                    displayName: data.display_name,
                    userId: data.id
                });
            }
        } catch (err) {
            setError('Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const refetch = () => {
        fetchProfile();
    };

    return { profile, loading, error, refetch };
}

/**
 * Hook for managing push notification tokens and device platforms.
 */
export function usePushToken() {
    const supabase = createClient() as any;

    async function saveToken(token: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Not authenticated' };

        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        const platform = isIOS ? 'ios' : 'web';

        const { error } = await supabase
            .from('push_tokens')
            .upsert({
                user_id: user.id,
                token: token,
                platform: platform,
                updated_at: new Date().toISOString()
            }, { onConflict: 'token' });

        if (error) {
            dbLogger.error('Error saving token:', error);
        }

        return { error };
    }

    return { saveToken };
}

/**
 * Hook for managing user notification preferences and general app settings.
 */
export function useNotificationPreferences() {
    const [preferences, setPreferences] = useState<{
        care_reminder: boolean;
        health_alert: boolean;
        inventory_alert: boolean;
        photo_alert: boolean;
        notification_hour: number;
        day_start_hour: number;
    }>({ care_reminder: true, health_alert: true, inventory_alert: true, photo_alert: true, notification_hour: 20, day_start_hour: 4 });
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    useEffect(() => {
        async function fetchPreferences() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('users')
                .select('notification_preferences')
                .eq('id', user.id)
                .single();

            if (data?.notification_preferences) {
                setPreferences(prev => ({ ...prev, ...data.notification_preferences }));
            }
            setLoading(false);
        }

        fetchPreferences();
    }, []);

    const updatePreference = async (key: string, value: boolean | number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);

        const { error } = await supabase
            .from('users')
            .update({ notification_preferences: newPreferences })
            .eq('id', user.id);

        if (error) {
            dbLogger.error('Error updating preferences:', error);
        }
    };

    return { preferences, loading, updatePreference };
}
