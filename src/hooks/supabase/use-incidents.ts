import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { dbLogger } from "@/lib/logger";

/**
 * Hook for managing household incidents (health issues, troubles, etc.)
 */
export function useIncidents(householdId: string | null) {
    const supabase = createClient() as any;
    const queryClient = useQueryClient();

    const queryKey = ['incidents', householdId];

    const { data: incidents = [], isLoading: loading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!householdId) return [];
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

            return (data as any[])?.map(inc => ({
                ...inc,
                updates: (inc.updates as any[])?.sort((a: any, b: any) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            })) || [];
        },
        enabled: !!householdId,
    });

    const addMutation = useMutation({
        mutationFn: async ({ catId, type, note, photos, health_category, health_value, onset, symptom_details, batch_id }: any) => {
            const photoPaths: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `incidents/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
                if (uploadError) throw uploadError;
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

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const addUpdateMutation = useMutation({
        mutationFn: async ({ incidentId, note, photos, statusChange }: any) => {
            const photoPaths: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `incidents/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
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
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const resolveMutation = useMutation({
        mutationFn: async (incidentId: string) => {
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
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (incidentId: string) => {
            const { error } = await supabase
                .from('incidents')
                .update({ deleted_at: new Date().toISOString() } as any)
                .eq('id', incidentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const addReactionMutation = useMutation({
        mutationFn: async ({ incidentId, emoji }: any) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from('incident_reactions')
                .insert({
                    incident_id: incidentId,
                    user_id: user.id,
                    emoji
                });
            if (error) throw error;
        },
        onMutate: async ({ incidentId, emoji }: any) => {
            await queryClient.cancelQueries({ queryKey });
            const previousIncidents = queryClient.getQueryData(queryKey);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
                    return old?.map(inc => {
                        if (inc.id === incidentId) {
                            return {
                                ...inc,
                                reactions: [...(inc.reactions || []), { incident_id: incidentId, emoji, user_id: user.id, created_at: new Date().toISOString() }]
                            };
                        }
                        return inc;
                    });
                });
            }
            return { previousIncidents };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(queryKey, context?.previousIncidents);
            dbLogger.error('addReaction error:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const removeReactionMutation = useMutation({
        mutationFn: async ({ incidentId, emoji }: any) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from('incident_reactions')
                .delete()
                .eq('incident_id', incidentId)
                .eq('user_id', user.id)
                .eq('emoji', emoji);
            if (error) throw error;
        },
        onMutate: async ({ incidentId, emoji }: any) => {
            await queryClient.cancelQueries({ queryKey });
            const previousIncidents = queryClient.getQueryData(queryKey);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
                    return old?.map(inc => {
                        if (inc.id === incidentId) {
                            return {
                                ...inc,
                                reactions: (inc.reactions || []).filter((r: any) => !(r.emoji === emoji && r.user_id === user.id))
                            };
                        }
                        return inc;
                    });
                });
            }
            return { previousIncidents };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(queryKey, context?.previousIncidents);
            dbLogger.error('removeReaction error:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });


    const toggleBookmarkMutation = useMutation({
        mutationFn: async (incidentId: string) => {
            const incident = incidents.find(i => i.id === incidentId);
            const newValue = !incident?.is_bookmarked;
            const { error } = await supabase
                .from('incidents')
                .update({ is_bookmarked: newValue })
                .eq('id', incidentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    useEffect(() => {
        if (!householdId) return;

        const channel = supabase
            .channel(`incidents-realtime-${householdId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'incidents', filter: `household_id=eq.${householdId}` },
                () => queryClient.invalidateQueries({ queryKey })
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'incident_updates' },
                () => queryClient.invalidateQueries({ queryKey })
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, queryClient, queryKey, supabase]);

    return {
        incidents,
        loading,
        refetch: () => queryClient.invalidateQueries({ queryKey }),
        addIncident: useCallback((catId: string, type: string, note: string, photos: File[] = [], health_category?: string, health_value?: string, onset?: string, symptom_details?: any, batch_id?: string) =>
            addMutation.mutateAsync({ catId, type, note, photos, health_category, health_value, onset, symptom_details, batch_id }), [addMutation]),
        addIncidentUpdate: useCallback((incidentId: string, note: string, photos: File[] = [], statusChange?: string) =>
            addUpdateMutation.mutateAsync({ incidentId, note, photos, statusChange }), [addUpdateMutation]),
        resolveIncident: useCallback((incidentId: string) =>
            resolveMutation.mutateAsync(incidentId), [resolveMutation]),
        deleteIncident: useCallback((incidentId: string) =>
            deleteMutation.mutateAsync(incidentId), [deleteMutation]),
        addReaction: useCallback((incidentId: string, emoji: string) =>
            addReactionMutation.mutateAsync({ incidentId, emoji }), [addReactionMutation]),
        removeReaction: useCallback((incidentId: string, emoji: string) =>
            removeReactionMutation.mutateAsync({ incidentId, emoji }), [removeReactionMutation]),
        toggleBookmark: useCallback((incidentId: string) =>
            toggleBookmarkMutation.mutateAsync(incidentId), [toggleBookmarkMutation])
    };
}

