import { TimelineItem, TimelineUpdate, TimelineReaction, TimelineCatShort } from '../types/timeline-types';
import { Cat } from '@/types';

/**
 * Merges a list of raw incidents into a processed list of TimelineItems,
 * handling batching by batch_id without losing metadata.
 */
export function processRawIncidents(incidents: any[], cats: Cat[], householdUsers: any[], currentUserId?: string | null, currentUserDisplayName?: string | null): TimelineItem[] {
    const items: TimelineItem[] = [];
    const batchGroups: Record<string, TimelineItem> = {};

    incidents.forEach((inc) => {
        const user = householdUsers.find((u) => u.id === inc.created_by);
        const cat = cats.find((c) => c.id === inc.cat_id);

        // Resolve display name: Prioritize auth metadata for current user if available
        let resolvedUserName = user?.display_name;
        if (inc.created_by === currentUserId && currentUserDisplayName) {
            resolvedUserName = currentUserDisplayName;
        }

        // Filter out avatar images from the gallery photos
        const filteredPhotos = (inc.photos || []).filter((p: string) => {
            return p !== cat?.avatar && !cat?.avatar?.includes(p);
        });

        const itemBase: TimelineItem = {
            id: inc.id,
            type: inc.type,
            catId: inc.cat_id,
            catName: cat?.name || '不明',
            cats: cat ? [{ id: cat.id, name: cat.name, avatar: cat.avatar }] : [],
            note: inc.note || '',
            photos: filteredPhotos,
            createdAt: inc.created_at,
            createdBy: inc.created_by,
            userName: resolvedUserName,
            updates: inc.updates || [],
            reactions: inc.reactions || [],
            is_bookmarked: !!inc.is_bookmarked,
            health_category: inc.health_category,
            health_value: inc.health_value,
            status: inc.status,
            severity: inc.severity,
            batch_id: inc.batch_id,
            onset_at: inc.onset_at,
            symptom_details: inc.symptom_details
        };

        if (inc.batch_id) {
            if (!batchGroups[inc.batch_id]) {
                batchGroups[inc.batch_id] = itemBase;
            } else {
                const group = batchGroups[inc.batch_id];

                // Merge Cats
                if (cat && !group.cats.find(c => c.id === cat.id)) {
                    group.cats.push({ id: cat.id, name: cat.name, avatar: cat.avatar });
                    group.catName = group.cats.map(c => c.name).join(', ');
                }

                // Merge Photos
                filteredPhotos.forEach((p: string) => {
                    if (!group.photos.includes(p)) group.photos.push(p);
                });

                // Merge Updates (Comments) - CRITICAL: No data loss
                if (inc.updates) {
                    inc.updates.forEach((u: any) => {
                        if (!group.updates.find(gu => gu.id === u.id)) {
                            group.updates.push(u);
                        }
                    });
                }

                // Merge Reactions
                if (inc.reactions) {
                    inc.reactions.forEach((r: any) => {
                        if (!group.reactions.find(gr => gr.user_id === r.user_id && gr.emoji === r.emoji)) {
                            group.reactions.push(r);
                        }
                    });
                }

                // Use the earliest timestamp as the base for the group
                if (new Date(inc.created_at) < new Date(group.createdAt)) {
                    group.createdAt = inc.created_at;
                }

                // Combine notes if they are different
                if (inc.note && group.note && inc.note !== group.note && !group.note.includes(inc.note)) {
                    group.note += ` / ${inc.note}`;
                } else if (inc.note && !group.note) {
                    group.note = inc.note;
                }
            }
        } else {
            items.push(itemBase);
        }
    });

    return [...items, ...Object.values(batchGroups)];
}
