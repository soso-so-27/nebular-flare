import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronDown, Check, AlertCircle, MessageCircle, Bell, X, Cat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/store/app-store';
import { useFootprintContext } from '@/providers/footprint-provider';
import { getCatchUpItems } from '@/lib/utils-catchup';
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { sounds } from "@/lib/sounds";
import { CelebrationOverlay, getRandomReaction, PawParticle, SparkleParticle } from '@/components/ui/celebration-overlay';
import { useUserReadTimestamps } from '@/hooks/use-user-read-timestamps';
import { useAuth } from '@/providers/auth-provider';
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
    const { careLogs, careTaskDefs, activeCatId, cats, catsLoading, noticeDefs, observations, settings, setSettings, addCareLog, inventory, noticeLogs, incidents } = useAppState();
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
                    priority: item.payload?.priority
                };
            });

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
        activeCatId,
        awardForCare,
        markPhotosAsSeen
    };
}


// --- COMPONENT: Unified Render ---
interface UnifiedCareListProps {
    alertItems: any[];
    careItems: any[];
    onOpenPickup: () => void;
    onOpenIncident: () => void;
    onOpenPhoto: () => void;
    onOpenIncidentDetail?: (id: string) => void;
    onClose?: () => void;
    addCareLog: any;
    activeCatId: string | null;
    awardForCare: (catId?: string, actionId?: string, skipPopup?: boolean) => void;
    markPhotosAsSeen?: () => void;
    initialTab?: 'care' | 'notifications';
    contrastMode?: 'light' | 'dark';
    completedCareTasks?: number;
    totalCareTasks?: number;
    style?: React.CSSProperties;
}

// Internal Local Burst Component
function LocalBurst({ x, y }: { x: number, y: number }) {
    // Ensure we are on client
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
        <div className="fixed pointer-events-none z-[20000]" style={{ left: x, top: y }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <React.Fragment key={angle}>
                    <PawParticle
                        angle={angle}
                        distance={50 + (i % 2) * 10}
                        delay={0}
                    />
                    <SparkleParticle
                        angle={angle + 22.5}
                        distance={60 + (i % 2) * 20}
                        delay={0.05}
                    />
                </React.Fragment>
            ))}
        </div>,
        document.body
    );
}

