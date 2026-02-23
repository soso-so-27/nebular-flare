"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    TrendingUp,
    Package,
    History,
    ChevronRight,
    Cat,
    Sparkles,
    Calendar,
    Clock,
    Camera,
    Image as ImageIcon,
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { triggerFeedback } from "@/lib/haptics";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { startOfWeek } from "date-fns";

// ─────────────────────────────────
// Types
// ─────────────────────────────────
interface AIAnalysis {
    labels?: {
        moment?: string;
        scene?: string;
        shot?: string;
    };
    forYouScores?: {
        dailyPick?: number;
        weeklyHighlight?: number;
        funnyMoment?: number;
    };
    uiTags?: string[];
    zukanShelf?: string;
    pose?: string;
}

interface ShelfPhoto {
    id: string;
    url: string;
    catName: string;
    createdAt: string;
    memo?: string;
    aiAnalysis?: AIAnalysis;
}

interface ToolsScreenProps {
    onOpenReport: () => void;
    onOpenTrends: () => void;
    onOpenInventory: () => void;
    onOpenSitter: () => void;
}

export function ToolsScreen({
    onOpenReport,
    onOpenTrends,
    onOpenInventory,
    onOpenSitter,
}: ToolsScreenProps) {
    const { cats } = useCatContext();
    const { householdId } = useCoreContext();
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const supabaseRef = useRef(createClient());

    // ─────────────────────────────────
    // Fetch Data
    // ─────────────────────────────────
    const loadPhotos = useCallback(async () => {
        if (!householdId) return;
        setLoading(true);

        const supabase = supabaseRef.current;
        const { data, error } = await (supabase.rpc as any)("get_unified_gallery", {
            target_household_id: householdId,
            limit_count: 500,
            offset_count: 0,
        });

        if (error) {
            console.error("Error loading photos:", error);
            setLoading(false);
            return;
        }

        const items = (data as any[]) || [];
        const photos = items.map((img) => ({
            id: img.id,
            url: getFullImageUrl(img.url, { width: 600, height: 600, resize: "cover", quality: 80 }),
            catName: img.cat_name,
            createdAt: img.created_at,
            memo: img.memo,
            aiAnalysis: img.ai_analysis,
        }));
        setAllPhotos(photos);
        setLoading(false);
    }, [householdId]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    // ─────────────────────────────────
    // Discovery Logic
    // ─────────────────────────────────
    const discoverItems = useMemo(() => {
        if (allPhotos.length === 0) return null;

        // Daily Pick
        const dailyPick = [...allPhotos].sort((a, b) =>
            (b.aiAnalysis?.forYouScores?.dailyPick || 0) - (a.aiAnalysis?.forYouScores?.dailyPick || 0)
        )[0];

        // Weekly Highlights
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weeklyPhotos = allPhotos.filter(p => new Date(p.createdAt) >= weekStart);
        const weeklyHighlight = (weeklyPhotos.length > 0 ? weeklyPhotos : allPhotos)
            .filter(p => p.id !== dailyPick?.id)
            .sort((a, b) => (b.aiAnalysis?.forYouScores?.weeklyHighlight || 0) - (a.aiAnalysis?.forYouScores?.weeklyHighlight || 0))
            .slice(0, 6);

        // Past years
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisDay = now.getDate();
        const pastYearPhotos = allPhotos
            .filter(p => {
                const d = new Date(p.createdAt);
                const dayDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                return d.getMonth() === thisMonth && d.getDate() === thisDay && dayDiff >= 30;
            })
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const monthName = `${now.getMonth() + 1}月`;

        return { dailyPick, weeklyHighlight, pastYearPhotos, monthName, totalPhotos: allPhotos.length };
    }, [allPhotos]);

    const toolSections = [
        {
            title: "書き出し",
            tools: [
                { title: "レポート", desc: "獣医さんへの説明用", icon: FileText, onClick: onOpenReport },
                { title: "引継ぎシート", desc: "シッターさんへの指示", icon: History, onClick: onOpenSitter },
            ]
        },
        {
            title: "分析・管理",
            tools: [
                { title: "健康推移", desc: "体重や体調の変化", icon: TrendingUp, onClick: onOpenTrends },
                { title: "在庫管理", desc: "フードや消耗品の残量", icon: Package, onClick: onOpenInventory },
            ]
        }
    ];

    return (
        <div className="h-full bg-[#FDF8F1] dark:bg-[#121214] overflow-y-auto px-5 pt-16 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
            <div className="max-w-md mx-auto">
                <header className="mb-10 text-center">
                    <h1 className="text-[20px] font-bold text-[#4E342E] dark:text-[#E8E6E1] tracking-wider">ツール</h1>
                    <p className="text-[12px] text-[#A69C94] dark:text-[#8E8B85] mt-1.5 font-medium tracking-wide italic">Daily Care & Memories</p>
                </header>

                {/* ── みつける Section ── */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-5 ml-1">
                        <Sparkles className="w-4 h-4 text-brand-peach" />
                        <h2 className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">みつける</h2>
                    </div>

                    {!loading && discoverItems ? (
                        <div className="space-y-6">
                            {/* Daily Pick Hero */}
                            {discoverItems.dailyPick && (
                                <motion.div
                                    whileTap={{ scale: 0.98 }}
                                    className="relative aspect-[4/5] rounded-[32px] overflow-hidden shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5 bg-white dark:bg-[#1c1c1e]"
                                >
                                    <img
                                        src={discoverItems.dailyPick.url}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
                                        <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full w-fit mb-3 flex items-center gap-1.5 border border-white/20">
                                            <Sparkles className="w-3 h-3 text-white" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Daily Pick</span>
                                        </div>
                                        <h3 className="text-white font-bold text-[18px] leading-tight mb-1">
                                            {discoverItems.dailyPick.catName}のきらきらした瞬間
                                        </h3>
                                        <p className="text-white/80 text-[12px] font-medium line-clamp-1">
                                            {discoverItems.dailyPick.memo || "特別な一枚が見つかりました"}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Weekly Highlights */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[12px] font-bold text-[#A69C94] dark:text-[#8E8B85]">今週のハイライト</span>
                                    <ChevronRight className="w-4 h-4 text-[#D4CFC9]" />
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
                                    {discoverItems.weeklyHighlight.map((photo, i) => (
                                        <motion.div
                                            key={photo.id}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5"
                                        >
                                            <img src={photo.url} className="w-full h-full object-cover" alt="" />
                                        </motion.div>
                                    ))}
                                    {discoverItems.weeklyHighlight.length === 0 && (
                                        <div className="w-full h-28 rounded-2xl border-2 border-dashed border-[#F2EFEA] flex items-center justify-center text-[10px] text-[#A69C94] font-bold">
                                            まだ記録がありません
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Two Small Discover Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <motion.div
                                    whileTap={{ scale: 0.96 }}
                                    className="bg-white dark:bg-[#1c1c1e] p-5 rounded-[28px] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5 flex flex-col gap-3 h-full"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-[#FDF8F1] dark:bg-white/5 flex items-center justify-center text-brand-peach">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[#4E342E] dark:text-white">{discoverItems.monthName}のあゆみ</h4>
                                        <p className="text-[10px] text-[#A69C94] mt-0.5 font-medium">{discoverItems.totalPhotos}枚の記録</p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileTap={{ scale: 0.96 }}
                                    className="bg-white dark:bg-[#1c1c1e] p-5 rounded-[28px] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5 flex flex-col gap-3 h-full"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-[#FDF8F1] dark:bg-white/5 flex items-center justify-center text-[#A69C94]">
                                        <History className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[#4E342E] dark:text-white">去年の今ごろ</h4>
                                        <p className="text-[10px] text-[#A69C94] mt-0.5 font-medium">
                                            {discoverItems.pastYearPhotos.length > 0 ? "思い出をふりかえる" : "記録がありません"}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white/50 dark:bg-white/5 rounded-[32px] border border-dashed border-[#F2EFEA] dark:border-white/10">
                            <Cat className="w-8 h-8 text-[#D4CFC9] animate-pulse" />
                            <span className="text-[11px] font-bold text-[#A69C94] tracking-wide">AIが記録を整理中です...</span>
                        </div>
                    )}
                </div>

                {/* ── ツール Section ── */}
                <div className="space-y-12">
                    {toolSections.map((section) => (
                        <div key={section.title}>
                            <h2 className="text-[11px] font-bold text-[#A69C94] dark:text-[#8E8B85] tracking-[0.2em] mb-4 ml-2 uppercase">
                                {section.title}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {section.tools.map((tool, idx) => {
                                    const Icon = tool.icon;
                                    return (
                                        <motion.button
                                            key={tool.title}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => {
                                                triggerFeedback('light');
                                                tool.onClick();
                                            }}
                                            className="flex flex-col items-start p-5 rounded-[28px] bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/5 shadow-sm active:shadow-none transition-all text-left h-full"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-[#FDF8F1] dark:bg-white/10 text-brand-peach flex items-center justify-center mb-4">
                                                <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[14px] text-[#4E342E] dark:text-[#E8E6E1] mb-1 leading-tight">{tool.title}</h3>
                                                <p className="text-[10px] text-[#A69C94] dark:text-[#8E8B85] leading-relaxed line-clamp-2">{tool.desc}</p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 flex flex-col items-center justify-center gap-3 opacity-40 pb-10">
                    <Cat className="w-5 h-5 text-[#D4CFC9]" strokeWidth={1} />
                    <div className="text-center font-mono tracking-tighter text-[9px] text-[#A69C94]">
                        NEBULAR FLARE CORE
                    </div>
                </div>
            </div>
        </div>
    );
};
