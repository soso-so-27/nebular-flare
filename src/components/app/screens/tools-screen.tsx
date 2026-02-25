"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
    FileText,
    TrendingUp,
    Package,
    History,
    Cat,
    Clock,
    Sparkles,
    ChevronRight,
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
    onSelectPhoto?: (id: string) => void;
}

export function ToolsScreen({
    onOpenReport,
    onOpenTrends,
    onOpenInventory,
    onOpenSitter,
    onOpenCareManagement,
    onSelectPhoto,
}: ToolsScreenProps) {
    const { cats } = useCatContext();
    const { householdId } = useCoreContext();
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [shouldLoad, setShouldLoad] = useState(false);
    const supabaseRef = useRef(createClient());
    const sectionRef = useRef<HTMLDivElement>(null);

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

    // P3: Lazy load — only fetch when ふりかえり section is visible
    useEffect(() => {
        if (!sectionRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setShouldLoad(true); },
            { rootMargin: '200px' }
        );
        observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (shouldLoad) loadPhotos();
    }, [shouldLoad, loadPhotos]);

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

        return { dailyPick, weeklyHighlight, pastYearPhotos };
    }, [allPhotos]);

    const toolSections = [
        {
            title: "日々の管理",
            tools: [
                { title: "お世話管理", desc: "お世話項目の設定・確認", icon: Clock, onClick: onOpenCareManagement },
                { title: "在庫管理", desc: "フードや消耗品の残量", icon: Package, onClick: onOpenInventory },
            ]
        },
        {
            title: "レポート・分析",
            tools: [
                { title: "受診用レポート", desc: "獣医さんへの説明用", icon: FileText, onClick: onOpenReport },
                { title: "引継ぎシート", desc: "シッターさんへの指示", icon: History, onClick: onOpenSitter },
                { title: "健康推移", desc: "体重や体調の変化", icon: TrendingUp, onClick: onOpenTrends },
            ]
        }
    ];

    return (
        <div className="h-full bg-[#FDF8F1] dark:bg-[#121214] overflow-y-auto px-5 pt-14 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
            <div className="max-w-md mx-auto">

                {/* ── ふりかえり Section ── */}
                <div ref={sectionRef} className="mb-8 bg-[#FAF4ED] dark:bg-white/5 rounded-[32px] p-5 border border-[#F2EFEA] dark:border-white/5">
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <History className="w-4 h-4 text-brand-peach" />
                        <h2 className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">ふりかえり</h2>
                    </div>

                    {!loading && discoverItems ? (
                        <div className="space-y-6">
                            {/* Daily Pick Hero */}
                            {discoverItems.dailyPick && (
                                <motion.div
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onSelectPhoto?.(discoverItems.dailyPick.id)}
                                    className="relative aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm border border-[#F2EFEA] dark:border-white/5 bg-white dark:bg-[#1c1c1e] cursor-pointer"
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
                                            {discoverItems.dailyPick.catName}の特別な一枚
                                        </h3>
                                        <p className="text-white/80 text-[12px] font-medium line-clamp-1">
                                            {discoverItems.dailyPick.memo || `${discoverItems.dailyPick.catName}のお気に入りが見つかりました`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Weekly Highlights */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[12px] font-bold text-[#787570] dark:text-[#A6A29A]">今週のハイライト</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                                    {discoverItems.weeklyHighlight.length > 0 ? (
                                        discoverItems.weeklyHighlight.map((photo, i) => (
                                            <motion.div
                                                key={photo.id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onSelectPhoto?.(photo.id)}
                                                className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5 cursor-pointer"
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

                            {discoverItems.pastYearPhotos.length > 0 && (
                                <div className="mt-2 space-y-2.5">
                                    <div className="flex items-center gap-2 px-1">
                                        <History className="w-3.5 h-3.5 text-[#787570]" />
                                        <span className="text-[12px] font-bold text-[#787570] dark:text-[#A6A29A]">去年の今ごろ</span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                                        {discoverItems.pastYearPhotos.slice(0, 6).map((photo) => (
                                            <motion.div
                                                key={photo.id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onSelectPhoto?.(photo.id)}
                                                className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm ring-1 ring-[#F2EFEA] dark:ring-white/5 cursor-pointer"
                                            >
                                                <img src={photo.url} className="w-full h-full object-cover" alt="" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center gap-3 bg-white/40 dark:bg-white/5 rounded-[24px]">
                            <Cat className="w-6 h-6 text-[#D4CFC9] animate-pulse" />
                            <span className="text-[10px] font-bold text-[#787570] tracking-wide">写真を読み込み中です...</span>
                        </div>
                    )}
                </div>

                {/* ── ツール Section ── */}
                <div className="space-y-8">
                    {toolSections.map((section) => (
                        <nav key={section.title} aria-label={section.title} className="bg-[#FAF4ED] dark:bg-white/5 rounded-[32px] p-5 border border-[#F2EFEA] dark:border-white/5">
                            <h2 className="text-[11px] font-bold text-[#787570] dark:text-[#A6A29A] tracking-[0.1em] mb-4 ml-2 uppercase">
                                {section.title}
                            </h2>
                            <div className="grid grid-cols-2 gap-3.5">
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
                                                <Icon className="w-[20px] h-[20px]" strokeWidth={1.8} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-[15px] text-[#4E342E] dark:text-[#E8E6E1] mb-0.5 leading-tight">{tool.title}</h3>
                                                <p className="text-[12px] text-[#787570] dark:text-[#787570] leading-relaxed line-clamp-2">{tool.desc}</p>
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
