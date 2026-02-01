import { useMemo } from "react";
import { useIncidentContext, useCatContext, useCoreContext } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { format, isToday, isYesterday } from "date-fns";
import { ja } from "date-fns/locale";
import { TimelineItem, TimelineGroup } from "@/types/timeline-types";
import { processRawIncidents } from "@/lib/timeline-utils";

export type FilterType = 'all' | 'photo' | 'chat' | 'bookmark' | 'health';

export function useGroupedLogs(activeTab: 'events' | 'requests' | 'input', selectedCatId: string | null, activeFilter: FilterType) {
    const { incidents } = useIncidentContext();
    const { cats } = useCatContext();
    const { householdUsers, currentUserId } = useCoreContext();
    const { user: authUser } = useAuth();

    const groupedLogs = useMemo<TimelineGroup[]>(() => {
        let items: TimelineItem[] = [];

        if (incidents) {
            const authDisplayName = authUser?.user_metadata?.display_name;
            items = processRawIncidents(incidents, cats, householdUsers, currentUserId, authDisplayName);
        }

        // Handle standalone photos (that are not part of an incident)
        const incidentPhotoPaths = new Set(items.flatMap(item => item.photos));
        cats.forEach((cat) => {
            if (cat.images) {
                cat.images.forEach((img) => {
                    if (!incidentPhotoPaths.has(img.storagePath)) {
                        items.push({
                            id: img.id,
                            type: 'photo_standalone',
                            catId: cat.id,
                            catName: cat.name,
                            cats: [{ id: cat.id, name: cat.name, avatar: cat.avatar }],
                            note: img.memo || '',
                            photos: [img.storagePath],
                            createdAt: img.createdAt,
                            userName: undefined,
                            updates: [],
                            reactions: [],
                            is_bookmarked: false
                        });
                    }
                });
            }
        });

        // Filter items
        const filteredItems = items.filter(item => {
            if (selectedCatId && item.catId !== selectedCatId) return false;
            if (activeFilter === 'all') return true;
            if (activeFilter === 'photo') return item.photos.length > 0;
            if (activeFilter === 'chat') return ['worried', 'chat', 'concerned', 'troubled'].includes(item.type as string);
            if (activeFilter === 'bookmark') return item.is_bookmarked;
            if (activeFilter === 'health') return !!item.health_category;
            return true;
        });

        // Sort: Latest First
        const sortedItems = filteredItems.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Group by Date
        const groups: Record<string, TimelineItem[]> = {};
        sortedItems.forEach(item => {
            const date = new Date(item.createdAt);
            let dateKey = format(date, 'yyyy-MM-dd');
            if (isToday(date)) dateKey = '今日';
            else if (isYesterday(date)) dateKey = '昨日';
            else dateKey = format(date, 'M月d日(E)', { locale: ja });

            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
        });

        return Object.entries(groups).map(([dateLabel, items]) => ({ dateLabel, items }));
    }, [incidents, cats, householdUsers, activeFilter, selectedCatId]);

    return groupedLogs;
}
