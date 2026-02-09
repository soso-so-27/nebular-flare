"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Cat } from '@/types';
import { useCats as useSupabaseCats } from '@/hooks/use-supabase-data';
import { uploadCatImage as uploadCatImageToStorage } from "@/lib/storage";
import { createClient } from '@/lib/supabase';
import { storeLogger } from '@/lib/logger';

interface CatContextType {
    cats: Cat[];
    activeCatId: string;
    setActiveCatId: (v: string) => void;
    catsLoading: boolean;
    refetchCats: () => void;
    uploadCatImage: (catId: string, file: File, memo?: string, skipRefetch?: boolean) => Promise<{ error?: any; data?: any }>;
    updateCatImage: (imageId: string, updates: Record<string, any>) => Promise<{ error?: any }>;
    deleteCatImage: (imageId: string, storagePath?: string) => Promise<{ error?: any }>;
    updateCat: (catId: string, updates: Partial<Cat>) => Promise<{ error?: any }>;
    addCatWeightRecord: (catId: string, weight: number, notes?: string) => Promise<{ error?: any }>;
    isHeroImageLoaded: boolean;
    setIsHeroImageLoaded: (v: boolean) => void;
}

const CatContext = createContext<CatContextType | undefined>(undefined);

export function CatProvider({ children, householdId, isDemo }: { children: ReactNode; householdId: string | null; isDemo: boolean }) {
    const [activeCatId, setActiveCatId] = useState('');
    const [isHeroImageLoaded, setIsHeroImageLoaded] = useState(false);
    const { cats: supabaseCats, loading: catsLoading, refetch: refetchCats } = useSupabaseCats(isDemo ? null : householdId);
    const supabase = createClient() as any;

    const demoCats: Cat[] = useMemo(() => [
        { id: "c1", name: "麦", age: "2才", sex: "オス", avatar: "/demo-cat-1.png", last_vaccine_date: "2024-05-10", vaccine_type: "3種混合" },
        { id: "c2", name: "雨", age: "2才", sex: "オス", avatar: "/demo-cat-2.png", last_vaccine_date: "2024-06-15", vaccine_type: "5種混合" },
    ], []);

    const cats: Cat[] = useMemo(() => {
        if (isDemo) return demoCats;
        return supabaseCats.map((c: any) => {
            const rawImages = c.images || [];
            const rawWeightHistory = c.weightHistory || c.weight_history || [];
            return {
                id: c.id,
                name: c.name,
                age: c.birthday ? `${Math.floor((Date.now() - new Date(c.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}才` : '年齢不明',
                sex: c.sex || 'オス',
                avatar: c.avatar || '🐈',
                birthday: c.birthday || undefined,
                images: rawImages.map((img: any) => ({
                    id: img.id,
                    catId: img.catId || img.cat_id,
                    catIds: img.catIds || img.cat_ids || (img.cat_id ? [img.cat_id] : []),
                    storagePath: img.storagePath || img.storage_path,
                    createdAt: img.createdAt || img.created_at,
                    isFavorite: img.isFavorite || img.is_favorite,
                    memo: img.memo,
                    tags: img.tags
                })),
                weightHistory: rawWeightHistory.map((wh: any) => ({
                    id: wh.id,
                    weight: typeof wh.weight === 'string' ? parseFloat(wh.weight) : wh.weight,
                    recorded_at: wh.recordedAt || wh.recorded_at,
                    notes: wh.notes || wh.note
                })),
                weight: typeof c.weight === 'string' ? parseFloat(c.weight) : c.weight,
                microchip_id: c.microchip_id,
                notes: c.notes,
                background_mode: c.background_mode,
                background_media: c.background_media,
            };
        });
    }, [isDemo, supabaseCats, demoCats]);

    useEffect(() => {
        if (cats.length > 0 && !activeCatId) {
            setActiveCatId(cats[0].id);
        }
    }, [cats, activeCatId]);

    const uploadCatImage = useCallback(async (catId: string, file: File, memo?: string, skipRefetch = false) => {
        if (isDemo) return { error: null };
        try {
            const catIds = catId.includes(',') ? catId.split(',') : [catId];
            const primaryCatId = catIds[0];
            const { publicUrl, storagePath, error: uploadError } = await uploadCatImageToStorage(primaryCatId, file);
            if (uploadError) throw new Error(uploadError);
            const { data: dbData, error: dbError } = await supabase.from('cat_images').insert([{
                cat_id: catIds[0], cat_ids: catIds, storage_path: storagePath, memo: memo
            }]).select();
            if (dbError) throw dbError;
            for (const id of catIds) {
                const currentCat = cats.find(c => c.id === id);
                if (currentCat && (currentCat.avatar === '🐈' || !currentCat.avatar)) {
                    await supabase.from('cats').update({ avatar: publicUrl }).eq('id', id);
                }
            }
            if (!skipRefetch) refetchCats();
            return { data: dbData[0] };
        } catch (e: any) {
            storeLogger.error('uploadCatImage error:', e);
            return { error: e.message || e.toString() };
        }
    }, [isDemo, cats, refetchCats, supabase]);

    const updateCatImage = useCallback(async (imageId: string, updates: Record<string, any>) => {
        if (isDemo) return { error: null };
        try {
            const { error } = await supabase.from('cat_images').update(updates).eq('id', imageId);
            if (error) throw error;
            refetchCats();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, refetchCats, supabase]);

    const deleteCatImage = useCallback(async (imageId: string, storagePath?: string) => {
        if (isDemo) return { error: null };
        try {
            if (storagePath) {
                await supabase.storage.from('avatars').remove([storagePath]);
            }
            const { error } = await supabase.from('cat_images').delete().eq('id', imageId);
            if (error) throw error;
            refetchCats();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, refetchCats, supabase]);

    const updateCat = useCallback(async (catId: string, updates: Partial<Cat>) => {
        if (isDemo) return {};
        try {
            const { error } = await supabase.from('cats').update(updates).eq('id', catId);
            if (error) throw error;
            refetchCats();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, refetchCats, supabase]);

    const addCatWeightRecord = useCallback(async (catId: string, weight: number, notes?: string) => {
        if (isDemo) return {};
        try {
            const { error: historyError } = await supabase.from('cat_weight_history').insert({
                cat_id: catId, weight, notes, recorded_at: new Date().toISOString()
            });
            if (historyError) throw historyError;
            const { error: updateError } = await supabase.from('cats').update({ weight }).eq('id', catId);
            if (updateError) throw updateError;
            refetchCats();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, refetchCats, supabase]);

    const value = useMemo(() => ({
        cats, activeCatId, setActiveCatId, catsLoading, refetchCats,
        uploadCatImage, updateCatImage, deleteCatImage, updateCat, addCatWeightRecord,
        isHeroImageLoaded, setIsHeroImageLoaded
    }), [cats, activeCatId, catsLoading, refetchCats, uploadCatImage, updateCatImage, deleteCatImage, updateCat, addCatWeightRecord, isHeroImageLoaded]);

    return <CatContext.Provider value={value}>{children}</CatContext.Provider>;
}

export function useCatContext() {
    const context = useContext(CatContext);
    if (!context) throw new Error('useCatContext must be used within CatProvider');
    return context;
}
