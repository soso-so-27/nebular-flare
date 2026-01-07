
"use client";

import React, { useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Heart, Cat, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getToday } from "@/lib/date-utils";
import { getIcon } from "@/lib/icon-utils";
import { motion, AnimatePresence } from "framer-motion";

import { getCatchUpItems } from "@/lib/utils-catchup";

interface BubbleItem {
    id: string;
    label: string;
    subLabel?: string | null;
    icon: React.ReactNode;
    colorClass: string;
    onAction: () => void | Promise<void>;
}

interface BubblePickupListProps {
    onClose: () => void;
}

export function BubblePickupList({ onClose }: BubblePickupListProps) {
    const {
        careLogs, addCareLog,
        careTaskDefs,
        noticeDefs, noticeLogs, setNoticeLogs,
        observations, addObservation, acknowledgeObservation,
        inventory, setInventory, updateInventoryItem,
        activeCatId, cats,
        settings, isDemo
    } = useAppState();

    const currentHour = new Date().getHours();
    const today = useMemo(() => getToday(settings.dayStartHour), [settings.dayStartHour]);

    // --- Unified Logic using getCatchUpItems ---

    // We reuse the same logic as MagicBubble to ensure counts match
    const catchUpData = useMemo(() => {
        const now = new Date();
        // If current hour < dayStartHour, we are in the "previous" date's business day
        const businessDate = new Date(now);
        if (now.getHours() < settings.dayStartHour) {
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
    }, [noticeLogs, inventory, settings, cats, careTaskDefs, careLogs, noticeDefs, observations, settings.dayStartHour]);

    // Map catchUpItems to BubbleItems
    const allItems: BubbleItem[] = useMemo(() => {
        return catchUpData.allItems.map(item => {
            let colorClass = "bg-slate-500";
            let icon = <Check className="w-5 h-5" />;

            const onAction = async () => {
                if (item.type === 'task') {
                    // Care Task
                    if (item.payload) {
                        // Distinguish slot vs normal
                        const defId = item.payload.id;
                        const slot = item.payload.slot;
                        const logType = slot ? `${defId}:${slot}` : defId;

                        // Check Per Cat
                        // If item.catId is present, use it. Else fallback to active or undefined.
                        // But for shared tasks, item.catId might be undefined.
                        // Wait, if it's perCat, getCatchUpItems sets catId.
                        const targetCatId = item.catId || (item.payload.perCat ? activeCatId : undefined);

                        await addCareLog(logType, targetCatId);
                        toast.success(`${item.title} 完了`);
                    }
                } else if (item.type === 'unrecorded' || item.type === 'notice') {
                    // Observation
                    if (item.payload) {
                        // unrecorded: payload = { noticeId, catId, noticeDef }
                        // notice: payload = log object (Supabase row)
                        const nId = item.payload.noticeId || item.payload.type || item.payload.id;

                        if (item.type === 'notice') {
                            // Abnormal observation -> Acknowledge it to remove from list
                            await acknowledgeObservation(item.id);
                            toast.success("確認しました");
                        } else {
                            // Unrecorded
                            await addObservation(item.catId || activeCatId, nId, "いつも通り");
                            toast.success(`${item.title} 記録しました`);
                        }
                    }

                } else if (item.type === 'inventory') {
                    // Purchase action: Update last_bought to today and reset stock level
                    await updateInventoryItem(item.id, {
                        last_bought: today,
                        stockLevel: 'full'
                    });
                    toast.success("購入を記録しました！");
                }
            };

            if (item.type === 'task') {
                colorClass = "bg-rose-500/80 hover:bg-rose-500";
                icon = <Heart className="w-5 h-5" />;
                if (item.icon) icon = React.createElement(getIcon(item.icon), { className: "w-5 h-5" });
            } else if (item.type === 'unrecorded') {
                colorClass = "bg-sky-500/80 hover:bg-sky-500";
                icon = <Cat className="w-5 h-5" />;
                if (item.payload?.noticeDef?.icon) {
                    icon = React.createElement(getIcon(item.payload.noticeDef.icon), { className: "w-5 h-5" });
                }
            } else if (item.type === 'notice') {
                colorClass = "bg-amber-500/80 hover:bg-amber-500";
                icon = <Cat className="w-5 h-5" />;
            } else if (item.type === 'inventory') {
                colorClass = "bg-emerald-500/80 hover:bg-emerald-500";
                icon = <ShoppingCart className="w-5 h-5" />;
            }

            // Swap label and subLabel: make content prominent, question as subLabel
            let displayLabel = item.body;      // Content (e.g., "あめ: 少なめ" or "残り約0日分")
            let displaySubLabel = item.title;  // Question (e.g., "食欲、いつも通り？")

            if (item.type === 'inventory' && item.payload) {
                displayLabel = item.body;           // Days remaining
                displaySubLabel = item.payload.label; // Item name
            }

            return {
                id: item.id,
                label: displayLabel,
                subLabel: displaySubLabel,
                icon,
                colorClass,
                onAction
            };
        });
    }, [catchUpData, addCareLog, addObservation, activeCatId]);

    // Layout
    return (
        // Right-Side Floating Panel (Unified Size & Style with Sidebar)
        <AnimatePresence>
            <div className="fixed right-0 bottom-4 top-4 z-40 flex flex-col items-end w-80 pointer-events-none">
                {/* Unified Glass Panel */}
                <motion.div
                    initial={{ x: '100%', opacity: 0.5, scale: 1 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: '100%', opacity: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="w-full h-full pointer-events-auto bg-black/60 backdrop-blur-xl border-l border-y border-white/10 shadow-2xl rounded-l-[32px] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 pb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center border border-white/10 shadow-lg">
                                <Check className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="block text-base font-bold text-white tracking-tight">Pickup</span>
                                <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">今日やること</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 border border-white/5"
                        >
                            <X className="w-4 h-4 text-white/60" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-hide">
                        <AnimatePresence mode="popLayout">
                            {allItems.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center justify-center py-10 mt-10 text-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                                        <Check className="w-8 h-8 text-emerald-400/80" />
                                    </div>
                                    <p className="text-lg font-bold text-white/90">完了</p>
                                    <p className="text-xs text-white/50 mt-1">今のタスクはありません</p>
                                </motion.div>
                            ) : (
                                <div className="space-y-2">
                                    {allItems.map((item, index) => (
                                        <motion.button
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={(e) => { e.stopPropagation(); item.onAction(); }}
                                            className={cn(
                                                "relative w-full rounded-[20px] p-3 flex items-center gap-3 overflow-hidden shadow-lg group border border-white/5 transition-all text-left",
                                                item.colorClass.replace('/80', '/90'),
                                                "hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            {/* Icon Circle */}
                                            <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white flex-shrink-0 backdrop-blur-sm border border-white/10 shadow-inner [&>svg]:w-5 [&>svg]:h-5">
                                                {item.icon}
                                            </div>

                                            {/* Text Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] text-white/80 uppercase tracking-wider font-bold mb-0.5 opacity-80">
                                                    {item.subLabel || 'タスク'}
                                                </p>
                                                <p className="text-sm font-bold text-white font-sans tracking-wide truncate">
                                                    {item.label}
                                                </p>
                                            </div>

                                            {/* Action Icon */}
                                            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/20 group-hover:border-white/40 transition-all bg-white/5">
                                                <div className="w-4 h-4 rounded-full border-2 border-white/40 group-hover:border-white/80 transition-colors" />
                                            </div>
                                        </motion.button>

                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer (Optional, mostly nice gradient fade or just padding) */}
                    <div className="h-6 shrink-0" />
                </motion.div>
            </div>
        </AnimatePresence>
    );
}


