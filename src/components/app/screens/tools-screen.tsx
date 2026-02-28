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
import { useCatContext, useCareContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { startOfWeek } from "date-fns";
import { useInventory } from "@/hooks/supabase/use-inventory";

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

    // Fetch dynamic status data
    const { inventory, loading: inventoryLoading } = useInventory(householdId);
    const { careLogs, careTaskDefs, tasks } = useCareContext();

    // ── Calculate Dynamic Statuses ──

    // 1. Care Progress (Today's tasks)
    const careStatus = useMemo(() => {
        if (!tasks || tasks.length === 0) return null;
        // tasks in careContext are calculated for current cats
        const total = tasks.length;
        // Count how many tasks have a corresponding careLog for today
        // (This is a simplified check, ideally we match catId and type)
        const doneCount = tasks.filter(t => t.done).length;
        return { done: doneCount, total };
    }, [tasks]);

    // 2. Inventory Alerts
    const inventoryAlertCount = useMemo(() => {
        if (!inventory) return 0;
        return inventory.filter(item => item.stock_level === 'low').length;
    }, [inventory]);

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

    // Remove toolSections as we will hardcode the layout to support different designs

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
                        <div className="space-y-6">
                            <div className="w-full aspect-[4/5] flex flex-col items-center justify-center gap-3 bg-white/40 dark:bg-white/5 rounded-[24px] border border-[#F2EFEA]/50 dark:border-white/5">
                                <Cat className="w-6 h-6 text-[#D4CFC9] animate-pulse" />
                                <span className="text-[10px] font-bold text-[#787570] tracking-wide animate-pulse">写真を読み込み中です...</span>
                            </div>
                            <div className="space-y-3">
                                <div className="w-24 h-4 bg-[#F2EFEA] dark:bg-white/5 rounded-full animate-pulse mx-1" />
                                <div className="flex gap-2 overflow-hidden -mx-4 px-4 pb-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-24 h-24 shrink-0 rounded-2xl bg-[#F2EFEA] dark:bg-white/5 animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── ツール Section ── */}
                <div className="space-y-6">
                    {/* 日々の管理 (Grid Layout - 操作系) */}
                    <nav aria-label="日々の管理" className="bg-[#FAF4ED] dark:bg-white/5 rounded-[32px] p-5 border border-[#F2EFEA] dark:border-white/5">
                        <h2 className="text-[11px] font-bold text-[#787570] dark:text-[#A6A29A] tracking-[0.1em] mb-4 ml-2 uppercase">
                            日々の管理
                        </h2>
                        <div className="grid grid-cols-2 gap-3.5">
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                aria-label="お世話管理: お世話項目の設定・確認"
                                onClick={() => { triggerFeedback('light'); onOpenCareManagement(); }}
                                className="flex flex-col items-start p-4 rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/5 shadow-sm transition-all text-left min-h-[120px] relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-brand-sage/5 rounded-bl-[100px] z-0" />
                                <div className="w-9 h-9 rounded-[12px] bg-brand-sage/10 text-brand-sage flex items-center justify-center mb-3 relative z-10 transition-colors">
                                    <Clock className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="relative z-10 flex-1 flex flex-col justify-end">
                                    <h3 className="font-bold text-[15px] text-[#4E342E] dark:text-[#E8E6E1] mb-1 leading-tight">お世話管理</h3>
                                    <p className={cn(
                                        "text-[11px] font-bold",
                                        careStatus?.done === careStatus?.total && careStatus?.total !== 0 ? "text-brand-sage" : "text-[#A6A29A]"
                                    )}>
                                        {careStatus ? `${careStatus.done} / ${careStatus.total} 完了` : "項目の設定・確認"}
                                    </p>
                                </div>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                aria-label="在庫管理: フードや消耗品の残量"
                                onClick={() => { triggerFeedback('light'); onOpenInventory(); }}
                                className="flex flex-col items-start p-4 rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/5 shadow-sm transition-all text-left min-h-[120px] relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-brand-peach/5 rounded-bl-[100px] z-0" />
                                <div className="w-9 h-9 rounded-[12px] bg-brand-peach/10 text-brand-peach flex items-center justify-center mb-3 relative z-10 transition-colors">
                                    <Package className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="relative z-10 flex-1 flex flex-col justify-end">
                                    <h3 className="font-bold text-[15px] text-[#4E342E] dark:text-[#E8E6E1] mb-1 leading-tight">在庫管理</h3>
                                    <p className={cn(
                                        "text-[11px] font-bold",
                                        inventoryAlertCount > 0 ? "text-brand-peach" : "text-[#A6A29A]"
                                    )}>
                                        {inventoryLoading ? "確認中..." : inventoryAlertCount > 0 ? `不足 ${inventoryAlertCount}件` : `登録 ${inventory.length}件`}
                                    </p>
                                </div>
                            </motion.button>
                        </div>
                    </nav>

                    {/* レポート・分析 (List Layout - 出力・閲覧系) */}
                    <nav aria-label="レポート・分析" className="bg-[#FAF4ED] dark:bg-white/5 rounded-[32px] p-5 border border-[#F2EFEA] dark:border-white/5">
                        <h2 className="text-[11px] font-bold text-[#787570] dark:text-[#A6A29A] tracking-[0.1em] mb-4 ml-2 uppercase">
                            レポート・分析
                        </h2>
                        <div className="flex flex-col gap-3">
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { triggerFeedback('light'); onOpenReport(); }}
                                className="flex items-center p-4 rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/5 shadow-sm transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#FDF8F1] dark:bg-white/10 text-[#4E342E] flex items-center justify-center mr-4 group-hover:bg-[#4E342E] group-hover:text-white transition-colors duration-300">
                                    <FileText className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-[15px] text-[#4E342E] dark:text-[#E8E6E1] leading-tight mb-0.5">受診用レポート</h3>
                                    <p className="text-[12px] text-[#A6A29A] leading-relaxed">獣医さんへの説明用</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-[#D4CFC9]" strokeWidth={1.5} />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { triggerFeedback('light'); onOpenSitter(); }}
                                className="flex items-center p-4 rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/5 shadow-sm transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#FDF8F1] dark:bg-white/10 text-[#4E342E] flex items-center justify-center mr-4 group-hover:bg-[#4E342E] group-hover:text-white transition-colors duration-300">
                                    <History className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-[15px] text-[#4E342E] dark:text-[#E8E6E1] leading-tight mb-0.5">引継ぎシート</h3>
                                    <p className="text-[12px] text-[#A6A29A] leading-relaxed">シッターさんへの指示に</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-[#D4CFC9]" strokeWidth={1.5} />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { triggerFeedback('light'); onOpenTrends(); }}
                                className="flex items-center p-4 rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-[#F2EFEA] dark:border-white/5 shadow-sm transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded-full bg-brand-lavender/10 text-brand-lavender flex items-center justify-center mr-4 group-hover:bg-brand-lavender group-hover:text-white transition-colors duration-300">
                                    <TrendingUp className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-[15px] text-[#4E342E] dark:text-[#E8E6E1] leading-tight mb-0.5">健康推移</h3>
                                    <p className="text-[12px] text-[#A6A29A] leading-relaxed">体重や体調の変化をグラフ化</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-[#D4CFC9]" strokeWidth={1.5} />
                            </motion.button>
                        </div>
                    </nav>
                </div>

                <div className="mt-12 flex flex-col items-center justify-center gap-3 opacity-30 pb-10">
                    <Cat className="w-5 h-5 text-[#D4CFC9]" strokeWidth={1} />
                </div>
            </div>
        </div>
    );
};
