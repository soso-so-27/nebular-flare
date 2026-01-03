"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Cat as CatIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw, Settings, Edit, Cake, Scale, Cpu, FileText } from "lucide-react";
import { CatObservationList } from "./cat-observation-list";
import { getCatchUpItems, CatchUpItem } from "@/lib/utils-catchup";
import { CatchUpStack } from "./catch-up-stack";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { haptics } from "@/lib/haptics";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { WeightChart } from "./weight-chart";
import { CatEditModal } from "./cat-edit-modal";

interface CatScreenProps {
    externalSwipeMode?: boolean;
    onSwipeModeChange?: (show: boolean) => void;
}

export function CatScreen({ externalSwipeMode = false, onSwipeModeChange }: CatScreenProps) {
    const {
        cats,
        activeCatId,
        setActiveCatId,
        tasks,
        noticeLogs,
        setNoticeLogs,
        inventory,
        lastSeenAt,
        settings,
        careTaskDefs,
        careLogs,
        noticeDefs,
        observations,
        isDemo,
        addObservation,
        acknowledgeObservation,
        addCatWeightRecord
    } = useAppState();
    const selectedCat = cats.find(c => c.id === activeCatId) || cats[0];

    const [internalShowSwipeMode, setInternalShowSwipeMode] = useState(false);
    const [progressIndex, setProgressIndex] = useState(0);
    const [lastAction, setLastAction] = useState<{ item: CatchUpItem; action: 'done' | 'later'; prevIndex: number } | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

    // Get catchup items and filter for cat-related types (notice)
    // Defer heavy calculation to unblock navigation
    const [catchupItems, setCatchupItems] = useState<CatchUpItem[]>([]);

    useEffect(() => {
        // Run in next tick to allow immediate render
        const timer = setTimeout(() => {
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
                observations,
            });
            setCatchupItems(result.allItems.filter(item => item.type === 'notice' || item.type === 'unrecorded'));
        }, 10);
        return () => clearTimeout(timer);
    }, [tasks, noticeLogs, inventory, lastSeenAt, settings, cats, careTaskDefs, careLogs, noticeDefs, observations]);

    // FAB will trigger swipe mode - removed auto-show

    async function handleCatchupAction(item: CatchUpItem, action: 'done' | 'later', value?: string) {
        if (action === 'done' && item.catId) {
            haptics.success();
            if (item.type === 'notice') {
                if (isDemo) {
                    setNoticeLogs(prev => ({
                        ...prev,
                        [item.catId!]: {
                            ...prev[item.catId!],
                            [item.id]: {
                                ...item.payload,
                                done: true,
                                later: false
                            }
                        }
                    }));
                } else {
                    // Supabase mode: Dismissing an abnormal observation
                    await acknowledgeObservation(item.id);
                    // toast.info("確認しました");
                }
            } else if (item.type === 'unrecorded') {
                // Use provided value or default to "いつも通り"
                const noticeId = item.payload?.noticeId;
                const recordValue = value || 'いつも通り';

                if (noticeId) {
                    if (isDemo) {
                        setNoticeLogs(prev => ({
                            ...prev,
                            [item.catId!]: {
                                ...prev[item.catId!],
                                [noticeId]: {
                                    id: `${item.catId}_${noticeId}_${Date.now()}`,
                                    catId: item.catId,
                                    noticeId: noticeId,
                                    value: recordValue,
                                    at: new Date().toISOString(),
                                    done: true,
                                    later: false
                                }
                            }
                        }));
                    } else {
                        // Supabase mode: Record observation
                        await addObservation(item.catId, noticeId, recordValue);
                        toast.success("記録しました");
                    }
                }
            }
        } else {
            // Silently skip
        }
    }

    function handleCatChange(direction: 'up' | 'down') {
        const currentIndex = cats.findIndex(c => c.id === activeCatId);
        let nextIndex: number;
        if (direction === 'up') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : cats.length - 1;
        } else {
            nextIndex = currentIndex < cats.length - 1 ? currentIndex + 1 : 0;
        }
        const nextCat = cats[nextIndex];
        if (nextCat) {
            setActiveCatId(nextCat.id);
        }
    }

    // Helper for Age Text
    const getAgeText = () => {
        if (!selectedCat?.birthday) return selectedCat?.age;
        const birthDate = new Date(selectedCat.birthday);
        const now = new Date();
        const years = differenceInYears(now, birthDate);
        const months = differenceInMonths(now, birthDate) % 12;

        if (years === 0) {
            return `${months}ヶ月`;
        } else if (months === 0) {
            return `${years}歳`;
        } else {
            return `${years}歳${months}ヶ月`;
        }
    };

    if (cats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <CatIcon className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">まだ猫がいません</h2>
                <p className="text-sm text-slate-500 mb-4">設定から猫を追加してください</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-background">
            <CatEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                catId={activeCatId}
            />

            {/* Main Content */}
            <div className={cn(
                "pb-24 transition-all duration-500",
                showSwipeMode && catchupItems.length > 0 && "blur-xl scale-[0.98] pointer-events-none opacity-50"
            )}>

                {selectedCat && (
                    <div className="relative mb-8">
                        {/* Immersive Hero Header - Seamless Edge-to-Edge */}
                        <div className="relative h-[280px] w-full overflow-hidden z-0">
                            {(selectedCat.avatar?.startsWith('http') || selectedCat.avatar?.startsWith('/')) ? (
                                <img src={selectedCat.avatar} alt={selectedCat.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-8xl">
                                    {selectedCat.avatar || "🐈"}
                                </div>
                            )}
                            {/* Gradient Overlay - Top and Bottom for seamless integration */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

                            {/* Header Controls (Floating) */}
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
                                >
                                    <Edit className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Cat Switcher (Floating Top Left) */}
                            {cats.length > 1 && (
                                <div className="absolute top-4 left-4 z-10 flex gap-2 overflow-x-auto scrollbar-hide max-w-[60%] py-1 px-1">
                                    {cats.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCatId(cat.id)}
                                            className={cn(
                                                "w-10 h-10 rounded-full border-2 overflow-hidden transition-all flex-shrink-0 shadow-lg",
                                                activeCatId === cat.id
                                                    ? "border-amber-500 scale-110 ring-2 ring-amber-500/50 z-10"
                                                    : "border-white/50 opacity-70 hover:opacity-100 hover:scale-105"
                                            )}
                                        >
                                            {(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                                                <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xs">{cat.avatar || "🐈"}</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Info Overlay (Bottom Left) */}
                            <div className="absolute bottom-0 left-0 w-full p-6 pb-8 flex items-end justify-between">
                                <div>
                                    <motion.h1
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-4xl font-extrabold text-white drop-shadow-md mb-2 tracking-tight"
                                    >
                                        {selectedCat.name}
                                    </motion.h1>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="flex items-center gap-2 text-white/95 font-medium text-sm"
                                    >
                                        <span className="bg-white/15 backdrop-blur-lg px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                                            {selectedCat.sex === 'オス' ? '♂ 男の子' : selectedCat.sex === 'メス' ? '♀ 女の子' : '性別不明'}
                                        </span>
                                        <span className="bg-white/15 backdrop-blur-lg px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                                            {getAgeText()}
                                        </span>
                                        {selectedCat.weight && (
                                            <span className="bg-white/15 backdrop-blur-lg px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                                                {selectedCat.weight}kg
                                            </span>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Swipe Badge (New Items) */}
                                {catchupItems.length > 0 && !showSwipeMode && (
                                    <button
                                        onClick={() => setShowSwipeMode(true)}
                                        className="flex flex-col items-center justify-center bg-rose-500 rounded-2xl w-14 h-14 shadow-lg shadow-rose-500/30 animate-pulse border-2 border-white/20 active:scale-95 transition-transform"
                                    >
                                        <span className="text-xl font-bold text-white leading-none">{catchupItems.length}</span>
                                        <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider">未確認</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Dashboard Content - Single Scroll View - NO TABS */}
                <div className="px-4 space-y-6">

                    {/* 1. Observation List (Top Priority) */}
                    <div className="space-y-2">
                        <CatObservationList />
                    </div>

                    {/* 2. Weight Chart */}
                    <div className="pt-6">
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">健康管理</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card p-5 rounded-2xl shadow-md border border-border"
                        >
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground text-base">体重推移</h3>
                                    <p className="text-xs text-muted-foreground">健康管理の基本です</p>
                                </div>
                            </div>
                            <WeightChart
                                catId={activeCatId}
                                currentWeight={selectedCat?.weight || undefined}
                                weightHistory={selectedCat?.weightHistory || []}
                                onAddWeight={(w, n) => addCatWeightRecord(activeCatId, w, n)}
                                isDemo={isDemo}
                            />
                        </motion.div>
                    </div>

                    {/* 3. Detailed Profile Info */}
                    <div className="pt-4">
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">プロフィール</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-1 gap-3"
                        >
                            <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Cake className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-0.5">誕生日</div>
                                        <div className="text-base font-bold text-foreground">
                                            {selectedCat?.birthday ? format(new Date(selectedCat.birthday), 'yyyy.MM.dd') : '未設定'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedCat?.microchip_id && (
                                <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground mb-0.5">マイクロチップID</div>
                                            <div className="text-base font-mono font-bold text-foreground tracking-wide">
                                                {selectedCat.microchip_id}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedCat?.notes && (
                                <div className="bg-card p-4 rounded-2xl shadow-sm border border-border">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-muted rounded-lg text-muted-foreground">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-foreground text-sm">メモ</h3>
                                    </div>
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/50 p-3 rounded-xl">
                                        {selectedCat.notes}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Swipe Card Overlay - Slack style */}
            <AnimatePresence>
                {showSwipeMode && catchupItems.length > 0 && progressIndex < catchupItems.length && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 overflow-hidden overscroll-none"
                        style={{ touchAction: 'none' }}
                    >
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-900 to-amber-900/20 pointer-events-none" />

                        {/* Header: Back + count + Cat switch + Undo */}
                        <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-4">
                            <button
                                onClick={() => setShowSwipeMode(false)}
                                className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white bg-white/5 rounded-full backdrop-blur-md transition-all active:scale-95"
                            >
                                <ChevronDown className="h-6 w-6" />
                            </button>
                            <div className="flex flex-col items-center">
                                <span className="text-slate-400 text-xs font-bold tracking-widest mb-0.5">確認中</span>
                                <span className="text-white font-bold text-lg">
                                    <span className="text-amber-500 text-2xl">{catchupItems.length - progressIndex}</span>
                                    <span className="opacity-50 mx-1">/</span>
                                    <span className="opacity-50">{catchupItems.length}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Undo button */}
                                <button
                                    onClick={() => {
                                        if (lastAction) {
                                            setProgressIndex(lastAction.prevIndex);
                                            setLastAction(null);
                                        }
                                    }}
                                    className={cn(
                                        "w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-95",
                                        lastAction ? "bg-white/10 text-white hover:bg-white/20" : "bg-white/5 text-white/20"
                                    )}
                                    disabled={!lastAction}
                                >
                                    <RotateCcw className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Card area */}
                        <div className="flex-1 px-4 pb-8 relative z-10" style={{ touchAction: 'none' }}>
                            <div className="w-full h-full relative" style={{ touchAction: 'none' }}>
                                <CatchUpStack
                                    items={catchupItems}
                                    cats={cats}
                                    onAction={(item, action, value) => {
                                        // Save for undo
                                        setLastAction({ item, action, prevIndex: progressIndex });
                                        handleCatchupAction(item, action, value);
                                    }}
                                    onIndexChange={setProgressIndex}
                                    onVerticalSwipe={handleCatChange}
                                />
                            </div>
                        </div>

                        {/* Footer Spacer (buttons are inside stack now or irrelevant if using gestures) */}
                        {/* Adding subtle instructional text */}
                        <div className="pb-10 pt-2 text-center relative z-10">
                            <p className="text-white/30 text-xs font-medium tracking-wider">左右にスワイプ</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Completion Screen */}
            {showSwipeMode && catchupItems.length > 0 && progressIndex >= catchupItems.length && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="text-8xl mb-8"
                    >
                        🎉
                    </motion.div>
                    <h3 className="text-3xl font-bold text-white mb-2">完了！</h3>
                    <p className="text-slate-400 mb-10 text-lg">今日の確認はすべて終わりました。</p>
                    <button
                        onClick={() => setShowSwipeMode(false)}
                        className="px-10 py-4 rounded-full bg-white text-slate-900 font-bold text-lg hover:bg-slate-200 active:scale-95 transition-all shadow-xl shadow-white/10"
                    >
                        閉じる
                    </button>
                </motion.div>
            )}
        </div>
    );
}
