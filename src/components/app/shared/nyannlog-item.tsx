"use client";

import React from 'react';
import { format } from "date-fns";
import { MessageCircle, Camera, AlertCircle, Bookmark, Trash2, PawPrint } from "lucide-react";
import { getFullImageUrl, cn } from '@/lib/utils';
import { ReactionBar } from './reaction-bar';
import { TimelineItem, TimelineUpdate } from '@/types/timeline-types';

interface NyannlogItemProps {
    item: TimelineItem;
    currentUserId: string | null;
    onSelectItem?: (id: string, type: string, photos: string[]) => void;
    onToggleBookmark: (id: string) => void;
    onAddReaction: (id: string, reaction: string) => void;
    onRemoveReaction: (id: string, reaction: string) => void;
    onDeleteItem?: (id: string) => void;
    variant?: 'default' | 'compact';
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

// --- Main Container ---

export const NyannlogItem = React.memo(({
    item,
    currentUserId,
    onSelectItem,
    onToggleBookmark,
    onAddReaction,
    onRemoveReaction,
    onDeleteItem,
    variant = 'default',
    scrollContainerRef
}: NyannlogItemProps) => {

    return (
        <div
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onSelectItem?.(item.id, item.type as string, item.photos);
            }}
            className={cn(
                "w-full bg-[#1F1F23]/80 backdrop-blur-3xl rounded-[20px] border border-white/5 shadow-2xl flex flex-col cursor-pointer hover:bg-[#252529]/90 transition-all group overflow-hidden",
            )}
        >
            {/* 1. Header Section (Identity) */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex -space-x-1.5 shrink-0">
                        {item.cats.map((cat) => (
                            <div key={cat.id} className="w-8 h-8 rounded-full border-2 border-[#1F1F23] overflow-hidden bg-slate-800 ring-1 ring-white/5">
                                {cat.avatar ? (
                                    <img src={getFullImageUrl(cat.avatar)} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><PawPrint className="w-3 h-3 text-slate-400" /></div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[14px] font-bold text-white tracking-tight truncate">{item.catName}</span>
                        <span className="text-[10px] font-bold text-white/30 tabular-nums shrink-0 pt-0.5">
                            {item.createdAt ? format(new Date(item.createdAt), 'HH:mm') : '--:--'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {item.health_category && (
                        <div className="px-1.5 py-0.5 rounded bg-brand-peach/10 border border-brand-peach/20 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-brand-peach" />
                            <span className="text-[8px] font-black text-brand-peach uppercase tracking-widest">{item.health_category === 'vomit' ? '嘔吐' : item.health_category === 'toilet' ? '排泄' : item.health_category}</span>
                        </div>
                    )}
                    {item.symptom_details?.vomit && (
                        <div className="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 flex items-center gap-1">
                            <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">嘔吐 {item.symptom_details.vomit.count}回</span>
                        </div>
                    )}
                    {item.symptom_details?.emergency?.prayerPose && (
                        <div className="px-1.5 py-0.5 rounded bg-red-500 border border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.4)] flex items-center gap-1 animate-pulse">
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">祈りポーズあり</span>
                        </div>
                    )}
                    {item.symptom_details?.stool?.hasBlood && (
                        <div className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 flex items-center gap-1">
                            <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">血便あり</span>
                        </div>
                    )}
                    {onDeleteItem && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('この記録を削除してもよろしいですか？')) {
                                    onDeleteItem(item.id);
                                }
                            }}
                            className="p-1.5 rounded-full text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0 ml-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Photo Section (Media) */}
            <div className="w-full aspect-square relative z-0 overflow-hidden bg-[#18181B]">
                {item.photos && item.photos.length > 0 ? (
                    <img
                        src={getFullImageUrl(item.photos[0])}
                        className="w-full h-full object-cover"
                        alt=""
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                        <Camera className="w-10 h-10 text-white/5" />
                    </div>
                )}

                {item.photos && item.photos.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10">
                        <span className="text-[10px] font-bold text-white/90 tabular-nums">1/{item.photos.length}</span>
                    </div>
                )}
            </div>

            {/* 3. Action Bar */}
            <div className="px-4 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ReactionBar
                        incidentId={item.id}
                        reactions={item.reactions}
                        currentUserId={currentUserId || undefined}
                        onAddReaction={(r) => onAddReaction(item.id, r)}
                        onRemoveReaction={(r) => onRemoveReaction(item.id, r)}
                        compact
                    />
                    {item.updates.length > 0 && (
                        <div className="flex items-center gap-1.5 text-white/60">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-[12px] font-black tabular-nums">{item.updates.length}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleBookmark(item.id); }}
                    className={cn("transition-colors", item.is_bookmarked ? "text-white" : "text-white/60 hover:text-white/90")}
                >
                    <Bookmark className="w-5 h-5" fill={item.is_bookmarked ? "currentColor" : "none"} strokeWidth={2.5} />
                </button>
            </div>

            {/* 4. Information Section (Caption & Time) */}
            <div className="px-4 pb-4 pt-2 flex flex-col gap-1.5">
                {item.onset_at && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-white/40">
                        <span>発症: {format(new Date(item.onset_at), 'MM/dd HH:mm')}</span>
                    </div>
                )}
                {!!item.note && (
                    <div className="text-[13px] leading-relaxed flex items-start gap-1.5">
                        {item.userAvatar ? (
                            <img src={getFullImageUrl(item.userAvatar)} alt="" className="w-4 h-4 rounded-full object-cover border border-white/10 mt-0.5 shrink-0" />
                        ) : null}
                        <div>
                            <span className="font-bold text-white mr-2">{item.userName || item.catName}</span>
                            <span className="text-white/80 font-medium">{item.note}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

NyannlogItem.displayName = 'NyannlogItem';
