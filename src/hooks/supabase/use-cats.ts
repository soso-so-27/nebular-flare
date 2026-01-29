/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { dbLogger } from "@/lib/logger";
import type { Cat } from '@/types';

/**
 * Hook for fetching and managing cat data within a household.
 * Supports real-time updates for cat profiles and weight history.
 */
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
                // Map snake_case to camelCase where expected by frontend types
                const mappedCats = catsData.map((cat: any) => ({
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
                setCats(mappedCats);
            }
            setLoading(false);
        }

        // Fallback function for backwards compatibility
        async function fetchCatsFallback() {
            const { data: rawCats, error: fallbackError } = await supabase
                .rpc('get_all_cats', { target_household_id: householdId });

            if (fallbackError) {
                dbLogger.error('Error fetching cats via RPC:', fallbackError);
                setLoading(false);
                return;
            }

            let catsData = rawCats || [];
            if (catsData.length > 0) {
                const catIds = catsData.map((c: any) => c.id);

                // Fetch images and weights in parallel
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

                // Build weight map
                const weightMap: Record<string, any[]> = {};
                weights.forEach((w: any) => {
                    const mappedW = {
                        ...w,
                        weight: typeof w.weight === 'string' ? parseFloat(w.weight) : w.weight,
                        notes: w.notes || w.note
                    };
                    if (!weightMap[w.cat_id]) weightMap[w.cat_id] = [];
                    weightMap[w.cat_id].push(mappedW);
                });

                // Merge data
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
