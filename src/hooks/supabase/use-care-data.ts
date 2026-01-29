/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
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
    const [careLogs, setCareLogs] = useState<CareLog[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    const startDt = new Date();
    startDt.setDate(1);
    startDt.setHours(dayStartHour, 0, 0, 0);
    const endDt = new Date(startDt);
    endDt.setMonth(endDt.getMonth() + 1);

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
    }, [householdId, dayStartHour]);

    async function addCareLog(type: string, catId?: string, note?: string, images: File[] = []) {
        if (!householdId) return { error: { message: "Household ID not found" } };

        const { data: user } = await supabase.auth.getUser();

        let imageUrls: string[] = [];
        if (images.length > 0) {
            const targetId = catId || 'household-common';
            const { urls, errors } = await uploadMultipleImages(targetId, images);
            imageUrls = urls;
            if (errors.length > 0) {
                console.warn('Some images failed to upload:', errors);
            }
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

        if (!error && data) {
            setCareLogs(prev => [...prev, data as CareLog]);
        }

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

/**
 * Hook for today's observations (House-wide)
 */
export function useTodayHouseholdObservations(householdId: string | null, dayStartHour: number = 0) {
    const [observations, setObservations] = useState<CatObservation[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    const now = new Date();
    if (now.getHours() < dayStartHour) {
        now.setDate(now.getDate() - 1);
    }

    const startDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dayStartHour, 0, 0, 0);
    const endDt = new Date(startDt);
    endDt.setDate(endDt.getDate() + 1);

    const startIso = startDt.toISOString();
    const endIso = endDt.toISOString();

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchObservations() {
            const { data, error } = await supabase
                .from('observations')
                .select('*')
                .gte('recorded_at', startIso)
                .lt('recorded_at', endIso)
                .order('recorded_at', { ascending: false });

            if (!error && data) {
                setObservations(data);
            }
            setLoading(false);
        }

        fetchObservations();

        const channel = supabase
            .channel(`observations-household-${householdId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'observations' },
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
    }, [householdId, startIso, endIso]);

    async function addObservation(catId: string, type: string, value: string, note?: string, images: File[] = []) {
        if (!householdId) return;

        const { data: user } = await supabase.auth.getUser();

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
            images: imageUrls.length > 0 ? imageUrls : null,
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

/**
 * Hook for fetching logs for a specific date (Calendar Detail)
 */
export function useDateLogs(householdId: string | null, date: Date) {
    const [logs, setLogs] = useState<{ careLogs: CareLog[], observations: Observation[] }>({ careLogs: [], observations: [] });
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const supabase = createClient() as any;

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const start = startOfDay.toISOString();
    const end = endOfDay.toISOString();

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }

        async function fetchLogs() {
            setLoading(true);

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
                .select('*, cats!inner(household_id)')
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
    }, [householdId, start, refreshTrigger]);

    return { ...logs, loading, refetch: () => setRefreshTrigger(prev => prev + 1) };
}

/**
 * Legacy hook for backward compatibility
 */
export function useTodayObservations(catId: string | null) {
    return { observations: [], loading: false, addObservation: async () => ({}) };
}
