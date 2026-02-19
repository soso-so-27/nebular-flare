"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Heart, BookOpen, Cat, Tag, CalendarDays, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterType } from "@/hooks/use-grouped-logs";

interface NyannlogHeaderProps {
    activeTab: 'events' | 'requests' | 'input';
    setActiveTab: (tab: 'events' | 'requests' | 'input') => void;
    isIsland: boolean;
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    selectedCatId: string | null;
    setSelectedCatId: (id: string | null) => void;
    cats: any[];
    onOpenCalendar?: () => void;
    onClose: () => void;
    requestsSubTab?: 'today' | 'history';
    setRequestsSubTab?: (tab: 'today' | 'history') => void;
}

export const NyannlogHeaderV2 = ({
    activeTab,
    setActiveTab,
    isIsland,
    activeFilter,
    setActiveFilter,
    selectedCatId,
    setSelectedCatId,
    cats,
    onOpenCalendar,
    onClose,
    requestsSubTab,
    setRequestsSubTab
}: NyannlogHeaderProps) => {
    if (activeTab === 'input') return null;

    return (
        <div className={cn(
            "relative w-full z-50 flex flex-col shadow-xl",
            activeTab === 'requests'
                ? "bg-[#F3F3F3] border-b border-black/5"
                : "bg-[#18181B]/95 backdrop-blur-xl border-b border-white/5"
        )}>
            {activeTab === 'events' && (
                <div
                    className="absolute inset-x-0 top-0 h-40 z-[-1]"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />
            )}

            <div className="pt-2" />

            <div className="px-5 pb-3 w-full flex items-center justify-between relative">
                {/* Close Button (Left) */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className={cn(
                        "relative z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors pointer-events-auto",
                        activeTab === 'requests'
                            ? "bg-black/5 active:bg-black/10"
                            : "backdrop-blur-md bg-[#A48E82]/20 border border-[#E6D5CC]/30 hover:bg-[#A48E82]/30"
                    )}
                >
                    <X className={cn("w-5 h-5", activeTab === 'requests' ? "text-[#1c1c1e]/40" : "text-[#E6D5CC]")} />
                </motion.button>

                {/* Center Tabs (Simplified/Unified) */}
                <div className={cn(
                    "absolute left-1/2 transform -translate-x-1/2 flex items-center p-1 backdrop-blur-md rounded-full shadow-xl z-40 pointer-events-auto",
                    activeTab === 'requests'
                        ? "bg-black/5 border border-black/5"
                        : "bg-[#18181B]/80 border border-white/10"
                )}>
                    {activeTab === 'requests' ? (
                        <>
                            <button
                                onClick={() => setRequestsSubTab?.('today')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all relative overflow-hidden whitespace-nowrap",
                                    requestsSubTab === 'today' ? "text-[#3D3A36] bg-brand-peach shadow-sm" : "text-[#1c1c1e]/30 hover:text-[#1c1c1e]/50"
                                )}
                            >
                                おねがい
                            </button>
                            <button
                                onClick={() => setRequestsSubTab?.('history')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all relative overflow-hidden whitespace-nowrap",
                                    requestsSubTab === 'history' ? "text-[#3D3A36] bg-brand-peach shadow-sm" : "text-[#1c1c1e]/30 hover:text-[#1c1c1e]/50"
                                )}
                            >
                                りれき
                            </button>
                        </>
                    ) : (
                        <div className="px-4 py-1.5 text-xs font-bold text-white/70">できごと</div>
                    )}
                </div>

                {/* Spacer for Right side */}
                <div className="w-10 h-10" />
            </div>

            {activeTab === 'events' && (
                <div className="flex items-center justify-end gap-3 px-6 pointer-events-auto">
                    <div className="w-[105px]">
                        <Select value={selectedCatId || 'all'} onValueChange={(val: string) => setSelectedCatId(val === 'all' ? null : val)}>
                            <SelectTrigger className="h-9 bg-white/10 border-white/10 text-[10px] font-bold text-white focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-white/15 transition-all shadow-sm">
                                <div className="flex items-center gap-2 truncate">
                                    <Cat className="w-3 h-3 text-white/40" />
                                    <SelectValue placeholder="全員" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#fefefe] border-[#f0f0f0] text-[#1c1c1e] z-[12050] shadow-xl">
                                <SelectItem value="all" className="text-[10px] font-bold text-[#1c1c1e]">全員</SelectItem>
                                {cats.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-bold text-[#1c1c1e]">
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[105px]">
                        <Select value={activeFilter} onValueChange={(val: string) => setActiveFilter(val as any)}>
                            <SelectTrigger className="h-9 bg-white/10 border-white/10 text-[10px] font-bold text-white focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-white/15 transition-all shadow-sm">
                                <div className="flex items-center gap-2 truncate">
                                    <Tag className="w-3 h-3 text-white/40" />
                                    <SelectValue placeholder="すべて" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#fefefe] border-[#f0f0f0] text-[#1c1c1e] z-[12050] shadow-xl">
                                {[
                                    { id: 'all', label: 'すべて' },
                                    { id: 'photo', label: '写真' },
                                    { id: 'chat', label: '相談' },
                                    { id: 'health', label: '健康' },
                                    { id: 'bookmark', label: '重要' },
                                ].map((f) => (
                                    <SelectItem key={f.id} value={f.id} className="text-[10px] font-bold text-[#1c1c1e]">
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isIsland && onOpenCalendar && (
                        <button
                            onClick={() => {
                                onClose();
                                onOpenCalendar?.();
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 border border-white/10 text-white/40 hover:bg-white/15 hover:text-white/60 transition-all shadow-sm"
                        >
                            <CalendarDays className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
