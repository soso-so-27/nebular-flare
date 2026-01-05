import { Task, NoticeLog, InventoryItem, AppSettings, CareTaskDef, NoticeDef } from "@/types";
import { bucketFor } from "./utils-date";

export type CatchUpItem = {
    id: string;
    type: 'notice' | 'task' | 'inventory' | 'memo' | 'unrecorded';
    severity: number; // 0-100
    title: string;
    body: string;
    at: string;
    status: 'danger' | 'warn' | 'success' | 'info' | 'default';
    actionLabel?: string;
    catId?: string;
    payload?: any;
    meta?: string;
    icon?: string; // Icon name from settings
    category?: string; // Category for grouping
    required?: boolean; // From settings
    actionId?: string;
};

export function getCatchUpItems({
    tasks,
    noticeLogs,
    inventory,
    lastSeenAt,
    settings,
    cats,
    careTaskDefs,
    careLogs,
    noticeDefs,
    today,
    observations,
}: {
    tasks: Task[];
    noticeLogs: Record<string, Record<string, NoticeLog>>;
    inventory: InventoryItem[];

    lastSeenAt: string;
    settings: AppSettings;
    cats: { id: string; name: string }[];
    careTaskDefs?: CareTaskDef[];
    careLogs?: any[];
    noticeDefs?: NoticeDef[];
    today?: string;
    observations?: any[];
}): { items: CatchUpItem[]; allItems: CatchUpItem[]; summary: string; remainingCount: number } {
    const items: CatchUpItem[] = [];
    const lastSeenDate = new Date(lastSeenAt);
    const now = new Date();
    const todayStr = today || now.toISOString().split('T')[0];

    // 1. Abnormal Notices (Score 100) - Filtered by enabled noticeDefs
    const enabledNoticeIds = noticeDefs?.filter(n => n.enabled).map(n => n.id) || [];
    const enabledNoticeDefs = noticeDefs?.filter(n => n.enabled && n.kind === 'notice') || [];

    // Local Logs (Demo)
    Object.values(noticeLogs).forEach(catLogs => {
        Object.values(catLogs).forEach(log => {
            if (noticeDefs && !enabledNoticeIds.includes(log.noticeId)) return;

            const isNew = new Date(log.at) > lastSeenDate;
            const isAbnormal = log.value !== "いつも通り" && log.value !== "なし" && log.value !== "記録した";
            if (isAbnormal && isNew && !log.later) {
                items.push({
                    id: log.id,
                    type: 'notice',
                    severity: 100,
                    title: "いつもと違う様子",
                    body: `${cats.find(c => c.id === log.catId)?.name}: ${log.value}`,
                    at: log.at,
                    status: 'danger',
                    actionLabel: 'OK',
                    catId: log.catId,
                    payload: log,
                    meta: `${cats.find(c => c.id === log.catId)?.name} ・ 体調`,
                });
            }
        });
    });

    // Supabase Observations
    if (observations) {
        observations.forEach(obs => {
            // Filter by enabled noticeDefs (obs.type should be the noticeDef ID)
            if (noticeDefs && !enabledNoticeIds.includes(obs.type)) return;

            const noticeDef = noticeDefs?.find(n => n.id === obs.type);

            // Determine 'normal' values from settings or use defaults
            // The first choice is typically the 'normal'/healthy response
            const normalValues = noticeDef?.choices?.slice(0, 1) || ['いつも通り'];
            const commonNormalValues = ['いつも通り', '普通', '元気', 'なし', '記録した'];
            const isNormal = normalValues.includes(obs.value) ||
                commonNormalValues.includes(obs.value) ||
                obs.value.includes('通り') ||
                obs.value.includes('普通');
            const isAbnormal = !isNormal;

            const isNew = new Date(obs.created_at || obs.recorded_at) > lastSeenDate;

            // Only add if abnormal, new, and not acknowledged
            if (isAbnormal && isNew && !obs.acknowledged_at) {
                items.push({
                    id: obs.id,
                    type: 'notice',
                    severity: 100,
                    title: noticeDef?.title || "いつもと違う様子",
                    body: `${cats.find(c => c.id === obs.cat_id)?.name}: ${obs.value}${obs.notes ? `\n📝 ${obs.notes}` : ''}`,
                    at: obs.created_at || obs.recorded_at,
                    status: 'danger',
                    actionLabel: '確認',
                    catId: obs.cat_id,
                    payload: obs,
                    meta: `${cats.find(c => c.id === obs.cat_id)?.name} ・ 体調`,
                });
            }
        });
    }

    // 1.5 Unrecorded Observations - Removed per user request (Only showing done-abnormal or care tasks)
    // logic removed.

    // 2. Care Tasks from careTaskDefs (Score 80) - Time slot based
    if (careTaskDefs && careLogs) {
        const currentHour = now.getHours();

        // Import meal slot utilities inline to avoid circular deps
        const getCurrentMealSlot = (hour: number): 'morning' | 'noon' | 'evening' | 'night' => {
            if (hour >= 5 && hour < 11) return 'morning';
            if (hour >= 11 && hour < 15) return 'noon';
            if (hour >= 15 && hour < 20) return 'evening';
            return 'night';
        };

        const getDefaultMealSlots = (freq: string): ('morning' | 'noon' | 'evening' | 'night')[] => {
            switch (freq) {
                case 'once-daily': return ['morning'];
                case 'twice-daily': return ['morning', 'evening'];
                case 'three-times-daily': return ['morning', 'noon', 'evening'];
                case 'four-times-daily': return ['morning', 'noon', 'evening', 'night'];
                case 'weekly': return []; // Treat as as-needed for now (TODO: check weekly history)
                case 'monthly': return []; // Treat as as-needed for now (TODO: check monthly history)
                case 'as-needed': return []; // Always show
                default: return ['morning'];
            }
        };

        const getMealSlotLabel = (slot: string): string => {
            switch (slot) {
                case 'morning': return '朝';
                case 'noon': return '昼';
                case 'evening': return '夕';
                case 'night': return '夜';
                default: return '';
            }
        };

        const currentSlot = getCurrentMealSlot(currentHour);

        careTaskDefs.filter(def => def.enabled).forEach(def => {
            // Get meal slots for this task
            const slots = def.mealSlots || getDefaultMealSlots(def.frequency);

            // For 'as-needed', always show if not done today
            if (def.frequency === 'as-needed' || slots.length === 0) {
                const matchingLog = careLogs.find(log => log.type === def.id);
                if (!matchingLog) {
                    items.push({
                        id: def.id,
                        type: 'task',
                        severity: 70, // Lower priority for as-needed
                        title: def.title,
                        body: "必要に応じて",
                        at: now.toISOString(),
                        status: 'info',
                        actionLabel: '済んだ',
                        payload: def,
                        meta: 'お世話',
                        icon: def.icon,
                        actionId: def.id,
                    });
                }
                return;
            }

            // Check ALL valid slots up to current time
            const slotOrder = ['morning', 'noon', 'evening', 'night'];
            const currentSlotIndex = slotOrder.indexOf(currentSlot);

            for (const slot of slots) {
                const slotIndex = slotOrder.indexOf(slot as any);

                // Skip future slots
                if (slotIndex > currentSlotIndex) continue;

                // Check if this slot is done
                const slotLabel = getMealSlotLabel(slot);

                // Logic to check if done matches home-screen/check-section logic
                // 1. Shared Task
                let isDone = false;

                if (def.perCat && cats.length > 0) {
                    // Per-cat task
                    cats.forEach(cat => {
                        const typeToCheck = slot ? `${def.id}:${slot}` : def.id;
                        // Match log by type AND (cat_id matches OR cat_id is null for legacy data)
                        const matchingLog = careLogs.find(log =>
                            log.type === typeToCheck &&
                            (log.cat_id === cat.id || log.cat_id === null)
                        );

                        if (!matchingLog) {
                            items.push({
                                id: `${def.id}_${cat.id}_${slot}`,
                                type: 'task',
                                severity: slot === currentSlot ? 85 : 75, // Higher for current
                                title: `${def.title}（${slotLabel}）`,
                                body: slot === currentSlot ? `${cat.name}の${slotLabel}の分` : '前回の分が未完了です',
                                at: now.toISOString(),
                                status: slot === currentSlot ? 'warn' : 'info',
                                actionLabel: '済んだ',
                                payload: { ...def, catId: cat.id, slot: slot },
                                meta: `${cat.name} ・ お世話`,
                                icon: def.icon,
                                catId: cat.id,
                                actionId: typeToCheck,
                            });
                        }
                    });
                } else {
                    // Shared task
                    const typeToCheck = slot ? `${def.id}:${slot}` : def.id;
                    const matchingLog = careLogs.find(log =>
                        log.type === typeToCheck
                    );

                    if (!matchingLog) {
                        items.push({
                            id: `${def.id}_${slot}`,
                            type: 'task',
                            severity: slot === currentSlot ? 85 : 75,
                            title: `${def.title}（${slotLabel}）`,
                            body: slot === currentSlot ? `${slotLabel}の分です` : '前回の分が未完了です',
                            at: now.toISOString(),
                            status: slot === currentSlot ? 'warn' : 'info',
                            actionLabel: '済んだ',
                            payload: { ...def, slot: slot },
                            meta: 'お世話',
                            icon: def.icon,
                            actionId: typeToCheck,
                        });
                    }
                }
            }
        });
    } else {
        // Fallback: Legacy tasks support
        tasks.filter(t => !t.done).forEach(t => {
            const bucket = bucketFor(t, now);
            if (bucket === 'overdue' || bucket === 'now' || (bucket === 'today' && !t.optional)) {
                items.push({
                    id: t.id,
                    type: 'task',
                    severity: bucket === 'overdue' ? 85 : 80,
                    title: t.title,
                    body: bucket === 'overdue' ? "期限が過ぎています" : "今日やるべきケアです",
                    at: t.dueAt || now.toISOString(),
                    status: bucket === 'overdue' ? 'danger' : 'warn',
                    actionLabel: '済んだ',
                    payload: t,
                    meta: t.catId ? `${cats.find(c => c.id === t.catId)?.name || '猫'} ・ お世話` : 'お世話',
                });
            }
        });
    }

    // 3. Inventory (Score 60-70) - Filter by alertEnabled
    inventory.forEach(it => {
        // Skip if alerts are disabled for this item
        if (it.alertEnabled === false) return;

        // Calculate days left (Logic matched with home-screen.tsx)
        const rangeMax = it.range_max || it.range?.[1] || 30;
        let daysLeft = rangeMax;

        if (it.last_bought) {
            const lastDate = new Date(it.last_bought);
            const diffTime = now.getTime() - lastDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = Math.max(0, rangeMax - diffDays);
        }

        const { critical, urgent } = settings.invThresholds;

        // Also consider stockLevel if set
        let shouldAlert = false;
        let severity = 0;
        let status: 'danger' | 'warn' = 'warn';

        if (it.stockLevel === 'empty' || it.stockLevel === 'low') {
            shouldAlert = true;
            severity = it.stockLevel === 'empty' ? 80 : 70;
            status = it.stockLevel === 'empty' ? 'danger' : 'warn';
        } else if (daysLeft <= critical) {
            shouldAlert = true;
            severity = 75;
            status = 'danger';
        } else if (daysLeft <= urgent) {
            shouldAlert = true;
            severity = 65;
            status = 'warn';
        }

        if (shouldAlert) {
            const bodyParts = [`残り約 ${daysLeft} 日分`];
            if (it.purchaseMemo) {
                bodyParts.push(`メモ: ${it.purchaseMemo}`);
            }

            items.push({
                id: it.id,
                type: 'inventory',
                severity,
                title: `${it.label}が少なくなっています`,
                body: bodyParts.join(' ・ '),
                at: now.toISOString(),
                status,
                actionLabel: '買った',
                payload: it,
            });
        }
    });



    // Sort by severity
    const sorted = items.sort((a, b) => b.severity - a.severity);
    const displayItems = sorted.slice(0, 6);
    const remainingCount = Math.max(0, items.length - 6);

    // Summary logic
    const counts = {
        abnormal: items.filter(i => i.severity >= 90).length,
        urgent: items.filter(i => i.severity >= 60 && i.severity < 90).length,
    };

    let summary = "すべて順調です";
    if (counts.abnormal > 0 || counts.urgent > 0) {
        const parts = [];
        if (counts.abnormal > 0) parts.push(`気になる変化 ${counts.abnormal}件`);
        if (counts.urgent > 0) parts.push(`未処理 ${counts.urgent}件`);
        summary = parts.join(' ・ ');
    }

    return { items: displayItems, allItems: sorted, summary, remainingCount };
}
