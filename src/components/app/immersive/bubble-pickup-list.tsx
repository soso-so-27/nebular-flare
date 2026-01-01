
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
                if (isDemo) {
                    const log = catLogs[notice.id];
                    return log?.at?.startsWith(today) && log?.done && (log?.value?.startsWith('ちょっと違う') || log?.value === '注意');
                } else {
                    const obs = observations.find(o => o.cat_id === activeCatId && o.type === notice.id);
                    return obs && (obs.value?.startsWith('ちょっと違う') || obs.value === '注意');
                }
            })
            .map(notice => ({
                id: notice.id,
                label: notice.alertLabel || notice.title,
                subLabel: activeCat.name,
                icon: <Cat className="w-5 h-5" />,
                colorClass: "bg-emerald-500/80 hover:bg-emerald-500",
                onAction: async () => {
                    if (isDemo) {
                        // Simplify update logic for demo
                        setNoticeLogs(prev => ({ ...prev })); // Trigger re-render by effect usually, but here we assume toast is enough visual feedback for now or simpler logic needed? 
                        // For simplicity in this specialized view, just toast. Real app logic is in CheckSection.
                        toast.success("確認なしにしました (Demo)");
                    } else {
                        await addObservation(activeCatId, notice.id, 'いつも通り');
                        toast.success("確認完了");
                    }
                }
            }));
    }, [activeCatId, noticeDefs, noticeLogs, observations, isDemo, cats, today, addObservation, setNoticeLogs]);

    const realItems = [...careItems, ...obsItems];
    // Show demo items if empty to visualize the list layout
    const allItems = realItems.length > 0 ? realItems : [
        {
            id: "demo-1",
            label: "朝のごはん",
            subLabel: "IMPORTANT",
            icon: <Heart className="w-5 h-5" />,
            colorClass: "bg-rose-500/90 hover:bg-rose-500",
            onAction: () => toast.success("これはサンプルタスクです")
        },
        {
            id: "demo-2",
            label: "トイレの掃除",
            subLabel: "DAILY",
            icon: <Check className="w-5 h-5" />,
            colorClass: "bg-emerald-500/90 hover:bg-emerald-500",
            onAction: () => toast.success("これはサンプルタスクです")
        },
        {
            id: "demo-3",
            label: "お水の交換",
            subLabel: "DAILY",
            icon: <Cat className="w-5 h-5" />,
            colorClass: "bg-blue-500/90 hover:bg-blue-500",
            onAction: () => toast.success("これはサンプルタスクです")
        }
    ];

    const isOdd = allItems.length % 2 !== 0;

    return (
        <div className="fixed inset-x-4 bottom-64 z-40 flex flex-col items-center pointer-events-none">
            {/* Editorial Glass Pane */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 pointer-events-auto shadow-2xl relative overflow-hidden"
            >
                {/* Using a subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-baseline justify-between mb-6 relative z-10 border-b border-white/10 pb-4">
                    <h2 className="text-white text-3xl font-serif italic tracking-wide drop-shadow-md">Today's Pickup</h2>
                    <span className="text-white/60 text-[10px] uppercase tracking-[0.2em] font-medium">Priority Tasks</span>
                </div>

                {/* Grid List with Fade Mask and Hidden Scrollbar */}
                <div className="relative z-10 max-h-[50vh] overflow-y-auto pb-12 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]">
                    <AnimatePresence mode="popLayout">
                        {allItems.length === 0 ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="flex flex-col items-center justify-center py-12 text-white/80"
                            >
                                <Check className="w-12 h-12 text-emerald-400 mb-4 opacity-80" />
                                <p className="text-xl font-serif italic">All Clear</p>
                                <p className="text-xs tracking-widest uppercase opacity-60 mt-2">Have a good rest</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {allItems.map((item, index) => {
                                    const isHero = isOdd && index === 0;
                                    return (
                                        <motion.button
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={(e) => { e.stopPropagation(); item.onAction(); }}
                                            className={cn(
                                                "relative rounded-xl p-4 transition-all hover:brightness-110 active:brightness-90 group/item overflow-hidden",
                                                isHero ? "col-span-2 aspect-[3/1] flex flex-row items-center gap-4" : "col-span-1 aspect-[4/3] flex flex-col justify-between items-start",
                                                item.colorClass.replace('/90', '/60'), // More transparent for glass look
                                                "backdrop-blur-md border border-white/10 shadow-lg"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                                            {/* Icon */}
                                            <div className={cn(
                                                "rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0",
                                                isHero ? "w-12 h-12" : "w-8 h-8"
                                            )}>
                                                {item.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 relative z-10 w-full text-left">
                                                {/* Hero Layout */}
                                                {isHero ? (
                                                    <div className="flex justify-between items-center w-full">
                                                        <div>
                                                            <p className="text-[9px] text-white/80 uppercase tracking-widest mb-1 font-medium">{item.subLabel || 'PRIORITY'}</p>
                                                            <p className="text-xl font-bold text-white leading-tight font-serif tracking-wide drop-shadow-sm line-clamp-1">{item.label}</p>
                                                        </div>
                                                        <div className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center opacity-30 group-hover/item:opacity-100 transition-opacity">
                                                            <Check className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Standard Layout
                                                    <>
                                                        <div className="absolute top-4 right-4 w-5 h-5 rounded-full border border-white/40 flex items-center justify-center opacity-30 group-hover/item:opacity-100 transition-opacity">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] text-white/80 uppercase tracking-widest mb-1 font-medium">{item.subLabel || 'TASK'}</p>
                                                            <p className="text-sm font-bold text-white leading-tight font-serif tracking-wide drop-shadow-sm line-clamp-2">{item.label}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}


