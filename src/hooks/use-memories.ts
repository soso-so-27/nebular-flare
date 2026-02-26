"use client";

import { useMemo } from 'react';
import { isSameDay, subWeeks, subMonths, subYears } from 'date-fns';
import { useCatContext, useIncidentContext } from '@/store/app-store';
import { getFullImageUrl } from '@/lib/utils';

// =====================================================
// 振り返りリワインド — 過去の今日の記録を検索
// =====================================================

export interface MemoryItem {
    id: string;
    label: string;        // 「1ヶ月前の今日」等
    daysAgo: number;
    imageUrl?: string;
    note?: string;
    catName?: string;
    date: Date;
}

const LOOKBACK_WINDOWS = [
    { days: 7, label: '1週間前の今日' },
    { days: 30, label: '1ヶ月前の今日' },
    { days: 90, label: '3ヶ月前の今日' },
    { days: 365, label: '1年前の今日' },
] as const;

export function useMemories(): MemoryItem[] {
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();

    return useMemo(() => {
        const today = new Date();
        const memories: MemoryItem[] = [];

        for (const window of LOOKBACK_WINDOWS) {
            const targetDate = window.days === 7
                ? subWeeks(today, 1)
                : window.days === 30
                    ? subMonths(today, 1)
                    : window.days === 90
                        ? subMonths(today, 3)
                        : subYears(today, 1);

            // Search incidents (dekigoto) for that day
            const matchingIncidents = (incidents || []).filter(inc =>
                isSameDay(new Date(inc.created_at), targetDate)
            );

            // Search cat images for that day
            const matchingPhotos = (cats || []).flatMap(cat =>
                (cat.images || [])
                    .filter(img => isSameDay(new Date(img.createdAt), targetDate))
                    .map(img => ({
                        storagePath: img.storagePath,
                        memo: img.memo,
                        catName: cat.name,
                    }))
            );

            // Pick the best item (prefer photos with images)
            const incidentWithPhoto = matchingIncidents.find(inc => inc.photos?.length > 0);
            const incidentAny = matchingIncidents[0];
            const photoAny = matchingPhotos[0];

            if (incidentWithPhoto) {
                const cat = cats.find(c => c.id === incidentWithPhoto.cat_id);
                memories.push({
                    id: `memory-${window.days}`,
                    label: window.label,
                    daysAgo: window.days,
                    imageUrl: getFullImageUrl(incidentWithPhoto.photos[0]),
                    note: incidentWithPhoto.note || undefined,
                    catName: cat?.name,
                    date: targetDate,
                });
            } else if (photoAny) {
                memories.push({
                    id: `memory-${window.days}`,
                    label: window.label,
                    daysAgo: window.days,
                    imageUrl: getFullImageUrl(photoAny.storagePath),
                    note: photoAny.memo || undefined,
                    catName: photoAny.catName,
                    date: targetDate,
                });
            } else if (incidentAny) {
                const cat = cats.find(c => c.id === incidentAny.cat_id);
                memories.push({
                    id: `memory-${window.days}`,
                    label: window.label,
                    daysAgo: window.days,
                    note: incidentAny.note || undefined,
                    catName: cat?.name,
                    date: targetDate,
                });
            }
            // If nothing found for this window, skip it
        }

        return memories;
    }, [cats, incidents]);
}
