"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Cat as CatIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw } from "lucide-react";
import { CatObservationList } from "./cat-observation-list";
import { getCatchUpItems, CatchUpItem } from "@/lib/utils-catchup";
import { CatchUpStack } from "./catch-up-stack";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

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
        noticeDefs
    } = useAppState();
    const selectedCat = cats.find(c => c.id === activeCatId) || cats[0];

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

    // Get catchup items and filter for cat-related types (notice)
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
        return result.allItems.filter(item => item.type === 'notice' || item.type === 'unrecorded');
    }, [tasks, noticeLogs, inventory, lastSeenAt, settings, cats, careTaskDefs, careLogs, noticeDefs]);

    // FAB will trigger swipe mode - removed auto-show

    function handleCatchupAction(item: CatchUpItem, action: 'done' | 'later', value?: string) {
        if (action === 'done' && item.catId) {
            if (item.type === 'notice') {
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
            } else if (item.type === 'unrecorded') {
                // Use provided value or default to "いつも通り"
                const noticeId = item.payload?.noticeId;
                const recordValue = value || 'いつも通り';
                if (noticeId) {
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

    if (cats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <CatIcon className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">まだ猫がいません</h2>
                <p className="text-sm text-slate-500 mb-4">設定から猫を追加してください</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            {/* Main Content */}
            <div className={cn(
                "space-y-4 pb-20 transition-all duration-500",
                showSwipeMode && catchupItems.length > 0 && "blur-xl scale-[0.98] pointer-events-none opacity-50"
            )}>
                {/* Cat Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {cats.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCatId(cat.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all ${activeCatId === cat.id
                                ? "bg-amber-500 text-white shadow-lg"
                                : "bg-white text-slate-700 border border-slate-200"
                                }`}
                        >{(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                            <img src={cat.avatar} alt={cat.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                            <span className="text-lg">{cat.avatar || "🐈"}</span>
                        )}
                            <span className="font-bold text-sm">{cat.name}</span>
                        </button>
                    ))}
                </div>

                {/* Cat Profile Card with Swipe Button */}
                {selectedCat && (
                    <Card className="rounded-3xl shadow-sm border-none bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-white shadow-inner flex items-center justify-center overflow-hidden">
                                    {(selectedCat.avatar?.startsWith('http') || selectedCat.avatar?.startsWith('/')) ? (
                                        <img src={selectedCat.avatar} alt={selectedCat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl">{selectedCat.avatar || "🐈"}</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-slate-900">{selectedCat.name}</h2>
                                    <p className="text-sm text-slate-500">
                                        {selectedCat.sex === 'オス' ? '♂ オス' : selectedCat.sex === 'メス' ? '♀ メス' : selectedCat.sex || '性別未設定'}
                                        {selectedCat.age && ` • ${selectedCat.age}`}
                                    </p>
                                </div>
                                {catchupItems.length > 0 && !showSwipeMode && (
                                    <button
                                        onClick={() => setShowSwipeMode(true)}
                                        className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200"
                                    >
                                        変化あり ({catchupItems.length})
                                    </button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cat Observations - Interactive */}
                <CatObservationList />
            </div>

            {/* Swipe Card Overlay - Slack style */}
            <AnimatePresence>
                {showSwipeMode && catchupItems.length > 0 && progressIndex < catchupItems.length && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-br from-rose-600 to-pink-700 overflow-hidden overscroll-none"
                        style={{ touchAction: 'none' }}
                    >
                        {/* Header: Back + count + Cat switch + Undo */}
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
                            <div className="flex items-center gap-1">
                                {/* Cat switch button - compact */}
                                {cats.length > 1 && (
                                    <button
                                        onClick={() => handleCatChange('down')}
                                        className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all"
                                        title="次の猫へ"
                                    >
                                        <ChevronsUpDown className="h-5 w-5" />
                                    </button>
                                )}
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
                        </div>


                        {/* Card area */}
                        <div className="flex-1 px-4 pb-4 relative" style={{ touchAction: 'none' }}>

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

                        {/* Footer: Buttons OUTSIDE the card */}
                        <div className="px-4 pb-6 pt-2 flex gap-3">
                            <button
                                onClick={() => {
                                    const currentItem = catchupItems[progressIndex];
                                    if (currentItem) {
                                        setLastAction({ item: currentItem, action: 'done', prevIndex: progressIndex });
                                        handleCatchupAction(currentItem, 'done', 'ちょっと違う');
                                    }
                                }}
                                className="flex-1 py-4 px-6 rounded-full border-2 border-white/30 text-white font-medium text-base hover:bg-white/10 active:scale-95 transition-all"
                            >
                                気になる
                            </button>
                            <button
                                onClick={() => {
                                    const currentItem = catchupItems[progressIndex];
                                    if (currentItem) {
                                        setLastAction({ item: currentItem, action: 'done', prevIndex: progressIndex });
                                        handleCatchupAction(currentItem, 'done', 'いつも通り');
                                    }
                                }}
                                className="flex-1 py-4 px-6 rounded-full bg-white text-rose-600 font-medium text-base hover:bg-white/90 active:scale-95 transition-all"
                            >
                                いつも通り
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Auto-close when complete */}
            {showSwipeMode && catchupItems.length > 0 && progressIndex >= catchupItems.length && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-rose-600 to-pink-700"
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
                    <p className="text-white/70 mb-8">すべてのチェックが完了しました</p>
                    <button
                        onClick={() => setShowSwipeMode(false)}
                        className="px-8 py-3 rounded-full bg-white text-rose-600 font-medium hover:bg-white/90 active:scale-95 transition-all"
                    >
                        閉じる
                    </button>
                </motion.div>
            )}
        </div>
    );
}
