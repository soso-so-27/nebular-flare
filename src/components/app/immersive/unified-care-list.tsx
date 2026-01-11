import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronDown, Check, AlertCircle, Camera } from 'lucide-react';
import { useAppState } from '@/store/app-store';
import { useFootprintContext } from '@/providers/footprint-provider';
import { getCatchUpItems } from '@/lib/utils-catchup';
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { sounds } from "@/lib/sounds";

// --- HOOK: Centralized Data Logic ---
export function useCareData() {
    const { careLogs, careTaskDefs, activeCatId, cats, catsLoading, noticeDefs, observations, settings, addCareLog, inventory, noticeLogs, incidents } = useAppState();
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
            .map(item => ({
                id: item.id,
                actionId: item.actionId,
                defId: item.payload?.id || item.id,
                label: item.title,
                perCat: item.payload?.perCat,
                done: false,
                slot: item.payload?.slot,
                catId: item.catId,
                severity: item.severity
            }));

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

            alerts = [...incidentAlerts, ...catchUpAlerts].sort((a, b) => b.severity - a.severity);
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

    return {
        careItems,
        alertItems,
        progress,
        addCareLog,
        activeCatId,
        awardForCare
    };
}


// --- COMPONENT: Unified Render ---
interface UnifiedCareListProps {
    alertItems: any[];
    careItems: any[];
    onOpenPickup: () => void;
    onOpenIncident: () => void;
    onOpenPhoto: () => void;
    addCareLog: any;
    activeCatId: string | null;
    awardForCare: (catId?: string) => void;
    style?: React.CSSProperties; // Optional inline overrides
    contrastMode?: 'light' | 'dark';
}

export function UnifiedCareList({
    alertItems,
    careItems,
    onOpenPickup,
    onOpenIncident,
    onOpenPhoto,
    addCareLog,
    activeCatId,
    awardForCare,
    style,
    contrastMode = 'light'
}: UnifiedCareListProps) {

    const isLight = contrastMode === 'light';

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
        onOpenPickup();
    };

    // Styles (Island Base)
    // Warm Glass Theme
    const listStyle = {
        background: 'rgba(42, 37, 34, 0.85)', // Warm Dark Brown
        backdropFilter: 'blur(24px) saturate(1.2)',
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
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
            <div className="p-4 space-y-4">
                {/* 1. Alerts Section - Unified to Peach */}
                {alertItems.length > 0 && (
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-[#FFD6C0] text-xs font-bold pl-1 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-[#E8B4A0] inline-block" />
                            <span>要確認</span>
                        </div>
                        <div className="space-y-2">
                            {alertItems.map(item => (
                                <motion.button
                                    key={item.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleAction(item)}
                                    // Unified Glassmorphism Style - Alert (Peach)
                                    className="w-full text-left p-3 rounded-xl bg-gradient-to-br from-[#E8B4A0]/20 to-[#C08A70]/40 border border-[#E8B4A0]/30 flex items-start gap-3 backdrop-blur-sm shadow-md transition-colors hover:border-[#E8B4A0]/50"
                                >
                                    <div className="w-5 h-5 rounded-full bg-[#E8B4A0]/20 flex items-center justify-center shrink-0 mt-0.5 border border-[#E8B4A0]/10">
                                        <span className="text-[#FFD6C0] text-xs text-center !leading-none flex items-center justify-center">!</span>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-[#FFD6C0] leading-tight mb-1">
                                            {item.label}
                                        </div>
                                        <div className="text-[10px] text-[#FFD6C0]/70 leading-tight">
                                            {item.subLabel}
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                        <div className="h-px bg-white/10 w-full mt-2" />
                    </div>
                )}

                {/* 2. Care Header */}
                <div className="flex items-center gap-2 text-[#E8B4A0] text-xs font-bold pl-1">
                    <Heart className="w-3 h-3 text-[#E8B4A0]" />
                    <span>お世話</span>
                </div>

                {/* 3. Care List */}
                <div className="space-y-2">
                    {careItems.map(item => (
                        <motion.button
                            key={item.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={async (e) => {
                                e.stopPropagation();
                                triggerFeedback('success');
                                if (!item.done && addCareLog) {
                                    const targetId = (item as any).actionId || item.id;
                                    const result = await addCareLog(targetId, item.perCat ? (activeCatId ?? undefined) : undefined);
                                    if (result && result.error) {
                                        toast.error(result.error.message || "記録できませんでした");
                                    } else {
                                        awardForCare(item.perCat ? (activeCatId ?? undefined) : undefined);
                                    }
                                }
                            }}
                            className={`flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all border ${item.done
                                    ? 'bg-black/20 border-white/5 opacity-50'
                                    : 'bg-[#3A322E]/80 border-white/10 hover:bg-[#4A403A] hover:border-[#E8B4A0]/30'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${item.done
                                    ? 'bg-[#7CAA8E] border-[#7CAA8E]'
                                    : 'border-[#E8B4A0]/40 group-hover:border-[#E8B4A0]'
                                }`}>
                                {item.done && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-medium truncate transition-colors ${item.done ? 'text-white/40 line-through' : 'text-[#F5E6E0]'}`}>
                                {item.label}
                            </span>
                        </motion.button>
                    ))}
                    {careItems.length === 0 && (
                        <div className="text-center py-4 text-white/30 text-xs italic">
                            お世話タスク完了！
                        </div>
                    )}
                </div>

                {/* 4. Additional Actions - Warm Buttons */}
                <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
                    {/* Notice Button - Standardized Style */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerFeedback('medium');
                            onOpenIncident();
                        }}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all bg-[#3A322E]/40 hover:bg-[#4A403A]/60 border border-white/10 hover:border-white/20 group"
                    >
                        <div className="w-5 h-5 rounded-full bg-[#E8B4A0]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E8B4A0]/20 transition-colors">
                            <AlertCircle className="w-3 h-3 text-[#E8B4A0] group-hover:text-[#FFD6C0] transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-white/70 group-hover:text-white">気付きを記録</span>
                    </motion.button>

                    {/* Today's Photo Button */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerFeedback('medium');
                            onOpenPhoto();
                        }}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all bg-[#3A322E]/40 hover:bg-[#4A403A]/60 border border-white/10 hover:border-white/20 group"
                    >
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                            <Camera className="w-3 h-3 text-white/70 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-white/70 group-hover:text-white">今日の一枚</span>
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
