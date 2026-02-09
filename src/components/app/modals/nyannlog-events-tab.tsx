"use client";

import { NyannlogItem as NyannlogItemComp } from '../shared/nyannlog-item';
import { TimelineGroup } from "@/types/timeline-types";

import React from "react";
import { History } from "lucide-react";
import { DekigotoCalendar } from '../shared/dekigoto-calendar';

interface NyannlogEventsTabProps {
    groupedLogs: TimelineGroup[];
    currentUserId: string | null;
    onSelectItem?: (id: string, type: string, photos: string[]) => void;
    toggleBookmark: (id: string) => void;
    addReaction: (id: string, reaction: string) => void;
    removeReaction: (id: string, reaction: string) => void;
    onDeleteItem?: (id: string) => void;
    inputCardRef: React.RefObject<HTMLDivElement>;
    dailyPhotos: Record<string, string>;
}

export const NyannlogEventsTab = ({
    groupedLogs,
    currentUserId,
    onSelectItem,
    toggleBookmark,
    addReaction,
    removeReaction,
    onDeleteItem,
    inputCardRef,
    dailyPhotos,
}: NyannlogEventsTabProps) => {
    const horizontalScrollRef = React.useRef<HTMLDivElement>(null);

    if (groupedLogs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-slate-200 text-sm font-bold mb-2">まだ記録がありません</p>
                <p className="text-slate-500 text-xs">＋ボタンから今日のできごとを<br />記録してみましょう</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0">
                <DekigotoCalendar
                    dailyPhotos={dailyPhotos}
                />
            </div>

            <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
                <div
                    ref={horizontalScrollRef}
                    className="flex-1 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory flex items-start"
                >
                    <div className="inline-flex pl-6 pr-12 gap-5 items-start pb-32 pt-4">
                        {groupedLogs.flatMap(group => group.items).map((item) => (
                            <div key={item.id} className="w-[85vw] max-w-[320px] shrink-0 snap-center flex flex-col">
                                <NyannlogItemComp
                                    item={item}
                                    currentUserId={currentUserId}
                                    onSelectItem={onSelectItem}
                                    onToggleBookmark={toggleBookmark}
                                    onAddReaction={addReaction}
                                    onRemoveReaction={removeReaction}
                                    onDeleteItem={onDeleteItem}
                                    variant="compact"
                                    scrollContainerRef={horizontalScrollRef}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
