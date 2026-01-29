/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { dbLogger } from "@/lib/logger";

/**
 * Hook for managing household incidents (health issues, troubles, etc.)
 */
export function useIncidents(householdId: string | null) {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    const fetchIncidents = useCallback(async () => {
        if (!householdId) return;
        try {
            const { data, error } = await supabase
                .from('incidents')
                .select(`
                    *,
                    updates:incident_updates(*),
                    reactions:incident_reactions(*)
                `)
                .eq('household_id', householdId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const sorted = (data as any[])?.map(inc => ({
                ...inc,
                updates: (inc.updates as any[])?.sort((a: any, b: any) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            })) || [];

            setIncidents(sorted);
        } catch (e) {
            dbLogger.error("Error fetching incidents:", e);
        } finally {
            setLoading(false);
        }
    }, [householdId]);

    useEffect(() => {
        fetchIncidents();

        if (!householdId) return;

        const channel = supabase
            .channel('public:incidents')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'incidents', filter: `household_id=eq.${householdId}` },
                () => fetchIncidents()
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'incident_updates' },
                () => fetchIncidents()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, fetchIncidents]);

    const addIncident = async (catId: string, type: string, note: string, photos: File[] = [], health_category?: string, health_value?: string, onset?: string, symptom_details?: any, batch_id?: string) => {
        if (!householdId) {
            dbLogger.error('addIncident: householdId is null');
            return { error: "No household" };
        }

        try {
            const photoPaths: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `incidents/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) {
                    dbLogger.error('Photo upload error:', uploadError);
                    throw uploadError;
                }
                photoPaths.push(filePath);
            }

            const { data, error } = await supabase
                .from('incidents')
                .insert({
                    household_id: householdId,
                    cat_id: catId,
                    type,
                    note,
                    status: 'log',
                    photos: photoPaths,
                    created_by: (await supabase.auth.getUser()).data.user?.id,
                    health_category,
                    health_value,
                    onset,
                    symptom_details,
                    batch_id
                } as any)
                .select()
                .single();

            if (error) {
                dbLogger.error('Incident create error:', error);
                throw error;
            }

            fetchIncidents();
            return { data };
        } catch (e) {
            dbLogger.error('addIncident error:', e);
            return { error: e };
        }
    };

    const addIncidentUpdate = async (incidentId: string, note: string, photos: File[] = [], statusChange?: string) => {
        try {
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

            if (statusChange && statusChange !== 'none') {
                let newStatus = 'tracking';
                if (statusChange === 'resolved') newStatus = 'resolved';
                if (statusChange === 'log') newStatus = 'log';

                const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
                if (newStatus === 'resolved') updateData.resolved_at = new Date().toISOString();

                await supabase.from('incidents').update(updateData).eq('id', incidentId);
            }

            fetchIncidents();
            return {};
        } catch (e) {
            dbLogger.error('addIncidentUpdate error:', e);
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

            await supabase.from('incident_updates').insert({
                incident_id: incidentId,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                note: '解決済みにしました',
                status_change: 'resolved'
            } as any);

            fetchIncidents();
            return {};
        } catch (e) {
            dbLogger.error('resolveIncident error:', e);
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
            dbLogger.error('deleteIncident error:', e);
            return { error: e };
        }
    };

    const addReaction = async (incidentId: string, emoji: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { error: "Not authenticated" };

            const { error } = await supabase
                .from('incident_reactions')
                .insert({
                    incident_id: incidentId,
                    user_id: user.id,
                    emoji
                });

            if (error) throw error;
            fetchIncidents();
            return {};
        } catch (e) {
            dbLogger.error('addReaction error:', e);
            return { error: e };
        }
    };

    const removeReaction = async (incidentId: string, emoji: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { error: "Not authenticated" };

            const { error } = await supabase
                .from('incident_reactions')
                .delete()
                .eq('incident_id', incidentId)
                .eq('user_id', user.id)
                .eq('emoji', emoji);

            if (error) throw error;
            fetchIncidents();
            return {};
        } catch (e) {
            dbLogger.error('removeReaction error:', e);
            return { error: e };
        }
    };

    const toggleBookmark = async (incidentId: string) => {
        try {
            const incident = incidents.find(i => i.id === incidentId);
            const newValue = !incident?.is_bookmarked;

            const { error } = await supabase
                .from('incidents')
                .update({ is_bookmarked: newValue })
                .eq('id', incidentId);

            if (error) throw error;

            setIncidents(prev => prev.map(i =>
                i.id === incidentId ? { ...i, is_bookmarked: newValue } : i
            ));
            return {};
        } catch (e) {
            dbLogger.error('toggleBookmark error:', e);
            return { error: e };
        }
    };

    return {
        incidents,
        loading,
        refetch: fetchIncidents,
        addIncident,
        addIncidentUpdate,
        resolveIncident,
        deleteIncident,
        addReaction,
        removeReaction,
        toggleBookmark
    };
}
