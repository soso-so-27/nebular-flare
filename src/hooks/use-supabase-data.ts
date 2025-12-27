"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Cat = Database['public']['Tables']['cats']['Row'];
type CareLog = Database['public']['Tables']['care_logs']['Row'];
type Observation = Database['public']['Tables']['observations']['Row'];
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
            const { data, error } = await supabase
                .from('cats')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setCats(data);
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
                    // Optimistic update or just refetch?
                    // Refetch is safer for consistency
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
export function useTodayCareLogs(householdId: string | null) {
    const [careLogs, setCareLogs] = useState<CareLog[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    const today = new Date().toISOString().split('T')[0];

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
                .gte('done_at', `${today}T00:00:00`)
                .lt('done_at', `${today}T23:59:59`)
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
    }, [householdId, today]);

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

    return { careLogs, loading, addCareLog };
}

// Hook for today's observations
export function useTodayObservations(catId: string | null) {
    const [observations, setObservations] = useState<Observation[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!catId) {
            setLoading(false);
            return;
        }

        async function fetchObservations() {
            const { data, error } = await supabase
                .from('observations')
                .select('*')
                .eq('cat_id', catId)
                .gte('recorded_at', `${today}T00:00:00`)
                .lt('recorded_at', `${today}T23:59:59`)
                .is('deleted_at', null);

            if (!error && data) {
                setObservations(data);
            }
            setLoading(false);
        }

        fetchObservations();

        // Real-time subscription
        const channel = supabase
            .channel(`observations-${catId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'observations', filter: `cat_id=eq.${catId}` },
                (payload: any) => {
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
    }, [catId, today]);

    // Add observation
    async function addObservation(type: string, value: string) {
        if (!catId) return;

        const { data: user } = await supabase.auth.getUser();

        const { error } = await supabase.from('observations').insert({
            cat_id: catId,
            type,
            value,
            recorded_by: user.user?.id || null,
        });

        return { error };
    }

    return { observations, loading, addObservation };
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
                { event: '*', schema: 'public', table: 'inventory', filter: `household_id=eq.${householdId}` },
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
    }>({ care_reminder: true, health_alert: true, inventory_alert: true, notification_hour: 20 });
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




