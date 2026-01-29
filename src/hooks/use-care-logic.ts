import { useMemo } from 'react';
import { useAppState } from '@/store/app-store';
import { useFootprintContext } from '@/providers/footprint-provider';
import { getCatchUpItems } from '@/lib/utils-catchup';
import { useAuth } from '@/providers/auth-provider';
import { useUserReadTimestamps } from './use-supabase-data';

// --- CONSTANTS: Request Variations (Pseudo-AI) ---
const REQUEST_VARIATIONS: Record<string, { base: string, slots?: Record<string, string[]> }> = {
    'care_food': {
        base: "ごはんほしいにゃ",
        slots: {
            'morning': ["朝だよ、お腹すいた〜", "おはよ、ごはん！", "朝ごはんまだー？", "起きて〜ごはん〜"],
            'evening': ["夜ごはんの時間だよ", "ごはん！待ちきれない！", "お腹ペコペコ〜", "夕飯まだかにゃ"],
            'noon': ["お昼ごはん！", "ランチタイムにゃ！", "お腹すいちゃった"],
            'night': ["夜食ちょうだい", "小腹すいた...にゃ", "夜のごはん〜"]
        }
    },
    'care_water': {
        base: "お水かえてにゃ",
        slots: {
            'morning': ["朝のお水、交換してにゃ", "新鮮なお水がいいにゃ"],
            'evening': ["お水かえて〜", "おいしいお水飲みたいにゃ"],
            'night': ["夜のお水ちょうだい", "お水交換してにゃ"]
        }
    },
    'care_litter': {
        base: "トイレお願いにゃ",
        slots: {
            'evening': ["トイレ掃除してにゃ", "きれいにしてほしいにゃ", "トイレお願い！"],
            'night': ["寝る前にトイレ掃除にゃ", "きれいにしてから寝てね"]
        }
    },
    'care_brush': {
        base: "ブラッシングして〜にゃ"
    },
    'care_play': {
        base: "遊んでほしいにゃ！",
        slots: {
            'evening': ["遊びたいにゃ！", "運動したい！", "遊んでほしいにゃ〜"]
        }
    },
    'care_medicine': {
        base: "お薬の時間にゃ"
    },
    'care_clip': {
        base: "爪きってにゃ〜"
    }
};

// UUID & Legacy ID Mapping
const ID_MAP: Record<string, string> = {
    // Legacy String IDs
    't1': 'care_food',
    't4': 'care_food',
    't3': 'care_water',
    't2': 'care_litter',
    't5': 'care_play',
    'w3': 'care_clip',

    // UUIDs (From User Environment)
    'e04bf651-3ac9-41d3-8c2e-b1173a6939b8': 'care_food',
    'bd13bc7f-d8cf-48b8-8f36-b7935e54af9b': 'care_litter',
    'd5148fcd-c7ed-48f3-b86d-800122539272': 'care_clip',
    '87c89f50-f800-4b8c-8515-99882949788f': 'care_water' // Added common water UUID
};

// Map Title to Base Variation Key (Fallback)
const TITLE_MAP: Record<string, string> = {
    'ごはん': 'care_food',
    'おやつ': 'care_food',
    '水を換える': 'care_water',
    'お水': 'care_water',
    'トイレ': 'care_litter',
    'トイレ掃除': 'care_litter',
    '爪切り': 'care_clip',
    'ブラッシング': 'care_brush',
    '遊ぶ': 'care_play',
    '運動': 'care_play'
};

const getDynamicRequestTitle = (defId: string, slot?: string, originalTitle?: string): string => {
    // 1. Try to find match in variations
    let baseId = defId.split(':')[0];

    // Map UUID/Legacy to New (Case insensitive for safety)
    const mapped = ID_MAP[baseId] || ID_MAP[baseId.toLowerCase()];
    if (mapped) {
        baseId = mapped;
    } else if (originalTitle) {
        // Fallback to title-based matching
        const found = Object.entries(TITLE_MAP).find(([key]) => originalTitle.includes(key));
        if (found) baseId = found[1];
    }

    const variation = REQUEST_VARIATIONS[baseId];
    if (!variation) return '';

    // 2. Pick random if slot matches
    if (slot && variation.slots && variation.slots[slot]) {
        const candidates = variation.slots[slot];
        const today = new Date().getDate();
        const index = today % candidates.length;
        return candidates[index];
    }

    // Default slot for food/water if not specified but we have a generic variation
    if (!slot && variation.slots?.['morning']) {
        // pick morning as default if slot is missing but it's a slot-aware type
        const candidates = variation.slots['morning'];
        return candidates[new Date().getDate() % candidates.length];
    }

    return variation.base;
};

