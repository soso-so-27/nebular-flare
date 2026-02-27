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
                    creator:users!incidents_created_by_fkey(display_name, avatar_url),
                    updates:incident_updates(*, updater:users!incident_updates_user_id_fkey(display_name, avatar_url)),
                    reactions:incident_reactions(*)
                `)
                .eq('household_id', householdId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            return (data as any[])?.map(inc => ({
                ...inc,
                // Flatten creator info
                creator_name: inc.creator?.display_name,
                creator_avatar: inc.creator?.avatar_url,
                updates: (inc.updates as any[])?.sort((a: any, b: any) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ).map((u: any) => ({
                    ...u,
                    user_name: u.updater?.display_name,
                    user_avatar: u.updater?.avatar_url,
                }))
            })) || [];
        },
        enabled: !!householdId,
    });

    const addMutation = useMutation({
        mutationFn: async ({ catId, catIds, type, note, photos, photoPaths: existingPhotoPaths, health_category, health_value, onset, symptom_details, batch_id }: any) => {
            const photoPaths: string[] = existingPhotoPaths || [];

            // If photos (Files) are provided, upload them only if they aren't already represented by photoPaths
            // (Compatibility: older UI versions might only provide 'photos')
            if (photos && photos.length > 0 && photoPaths.length === 0) {
                for (const file of photos) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `incidents/${fileName}`;
                    // FIXED: Use 'cat-images' bucket for medical/life logs
                    const { error: uploadError } = await supabase.storage.from('cat-images').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    photoPaths.push(filePath);
                }
            }

            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;

            if (!householdId) {
                dbLogger.error('[Incidents] Missing householdId');
                throw new Error("世帯IDが見つかりません。ログイン状態を確認してください。");
            }

            // Aligned with Nyannlog schema (20260118_nyannlog_migration.sql)
            const nyannlogTypes = ['daily', 'worried', 'concerned', 'troubled', 'good'];
            const safeType = nyannlogTypes.includes(type)
                ? type
                : (['vomit', 'diarrhea', 'injury', 'hospital'].includes(type) ? 'worried' : 'daily');

            const nyannlogStatuses = ['log', 'tracking', 'resolved'];
            const safeStatus = nyannlogStatuses.includes(status || 'log')
                ? (status || 'log')
                : 'log';

            // Ensure we don't pass empty strings to UUID columns
            const finalCatId = (catId && catId.length > 0) ? catId : (catIds && catIds.length > 0 ? catIds[0] : null);
            const finalCatIds = (catIds && catIds.length > 0) ? catIds.filter((id: string) => id && id.length > 0) : (finalCatId ? [finalCatId] : []);

            const insertPayload = {
                household_id: householdId,
                cat_id: finalCatId,
                cat_ids: finalCatIds,
                type: safeType,
                note: note || '',
                status: safeStatus,
                severity: health_category === 'emergency' ? 'high' : 'medium',
                photos: photoPaths,
                created_by: userId,
                health_category,
                health_value,
                onset_at: onset || new Date().toISOString(),
                symptom_details: symptom_details || {},
                batch_id: (batch_id && batch_id.length > 0) ? batch_id : null
            };

            dbLogger.info('[Incidents] Attempting insert:', {
                type: insertPayload.type,
                status: insertPayload.status,
                catCount: insertPayload.cat_ids?.length,
                hasHousehold: !!insertPayload.household_id
            });

            const { data, error } = await supabase
                .from('incidents')
                .insert(insertPayload as any)
                .select()
                .single();

            if (error) {
                dbLogger.error('[Incidents] Insert failed:', error);
                // Provide a more descriptive error for the UI
                const enhancedError = new Error(`保存に失敗しました: ${error.message} (${error.code})`);
                (enhancedError as any).details = error;
                throw enhancedError;
            }
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['cats'] }); // Refresh gallery
            // Fire-and-forget: notify family members
            if (data?.household_id) {
                supabase.functions.invoke('push-notification', {
                    body: {
                        type: 'INSERT',
                        table: 'incidents',
                        record: {
                            household_id: data.household_id,
                            created_by: data.created_by,
                            cat_id: data.cat_id,
                            type: data.type,
                            severity: data.severity,
                            note: data.note,
                            health_category: data.health_category
                        }
                    }
                }).catch(() => { /* silent */ });
            }
        },
    });

    const addUpdateMutation = useMutation({
        mutationFn: async ({ incidentId, note, photos, statusChange }: any) => {
            const photoPaths: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `incidents/${fileName}`;
                // FIXED: Use 'cat-images' bucket
                const { error: uploadError } = await supabase.storage.from('cat-images').upload(filePath, file);
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
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey });
            // Fire-and-forget: notify family about update
            const incident = incidents.find((inc: any) => inc.id === variables.incidentId);
            if (incident?.household_id) {
                supabase.functions.invoke('push-notification', {
                    body: {
                        type: 'INSERT',
                        table: 'incidents',
                        record: {
                            household_id: incident.household_id,
                            created_by: incident.created_by,
                            cat_id: incident.cat_id,
                            type: variables.statusChange === 'resolved' ? 'resolved' : incident.type,
                            note: variables.note || (variables.statusChange === 'resolved' ? '解決済みにしました' : '状況が更新されました')
                        }
                    }
                }).catch(() => { /* silent */ });
            }
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

    const updateNoteMutation = useMutation({
        mutationFn: async ({ id, note }: { id: string, note: string }) => {
            const { error } = await supabase
                .from('incidents')
                .update({ note, updated_at: new Date().toISOString() } as any)
                .eq('id', id);
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
        addIncident: useCallback((catId: string, type: string, note: string, photos: File[] = [], health_category?: string, health_value?: string, onset?: string, symptom_details?: any, batch_id?: string, catIds?: string[], photoPaths?: string[]) =>
            addMutation.mutateAsync({ catId, catIds, type, note, photos, photoPaths, health_category, health_value, onset, symptom_details, batch_id }), [addMutation]),
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
            toggleBookmarkMutation.mutateAsync(incidentId), [toggleBookmarkMutation]),
        updateIncidentNote: useCallback((id: string, note: string) =>
            updateNoteMutation.mutateAsync({ id, note }), [updateNoteMutation])
    };
}