export function UnifiedCareList({
    alertItems,
    careItems,
    onOpenPickup,
    onOpenIncident,
    onOpenIncidentDetail,
    onOpenPhoto,
    onClose,
    addCareLog,
    activeCatId,
    awardForCare,
    markPhotosAsSeen,
    initialTab = 'notifications',
    contrastMode = 'light',
    style,
    totalCareTasks = 0,
    completedCareTasks = 0,
    className
}: UnifiedCareListProps & { className?: string }) {

    const [activeTab, setActiveTab] = useState<'care' | 'notifications'>(initialTab);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const isLight = contrastMode === 'light';
    const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());

    const [celebration, setCelebration] = useState<{
        active: boolean;
        taskId: string;
        message: string;
        tapPosition: { x: number; y: number };
    } | null>(null);

    const [bursts, setBursts] = useState<{ id: string, x: number, y: number }[]>([]);

    const { cats } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    // Use props passed from useCareData


    // Feedback Helper
    const triggerFeedback = (type: 'light' | 'medium' | 'success' = 'light') => {
        try {
            if (type === 'light') {
                haptics.impactLight();
                sounds.click().catch(e => console.warn(e));
            } else if (type === 'medium') {
                haptics.impactMedium();
                sounds.pop().catch(e => console.warn(e));
            } else if (type === 'success') {
                haptics.success();
                sounds.success().catch(e => console.warn(e));
            }
        } catch (e) { console.warn(e); }
    };

    // Action Handler
    const handleAction = (item: any) => {
        triggerFeedback('medium');
        if (item.type === 'incident' && onOpenIncidentDetail) {
            onOpenIncidentDetail(item.id);
        } else if (item.id.startsWith('photo-')) {
            if (markPhotosAsSeen) markPhotosAsSeen();
            onOpenPhoto();
        } else {
            onOpenPickup();
        }
    };

    const listStyle = {
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(40px) saturate(2)',
        boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.25), inset 0 2px 0 0 rgba(255,255,255,0.1)',
        borderRadius: '32px',
        ...style
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 10 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`w-72 overflow-hidden rounded-2xl relative mt-2 pointer-events-auto ${className || ''}`}
            style={listStyle}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto no-scrollbar">
                {/* Close Button */}
                {onClose && (
                    <div className="flex justify-end -mt-2 -mr-2 mb-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4 text-white/70" />
                        </button>
                    </div>
                )}
                <AnimatePresence mode="wait">
                    {activeTab === 'notifications' ? (
                        <motion.div
                            key="notifications-tab"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            {/* 1. Alerts Section (Prioritized) */}
                            {alertItems.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="space-y-2">
                                        {alertItems.map(item => (
                                            <motion.button
                                                key={item.id}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleAction(item)}
                                                className="w-full text-left p-3 rounded-xl bg-gradient-to-br from-[#E8B4A0]/20 to-[#C08A70]/40 border border-[#E8B4A0]/30 flex items-start gap-3 backdrop-blur-sm shadow-md transition-colors hover:border-[#E8B4A0]/50"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5 border border-white/20">
                                                    <span className="text-white text-[10px] font-black">!</span>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-white leading-tight mb-1 drop-shadow-sm">
                                                        {item.label}
                                                    </div>
                                                    <div className="text-[10px] text-white/80 font-medium leading-tight drop-shadow-sm">
                                                        {item.subLabel}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                                        <Bell className="w-6 h-6 text-white/20" />
                                    </div>
                                    <p className="text-xs text-white/30 italic">通知はありません</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="care-tab"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-4"
                        >
                            {/* 2. Care Header */}
                            <div className="flex items-center gap-2 text-[#E8B4A0] text-xs font-bold pl-1">
                                <Cat className="w-3 h-3 text-[#E8B4A0]" />
                                <span>今日のリクエスト</span>
                                <span className="ml-auto text-[10px] text-white/40">{completedCareTasks}/{totalCareTasks}</span>
                            </div>

                            {/* 3. Care List */}
                            <div className="space-y-2">
                                {careItems.map(item => (
                                    <motion.button
                                        key={item.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (item.done || pendingIds.has(item.id)) return;

                                            // Get tap position for particle effect
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            const tapPosition = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

                                            setPendingIds(prev => new Set(prev).add(item.id));

                                            if (addCareLog) {
                                                const targetId = (item as any).actionId || item.id;
                                                const result = await addCareLog(targetId, item.perCat ? (activeCatId ?? undefined) : undefined);
                                                if (result && result.error) {
                                                    toast.error(result.error.message || "記録できませんでした");
                                                    setPendingIds(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(item.id);
                                                        return next;
                                                    });
                                                } else {
                                                    // Trigger celebration ONLY if it's the last task
                                                    const remainingTasks = careItems.filter(i => i.id !== item.id && !i.done && !pendingIds.has(i.id));
                                                    const isLastTask = remainingTasks.length === 0;

                                                    if (isLastTask) {
                                                        const reactionMessage = getRandomReaction(item.defId || item.id);
                                                        setCelebration({
                                                            active: true,
                                                            taskId: item.id,
                                                            message: reactionMessage,
                                                            tapPosition
                                                        });
                                                        sounds.celebrate();
                                                    } else {
                                                        // Immediate feedback for normal tasks
                                                        sounds.burst();
                                                        sounds.success().catch(() => { }); // Secondary reward sound

                                                        // Add local burst
                                                        const burstId = Math.random().toString(36).substr(2, 9);
                                                        setBursts(prev => [...prev, { id: burstId, x: tapPosition.x, y: tapPosition.y }]);
                                                        setTimeout(() => {
                                                            setBursts(prev => prev.filter(b => b.id !== burstId));
                                                        }, 1000);
                                                    }

                                                    haptics.success();

                                                    // Use skipPopup: true for minimal distraction
                                                    awardForCare(item.perCat ? (activeCatId ?? undefined) : undefined, undefined, true);
                                                    setTimeout(() => {
                                                        setPendingIds(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(item.id);
                                                            return next;
                                                        });
                                                    }, 800); // Shorter delay (Duolingo style)
                                                }
                                            }
                                        }}
                                        className={`flex items-center gap-3 w-full text-left p-3 rounded-2xl transition-all border shadow-sm ${(item.done || pendingIds.has(item.id))
                                            ? 'bg-black/20 border-white/5 opacity-50'
                                            : item.priority === 'high'
                                                ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30'
                                                : 'bg-white/10 border-white/10 hover:bg-white/20 hover:border-white/30'
                                            }`}
                                    >
                                        <div className="relative shrink-0">
                                            {item.catId ? (
                                                <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-white/5">
                                                    {cats.find(c => c.id === item.catId)?.avatar ? (
                                                        <img src={cats.find(c => c.id === item.catId)?.avatar} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/50 lowercase">
                                                            {cats.find(c => c.id === item.catId)?.name.substring(0, 1)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#E8B4A0]" />
                                                </div>
                                            )}

                                            <AnimatePresence>
                                                {(item.done || pendingIds.has(item.id)) && (
                                                    <motion.div
                                                        initial={{ scale: 0, rotate: -45, opacity: 0 }}
                                                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                                        exit={{ scale: 0, rotate: 45, opacity: 0 }}
                                                        className="absolute inset-0 bg-gradient-to-br from-[#A6C09D] to-[#8FA986] rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10"
                                                    >
                                                        <motion.div
                                                            initial={{ pathLength: 0 }}
                                                            animate={{ pathLength: 1 }}
                                                            transition={{ duration: 0.3, delay: 0.1 }}
                                                        >
                                                            <Check className="w-5 h-5 text-white stroke-[3.5]" />
                                                        </motion.div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {item.priority === 'high' && !item.done && (
                                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-slate-900" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-black truncate transition-colors drop-shadow-sm flex items-center gap-1.5 ${(item.done || pendingIds.has(item.id)) ? 'text-white/40 line-through' : 'text-white'}`}>
                                                {item.priority === 'high' && !item.done && <span className="text-[10px] font-black text-red-400">!!</span>}
                                                {item.label}
                                            </div>
                                            {item.subLabel && !item.done && (
                                                <div className="text-[10px] text-white/40 font-medium truncate italic mt-0.5">
                                                    {item.subLabel}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${(item.done || pendingIds.has(item.id))
                                            ? 'bg-[#7CAA8E] border-[#7CAA8E]'
                                            : item.priority === 'high'
                                                ? 'border-red-500/50'
                                                : 'border-[#E8B4A0]/40 group-hover:border-[#E8B4A0]'
                                            }`}>
                                            {(item.done || pendingIds.has(item.id)) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </motion.button>
                                ))}
                                {careItems.length === 0 && (
                                    <div className="text-center py-12 space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                                            <Cat className="w-6 h-6 text-white/20" />
                                        </div>
                                        <p className="text-xs text-white/30 italic">今日のリクエストは完了しています</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Celebration Overlay */}
            {celebration && (
                <CelebrationOverlay
                    isActive={celebration.active}
                    onComplete={() => setCelebration(null)}
                    tapPosition={celebration.tapPosition}
                    catAvatar={activeCat?.avatar}
                    catName={activeCat?.name || 'ねこ'}
                    reactionMessage={celebration.message}
                />
            )}
        </motion.div>
    );
}
