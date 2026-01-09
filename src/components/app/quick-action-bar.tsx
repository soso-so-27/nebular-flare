"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { getIcon } from "@/lib/icon-utils";

export function QuickActionBar() {
    const {
        cats,
        activeCatId,
        setActiveCatId,
        careTaskDefs,
        addCareLog,
        careLogs,
        isDemo,
        settings
    } = useAppState();

    const [showCatPicker, setShowCatPicker] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);

    const activeCat = cats.find(c => c.id === activeCatId);
    const { dayStartHour } = settings;

    // Calculate "today" based on custom day start time
    const today = React.useMemo(() => {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < dayStartHour) {
            now.setDate(now.getDate() - 1);
        }
        return now.toISOString().split('T')[0];
    }, [dayStartHour]);

    // Get enabled quick action tasks (top 4 most used)
    const quickActions = careTaskDefs
        .filter(t => t.enabled)
        .slice(0, 4);

    // Check if action is already done today
    const isDoneToday = (taskId: string) => {
        return careLogs.some(log => {
            const logDate = log.done_at?.split('T')[0];
            return log.type === taskId && logDate === today;
        });
    };

    const handleQuickAction = async (taskId: string) => {
        if (cats.length === 0) {
            toast.error("猫を先に登録してください");
            return;
        }

        if (cats.length > 1) {
            // Show cat picker for multi-cat households
            setPendingAction(taskId);
            setShowCatPicker(true);
        } else {
            // Single cat - record immediately
            await recordCare(taskId, cats[0].id);
        }
    };

    const recordCare = async (taskId: string, catId: string) => {
        const task = careTaskDefs.find(t => t.id === taskId);
        const catName = cats.find(c => c.id === catId)?.name || "";

        if (isDemo) {
            toast.success(`${task?.title || taskId} を記録しました！`, {
                description: catName ? `${catName}` : undefined
            });
        } else {
            const result = await addCareLog(taskId, catId);
            if (result?.error) {
                toast.error("記録に失敗しました");
            } else {
                toast.success(`${task?.title || taskId} を記録しました！`, {
                    description: catName ? `${catName}` : undefined
                });
            }
        }

        setShowCatPicker(false);
        setPendingAction(null);
    };

    if (quickActions.length === 0) return null;

    return (
        <>
            {/* Quick Action Bar */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {quickActions.map((task) => {
                    const IconComponent = getIcon(task.icon);
                    const done = isDoneToday(task.id);

                    return (
                        <button
                            key={task.id}
                            onClick={() => !done && handleQuickAction(task.id)}
                            disabled={done}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-95",
                                done
                                    ? "bg-[#E5F0EA] dark:bg-[#2D4637]/30 text-[#5A8C6E]"
                                    : "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                            )}
                        >
                            {done ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <IconComponent className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium whitespace-nowrap">
                                {task.title}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Cat Picker Modal */}
            <AnimatePresence>
                {showCatPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
                        onClick={() => setShowCatPicker(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-md p-6 pb-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    どの猫？
                                </h3>
                                <button
                                    onClick={() => setShowCatPicker(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {cats.map((cat) => {
                                    const hasImageAvatar = cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/');

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => pendingAction && recordCare(pendingAction, cat.id)}
                                            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                {hasImageAvatar ? (
                                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl">{cat.avatar || "🐈"}</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {cat.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* All cats option */}
                            <button
                                onClick={async () => {
                                    if (pendingAction) {
                                        for (const cat of cats) {
                                            await recordCare(pendingAction, cat.id);
                                        }
                                    }
                                }}
                                className="w-full mt-4 py-3 rounded-xl bg-[#7CAA8E] text-white font-bold hover:bg-[#6B9B7A] active:scale-95 transition-all"
                            >
                                全員に記録
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
