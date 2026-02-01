"use client";

import { useMemo } from "react";
import { Cat } from "@/types";
import { createClient } from "@/lib/supabase";

interface HouseholdMediaItem {
    catId: string;
    url: string;
    isVideo: boolean;
    type: 'background' | 'avatar' | 'random';
}

export function useHouseholdMedia(cats: Cat[]) {
    // Helper function to get public URL
    const getPublicUrl = (path: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
    };

    const mediaPool: HouseholdMediaItem[] = useMemo(() => {
        if (!cats || cats.length === 0) return [];

        return cats.map(cat => {
            const mode = cat.background_mode || 'random';

            // 1. Fixed Background Media (Designated)
            if (mode === 'media' && cat.background_media) {
                const isVid = /\.(mp4|webm|mov)$/i.test(cat.background_media);
                return {
                    catId: cat.id,
                    url: cat.background_media,
                    isVideo: isVid,
                    type: 'background' as const
                };
            }

            // 2. Avatar Mode or Fallback
            if (mode === 'avatar' || !cat.avatar) {
                return {
                    catId: cat.id,
                    url: cat.avatar || '',
                    isVideo: false,
                    type: 'avatar' as const
                };
            }

            // 3. Random Mode (Select one from his gallery or avatar)
            // For now, we use a simple approach: if random, we prefer his latest gallery image if exists, else avatar
            // But to stay safe and consistent with "designated", we can just use avatar or a random pick
            // from cat.images if loaded.
            if (mode === 'random' && cat.images && cat.images.length > 0) {
                const randomImg = cat.images[Math.floor(Math.random() * cat.images.length)];
                return {
                    catId: cat.id,
                    url: getPublicUrl(randomImg.storagePath),
                    isVideo: false,
                    type: 'random' as const
                };
            }

            // Ultimate Fallback
            return {
                catId: cat.id,
                url: cat.avatar || '',
                isVideo: false,
                type: 'avatar' as const
            };
        });
    }, [cats]);

    // The actual pick is done once per-render-cycle (or on reload)
    // We use a stable pick until reload by using a simple random index IF pool exists
    const selectedItem = useMemo(() => {
        if (mediaPool.length === 0) return null;
        const index = Math.floor(Math.random() * mediaPool.length);
        return mediaPool[index];
    }, [mediaPool.length]); // Only re-pick if cats change significantly (length)

    return {
        selectedItem,
        mediaPool
    };
}
