/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getAdjustedDateString } from "@/lib/utils-date";
import type { Database } from '@/types/database';

import type { Cat } from '@/types';
type CareLog = Database['public']['Tables']['care_logs']['Row'];
type Observation = Database['public']['Tables']['observations']['Row'];
type CatObservation = Observation; // Alias for compat
type Inventory = Database['public']['Tables']['inventory']['Row'];



// Rewriting useCats to allow refetch
export function useCats(householdId: string | null) {
    const [cats, setCats] = useState<Cat[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const supabase = createClient() as any;

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchCats() {
            setLoading(true);

            // Fetch cats first (Critical data)
            const { data: catsData, error: catsError } = await supabase
                .from('cats')
                .select('*, images:cat_images(*)')
                .eq('household_id', householdId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });

            if (catsError) {
                console.error('Error fetching cats:', catsError);
                setLoading(false);
                return;
            }

            // Fetch weight history safely (Non-critical)
            let weightMap: Record<string, any[]> = {};
            try {
                const catIds = catsData.map((c: any) => c.id);
                if (catIds.length > 0) {
                    const { data: weights, error: weightError } = await supabase
                        .from('cat_weight_history')
                        .select('*')
                        .in('cat_id', catIds)
                        .order('recorded_at', { ascending: false }); // Latest first

                    if (!weightError && weights) {
                        weights.forEach((w: any) => {
                            if (!weightMap[w.cat_id]) weightMap[w.cat_id] = [];
                            weightMap[w.cat_id].push(w);
                        });
                    }
                }
            } catch (e) {
                console.warn('Weight history fetch failed, ignoring:', e);
            }

            if (catsData) {
                const mergedCats = catsData.map((cat: any) => ({
                    ...cat,
                    weight_history: weightMap[cat.id] || []
                }));
                setCats(mergedCats);
            }
            setLoading(false);
        }

        fetchCats();

        // Real-time subscription
        const channel = supabase
            .channel('cats-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'cats', filter: `household_id=eq.${householdId}` },
                (payload: any) => {
                    fetchCats();
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'cat_weight_history' },
                (payload: any) => {
                    fetchCats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, refreshTrigger]);

    const refetch = () => setRefreshTrigger(prev => prev + 1);

    return { cats, loading, setCats, refetch };
}



// Hook for today's care logs
export function useTodayCareLogs(householdId: string | null, dayStartHour: number = 0) {
    const [careLogs, setCareLogs] = useState<CareLog[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    // Calculate 'Business Day' range
    const todayStr = getAdjustedDateString(new Date(), dayStartHour);
    const startDt = new Date(todayStr);
    startDt.setHours(dayStartHour, 0, 0, 0);
    const endDt = new Date(startDt);
    endDt.setDate(endDt.getDate() + 1);

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchCareLogs() {
            const { data, error } = await supabase
                .from('care_logs')
                .select('*')
                .eq('household_id', householdId)
                .gte('done_at', startDt.toISOString())
                .lt('done_at', endDt.toISOString())
                .is('deleted_at', null);

            if (!error && data) {
                setCareLogs(data);
            }
            setLoading(false);
        }

        fetchCareLogs();

        // Real-time subscription
        const channel = supabase
            .channel('care-logs-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'care_logs', filter: `household_id=eq.${householdId}` },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        setCareLogs(prev => [...prev, payload.new as CareLog]);
                    } else if (payload.eventType === 'UPDATE') {
                        setCareLogs(prev => prev.map(c => c.id === (payload.new as CareLog).id ? payload.new as CareLog : c));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, todayStr, dayStartHour]);

    // Add care log
    async function addCareLog(type: string, catId?: string) {
        if (!householdId) return;

        const { data: user } = await supabase.auth.getUser();

        const { error } = await supabase.from('care_logs').insert({
            household_id: householdId,
            cat_id: catId || null,
            type,
            done_by: user.user?.id || null,
        });

        return { error };
    }

    async function deleteCareLog(id: string) {
        if (!householdId) return;
        const { error } = await supabase
            .from('care_logs')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        return { error };
    }

    return { careLogs, loading, addCareLog, deleteCareLog };
}