// --- HOOK: Centralized Data Logic ---
export function useCareData() {
    const { careLogs, careTaskDefs, activeCatId, cats, catsLoading, noticeDefs, observations, settings, setSettings, addCareLog, deleteCareLog, inventory, noticeLogs, incidents, medicationLogs } = useAppState();
    const { awardForCare } = useFootprintContext();
    const { lastSeenPhotoAt, lastSeenIncidentAt } = useUserReadTimestamps();
    const { user } = useAuth();
    const { dayStartHour } = settings;

    // 1. Calculate CatchUp Data
    const catchUpData = useMemo(() => {
        const now = new Date();
        const businessDate = new Date(now);
        if (now.getHours() < dayStartHour) {
            businessDate.setDate(businessDate.getDate() - 1);
        }
        const todayStr = businessDate.toISOString().split('T')[0];

        return getCatchUpItems({
            tasks: [],
            noticeLogs: noticeLogs || {},
            inventory: inventory || [],
            lastSeenAt: "1970-01-01",
            settings,
            cats,
            careTaskDefs,
            careLogs,
            noticeDefs,
            today: todayStr,
            observations
        });
    }, [noticeLogs, inventory, settings, cats, careTaskDefs, careLogs, noticeDefs, observations, dayStartHour]);

    // 2. Separate Items & Calculate Alerts
    const { careItems, alertItems } = useMemo(() => {
        const tasks = catchUpData.allItems
            .filter(item => item.type === 'task')
            .map(item => {
                // Determine Slot for dynamic title
                // item.payload?.slot might be 'morning' etc.
                const slot = item.payload?.slot;
                const defId = item.payload?.id || item.id;

                // Get AI-like Title
                const dynamicTitle = getDynamicRequestTitle(defId, slot, item.title);

                // Preserve progress indicator (e.g. "(1/3)") from item.title if dynamicTitle is used
                let label = dynamicTitle || item.title;
                if (dynamicTitle && item.title.includes('(')) {
                    const progressMatch = item.title.match(/\s\(\d+\/\d+\)$/);
                    if (progressMatch) {
                        label = `${dynamicTitle}${progressMatch[0]}`;
                    }
                }

                return {
                    id: item.id,
                    actionId: item.actionId,
                    defId: defId,
                    label: label,
                    subLabel: item.body, // Added this line to show cat/slot info
                    perCat: item.payload?.perCat,
                    done: false,
                    slot: slot,
                    catId: item.catId,
                    severity: item.severity,
                    priority: item.payload?.priority,
                    icon: item.icon // Make sure icon is passed if available
                };
            });

        // --- Medication Quests Start ---
        if (medicationLogs && medicationLogs.length > 0) {
            const today = new Date(catchUpData.today);

            // Find most recent log (by starts_at)
            const sortedLogs = [...medicationLogs].sort((a, b) =>
                new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
            );

            medicationLogs.forEach(med => {
                const startDate = new Date(med.starts_at);
                const endDate = med.end_date ? new Date(med.end_date) : null;

                // Active check
                if (today < startDate || (endDate && today > endDate)) return;

                // Weekly check
                if (med.frequency === 'weekly') {
                    if (today.getDay() !== startDate.getDay()) return;
                }

                const cat = cats.find(c => c.id === med.cat_id);
                if (!cat) return;

                const slots = med.frequency === 'twice_daily' ? ['morning', 'evening'] : ['daily'];

                slots.forEach(slot => {
                    const questId = `med:${med.id}:${slot}:${catchUpData.today}`;
                    const actionId = `medication:${med.id}:${slot}`;

                    const isDone = careLogs?.some(log => {
                        if (log.type !== actionId) return false;
                        const logDate = new Date((log as any).at || log.done_at).toISOString().split('T')[0];
                        return logDate === catchUpData.today;
                    });

                    // Add as task (even if done, to show consistent list, or filter? Usually we filter out done in QuestGrid via logic)
                    // But here we rely on 'done' prop.
                    // Important: QuestGrid filters based on 'done' prop usually?
                    // Let's check: "const questItems = careItems.filter(item => !item.done ..."
                    // So we must set 'done' correctly.

                    tasks.push({
                        id: questId,
                        actionId: actionId,
                        defId: 'care_medicine',
                        label: `${med.product_name} (${slot === 'morning' ? '朝' : slot === 'evening' ? '夜' : '1日1回'})`,
                        subLabel: `${cat.name}のお薬・${med.dosage || ''}`,
                        perCat: true,
                        done: !!isDone,
                        slot: slot,
                        catId: med.cat_id,
                        severity: 80,
                        priority: 'high',
                        icon: 'Pill'
                    });
                });
            });
        }
        // --- Medication Quests End ---

        const ENABLE_INTEGRATED_PICKUP = true; // Always enabled for this unified logic
        let alerts: any[] = [];

        if (ENABLE_INTEGRATED_PICKUP) {
            // Incidents - show all active incidents, count decreases when resolved
            const activeIncidents = incidents
                ? incidents.filter(inc => inc.status !== 'resolved')
                : [];
            const incidentAlerts = activeIncidents.map(inc => {
                const cat = cats.find(c => c.id === inc.cat_id);
                const typeLabel = {
                    'vomit': '嘔吐',
                    'diarrhea': '下痢',
                    'injury': '怪我',
                    'appetite': '食欲不振',
                    'energy': '元気がない',
                    'toilet': 'トイレ失敗',
                    'other': 'その他'
                }[inc.type as string] || inc.type;

                return {
                    id: inc.id,
                    actionId: inc.id,
                    label: `${cat?.name || '猫ちゃん'} : ${typeLabel}`,
                    subLabel: new Date(inc.created_at).toLocaleDateString(),
                    type: 'incident',
                    severity: 100,
                    catId: inc.cat_id,
                    payload: inc
                };
            });

            // CatchUp Alerts
            const catchUpAlerts = catchUpData.allItems
                .filter(item => item.type !== 'task' && item.severity >= 60)
                .map(item => ({
                    id: item.id,
                    actionId: item.actionId,
                    label: item.title,
                    subLabel: item.body,
                    type: item.type,
                    severity: item.severity,
                    catId: item.catId,
                    payload: item.payload
                }));

            // New Photo Alerts (New!) - Using per-user timestamp
            const photoAlerts = cats.flatMap(cat => {
                if (!cat.images) return [];
                const unseen = cat.images.filter(img =>
                    img.createdAt > lastSeenPhotoAt
                ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

                if (unseen.length === 0) return [];

                return [{
                    id: `photo-${cat.id}`,
                    actionId: `photo-${cat.id}`,
                    label: `${cat.name}の新しい写真`,
                    subLabel: `家族が${unseen.length}枚の写真を届けました`,
                    type: 'notice',
                    severity: 90, // High priority
                    catId: cat.id,
                    payload: { unseenPhotos: unseen }
                }];
            });

            alerts = [...incidentAlerts, ...catchUpAlerts, ...photoAlerts].sort((a, b) => b.severity - a.severity);
        }

        return { careItems: tasks, alertItems: alerts };
    }, [catchUpData, incidents, cats, lastSeenPhotoAt, user]);

    // 3. Calculate Progress
    const { totalCareTasks, completedCareTasks } = useMemo(() => {
        if (!careTaskDefs) return { totalCareTasks: 0, completedCareTasks: 0 };
        const now = new Date();
        const currentHour = now.getHours();
        const businessDate = new Date(now);
        if (currentHour < dayStartHour) {
            businessDate.setDate(businessDate.getDate() - 1);
        }

        const getCurrentMealSlot = (hour: number) => {
            if (hour >= 5 && hour < 11) return 'morning';
            if (hour >= 11 && hour < 15) return 'noon';
            if (hour >= 15 && hour < 20) return 'evening';
            return 'night';
        };
        const currentSlot = getCurrentMealSlot(currentHour);
        const slotOrder = ['morning', 'noon', 'evening', 'night'];
        const currentSlotIndex = slotOrder.indexOf(currentSlot);

        let total = 0;
        let completed = 0;

        careTaskDefs.filter(def => def.enabled).forEach(def => {
            const isGoalBased = !def.mealSlots || def.mealSlots.length === 0;

            if (isGoalBased) {
                // Goal-based (Count based) or Anytime
                const startDt = new Date(businessDate);
                startDt.setHours(dayStartHour, 0, 0, 0);
                let periodStart = new Date(startDt);
                if (def.frequency === 'weekly') {
                    const d = new Date(now);
                    d.setHours(d.getHours() - dayStartHour);
                    const day = d.getDay();
                    const diffToMon = (day === 0 ? -6 : 1 - day);
                    d.setDate(d.getDate() + diffToMon);
                    periodStart = new Date(d);
                    periodStart.setHours(dayStartHour, 0, 0, 0);
                } else if (def.frequency === 'monthly') {
                    const d = new Date(now);
                    d.setHours(d.getHours() - dayStartHour);
                    periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
                    periodStart.setHours(dayStartHour, 0, 0, 0);
                }

                const count = def.frequencyCount || 1;
                const logsInPeriod = careLogs?.filter(log =>
                    log.type === def.id &&
                    new Date((log.done_at || (log as any).at) as string).getTime() >= periodStart.getTime()
                ) || [];

                total += count;
                completed += Math.min(logsInPeriod.length, count);
            } else {
                // Time-slot based
                const slots = def.mealSlots || [];
                for (const slot of slots) {
                    const slotIndex = slotOrder.indexOf(slot as string);
                    if (slotIndex <= currentSlotIndex) {
                        total += 1;
                        const typeToCheck = `${def.id}:${slot}`;
                        const hasLog = careLogs?.find(log => log.type === typeToCheck);
                        if (hasLog) completed += 1;
                    }
                }
            }
        });

        return { totalCareTasks: total, completedCareTasks: completed };
    }, [careTaskDefs, careLogs, dayStartHour]);

    const progress = totalCareTasks > 0 ? completedCareTasks / totalCareTasks : 1;

    const markPhotosAsSeen = () => {
        setSettings(s => ({ ...s, lastSeenPhotoAt: new Date().toISOString() }));
    };

    return {
        careItems,
        alertItems,
        progress,
        totalCareTasks,
        completedCareTasks,
        addCareLog,
        deleteCareLog,
        careLogs,
        careTaskDefs,
        activeCatId,
        awardForCare,
        markPhotosAsSeen
    };
}
