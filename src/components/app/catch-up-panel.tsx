"use client";

import React, { useMemo, useEffect } from "react";
import { CatchUpItem } from "@/lib/utils-catchup";
import { ChevronRight, ChevronLeft, Heart, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatchUpStack } from "./catch-up-stack";
import { cn } from "@/lib/utils";

interface CatchUpPanelProps {
    summary: string;
    items: CatchUpItem[];
    remainingCount: number;
    onAction: (item: CatchUpItem, action: 'done' | 'later') => void;
    onClearAll: () => void;
    onSeeMore: () => void;
    onCatChange?: (direction: 'up' | 'down') => void;
}

type TabType = 'status' | 'care';

export function CatchUpPanel({
    summary,
    items,
    onAction,
    onClearAll,
    onSeeMore,
    onCatChange,
}: CatchUpPanelProps) {
    const [activeTab, setActiveTab] = React.useState<TabType>('status');
    const [progressIndex, setProgressIndex] = React.useState(0);

    // Filter items by type
    const statusItems = useMemo(() => items.filter(i => i.type === 'notice'), [items]);
    const careItems = useMemo(() => items.filter(i => i.type === 'task' || i.type === 'inventory'), [items]);

    const currentItems = activeTab === 'status' ? statusItems : careItems;
    const totalItems = currentItems.length;

    // Auto-transition: when current tab is cleared, switch to the other if it has items
    useEffect(() => {
        if (progressIndex >= currentItems.length && currentItems.length > 0) {
            // Current tab cleared
            const otherTab: TabType = activeTab === 'status' ? 'care' : 'status';
            const otherItems = activeTab === 'status' ? careItems : statusItems;
            if (otherItems.length > 0) {
                setActiveTab(otherTab);
                setProgressIndex(0);
            }
        }
    }, [progressIndex, currentItems.length, activeTab, careItems, statusItems]);

    // Reset progress when switching tabs
    const handleTabChange = (tab: TabType) => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            setProgressIndex(0);
        }
    };

    return (
        <div className="h-full w-full max-w-md mx-auto flex flex-col pt-4 pb-8 overflow-hidden overscroll-none" style={{ touchAction: 'none' }}>
            {/* Top Progress Segments (Slack/Story style) */}
            <div className="px-6 mb-4">
                <div className="flex gap-1 h-[3px]">
                    {totalItems > 0 ? (
                        Array.from({ length: totalItems }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 rounded-full transition-all duration-300",
                                    i < progressIndex ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" :
                                        i === progressIndex ? "bg-white/80" : "bg-white/20"
                                )}
                            />
                        ))
                    ) : (
                        <div className="flex-1 rounded-full bg-white/20" />
                    )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">
                        {totalItems > 0 ? summary : "COMPLETED"}
                    </span>
                    <button
                        onClick={onSeeMore}
                        className="text-[10px] font-black tracking-widest text-white/60 uppercase hover:text-white"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Segmented Tab Control */}
            <div className="px-6 mb-4">
                <div className="flex p-1 bg-white/10 rounded-full">
                    <button
                        onClick={() => handleTabChange('status')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300",
                            activeTab === 'status'
                                ? "bg-white text-slate-900 shadow-lg"
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <Heart className="h-3.5 w-3.5" />
                        体調
                        {statusItems.length > 0 && (
                            <span className={cn(
                                "min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black",
                                activeTab === 'status' ? "bg-blue-500 text-white" : "bg-white/20 text-white"
                            )}>
                                {statusItems.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleTabChange('care')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300",
                            activeTab === 'care'
                                ? "bg-white text-slate-900 shadow-lg"
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        お世話
                        {careItems.length > 0 && (
                            <span className={cn(
                                "min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black",
                                activeTab === 'care' ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
                            )}>
                                {careItems.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Swipe Area */}
            <div className="flex-1 flex items-center justify-center px-4 relative" style={{ touchAction: 'none' }}>
                <div className="w-full aspect-[4/5] relative">
                    <CatchUpStack
                        key={activeTab} // Reset stack when tab changes
                        items={currentItems}
                        onAction={onAction}
                        onIndexChange={(idx) => {
                            setProgressIndex(idx);
                        }}
                        onVerticalSwipe={onCatChange}
                    />
                </div>
            </div>

            {/* Bottom Swipe Triage Indicators */}
            <div className="px-8 mt-6 flex justify-between items-center opacity-40">
                <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                        <ChevronLeft className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[8px] font-black text-white tracking-widest uppercase">Later</span>
                </div>

                <div className="flex flex-col items-center gap-0.5 text-center">
                    <span className="text-[8px] font-black text-white/40 tracking-widest uppercase">↑↓ 猫切替</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                        <ChevronRight className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[8px] font-black text-white tracking-widest uppercase">Done</span>
                </div>
            </div>

            {items.length > 0 && (
                <div className="mt-4 flex justify-center">
                    <Button
                        variant="link"
                        className="text-[10px] text-white/30 font-bold hover:text-white/60 tracking-wider h-auto py-0"
                        onClick={onClearAll}
                    >
                        MARK ALL AS READ
                    </Button>
                </div>
            )}
        </div>
    );
}
