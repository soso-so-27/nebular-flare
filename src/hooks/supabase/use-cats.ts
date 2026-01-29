/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { dbLogger } from "@/lib/logger";
import type { Cat } from '@/types';

/**
 * Hook for fetching and managing cat data within a household.
 * Supports real-time updates for cat profiles and weight history.
 */
export function useCats(householdId: string | null) {
    const supabase = createClient() as any;
    const queryClient = useQueryClient();

    const fetchCatsData = async () => {
        if (!householdId) return [];

        // Use optimized RPC that fetches cats, images, and weight history in one query
        const { data: catsData, error: catsError } = await supabase
            .rpc('get_cats_with_details', { target_household_id: householdId });

        if (catsError) {
            // Fallback
            dbLogger.warn('Optimized RPC not available, using fallback:', catsError.message);
            return await fetchCatsFallback();
        }

        if (catsData) {
            return catsData.map((cat: any) => ({
                ...cat,
                weightHistory: (cat.weightHistory || cat.weight_history || []).map((wh: any) => ({
                    ...wh,
                    weight: typeof wh.weight === 'string' ? parseFloat(wh.weight) : wh.weight,
                    notes: wh.notes || wh.note
                })),
                images: (cat.images || []).map((img: any) => ({
                    id: img.id,
                    catId: img.cat_id || img.catId,
                    storagePath: img.storage_path || img.storagePath,
                    createdAt: img.created_at || img.createdAt,
                    isFavorite: img.is_favorite || img.isFavorite,
                    memo: img.memo
                }))
            }));
        }
        return [];
    };

    const fetchCatsFallback = async () => {
        const { data: rawCats, error: fallbackError } = await supabase
            .rpc('get_all_cats', { target_household_id: householdId });

        if (fallbackError) {
            dbLogger.error('Error fetching cats via RPC:', fallbackError);
            return [];
        }

        let catsData = rawCats || [];
        if (catsData.length > 0) {
            const catIds = catsData.map((c: any) => c.id);
            const [imagesResult, weightsResult] = await Promise.all([
                supabase.from('cat_images')
                    .select('id, storage_path, cat_id, created_at, is_favorite, memo')
                    .in('cat_id', catIds),
                supabase.from('cat_weight_history')
                    .select('id, cat_id, weight, recorded_at, notes')
                    .in('cat_id', catIds)
                    .order('recorded_at', { ascending: false })
            ]);

            const images = imagesResult.data || [];
            const weights = weightsResult.data || [];
            const weightMap: Record<string, any[]> = {};
            weights.forEach((w: any) => {
                const mappedW = { ...w, weight: typeof w.weight === 'string' ? parseFloat(w.weight) : w.weight };
                if (!weightMap[w.cat_id]) weightMap[w.cat_id] = [];
                weightMap[w.cat_id].push(mappedW);
            });

            catsData = catsData.map((cat: any) => ({
                ...cat,
                weightHistory: weightMap[cat.id] || [],
                images: images.filter((img: any) => img.cat_id === cat.id).map((img: any) => ({
                    id: img.id,
                    catId: img.cat_id,
                    storagePath: img.storage_path,
                    createdAt: img.created_at,
                    isFavorite: img.is_favorite,
                    memo: img.memo
                }))
            }));
        }
        return catsData;
    };

    const { data: cats = [], isLoading: loading } = useQuery({
        queryKey: ['cats', householdId],
        queryFn: fetchCatsData,
        enabled: !!householdId,
    });

    useEffect(() => {
        if (!householdId) return;

        const channel = supabase
            .channel(`cats-realtime-${householdId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'cats', filter: `household_id=eq.${householdId}` },
                () => queryClient.invalidateQueries({ queryKey: ['cats', householdId] })
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'cat_weight_history' },
                () => queryClient.invalidateQueries({ queryKey: ['cats', householdId] })
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [householdId, queryClient, supabase]);

    const refetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['cats', householdId] });
    }, [householdId, queryClient]);

    return { cats, loading, refetch };
}

