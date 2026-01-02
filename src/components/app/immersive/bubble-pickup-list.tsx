
"use client";

import React, { useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Heart, Cat, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getToday } from "@/lib/date-utils";
import { getIcon } from "@/lib/icon-utils";
import { motion, AnimatePresence } from "framer-motion";

interface BubbleItem {
    id: string;
    label: string;
    subLabel?: string;
    icon: React.ReactNode;
    colorClass: string;
    onAction: () => void;
}

interface BubblePickupListProps {
    onClose: () => void;
}

export function BubblePickupList({ onClose }: BubblePickupListProps) {
    const {
        careLogs, addCareLog,
        careTaskDefs,
        noticeDefs, noticeLogs, setNoticeLogs,
        observations, addObservation,
        inventory, setInventory,
        activeCatId, cats,
        settings, isDemo
    } = useAppState();

    const currentHour = new Date().getHours();
    const today = useMemo(() => getToday(settings.dayStartHour), [settings.dayStartHour]);

    // --- Helper Logic (Copied/Simplified from CheckSection) ---

    // 1. Care Items
    const careItems: BubbleItem[] = useMemo(() => {
        const items: BubbleItem[] = [];
        const slotOrder = ['morning', 'noon', 'evening', 'night'];
        const currentSlot = (() => {
            if (currentHour >= 5 && currentHour < 11) return 'morning';
            if (currentHour >= 11 && currentHour < 15) return 'noon';
            if (currentHour >= 15 && currentHour < 20) return 'evening';
            return 'night';
        })();
        const currentSlotIndex = slotOrder.indexOf(currentSlot);

        careTaskDefs
            .filter(def => def.enabled !== false)
            .filter(def => !def.perCat || (def.targetCatIds?.includes(activeCatId) ?? true))
            .forEach(def => {
                const slots = def.mealSlots || (def.frequency === 'twice-daily' ? ['morning', 'evening'] : []);

                // Non-slot tasks
                if (slots.length === 0) {
                    const isDone = careLogs.some(log => log.type === def.id && (!def.perCat || log.cat_id === activeCatId));
                    if (!isDone) {
                        items.push({
                            id: def.id,
                            label: def.title,
                            icon: def.icon ? React.createElement(getIcon(def.icon), { className: "w-5 h-5" }) : <Heart className="w-5 h-5" />,
                            colorClass: "bg-rose-500/80 hover:bg-rose-500",
                            onAction: async () => {
                                await addCareLog(def.id, def.perCat ? activeCatId : undefined);
                                toast.success(`${def.title} 完了`);
                            }
                        });
                    }
                    return;
                }

                // Slot tasks
                for (const slot of slots) {
                    if (slotOrder.indexOf(slot) > currentSlotIndex) continue; // Future slots skip
                    const type = `${def.id}:${slot}`;
                    const isDone = careLogs.some(log => log.type === type && (!def.perCat || log.cat_id === activeCatId));
                    if (!isDone) {
                        const slotLabel = slot === 'morning' ? '朝' : slot === 'noon' ? '昼' : slot === 'evening' ? '夕' : '夜';
                        items.push({
                            id: type,
                            label: def.title,
                            subLabel: slotLabel,
                            icon: def.icon ? React.createElement(getIcon(def.icon), { className: "w-5 h-5" }) : <Heart className="w-5 h-5" />,
                            colorClass: "bg-orange-500/80 hover:bg-orange-500",
                            onAction: async () => {
                                await addCareLog(type, def.perCat ? activeCatId : undefined);
                                toast.success(`${def.title} 完了`);
                            }
                        });
                        break; // Only show first pending slot
                    }
                }
            });
        return items;
    }, [careTaskDefs, careLogs, addCareLog, activeCatId, currentHour]);

    // 2. Observations (Abnormal)
    const obsItems: BubbleItem[] = useMemo(() => {
        const activeCat = cats.find(c => c.id === activeCatId);
        if (!activeCat) return [];
        const catLogs = noticeLogs[activeCatId] || {};

        return noticeDefs
            .filter(n => n.enabled !== false && n.kind === 'notice')
            .filter(notice => {
                const obs = observations.find(o => o.cat_id === activeCatId && o.type === notice.id);
                // In demo, show if log matches. In real, show if observed value is abnormal.
                // For simplicity, existing logic seemed to filter for abnormal.
                // Let's trust the filter:
                if (isDemo) {
                    const log = catLogs[notice.id];
                    return log?.at?.startsWith(today) && log?.done && (log?.value?.startsWith('ちょっと違う') || log?.value === '注意');
                }
                return obs && (obs.value?.startsWith('ちょっと違う') || obs.value === '注意');
            })
            .map(notice => ({
                id: notice.id,
                label: notice.alertLabel || notice.title,
                subLabel: activeCat.name,
                icon: <Cat className="w-6 h-6" />,
                colorClass: "bg-gradient-to-br from-orange-500 to-amber-600", // Unified Orange Theme
                onAction: async () => {
                    if (isDemo) {
                        toast.success("確認なしにしました (Demo)");
                    } else {
                        await addObservation(activeCatId, notice.id, 'いつも通り');
                        toast.success("確認完了");
                    }
                }
            }));
    }, [activeCatId, noticeDefs, noticeLogs, observations, isDemo, cats, today, addObservation]);

    // Override colors for CareItems to be Orange too, matching the request
    const unifiedCareItems = careItems.map(item => ({
        ...item,
        colorClass: "bg-gradient-to-br from-orange-500 to-amber-600"
    }));

    const allItems = [...unifiedCareItems, ...obsItems];

    // Layout
    return (
        <div className="fixed inset-x-4 bottom-56 z-40 flex flex-col items-center pointer-events-none">
            {/* Container - removed dark glass background to match floating feel or keep it subtle */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-sm pointer-events-auto relative"
            >
                {/* Header */}
                <div className="flex items-baseline justify-between mb-4 px-2">
                    <h2 className="text-white text-3xl font-serif font-bold tracking-wide drop-shadow-md">
                        {cats.find(c => c.id === activeCatId)?.name || ''}のやること
                    </h2>
                    <span className="text-white/80 text-[10px] font-bold opacity-80">未完了のタスク</span>
                </div>

                {/* Grid List */}
                <div className="space-y-3 pb-12">
                    <AnimatePresence mode="popLayout">
                        {allItems.length === 0 ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="flex flex-col items-center justify-center py-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10"
                            >
                                <Check className="w-10 h-10 text-emerald-400 mb-3 opacity-80" />
                                <p className="text-lg font-bold text-white/90">完了</p>
                                <p className="text-[10px] text-white/50">すべて完了しました</p>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {allItems.map((item, index) => (
                                    <motion.button
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={(e) => { e.stopPropagation(); item.onAction(); }}
                                        className={cn(
                                            "relative w-full rounded-2xl p-4 flex items-center gap-4 overflow-hidden shadow-lg group",
                                            item.colorClass
                                        )}
                                    >
                                        {/* Icon Circle */}
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 backdrop-blur-sm border border-white/10">
                                            {item.icon}
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-[10px] text-white/90 uppercase tracking-wider font-bold mb-0.5 opacity-80">
                                                {item.subLabel || 'タスク'}
                                            </p>
                                            <p className="text-xl font-bold text-white font-sans tracking-wide drop-shadow-sm truncate">
                                                {item.label}
                                            </p>
                                        </div>

                                        {/* Large Check Circle (Action) */}
                                        <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center group-hover:bg-white/20 group-hover:border-white/50 transition-all">
                                            <Check className="w-5 h-5 text-white opacity-80 group-hover:opacity-100" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}