// Hook for today's observations (House-wide)
export function useTodayHouseholdObservations(householdId: string | null, dayStartHour: number = 0) {
    const [observations, setObservations] = useState<CatObservation[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    // Calculate start/end based on local time dayStartHour
    const now = new Date();
    // Adjust for day start hour (e.g. if 2am and start is 6am, it's previous day)
    if (now.getHours() < dayStartHour) {
        now.setDate(now.getDate() - 1);
    }

    // Create start date at 00:00:00 (or dayStartHour) LOCAL time
    const startDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dayStartHour, 0, 0, 0);

    // Create end date (next day at start hour)
    const endDt = new Date(startDt);
    endDt.setDate(endDt.getDate() + 1);

    // Convert to ISO string for Supabase comparison (Supabase stores in UTC, but comparison string is interpreted)
    // IMPORTANT: .toISOString() converts to UTC. If user is JST (+9), 00:00 JST becomes 15:00 UTC previous day.
    // This IS correct for querying 'timestamptz' columns if Supabase stores them correctly.
    // However, to be safe and explicit, let's trust the browser's conversion of the local startDt object to ISO.
    const startIso = startDt.toISOString();
    const endIso = endDt.toISOString();

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchObservations() {
            // DEBUG LOGGING
            console.log('Fetching observations for household:', householdId);
            console.log('Date Range:', startIso, '~', endIso);

            // RLS handles access control via cat_id, no need to filter by household_id
            const { data, error } = await supabase
                .from('observations')
                .select(`
    *,
    cats(name)
        `)
                // TEMPORARILY REMOVED DATE FILTER FOR DEBUGGING
                // .gte('created_at', startIso)
                // .lt('created_at', endIso)
                .order('created_at', { ascending: false })
                .limit(50); // Limit to avoid too much data

            console.log('Observations fetch result:', { data, error });

            if (!error && data) {
                console.log('Found', data.length, 'observations');
                setObservations(data);
            }
            setLoading(false);
        }

        fetchObservations();

        // Real-time subscription - tricky for joined tables.
        // Simplified: Subscribe to 'observations' with client-side filter or re-fetch?
        // Actually, observations table has cat_id. We can listen to all observations where cat_id corresponds to our cats.
        // But for simplicity, let's just listen to generic INSERT/UPDATE on observations.
        // RLS will ensure we only receive what we are allowed to see.
        const channel = supabase
            .channel(`observations-household-${householdId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'observations' },
                (payload: any) => {
                    // Ideally check if payload.new.cat_id belongs to household, but RLS restricts receipt anyway.
                    if (payload.eventType === 'INSERT') {
                        setObservations(prev => [...prev, payload.new as Observation]);
                    } else if (payload.eventType === 'UPDATE') {
                        setObservations(prev => prev.map(o => o.id === (payload.new as Observation).id ? payload.new as Observation : o));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, startIso, endIso]);

    async function addObservation(catId: string, type: string, value: string) {
        if (!householdId) return;

        const { data: user } = await supabase.auth.getUser();

        const { error } = await supabase.from('observations').insert({
            household_id: householdId,
            cat_id: catId,
            type,
            value,
            recorded_by: user.user?.id || null,
            recorded_at: new Date().toISOString(),
        });

        return { error };
    }

    async function acknowledgeObservation(id: string) {
        if (!householdId) return;
        const { data: user } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('observations')
            .update({
                acknowledged_at: new Date().toISOString(),
                acknowledged_by: user.user?.id
            })
            .eq('id', id);
        return { error };
    }

    async function deleteObservation(id: string) {
        if (!householdId) return;
        const { error } = await supabase
            .from('observations')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        return { error };
    }

    return { observations, loading, addObservation, acknowledgeObservation, deleteObservation };
}

// Legacy hook - keeping for backward compat if needed, but AppStore will switch to above.
export function useTodayObservations(catId: string | null) {
    // ... existing implementation ...
    return { observations: [], loading: false, addObservation: async () => ({}) };
}

// Hook for inventory
export function useInventory(householdId: string | null) {
    const [inventory, setInventory] = useState<Inventory[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchInventory() {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null);

            if (!error && data) {
                setInventory(data);
            }
            setLoading(false);
        }

        fetchInventory();

        // Real-time subscription
        const channel = supabase
            .channel('inventory-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'inventory', filter: `household_id = eq.${householdId} ` },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        setInventory(prev => [...prev, payload.new as Inventory]);
                    } else if (payload.eventType === 'UPDATE') {
                        setInventory(prev => prev.map(i => i.id === (payload.new as Inventory).id ? payload.new as Inventory : i));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId]);

    // Mark as bought
    async function markBought(itemId: string) {
        const { error } = await supabase
            .from('inventory')
            .update({
                last_bought: new Date().toISOString().split('T')[0],
                range_min: 30,
                range_max: 45
            })
            .eq('id', itemId);

        return { error };
    }

    return { inventory, loading, markBought };
}

// Hook for user profile with household
export function useUserProfile() {
    const [profile, setProfile] = useState<{ householdId: string | null; displayName: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient() as any;

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('users')
                .select('household_id, display_name')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                // If user doesn't exist yet (PGRST116 = no rows returned), treat as new user
                if (fetchError.code === 'PGRST116') {
                    setProfile({ householdId: null, displayName: null });
                } else {
                    setError(fetchError.message);
                }
            } else if (data) {
                setProfile({
                    householdId: data.household_id,
                    displayName: data.display_name
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

// Hook for managing push tokens
export function usePushToken() {
    const supabase = createClient() as any;

    async function saveToken(token: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Not authenticated' };

        // Simple platform detection
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS 13+

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
            console.error('Error saving token:', error);
        }

        return { error };
    }

    return { saveToken };
}

// Hook for notification preferences
export function useNotificationPreferences() {
    const [preferences, setPreferences] = useState<{
        care_reminder: boolean;
        health_alert: boolean;
        inventory_alert: boolean;
        notification_hour: number;
        day_start_hour: number;
    }>({ care_reminder: true, health_alert: true, inventory_alert: true, notification_hour: 20, day_start_hour: 0 });
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
                // Merge with defaults to handle new keys in future
                setPreferences(prev => ({ ...prev, ...data.notification_preferences }));
            }
            setLoading(false);
        }

        fetchPreferences();
    }, []);

    const updatePreference = async (key: string, value: boolean | number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Optimistic update
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);

        const { error } = await supabase
            .from('users')
            .update({ notification_preferences: newPreferences })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating preferences:', error);
            // Revert on error? For now, we just log it.
        }
    };

    return { preferences, loading, updatePreference };
}

// Hook for fetching logs for a specific date (Calendar Detail)
export function useDateLogs(householdId: string | null, date: Date) {
    const [logs, setLogs] = useState<{ careLogs: CareLog[], observations: Observation[] }>({ careLogs: [], observations: [] });
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const supabase = createClient() as any;

    const dateStr = date.toISOString().split('T')[0];

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchLogs() {
            setLoading(true);
            const start = `${dateStr}T00:00:00`;
            const end = `${dateStr}T23:59:59`;

            const { data: careLogs } = await supabase
                .from('care_logs')
                .select('*')
                .eq('household_id', householdId)
                .gte('done_at', start)
                .lte('done_at', end)
                .is('deleted_at', null)
                .order('done_at', { ascending: false });

            const { data: observations } = await supabase
                .from('observations')
                .select('*, cats!inner(household_id)') // Join to ensure household match
                .eq('cats.household_id', householdId)
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .is('deleted_at', null)
                .order('recorded_at', { ascending: false });

            if (careLogs && observations) {
                setLogs({ careLogs, observations });
            }
            setLoading(false);
        }

        fetchLogs();
    }, [householdId, dateStr, refreshTrigger]);

    return { ...logs, loading, refetch: () => setRefreshTrigger(prev => prev + 1) };
}

