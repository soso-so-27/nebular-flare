"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Sun, Moon, Trash2, Activity, Heart, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { HouseholdCareList } from "./household-care-list";
import { getCatchUpItems, CatchUpItem } from "@/lib/utils-catchup";
import { CatchUpStack } from "./catch-up-stack";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { haptics } from "@/lib/haptics";
import { sounds } from "@/lib/sounds";

const careTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    breakfast: { icon: <Sun className="h-4 w-4" />, label: "朝ごはん", color: "text-[#C08A70] bg-[#E8B4A0]/20" },
    dinner: { icon: <Moon className="h-4 w-4" />, label: "夜ごはん", color: "text-[#8B7AAF] bg-[#B8A6D9]/20" },
    toilet_clean: { icon: <Trash2 className="h-4 w-4" />, label: "トイレ掃除", color: "text-green-500 bg-green-100" },
};

interface CareScreenProps {
    externalSwipeMode?: boolean;
    onSwipeModeChange?: (show: boolean) => void;
    onClose?: () => void;
}

export function CareScreen({ externalSwipeMode = false, onSwipeModeChange, onClose }: CareScreenProps) {
    const {
        careLogs,
        cats,
        tasks,
        setTasks,
        noticeLogs,
        inventory,
        setInventory,
        lastSeenAt,
        settings,
        careTaskDefs,
        noticeDefs
    } = useAppState();

    const [internalShowSwipeMode, setInternalShowSwipeMode] = useState(false);
    const [progressIndex, setProgressIndex] = useState(0);
    const [lastAction, setLastAction] = useState<{ item: CatchUpItem; action: 'done' | 'later'; prevIndex: number } | null>(null);

    // Combine external and internal swipe mode
    const showSwipeMode = externalSwipeMode || internalShowSwipeMode;
    const setShowSwipeMode = (show: boolean) => {
        setInternalShowSwipeMode(show);
        onSwipeModeChange?.(show);
    };

    // Lock body scroll when swipe mode is active
    useEffect(() => {
        if (showSwipeMode) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
        };
    }, [showSwipeMode]);

    // Get catchup items and filter for care-related types (task, inventory)
    const catchupItems = useMemo(() => {
        const result = getCatchUpItems({
            tasks,
            noticeLogs,
            inventory,
            lastSeenAt,
            settings,
            cats,
            careTaskDefs,
            careLogs,
            noticeDefs,
        });
        return result.allItems.filter(item => item.type === 'task' || item.type === 'inventory');
    }, [tasks, noticeLogs, inventory, lastSeenAt, settings, cats, careTaskDefs, careLogs, noticeDefs]);

    // FAB will trigger swipe mode - removed auto-show

    async function handleCatchupAction(item: CatchUpItem, action: 'done' | 'later') {
        if (action === 'done') {
            // Play effects (Non-blocking / Safe)
            try {
                haptics.success();
                sounds.success().catch(e => console.warn(e));
            } catch (e) {
                console.warn('Feedback failed:', e);
            }

            if (item.type === 'task') {
                setTasks(prev => prev.map(t =>
                    t.id === item.id ? { ...t, done: true, doneAt: new Date().toISOString() } : t
                ));
            } else if (item.type === 'inventory') {
                setInventory(prev => prev.map(it =>
                    it.id === item.id ? { ...it, last: new Date().toISOString().split('T')[0], range: [30, 45] } : it
                ));
            }

            // Show feedback toast
            toast.success('記録・通知しました');
        } else {
            // Silently skip
        }
    }

    // Sort logs by date, newest first
    const sortedLogs = [...careLogs].sort((a, b) =>
        new Date(b.done_at || 0).getTime() - new Date(a.done_at || 0).getTime()
    );

    // Group logs by date
    const groupedLogs = sortedLogs.reduce((groups, log) => {
        const doneAt = log.done_at;
        if (!doneAt) return groups;

        const date = new Date(doneAt).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
        return groups;
    }, {} as Record<string, typeof careLogs>);

    const getCatName = (catId: string | null) => {
        if (!catId) return null;
        const cat = cats.find(c => c.id === catId);
        return cat ? cat.name : null;
    };

    return (
        <div className="relative min-h-screen">
            {/* Main Content */}
            <div className={cn(
                "space-y-4 pb-20 transition-all duration-500",
                showSwipeMode && catchupItems.length > 0 && "blur-xl scale-[0.98] pointer-events-none opacity-50"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between pt-4 px-2">
                    <div className="flex items-center gap-2">
                        {onClose && (
                            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
                                <ChevronLeft className="h-6 w-6 text-slate-800 dark:text-white" />
                            </button>
                        )}
                        <Heart className="h-5 w-5 text-rose-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">お世話・活動記録</h2>
                    </div>
                    {catchupItems.length > 0 && !showSwipeMode && (
                        <button
                            onClick={() => setShowSwipeMode(true)}
                            className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
                        >
                            まとめて入力 ({catchupItems.length})
                        </button>
                    )}
                </div>

                {/* Today's Care - Interactive */}
                <HouseholdCareList />

                {/* Care History Timeline */}
                {careLogs.length > 0 && (
                    <div className="space-y-3 mt-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                            お世話履歴
                        </h3>
                        {Object.entries(groupedLogs).map(([date, logs]) => (
                            <div key={date} className="space-y-2">
                                <p className="text-xs text-slate-400 px-1">{date}</p>
                                <Card className="rounded-2xl shadow-sm border border-white/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100">
                                            {(logs as typeof careLogs).map((log) => {
                                                const config = careTypeConfig[log.type] || {
                                                    icon: <Activity className="h-4 w-4" />,
                                                    label: log.type,
                                                    color: "text-slate-500 bg-slate-100"
                                                };
                                                const catName = getCatName(log.cat_id ?? null);
                                                const doneAt = log.done_at;

                                                return (
                                                    <div key={log.id} className="flex items-center gap-3 p-3">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.color}`}>
                                                            {config.icon}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {config.label}
                                                                {catName && <span className="text-slate-400 font-normal"> - {catName}</span>}
                                                            </p>
                                                            {doneAt && (
                                                                <p className="text-xs text-slate-400">
                                                                    {formatDistanceToNow(new Date(doneAt), { addSuffix: true, locale: ja })}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Swipe Card Overlay - Slack style */}
            <AnimatePresence>
                {showSwipeMode && catchupItems.length > 0 && progressIndex < catchupItems.length && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-br from-emerald-600 to-teal-700 overflow-hidden overscroll-none"
                        style={{ touchAction: 'none' }}
                    >
                        {/* Header: Back + count + Undo */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-2">
                            <button
                                onClick={() => setShowSwipeMode(false)}
                                className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <span className="text-white font-medium">
                                残り {catchupItems.length - progressIndex} 件
                            </span>
                            {/* Undo button */}
                            <button
                                onClick={() => {
                                    if (lastAction) {
                                        setProgressIndex(lastAction.prevIndex);
                                        setLastAction(null);
                                    }
                                }}
                                className={cn(
                                    "w-10 h-10 flex items-center justify-center transition-all",
                                    lastAction ? "text-white/80 hover:text-white" : "text-white/20"
                                )}
                                disabled={!lastAction}
                            >
                                <RotateCcw className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Card area with swipe direction hints */}
                        <div className="flex-1 px-4 pb-4 relative" style={{ touchAction: 'none' }}>
                            {/* Left swipe indicator */}
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-white/30 pointer-events-none">
                                <ChevronLeft className="h-6 w-6" />
                                <span className="text-xs font-medium">あとで</span>
                            </div>

                            {/* Right swipe indicator */}
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-white/30 pointer-events-none">
                                <ChevronRight className="h-6 w-6" />
                                <span className="text-xs font-medium">完了</span>
                            </div>

                            <div className="w-full h-full relative" style={{ touchAction: 'none' }}>
                                <CatchUpStack
                                    items={catchupItems}
                                    cats={cats}
                                    onAction={(item, action) => {
                                        setLastAction({ item, action, prevIndex: progressIndex });
                                        handleCatchupAction(item, action);
                                    }}
                                    onIndexChange={setProgressIndex}
                                />
                            </div>
                        </div>

                        {/* Footer: Buttons OUTSIDE the card (Slack style) */}
                        <div className="px-4 pb-6 pt-2 flex gap-3">
                            <button
                                onClick={() => {
                                    const currentItem = catchupItems[progressIndex];
                                    if (currentItem) {
                                        setLastAction({ item: currentItem, action: 'later', prevIndex: progressIndex });
                                        handleCatchupAction(currentItem, 'later');
                                    }
                                }}
                                className="flex-1 py-4 px-6 rounded-full border-2 border-white/30 text-white font-medium text-base hover:bg-white/10 active:scale-95 transition-all"
                            >
                                あとで
                            </button>
                            <button
                                onClick={() => {
                                    const currentItem = catchupItems[progressIndex];
                                    if (currentItem) {
                                        setLastAction({ item: currentItem, action: 'done', prevIndex: progressIndex });
                                        handleCatchupAction(currentItem, 'done');
                                    }
                                }}
                                className="flex-1 py-4 px-6 rounded-full bg-white text-emerald-600 font-medium text-base hover:bg-white/90 active:scale-95 transition-all"
                            >
                                完了
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Completion screen */}
            {showSwipeMode && catchupItems.length > 0 && progressIndex >= catchupItems.length && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="text-6xl mb-4"
                    >
                        🎉
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">完了！</h3>
                    <p className="text-white/70 mb-8">すべてのタスクが完了しました</p>
                    <button
                        onClick={() => setShowSwipeMode(false)}
                        className="px-8 py-3 rounded-full bg-white text-emerald-600 font-medium hover:bg-white/90 active:scale-95 transition-all"
                    >
                        閉じる
                    </button>
                </motion.div>
            )}
        </div>
    );
}
