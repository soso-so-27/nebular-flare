import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { uploadMultipleImages } from "@/lib/storage";
import type { Database } from '@/types/database';

export type CareLog = Database['public']['Tables']['care_logs']['Row'];
export type Observation = Database['public']['Tables']['observations']['Row'];
export type CatObservation = Observation;

/**
 * Hook for today's care logs (feed, clean, etc.)
 */
export function useTodayCareLogs(householdId: string | null, dayStartHour: number = 0) {
    const supabase = createClient() as any;
    const queryClient = useQueryClient();

    const startDt = new Date();
    startDt.setDate(1); // NOTE: Original code had .setDate(1). This fetches month-to-date? 
    // Wait, the hook name says "useTodayCareLogs" but the date logic in original was monthly??
    // Let's stick to original implementation's logic but wrap in useQuery.
    startDt.setHours(dayStartHour, 0, 0, 0);
    const endDt = new Date(startDt);
    endDt.setMonth(endDt.getMonth() + 1);

    const queryKey = ['careLogs', householdId, dayStartHour];

    const { data: careLogs = [], isLoading: loading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!householdId) return [];
            const { data, error } = await supabase
                .from('care_logs')
                .select('*')
                .eq('household_id', householdId)
                .gte('done_at', startDt.toISOString())
                .lt('done_at', endDt.toISOString())
                .is('deleted_at', null);
            if (error) throw error;
            return data as CareLog[];
        },
        enabled: !!householdId,
    });

    const addMutation = useMutation({
        mutationFn: async ({ type, catId, note, images }: { type: string, catId?: string, note?: string, images: File[] }) => {
            if (!householdId) throw new Error("Household ID not found");
            const { data: user } = await supabase.auth.getUser();

            let imageUrls: string[] = [];
            if (images.length > 0) {
                const targetId = catId || 'household-common';
                const { urls, errors } = await uploadMultipleImages(targetId, images);
                imageUrls = urls;
                if (errors.length > 0) console.warn('Some images failed to upload:', errors);
            }

            const { data, error } = await supabase.from('care_logs').insert({
                household_id: householdId,
                cat_id: catId || null,
                type,
                notes: note || null,
                images: imageUrls.length > 0 ? imageUrls : null,
                done_by: user.user?.id || null,
                done_at: new Date().toISOString(),
            }).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!householdId) return;
            const { error } = await supabase
                .from('care_logs')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    useEffect(() => {
        if (!householdId) return;
        const channel = supabase
            .channel(`care-logs-realtime-${householdId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'care_logs', filter: `household_id=eq.${householdId}` },
                () => queryClient.invalidateQueries({ queryKey })
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, queryClient, queryKey, supabase]);

    return {
        careLogs,
        loading,
        addCareLog: useCallback((type: string, catId?: string, note?: string, images: File[] = []) =>
            addMutation.mutateAsync({ type, catId, note, images }), [addMutation]),
        deleteCareLog: useCallback((id: string) =>
            deleteMutation.mutateAsync(id), [deleteMutation])
    };
}


/**
 * Hook for today's observations (House-wide)
 */
export function useTodayHouseholdObservations(householdId: string | null, dayStartHour: number = 0) {
    const supabase = createClient() as any;
    const queryClient = useQueryClient();

    const now = new Date();
    if (now.getHours() < dayStartHour) {
        now.setDate(now.getDate() - 1);
    }
    const startDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dayStartHour, 0, 0, 0);
    const endDt = new Date(startDt);
    endDt.setDate(endDt.getDate() + 1);

    const startIso = startDt.toISOString();
    const endIso = endDt.toISOString();

    const queryKey = ['observations', householdId, startIso, endIso];

    const { data: observations = [], isLoading: loading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!householdId) return [];
            const { data, error } = await supabase
                .from('observations')
                .select('*')
                .gte('recorded_at', startIso)
                .lt('recorded_at', endIso)
                .order('recorded_at', { ascending: false });
            if (error) throw error;
            return data as Observation[];
        },
        enabled: !!householdId,
    });

    const addMutation = useMutation({
        mutationFn: async ({ catId, type, value, note, images }: { catId: string, type: string, value: string, note?: string, images: File[] }) => {
            if (!householdId) throw new Error("Household ID not found");
            const { data: user } = await supabase.auth.getUser();

            let imageUrls: string[] = [];
            if (images.length > 0) {
                const { urls, errors } = await uploadMultipleImages(catId, images);
                imageUrls = urls;
                if (errors.length > 0) console.warn('Some images failed to upload:', errors);
            }

            const { error } = await supabase.from('observations').insert({
                household_id: householdId,
                cat_id: catId,
                type,
                value,
                notes: note || null,
                images: imageUrls.length > 0 ? imageUrls : null,
                recorded_by: user.user?.id || null,
                recorded_at: new Date().toISOString(),
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['observations', householdId] });
        },
    });

    const acknowledgeMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!householdId) return;
            const { data: user } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('observations')
                .update({
                    acknowledged_at: new Date().toISOString(),
                    acknowledged_by: user.user?.id
                })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['observations', householdId] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!householdId) return;
            const { error } = await supabase
                .from('observations')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['observations', householdId] });
        },
    });

    useEffect(() => {
        if (!householdId) return;
        const channel = supabase
            .channel(`observations-household-${householdId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'observations' },
                () => queryClient.invalidateQueries({ queryKey: ['observations', householdId] })
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, queryClient, supabase]);

    return {
        observations,
        loading,
        addObservation: useCallback((catId: string, type: string, value: string, note?: string, images: File[] = []) =>
            addMutation.mutateAsync({ catId, type, value, note, images }), [addMutation]),
        acknowledgeObservation: useCallback((id: string) =>
            acknowledgeMutation.mutateAsync(id), [acknowledgeMutation]),
        deleteObservation: useCallback((id: string) =>
            deleteMutation.mutateAsync(id), [deleteMutation])
    };
}


/**
 * Hook for fetching logs for a specific date (Calendar Detail)
 */
export function useDateLogs(householdId: string | null, date: Date) {
    const supabase = createClient() as any;
    const queryClient = useQueryClient();

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const start = startOfDay.toISOString();
    const end = endOfDay.toISOString();

    const queryKey = ['dateLogs', householdId, start];

    const { data: logs = { careLogs: [], observations: [] }, isLoading: loading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!householdId) return { careLogs: [], observations: [] };

            const [careLogsRes, observationsRes] = await Promise.all([
                supabase
                    .from('care_logs')
                    .select('*')
                    .eq('household_id', householdId)
                    .gte('done_at', start)
                    .lte('done_at', end)
                    .is('deleted_at', null)
                    .order('done_at', { ascending: false }),
                supabase
                    .from('observations')
                    .select('*, cats!inner(household_id)')
                    .eq('cats.household_id', householdId)
                    .gte('recorded_at', start)
                    .lte('recorded_at', end)
                    .is('deleted_at', null)
                    .order('recorded_at', { ascending: false })
            ]);

            return {
                careLogs: careLogsRes.data || [],
                observations: (observationsRes.data || []) as Observation[]
            };
        },
        enabled: !!householdId,
    });

    const refetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey]);

    return { ...logs, loading, refetch };
}

/**
 * Legacy hook for backward compatibility
 */
export function useTodayObservations(_catId: string | null) {
    return { observations: [], loading: false, addObservation: async () => ({}) };
}

