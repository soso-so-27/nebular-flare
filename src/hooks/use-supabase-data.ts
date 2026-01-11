/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { getAdjustedDateString } from "@/lib/utils-date";
import { uploadCatImage as uploadCatImageToStorage, uploadMultipleImages } from "@/lib/storage";
import type { Database } from '@/types/database';

import type { Cat } from '@/types';
type CareLog = Database['public']['Tables']['care_logs']['Row'];
type Observation = Database['public']['Tables']['observations']['Row'];
type CatObservation = Observation; // Alias for compat
type Inventory = Database['public']['Tables']['inventory']['Row'];
type Incident = Database['public']['Tables']['incidents']['Row'];
type IncidentUpdate = Database['public']['Tables']['incident_updates']['Row'];


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

            // Use optimized RPC that fetches cats, images, and weight history in one query
            const { data: catsData, error: catsError } = await supabase
                .rpc('get_cats_with_details', { target_household_id: householdId });

            if (catsError) {
                // Fallback to old method if new RPC doesn't exist yet
                console.warn('Optimized RPC not available, using fallback:', catsError.message);
                await fetchCatsFallback();
                return;
            }

            if (catsData) {
                // RPC returns JSON with images and weight_history already included
                setCats(catsData);
            }
            setLoading(false);
        }

        // Fallback function for backwards compatibility
        async function fetchCatsFallback() {
            const { data: rawCats, error: fallbackError } = await supabase
                .rpc('get_all_cats', { target_household_id: householdId });

            if (fallbackError) {
                console.error('Error fetching cats via RPC:', fallbackError);
                setLoading(false);
                return;
            }

            let catsData = rawCats || [];
            if (catsData.length > 0) {
                const catIds = catsData.map((c: any) => c.id);

                // Fetch images and weights in parallel
                const [imagesResult, weightsResult] = await Promise.all([
                    supabase.from('cat_images')
                        .select('id, storage_path, cat_id, created_at, is_favorite')
                        .in('cat_id', catIds),
                    supabase.from('cat_weight_history')
                        .select('id, cat_id, weight, recorded_at, note')
                        .in('cat_id', catIds)
                        .order('recorded_at', { ascending: false })
                ]);

                const images = imagesResult.data || [];
                const weights = weightsResult.data || [];

                // Build weight map
                const weightMap: Record<string, any[]> = {};
                weights.forEach((w: any) => {
                    if (!weightMap[w.cat_id]) weightMap[w.cat_id] = [];
                    weightMap[w.cat_id].push(w);
                });

                // Merge data
                catsData = catsData.map((cat: any) => ({
                    ...cat,
                    images: images.filter((img: any) => img.cat_id === cat.id),
                    weight_history: weightMap[cat.id] || []
                }));
            }

            setCats(catsData);
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
    async function addCareLog(type: string, catId?: string, note?: string, images: File[] = []) {
        if (!householdId) return { error: { message: "Household ID not found" } };

        const { data: user } = await supabase.auth.getUser();

        // Upload images using shared storage utility
        let imageUrls: string[] = [];
        if (images.length > 0) {
            const targetId = catId || 'household-common';
            const { urls, errors } = await uploadMultipleImages(targetId, images);
            imageUrls = urls;
            if (errors.length > 0) {
                console.warn('Some images failed to upload:', errors);
            }
        }

        const { error } = await supabase.from('care_logs').insert({
            household_id: householdId,
            cat_id: catId || null,
            type,
            notes: note || null,
            images: imageUrls.length > 0 ? imageUrls : null,
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
            // RLS handles access control via cat_id, no need to filter by household_id
            const { data, error } = await supabase
                .from('observations')
                .select('*')
                // Date filter uses recorded_at (not created_at - that column doesn't exist)
                .gte('recorded_at', startIso)
                .lt('recorded_at', endIso)
                .order('recorded_at', { ascending: false });

            if (!error && data) {
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

    async function addObservation(catId: string, type: string, value: string, note?: string, images: File[] = []) {
        if (!householdId) return;

        const { data: user } = await supabase.auth.getUser();

        // Upload images using shared storage utility
        let imageUrls: string[] = [];
        if (images.length > 0) {
            const { urls, errors } = await uploadMultipleImages(catId, images);
            imageUrls = urls;
            if (errors.length > 0) {
                console.warn('Some images failed to upload:', errors);
            }
        }

        const { error } = await supabase.from('observations').insert({
            household_id: householdId,
            cat_id: catId,
            type,
            value,
            notes: note || null,
            images: imageUrls.length > 0 ? imageUrls : null, // Store as text[]
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
export function useUserProfile(currentUser?: any) {
    const [profile, setProfile] = useState<{ householdId: string | null; displayName: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient() as any;

    const fetchProfile = async () => {
        try {
            // Only show full loading state if we have no data yet
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
// --- Incidents ---

export function useIncidents(householdId: string | null) {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    const fetchIncidents = useCallback(async () => {
        if (!householdId) return;
        try {
            // Fetch active incidents (not resolved, or resolved recently)
            // For now, let's just fetch all non-deleted for the last 30 days maybe?
            // Or just active ones + resolved in last 24h?
            // Let's simplified: fetch all non-deleted, filter on client or server.
            // Actually, we want active ones predominantly.

            const { data, error } = await supabase
                .from('incidents')
                .select(`
                    *,
                    updates:incident_updates(*)
                `)
                .eq('household_id', householdId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Client-side sort updates
            const sorted = (data as any[])?.map(inc => ({
                ...inc,
                updates: (inc.updates as any[])?.sort((a: any, b: any) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            })) || [];

            setIncidents(sorted);
        } catch (e) {
            console.error("Error fetching incidents:", e);
        } finally {
            setLoading(false);
        }
    }, [householdId]);

    useEffect(() => {
        fetchIncidents();

        if (!householdId) return;

        // Realtime subscription
        const channel = supabase
            .channel('public:incidents')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'incidents', filter: `household_id=eq.${householdId}` },
                () => fetchIncidents()
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'incident_updates' }, // Filter might be hard for joined updates, just listen to table
                () => fetchIncidents()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, fetchIncidents]);

    const addIncident = async (catId: string, type: string, note: string, photos: File[] = []) => {
        if (!householdId) return { error: "No household" };

        try {
            // 1. Upload photos
            const photoPaths: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `incidents/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars') // Using avatars bucket for now as shared storage
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
                photoPaths.push(filePath);
            }

            // 2. Create Incident
            const { data, error } = await supabase
                .from('incidents')
                .insert({
                    household_id: householdId,
                    cat_id: catId,
                    type,
                    note,
                    photos: photoPaths,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                } as any)
                .select()
                .single();

            if (error) throw error;

            // Trigger Notification
            await supabase.functions.invoke('push-notification', {
                body: {
                    type: 'INSERT',
                    table: 'incidents',
                    record: data,
                }
            });

            fetchIncidents();
            return { data };
        } catch (e) {
            console.error(e);
            return { error: e };
        }
    };

    const addIncidentUpdate = async (incidentId: string, note: string, photos: File[] = [], statusChange?: string) => {
        try {
            // 1. Upload photos
            const photoPaths: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `incidents/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
                photoPaths.push(filePath);
            }

            // 2. Create Update
            const { error } = await supabase
                .from('incident_updates')
                .insert({
                    incident_id: incidentId,
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    note,
                    photos: photoPaths,
                    status_change: statusChange === 'none' ? null : statusChange
                } as any);

            if (error) throw error;

            // 3. Update Parent Incident if status changed
            if (statusChange && statusChange !== 'none') {
                // Determine new status based on change
                let newStatus = 'watching';
                if (statusChange === 'resolved') newStatus = 'resolved';

                // If resolved, set resolved_at
                const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
                if (newStatus === 'resolved') updateData.resolved_at = new Date().toISOString();

                await supabase.from('incidents').update(updateData).eq('id', incidentId);
            }

            fetchIncidents();
            return {};
        } catch (e) {
            console.error(e);
            return { error: e };
        }
    };

    const resolveIncident = async (incidentId: string) => {
        try {
            const { error } = await supabase
                .from('incidents')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', incidentId);

            if (error) throw error;

            // Add a system update for clarity? Optional.
            await supabase.from('incident_updates').insert({
                incident_id: incidentId,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                note: '解決済みにしました',
                status_change: 'resolved'
            } as any);

            fetchIncidents();
            return {};
        } catch (e) {
            console.error(e);
            return { error: e };
        }
    }

    const deleteIncident = async (incidentId: string) => {
        try {
            const { error } = await supabase
                .from('incidents')
                .update({ deleted_at: new Date().toISOString() } as any)
                .eq('id', incidentId);

            if (error) throw error;
            fetchIncidents();
            return {};
        } catch (e) {
            console.error(e);
            return { error: e };
        }
    };

    return { incidents, loading, refetch: fetchIncidents, addIncident, addIncidentUpdate, resolveIncident, deleteIncident };
}

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

