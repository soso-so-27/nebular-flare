import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronDown, Check, AlertCircle, MessageCircle, Bell, X, Cat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/store/app-store';
import { useFootprintContext } from '@/providers/footprint-provider';
import { getCatchUpItems } from '@/lib/utils-catchup';
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { sounds } from "@/lib/sounds";

// --- CONSTANTS: Request Variations (Pseudo-AI) ---
const REQUEST_VARIATIONS: Record<string, { base: string, slots?: Record<string, string[]> }> = {
    'care_food': {
        base: "ごはんほしい",
        slots: {
            'morning': ["朝ごはんまだー？", "お腹すいた！（朝）", "ごはん！起きて！", "エネルギー切れ..."],
            'evening': ["夜ごはんの時間だよ", "お腹ペコペコ（夜）", "ごはん！", "待ちきれない！"],
            'noon': ["お昼ごはん！", "ランチタイム！"],
            'night': ["夜食ちょうだい", "小腹すいた...", "お夜食..."]
        }
    },
    'care_water': {
        base: "お水かえて",
        slots: {
            'morning': ["お水、新鮮にして！", "喉かわいた（朝）"],
            'evening': ["お水かえてー", "おいしいお水飲みたい"],
            'night': ["お水かえてー", "夜のお水ちょうだい"]
        }
    },
    'care_litter': {
        base: "トイレそうじして",
        slots: {
            'evening': ["トイレ掃除してー", "キレイにして！", "トイレあふれそう..."],
            'night': ["寝る前にトイレ掃除！", "キレイにしてから寝て"]
        }
    },
    'care_brush': {
        base: "ブラッシングして～"
    },
    'care_play': {
        base: "遊んで！",
        slots: {
            'evening': ["遊んで！", "運動したい！", "退屈だよー"]
        }
    },
    'care_medicine': {
        base: "お薬ちょうだい"
    },
    'care_clip': {
        base: "爪きって～"
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
    'd5148fcd-c7ed-48f3-b86d-800122539272': 'care_clip'
};

const getDynamicRequestTitle = (defId: string, slot?: string): string => {
    // 1. Try to find match in variations
    let baseId = defId.split(':')[0];

    // Map UUID/Legacy to New
    if (ID_MAP[baseId]) {
        baseId = ID_MAP[baseId];
    }

    const variation = REQUEST_VARIATIONS[baseId];

    if (!variation) return ''; // Fallback to original title if no variation found

    // 2. Pick random if slot matches
    if (slot && variation.slots && variation.slots[slot]) {
        const candidates = variation.slots[slot];
        const today = new Date().getDate();
        const index = today % candidates.length;
        return candidates[index];
    }

    return variation.base;
};

// --- HOOK: Centralized Data Logic ---
export function useCareData() {
    const { careLogs, careTaskDefs, activeCatId, cats, catsLoading, noticeDefs, observations, settings, setSettings, addCareLog, inventory, noticeLogs, incidents } = useAppState();
    const { awardForCare } = useFootprintContext();
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
                const dynamicTitle = getDynamicRequestTitle(defId, slot);

                // DEBUG: Check why title isn't changing
                // console.log('DEBUG REQUEST:', { defId, slot, originalTitle: item.title, dynamicTitle });

                return {
                    id: item.id,
                    actionId: item.actionId,
                    defId: defId,
                    label: dynamicTitle || item.title, // Use dynamic if available, else static
                    perCat: item.payload?.perCat,
                    done: false,
                    slot: slot,
                    catId: item.catId,
                    severity: item.severity
                };
            });

        const ENABLE_INTEGRATED_PICKUP = true; // Always enabled for this unified logic
        let alerts: any[] = [];

        if (ENABLE_INTEGRATED_PICKUP) {
            // Incidents
            const activeIncidents = incidents ? incidents.filter(inc => inc.status !== 'resolved') : [];
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

            // New Photo Alerts (New!)
            const photoAlerts = cats.flatMap(cat => {
                if (!cat.images) return [];
                const unseen = cat.images.filter(img =>
                    img.createdAt > settings.lastSeenPhotoAt
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
    }, [catchUpData, incidents, cats]);

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
            const slots = def.mealSlots || (def.frequency === 'as-needed' ? [] :
                def.frequency === 'twice-daily' ? ['morning', 'evening'] :
                    def.frequency === 'three-times-daily' ? ['morning', 'noon', 'evening'] :
                        def.frequency === 'four-times-daily' ? ['morning', 'noon', 'evening', 'night'] :
                            ['morning']);

            if (slots.length === 0) {
                total += 1;
                const hasLog = careLogs?.find(log => log.type === def.id);
                if (hasLog) completed += 1;
                return;
            }

            for (const slot of slots) {
                const slotIndex = slotOrder.indexOf(slot as string);
                if (slotIndex <= currentSlotIndex) {
                    total += 1;
                    const typeToCheck = `${def.id}:${slot}`;
                    const hasLog = careLogs?.find(log => log.type === typeToCheck);
                    if (hasLog) completed += 1;
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
    awardForCare: (catId?: string) => void;
    markPhotosAsSeen?: () => void;
    initialTab?: 'care' | 'notifications';
    contrastMode?: 'light' | 'dark';
    style?: React.CSSProperties;
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
    style
}: UnifiedCareListProps) {

    const [activeTab, setActiveTab] = useState<'care' | 'notifications'>(initialTab);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const isLight = contrastMode === 'light';
    const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());

    const { totalCareTasks, completedCareTasks } = useMemo(() => {
        const total = careItems.length;
        const completed = careItems.filter(i => i.done).length;
        return { totalCareTasks: total, completedCareTasks: completed };
    }, [careItems]);

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
            className="w-72 overflow-hidden rounded-2xl relative mt-2 pointer-events-auto"
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

                                            setPendingIds(prev => new Set(prev).add(item.id));
                                            triggerFeedback('success');

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
                                                    awardForCare(item.perCat ? (activeCatId ?? undefined) : undefined);
                                                    setTimeout(() => {
                                                        setPendingIds(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(item.id);
                                                            return next;
                                                        });
                                                    }, 1000);
                                                }
                                            }
                                        }}
                                        className={`flex items-center gap-3 w-full text-left p-3 rounded-2xl transition-all border ${(item.done || pendingIds.has(item.id))
                                            ? 'bg-black/20 border-white/5 opacity-50'
                                            : 'bg-white/10 border-white/10 hover:bg-white/20 hover:border-white/30'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${(item.done || pendingIds.has(item.id))
                                            ? 'bg-[#7CAA8E] border-[#7CAA8E]'
                                            : 'border-[#E8B4A0]/40 group-hover:border-[#E8B4A0]'
                                            }`}>
                                            {(item.done || pendingIds.has(item.id)) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-sm font-black truncate transition-colors drop-shadow-sm ${(item.done || pendingIds.has(item.id)) ? 'text-white/40 line-through' : 'text-white'}`}>
                                            {item.label}
                                        </span>
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
        </motion.div>
    );
}
