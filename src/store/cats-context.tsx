"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useCats } from '@/hooks/use-supabase-data';
import { uploadCatImage as uploadCatImageToStorage } from '@/lib/storage';
import { createClient } from '@/lib/supabase';
import { storeLogger } from '@/lib/logger';
import type { Cat } from '@/types';

// =============================================================================
// CatsContext - Separated from app-store for performance optimization
// =============================================================================

interface CatImage {
    id: string;
    catId: string;
    storagePath: string;
    createdAt: string;
    isFavorite?: boolean;
    memo?: string;
}

type CatsContextType = {
    cats: Cat[];
    catsLoading: boolean;
    activeCatId: string;
    setActiveCatId: (id: string) => void;
    refetchCats: () => void;
    updateCat: (catId: string, updates: Partial<Cat>) => Promise<{ error?: any }>;
    uploadCatImage: (catId: string, file: File, memo?: string, skipRefetch?: boolean) => Promise<{ data?: any; error?: string }>;
    deleteCatImage: (imageId: string, storagePath: string) => Promise<{ error?: any }>;
    updateCatImage: (imageId: string, updates: Partial<CatImage>) => Promise<{ error?: any }>;
    addCatWeightRecord: (catId: string, weight: number, notes?: string) => Promise<{ error?: any }>;
};

const CatsContext = createContext<CatsContextType | null>(null);

interface CatsProviderProps {
    children: ReactNode;
    householdId: string | null;
    isDemo?: boolean;
}

export function CatsProvider({ children, householdId, isDemo = false }: CatsProviderProps) {
    const { cats, loading: catsLoading, refetch: refetchCats } = useCats(householdId);
    const [activeCatId, setActiveCatId] = React.useState<string>('');
    const supabase = createClient() as any;

    // Set initial active cat when cats load
    React.useEffect(() => {
        if (cats.length > 0 && !activeCatId) {
            setActiveCatId(cats[0].id);
        }
    }, [cats, activeCatId]);

    // Update Cat Profile
    const updateCat = useCallback(async (catId: string, updates: Partial<Cat>): Promise<{ error?: any }> => {
        if (isDemo) {
            return {};
        }

        try {
            const { error } = await supabase
                .from('cats')
                .update(updates)
                .eq('id', catId);

            if (error) {
                storeLogger.error('Error updating cat:', error);
                return { error };
            }

            await refetchCats?.();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, supabase, refetchCats]);

    // Upload Cat Image
    const uploadCatImage = useCallback(async (
        catId: string,
        file: File,
        memo?: string,
        skipRefetch = false
    ): Promise<{ data?: any; error?: string }> => {
        if (isDemo) return { error: undefined };

        try {
            const catIds = catId.includes(',') ? catId.split(',') : [catId];
            const primaryCatId = catIds[0];

            const result = await uploadCatImageToStorage(primaryCatId, file);
            if (!result.storagePath) {
                return { error: result.error || 'Upload failed' };
            }

            const dbInserts = catIds.map(id => ({
                cat_id: id,
                storage_path: result.storagePath,
                memo: memo || null,
            }));

            const { data: dbData, error: dbError } = await supabase
                .from('cat_images')
                .insert(dbInserts)
                .select();

            if (dbError) {
                return { error: dbError.message };
            }

            if (!skipRefetch) {
                refetchCats();
            }

            return { data: dbData[0] };
        } catch (e: any) {
            storeLogger.error('uploadCatImage error:', e);
            return { error: e.message || e.toString() };
        }
    }, [isDemo, supabase, refetchCats]);

    // Delete Cat Image
    const deleteCatImage = useCallback(async (imageId: string, storagePath: string): Promise<{ error?: any }> => {
        if (isDemo) return {};

        try {
            await supabase.storage.from('cat-images').remove([storagePath]);
            const { error } = await supabase.from('cat_images').delete().eq('id', imageId);
            if (error) throw error;

            refetchCats();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, supabase, refetchCats]);

    // Update Cat Image
    const updateCatImage = useCallback(async (imageId: string, updates: Partial<CatImage>): Promise<{ error?: any }> => {
        if (isDemo) return {};

        try {
            const { error } = await supabase
                .from('cat_images')
                .update(updates)
                .eq('id', imageId);

            if (error) throw error;
            refetchCats();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, supabase, refetchCats]);

    // Add Cat Weight Record
    const addCatWeightRecord = useCallback(async (
        catId: string,
        weight: number,
        notes?: string
    ): Promise<{ error?: any }> => {
        if (isDemo) return {};

        try {
            const { error } = await supabase
                .from('cat_weight_history')
                .insert({
                    cat_id: catId,
                    weight,
                    notes,
                    recorded_at: new Date().toISOString()
                });

            if (error) throw error;
            refetchCats();
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    }, [isDemo, supabase, refetchCats]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<CatsContextType>(() => ({
        cats,
        catsLoading,
        activeCatId,
        setActiveCatId,
        refetchCats,
        updateCat,
        uploadCatImage,
        deleteCatImage,
        updateCatImage,
        addCatWeightRecord,
    }), [
        cats,
        catsLoading,
        activeCatId,
        refetchCats,
        updateCat,
        uploadCatImage,
        deleteCatImage,
        updateCatImage,
        addCatWeightRecord,
    ]);

    return (
        <CatsContext.Provider value={contextValue}>
            {children}
        </CatsContext.Provider>
    );
}

export function useCatsContext() {
    const ctx = useContext(CatsContext);
    if (!ctx) {
        throw new Error('useCatsContext must be used within CatsProvider');
    }
    return ctx;
}

// Optional: Hook that doesn't throw for components that may be outside provider
export function useCatsContextOptional() {
    return useContext(CatsContext);
}
