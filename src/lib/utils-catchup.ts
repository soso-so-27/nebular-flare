import { Task, NoticeLog, InventoryItem, AppSettings, CareTaskDef, NoticeDef, MealSlot, Frequency, TimeOfDay } from "@/types";
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

// --- HELPERS ---
const formatIntervalJp = (hours: number): string => {
    if (hours >= 720) {
        const months = Math.floor(hours / (24 * 30));
        return months === 1 ? '月に1回' : `${months}ヶ月おき`;
    }
    if (hours >= 168) {
        const weeks = Math.floor(hours / 168);
        return weeks === 1 ? '週に1回' : `${weeks}週間に1回`;
    }
    if (hours % 24 === 0) {
        const days = hours / 24;
        return days === 1 ? '毎日' : `${days}日おき`;
    }
    return `${hours}時間おき`;
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
    dayStartHour = 0,
}: {
    tasks: Task[];
    noticeLogs: Record<string, Record<string, NoticeLog>>;
    inventory: InventoryItem[];

    lastSeenAt: string;
    settings: AppSettings;
    cats: { id: string; name: string }[];
    careTaskDefs?: CareTaskDef[];
    careLogs?: any[];
    careLogsCurrentMonth?: any[];
    noticeDefs?: NoticeDef[];
    today?: string;
    observations?: any[];
    dayStartHour?: number;
}): { items: CatchUpItem[]; allItems: CatchUpItem[]; summary: string; remainingCount: number; today: string } {
    const items: CatchUpItem[] = [];
    const allItems: CatchUpItem[] = []; // Not used?
    const lastSeenDate = new Date(lastSeenAt);
    const now = new Date();

    // Calculate Today's Business Start
    const startDt = new Date(now);
    startDt.setHours(startDt.getHours() - dayStartHour);
    startDt.setHours(dayStartHour, 0, 0, 0);

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
                    body: `${cats.find(c => c.id === log.catId)?.name}: ${log.value} `,
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
                    body: `${cats.find(c => c.id === obs.cat_id)?.name}: ${obs.value}${obs.notes ? `\n📝 ${obs.notes}` : ''} `,
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

        const getSlotStartTime = (slot: string): number => {
            const date = new Date(now);
            switch (slot) {
                case 'morning': date.setHours(5, 0, 0, 0); break;
                case 'noon': date.setHours(11, 0, 0, 0); break;
                case 'evening': date.setHours(15, 0, 0, 0); break;
                case 'night': date.setHours(20, 0, 0, 0); break;
                default: date.setHours(0, 0, 0, 0);
            }
            return date.getTime();
        };

        const getDefaultMealSlots = (freq: string): ('morning' | 'noon' | 'evening' | 'night')[] => {
            switch (freq) {
                case 'daily': return ['morning'];
                case 'once-daily': return ['morning'];
                case 'twice-daily': return ['morning', 'evening'];
                case 'three-times-daily': return ['morning', 'noon', 'evening'];
                case 'four-times-daily': return ['morning', 'noon', 'evening', 'night'];
                case 'weekly': return [];
                case 'monthly': return [];
                case 'as-needed': return [];
                default: return [];
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

        const getPrioritySeverity = (priority?: string): number => {
            switch (priority) {
                case 'high': return 90;
                case 'low': return 65;
                default: return 80;
            }
        };

        careTaskDefs.filter(def => def.enabled).forEach(def => {
            const baseSeverity = getPrioritySeverity(def.priority);

            // --- A. INTERVAL-BASED SCHEDULING ---
            if (def.frequencyType === 'interval' && def.intervalHours) {
                const intervalMs = def.intervalHours * 60 * 60 * 1000;

                const checkIntervalForCat = (catId?: string) => {
                    const lastLog = [...(careLogs || [])]
                        .filter(log => log.type === def.id && (catId ? log.cat_id === catId : true))
                        .sort((a, b) => new Date(b.done_at).getTime() - new Date(a.done_at).getTime())[0];

                    const nextDueAt = lastLog
                        ? new Date(lastLog.done_at).getTime() + intervalMs
                        : 0; // If never done, it's due now

                    const startAt = nextDueAt - (def.startOffsetMinutes || 0) * 60 * 1000;

                    if (now.getTime() >= startAt && def.intervalHours) {
                        const intervalLabel = formatIntervalJp(def.intervalHours);
                        const catName = catId ? cats.find(c => c.id === catId)?.name : null;
                        const body = catName
                            ? `${catName}の分 ・ ${intervalLabel}`
                            : `みんなの分 ・ ${intervalLabel}`;

                        items.push({
                            id: `${def.id}_${catId || 'shared'} _interval`,
                            type: 'task',
                            severity: baseSeverity,
                            title: def.title,
                            body: body,
                            at: new Date(nextDueAt).toISOString(),
                            status: now.getTime() >= nextDueAt ? 'warn' : 'info',
                            actionLabel: '済んだ',
                            payload: { ...def, catId },
                            meta: catName ? `${catName} ・ お世話` : 'お世話',
                            icon: def.icon,
                            catId,
                            actionId: def.id,
                        });
                    }
                };

                if (def.perCat) {
                    cats.forEach(cat => checkIntervalForCat(cat.id));
                } else {
                    checkIntervalForCat();
                }
                return;
            }

            // --- B. FIXED/CALENDAR-BASED and GOAL-BASED ---
            const slots = def.mealSlots || getDefaultMealSlots(def.frequency);
            const frequencyCount = def.frequencyCount || slots.length || 1;

            // Type 1: Fixed Time Points (if mealSlots exist)
            if (slots.length > 0) {
                const checkSlotsForCat = (catId?: string) => {
                    // Collect all currently "valid and pending" slots
                    const pendingSlots: { slot: MealSlot; slotStartTime: number }[] = [];

                    slots.forEach((slot) => {
                        const slotStartTime = getSlotStartTime(slot);
                        const specificType = `${def.id}:${slot}`;
                        const isDoneToday = (careLogs || []).some(log =>
                            log.type === specificType &&
                            (catId ? log.cat_id === catId : true) &&
                            new Date(log.done_at).getTime() >= startDt.getTime()
                        );

                        const startAt = slotStartTime - (def.startOffsetMinutes || 0) * 60 * 1000;
                        if (!isDoneToday && now.getTime() >= startAt) {
                            pendingSlots.push({ slot, slotStartTime });
                        }
                    });

                    if (pendingSlots.length > 0) {
                        // Show ALL pending slots, not just the latest
                        pendingSlots.forEach(({ slot, slotStartTime }) => {
                            const catName = catId ? cats.find(c => c.id === catId)?.name : null;
                            const slotLabel = getMealSlotLabel(slot);
                            items.push({
                                id: `${def.id}_${catId || 'shared'}_${slot}`,
                                type: 'task',
                                severity: baseSeverity,
                                title: def.title,
                                body: catName ? `${catName}の分 ・ ${slotLabel}` : `みんなの分 ・ ${slotLabel}`,
                                at: new Date(slotStartTime).toISOString(),
                                status: now.getTime() >= slotStartTime ? 'warn' : 'info',
                                actionLabel: '済んだ',
                                payload: { ...def, catId, slot },
                                meta: catName ? `${catName} ・ お世話` : 'お世話',
                                icon: def.icon,
                                catId,
                                actionId: `${def.id}:${slot}`,
                            });
                        });
                    }
                };

                if (def.perCat) {
                    cats.forEach(cat => checkSlotsForCat(cat.id));
                } else {
                    checkSlotsForCat();
                }
            } else {
                // Type 2: Goal Counts (Daily/Weekly/Monthly without specific slots)
                const checkGoalForCat = (catId?: string) => {
                    const logs = (careLogs || []).filter(log =>
                        log.type === def.id &&
                        (catId ? log.cat_id === catId : true)
                    );

                    let periodStart = new Date(startDt);
                    let periodLabel = '今日分';

                    if (def.frequency === 'weekly') {
                        const d = new Date(now);
                        d.setHours(d.getHours() - dayStartHour);
                        const day = d.getDay();
                        const diffToMon = (day === 0 ? -6 : 1 - day);
                        d.setDate(d.getDate() + diffToMon);
                        periodStart = new Date(d);
                        periodStart.setHours(dayStartHour, 0, 0, 0);
                        periodLabel = '今週分';
                    } else if (def.frequency === 'monthly') {
                        const d = new Date(now);
                        d.setHours(d.getHours() - dayStartHour);
                        periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
                        periodStart.setHours(dayStartHour, 0, 0, 0);
                        periodLabel = '今月分';
                    }

                    const doneInPeriod = logs.filter(log => {
                        const logTime = new Date(log.done_at || log.at).getTime();
                        return logTime >= periodStart.getTime();
                    });
                    const doneCount = doneInPeriod.length;

                    if (doneCount < frequencyCount) {
                        const catName = catId ? cats.find(c => c.id === catId)?.name : null;
                        const progress = frequencyCount > 1 ? ` (${doneCount + 1}/${frequencyCount})` : '';

                        items.push({
                            id: `${def.id}_${catId || 'shared'}_goal`,
                            type: 'task',
                            severity: baseSeverity - 5,
                            title: def.title + progress,
                            body: catName ? `${catName}の分 ・ ${periodLabel}` : `みんなの分 ・ ${periodLabel}`,
                            at: now.toISOString(),
                            status: 'info',
                            actionLabel: '済んだ',
                            payload: { ...def, catId },
                            meta: catName ? `${catName} ・ お世話` : 'お世話',
                            icon: def.icon,
                            catId,
                            actionId: def.id,
                        });
                    }
                };

                if (def.perCat) {
                    cats.forEach(cat => checkGoalForCat(cat.id));
                } else {
                    checkGoalForCat();
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
                bodyParts.push(`メモ: ${it.purchaseMemo} `);
            }

            items.push({
                id: it.id,
                type: 'inventory',
                severity,
                title: `${it.label} が少なくなっています`,
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
        if (counts.abnormal > 0) parts.push(`気になる変化 ${counts.abnormal} 件`);
        if (counts.urgent > 0) parts.push(`未処理 ${counts.urgent} 件`);
        summary = parts.join(' ・ ');
    }

    return { items: displayItems, allItems: sorted, summary, remainingCount, today: todayStr };
}
