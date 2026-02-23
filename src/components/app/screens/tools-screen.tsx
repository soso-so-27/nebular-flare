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
    Wrench,
    BookOpen,
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
    onOpenCareManagement: () => void;
}

export function ToolsScreen({
    onOpenReport,
    onOpenTrends,
    onOpenInventory,
    onOpenSitter,
    onOpenCareManagement,
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
            title: "レポート",
            tools: [
                { title: "受診用レポート", desc: "獣医さんへの説明用", icon: FileText, onClick: onOpenReport },
                { title: "引継ぎシート", desc: "シッターさんへの指示", icon: History, onClick: onOpenSitter },
            ]
        },
        {
            title: "分析・管理",
            tools: [
                { title: "お世話管理", desc: "日々のルーチンをチェック", icon: Clock, onClick: onOpenCareManagement },
                { title: "健康推移", desc: "体重や体調の変化", icon: TrendingUp, onClick: onOpenTrends },
                { title: "在庫管理", desc: "フードや消耗品の残量", icon: Package, onClick: onOpenInventory },
            ]
        }
    ];

    return (
        <div className="h-full bg-[#FDF8F1] dark:bg-[#121214] overflow-y-auto px-4 pt-14 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
            <div className="max-w-md mx-auto">

                {/* ── みつける Section ── */}
                <div className="mb-10 bg-[#FAF4ED] dark:bg-white/5 rounded-[32px] p-4 border border-[#F2EFEA] dark:border-white/5">
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <Sparkles className="w-3.5 h-3.5 text-brand-peach" />
                        <h2 className="text-[13px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">みつける</h2>
                    </div>

                    {!loading && discoverItems ? (
                        <div className="space-y-6">
                            {/* Daily Pick Hero */}
                            {discoverItems.dailyPick && (
                                <motion.div
                                    whileTap={{ scale: 0.98 }}
                                    className="relative aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm border border-[#F2EFEA] dark:border-white/5 bg-white dark:bg-[#1c1c1e]"
                                >
                                    <img
                                        src={discoverItems.dailyPick.url}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-5">
                                        <div className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full w-fit mb-2.5 flex items-center gap-1.5 border border-white/20">
                                            <Sparkles className="w-2.5 h-2.5 text-white" />
                                            <span className="text-[10px] font-bold text-white tracking-widest">今日のとっておき</span>
                                        </div>
                                        <h3 className="text-white font-bold text-[17px] leading-tight mb-1">
                                            {discoverItems.dailyPick.catName}のきらきらした瞬間
                                        </h3>
                                        <p className="text-white/80 text-[12px] font-medium line-clamp-1">
                                            {discoverItems.dailyPick.memo || "特別な一枚が見つかりました"}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Weekly Highlights */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[12px] font-bold text-[#8E8B85] dark:text-[#A6A29A]">今週のハイライト</span>
                                    <ChevronRight className="w-4 h-4 text-[#D4CFC9]" />
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                                    {discoverItems.weeklyHighlight.length > 0 ? (
                                        discoverItems.weeklyHighlight.map((photo, i) => (
                                            <motion.div
                                                key={photo.id}
                                                whileTap={{ scale: 0.95 }}
                                                className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5"
                                            >
                                                <img src={photo.url} className="w-full h-full object-cover" alt="" />
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="w-full h-24 rounded-2xl border-2 border-dashed border-[#F2EFEA] flex items-center justify-center text-[10px] text-[#A69C94] font-bold">
                                            まだ記録がありません
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <motion.div
                                    whileTap={{ scale: 0.96 }}
                                    className="bg-white dark:bg-[#1c1c1e] p-4 rounded-[24px] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5 flex flex-col gap-2.5"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-brand-peach/10 flex items-center justify-center text-brand-peach">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[#4E342E] dark:text-white">{discoverItems.monthName}のあゆみ</h4>
                                        <p className="text-[9px] text-[#8E8B85] dark:text-[#A6A29A] mt-0.5 font-medium">{discoverItems.totalPhotos}枚の記録</p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileTap={{ scale: 0.96 }}
                                    className="bg-white dark:bg-[#1c1c1e] p-4 rounded-[24px] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5 flex flex-col gap-2.5"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#FDF8F1] dark:bg-white/5 flex items-center justify-center text-[#8E8B85]">
                                        <History className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[#4E342E] dark:text-white">去年の今ごろ</h4>
                                        <p className="text-[9px] text-[#8E8B85] dark:text-[#A6A29A] mt-0.5 font-medium">
                                            {discoverItems.pastYearPhotos.length > 0 ? "思い出をふりかえる" : "記録がありません"}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center gap-3 bg-white/40 dark:bg-white/5 rounded-[24px]">
                            <Cat className="w-6 h-6 text-[#D4CFC9] animate-pulse" />
                            <span className="text-[10px] font-bold text-[#A69C94] tracking-wide">AIが記録を整理中です...</span>
                        </div>
                    )}
                </div>

                {/* ── ツール Section ── */}
                <div className="space-y-8">
                    {toolSections.map((section) => (
                        <nav key={section.title} aria-label={section.title} className="bg-[#FAF4ED] dark:bg-white/5 rounded-[32px] p-4 border border-[#F2EFEA] dark:border-white/5">
                            <h2 className="text-[11px] font-bold text-[#8E8B85] dark:text-[#A6A29A] tracking-[0.1em] mb-4 ml-2 uppercase">
                                {section.title}
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                {section.tools.map((tool, idx) => {
                                    const Icon = tool.icon;
                                    const isFullWidth = section.tools.length % 2 !== 0 && idx === 0;
                                    return (
                                        <motion.button
                                            key={tool.title}
                                            whileTap={{ scale: 0.96 }}
                                            aria-label={`${tool.title}: ${tool.desc}`}
                                            onClick={() => {
                                                triggerFeedback('light');
                                                tool.onClick();
                                            }}
                                            className={cn(
                                                "flex flex-col items-start p-4 rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/5 shadow-sm active:shadow-none transition-all text-left min-h-[110px]",
                                                isFullWidth && "col-span-2 flex-row items-center gap-4 min-h-[0] py-4"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg bg-[#FDF8F1] dark:bg-white/10 text-brand-peach flex items-center justify-center",
                                                !isFullWidth && "mb-3"
                                            )}>
                                                <Icon className="w-[16px] h-[16px]" strokeWidth={2} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-[13px] text-[#4E342E] dark:text-[#E8E6E1] mb-0.5 leading-tight">{tool.title}</h3>
                                                <p className="text-[9px] text-[#A69C94] dark:text-[#8E8B85] leading-relaxed line-clamp-2">{tool.desc}</p>
                                            </div>
                                            {isFullWidth && <ChevronRight className="w-4 h-4 text-[#D4CFC9]" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </nav>
                    ))}
                </div>

                <div className="mt-12 flex flex-col items-center justify-center gap-3 opacity-30 pb-10">
                    <Cat className="w-5 h-5 text-[#D4CFC9]" strokeWidth={1} />
                </div>
            </div>
        </div>
    );
};
