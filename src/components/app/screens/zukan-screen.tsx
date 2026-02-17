"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ChevronLeft,
    Loader2,
    ChevronRight,
    Sparkles,
    Calendar,
    Clock,
    Camera,
    Award,
    ImageIcon,
    Wand2,
    AlertTriangle,
    History,
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { PhotoDetailView } from "../immersive/photo-detail-view";
import { WeeklyPageClient } from "../shared/weekly-page-client";
import { subDays, startOfWeek } from "date-fns";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
    needUserConfirm?: boolean;
    userConfirmed?: boolean;
    confirmedAt?: string;
    zukanShelf?: string;
    identificationReason?: string;
    catConfidence?: number;
}

interface ShelfPhoto {
    id: string;
    url: string;
    storagePath: string;
    catId: string;
    catName: string;
    catIds?: string[];
    createdAt: string;
    source: string;
    memo?: string;
    tags?: any[];
    isUrl?: boolean;
    aiAnalysis?: AIAnalysis;
}

interface Shelf {
    name: string;
    photos: ShelfPhoto[];
}

// ─────────────────────────────────
// Helpers
// ─────────────────────────────────

function mapToShelfPhoto(img: any): ShelfPhoto {
    return {
        id: img.id,
        url: getFullImageUrl(img.url, { width: 400, height: 400, resize: "cover", quality: 80 }),
        storagePath: img.url,
        catId: img.cat_id,
        catName: img.cat_name,
        catIds: img.cat_ids,
        createdAt: img.created_at,
        source: img.source || "profile",
        memo: img.memo,
        tags: img.tags,
        isUrl: img.is_url,
        aiAnalysis: img.ai_analysis,
    };
}

function daysAgo(dateStr: string): number {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────
// Props
// ─────────────────────────────────
interface ZukanScreenProps {
    onClose?: () => void;
}

// ─────────────────────────────────
// Main Component
// ─────────────────────────────────
export function ZukanScreen({ onClose }: ZukanScreenProps) {
    const { cats, analyzeCatImage } = useCatContext();
    const { householdId } = useCoreContext();

    const [activeTab, setActiveTab] = useState<'discover' | 'encyclopedia'>('discover');
    const [filterCatId, setFilterCatId] = useState<string | null>(null);
    const [showEmptyShelves, setShowEmptyShelves] = useState(false);
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
    const [selectedDetailImage, setSelectedDetailImage] = useState<any>(null);

    // Verification State
    const [isVerificationOpen, setIsVerificationOpen] = useState(false);

    // Batch tagging state
    const [batchTagging, setBatchTagging] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, done: false });
    const [showWeeklyAlbum, setShowWeeklyAlbum] = useState(false);

    const supabaseRef = useRef(createClient());

    // ─────────────────────────────────
    // Fetch all photos
    // ─────────────────────────────────
    const loadPhotos = useCallback(async () => {
        if (!householdId) return;
        setLoading(true);

        const supabase = supabaseRef.current;
        const { data, error } = await (supabase.rpc as any)("get_unified_gallery", {
            target_household_id: householdId,
            filter_cat_id: filterCatId || undefined,
            limit_count: 500,
            offset_count: 0,
        });

        if (error) {
            console.error("Error loading photos:", error);
            setLoading(false);
            return;
        }

        const items = (data as any[]) || [];
        const photos = items.map((img) => mapToShelfPhoto(img));
        setAllPhotos(photos);
        setLoading(false);
    }, [householdId, filterCatId]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    // ─────────────────────────────────
    // Helper: Categorize Photos (Fixed Shelves)
    // ─────────────────────────────────
    const encyclopediaShelves = useMemo(() => {
        const shelves: Record<string, ShelfPhoto[]> = {
            '眠り': [],
            'ごはん': [],
            '遊び': [],
            '甘えん坊': [],
            'いたずら': [],
            'ハプニング': [],
            'ふたり': [],
            '窓辺': [],
            'おでかけ・病院': [],
            '記念日': [],
            'その他': []
        };

        allPhotos.forEach(photo => {
            const ai = photo.aiAnalysis;
            const labels = ai?.labels;

            // 1. Priority: Direct Zukan Shelf Mapping from AI
            if (ai?.zukanShelf && shelves[ai.zukanShelf]) {
                shelves[ai.zukanShelf].push(photo);
            }
            // 2. Fallback: By Labels (mapping from English keys)
            else if (labels) {
                if (labels.moment === 'sleep' || labels.moment === 'rest') shelves['眠り'].push(photo);
                else if (labels.moment === 'meal') shelves['ごはん'].push(photo);
                else if (labels.moment === 'play' || labels.moment === 'explore') shelves['遊び'].push(photo);
                else if (labels.moment === 'cuddle' || labels.moment === 'grooming') shelves['甘えん坊'].push(photo);
                else if (labels.moment === 'mischief') shelves['いたずら'].push(photo);
                else if (labels.moment === 'accident') shelves['ハプニング'].push(photo);

                if (labels.shot === 'two_cats') shelves['ふたり'].push(photo);

                if (labels.scene === 'window') shelves['窓辺'].push(photo);
                if (labels.scene === 'vet' || labels.scene === 'outside') shelves['おでかけ・病院'].push(photo);
            }
            // 3. Last Resort: Tags
            else if (photo.tags && photo.tags.length > 0) {
                const t = photo.tags.map((t: any) => (typeof t === 'string' ? t : t.name));
                if (t.includes('寝顔') || t.includes('寝る')) shelves['眠り'].push(photo);
                else if (t.includes('ごはん') || t.includes('食べる')) shelves['ごはん'].push(photo);
                else shelves['その他'].push(photo);
            } else {
                shelves['その他'].push(photo);
            }
        });

        // Return all shelves, even empty ones
        return Object.entries(shelves)
            .map(([name, photos]) => ({
                name,
                photos: photos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            }));
    }, [allPhotos]);

    // ─────────────────────────────────
    // Discover Logic
    // ─────────────────────────────────
    const discoverItems = useMemo(() => {
        // 1. Daily Pick (Highest score today)
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));

        const todaysPhotos = allPhotos.filter(p => new Date(p.createdAt) >= startOfToday);
        const dailyPick = todaysPhotos.sort((a, b) => (b.aiAnalysis?.forYouScores?.dailyPick || 0) - (a.aiAnalysis?.forYouScores?.dailyPick || 0))[0];

        // 2. Weekly Highlight (Fallback to 'Recent' if empty)
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        let weeklyPhotos = allPhotos.filter(p => new Date(p.createdAt) >= weekStart);

        const isFallback = weeklyPhotos.length === 0;
        if (isFallback) {
            // If no photos this week, get latest highly scored photos
            weeklyPhotos = [...allPhotos];
        }

        const weeklyHighlight = weeklyPhotos
            .filter(p => p.id !== dailyPick?.id)
            .sort((a, b) => (b.aiAnalysis?.forYouScores?.weeklyHighlight || 0) - (a.aiAnalysis?.forYouScores?.weeklyHighlight || 0))
            .slice(0, 6);

        // 3. Similar Day (Past photo)
        let similarDay = null;
        if (dailyPick && dailyPick.aiAnalysis?.labels) {
            const { scene, moment } = dailyPick.aiAnalysis.labels;
            if (scene || moment) {
                const candidates = allPhotos.filter(p =>
                    p.id !== dailyPick.id &&
                    new Date(p.createdAt) < startOfToday &&
                    (p.aiAnalysis?.labels?.scene === scene || p.aiAnalysis?.labels?.moment === moment)
                );
                if (candidates.length > 0) {
                    similarDay = candidates[Math.floor(Math.random() * candidates.length)];
                }
            }
        }

        return { dailyPick, weeklyHighlight, similarDay, isFallback };
    }, [allPhotos]);

    // ─────────────────────────────────
    // UI Helpers
    // ─────────────────────────────────
    const openDetail = (photo: ShelfPhoto) =>
        setSelectedDetailImage({
            id: photo.id,
            url: photo.url,
            catName: photo.catName,
            catIds: photo.catIds,
            createdAt: photo.createdAt,
            source: photo.source,
            memo: photo.memo,
            tags: photo.tags,
            aiAnalysis: photo.aiAnalysis
        });

    // ─────────────────────────────────
    // Verification Items
    // ─────────────────────────────────
    const verificationQueue = useMemo(() => {
        return allPhotos.filter(p => p.aiAnalysis && p.aiAnalysis.needUserConfirm === true).map(p => ({
            id: p.id,
            url: p.url,
            aiAnalysis: p.aiAnalysis,
            currentCatId: p.catId
        }));
    }, [allPhotos]);

    // ─────────────────────────────────
    // Batch AI tagging (Existing Logic)
    // ─────────────────────────────────
    // Update Untagged Count to identify photos without AI Analysis
    const untaggedCount = useMemo(() => {
        return allPhotos.filter(
            (p) => !p.aiAnalysis
        ).length;
    }, [allPhotos]);

    const runBatchTagging = useCallback(async () => {
        // Filter for photos that haven't been analyzed by AI yet
        const untagged = allPhotos.filter(
            (p) => !p.aiAnalysis
        );
        if (untagged.length === 0) return;

        setBatchTagging(true);
        setBatchProgress({ current: 0, total: untagged.length, done: false });

        for (let i = 0; i < untagged.length; i++) {
            const photo = untagged[i];
            const imageUrl = getFullImageUrl(photo.storagePath, { width: 800, height: 800, resize: 'contain', quality: 90 });

            try {
                const { error: invokeError } = await analyzeCatImage(photo.id, imageUrl);
                if (invokeError) {
                    console.error(`[AI Batch] Error (Photo ${i + 1}):`, invokeError);
                    // Error handling...
                }
            } catch (e) {
                console.error("[AI Batch] Unexpected exception:", e);
            }
            setBatchProgress({ current: i + 1, total: untagged.length, done: false });
            if (i < untagged.length - 1) await new Promise((r) => setTimeout(r, 2000));
        }

        setBatchProgress((prev) => ({ ...prev, done: true }));
        setBatchTagging(false);
        loadPhotos();
    }, [allPhotos, loadPhotos, analyzeCatImage]);


    // ─────────────────────────────────
    // Render: Shelf Detail
    // ─────────────────────────────────
    if (selectedShelf) {
        return (
            <div className="fixed inset-0 z-50 bg-[#fafafa] dark:bg-[#1c1c1e] flex flex-col">
                <div className="sticky top-0 z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10 pt-[env(safe-area-inset-top)]">
                    <div className="flex items-center justify-between px-5 h-14">
                        <button
                            onClick={() => setSelectedShelf(null)}
                            className="flex items-center gap-0.5 text-[#007AFF] font-semibold text-[15px] active:opacity-50 transition-opacity"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            戻る
                        </button>
                        <h2 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">
                            {selectedShelf.name}
                        </h2>
                        <span className="text-[13px] text-[#8e8e93] font-medium tabular-nums">
                            {selectedShelf.photos.length}枚
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-[2px] pb-24">
                        {selectedShelf.photos.map((photo, idx) => (
                            <motion.div
                                key={photo.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                                className="relative aspect-square bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer overflow-hidden active:opacity-80 transition-opacity"
                                onClick={() => openDetail(photo)}
                            >
                                <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            </motion.div>
                        ))}
                    </div>
                </div>

                <PhotoDetailView
                    isOpen={!!selectedDetailImage}
                    onClose={() => setSelectedDetailImage(null)}
                    image={selectedDetailImage}
                />
            </div>
        );
    }

    // ─────────────────────────────────
    // Render: Main Screen
    // ─────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-[#fafafa] dark:bg-[#1c1c1e] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center justify-between px-5 h-14">
                    <button
                        onClick={onClose}
                        className="p-1.5 -ml-1.5 rounded-full active:bg-black/5 dark:active:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5 text-[#8e8e93]" />
                    </button>

                    {/* Segmented Control for Tabs */}
                    <div className="flex p-0.5 bg-[#767680]/15 rounded-lg w-[180px]">
                        <button
                            onClick={() => setActiveTab('discover')}
                            className={cn(
                                "flex-1 text-[13px] font-semibold py-1 rounded-[6px] transition-all",
                                activeTab === 'discover' ? "bg-white shadow-sm text-black" : "text-[#8e8e93]"
                            )}
                        >
                            みつける
                        </button>
                        <button
                            onClick={() => setActiveTab('encyclopedia')}
                            className={cn(
                                "flex-1 text-[13px] font-semibold py-1 rounded-[6px] transition-all",
                                activeTab === 'encyclopedia' ? "bg-white shadow-sm text-black" : "text-[#8e8e93]"
                            )}
                        >
                            図鑑
                        </button>
                    </div>

                    {/* Right Action: Verify or AI Analyze */}
                    <div className="flex items-center justify-end w-20">
                        {(() => {
                            if (verificationQueue.length > 0) {
                                return (
                                    <button
                                        onClick={() => setIsVerificationOpen(true)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white shadow-sm animate-pulse"
                                    >
                                        <span className="font-bold text-xs">{verificationQueue.length}</span>
                                    </button>
                                );
                            }
                            if (batchTagging) {
                                return (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8e8e93]/10 text-[#8e8e93] text-[11px] font-medium animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>{batchProgress.current}/{batchProgress.total}</span>
                                    </div>
                                );
                            }
                            if (untaggedCount > 0) {
                                return (
                                    <button
                                        onClick={runBatchTagging}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-[12px] font-semibold active:bg-[#007AFF]/20 transition-colors"
                                    >
                                        <Wand2 className="w-3.5 h-3.5" />
                                        <span className="text-[10px] ml-0.5">{untaggedCount}</span>
                                    </button>
                                );
                            }
                            return <div className="w-8" />;
                        })()}
                    </div>
                </div>
            </div>

            {/* Cat Filter Selector (Sticky Chips) */}
            <div className="sticky top-[56px] z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10 flex-shrink-0">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 py-3">
                    <button
                        onClick={() => setFilterCatId(null)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 h-9 rounded-full border transition-all shrink-0 font-bold text-[13px]",
                            filterCatId === null
                                ? "bg-[#1c1c1e] dark:bg-white border-[#1c1c1e] dark:border-white text-white dark:text-black shadow-sm"
                                : "bg-white dark:bg-[#2c2c2e] border-[#e5e5ea] dark:border-white/10 text-[#8e8e93]"
                        )}
                    >
                        すべて
                    </button>
                    {cats.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilterCatId(cat.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 h-9 rounded-full border transition-all shrink-0 font-bold text-[13px]",
                                filterCatId === cat.id
                                    ? "bg-[#1c1c1e] dark:bg-white border-[#1c1c1e] dark:border-white text-white dark:text-black shadow-sm"
                                    : "bg-white dark:bg-[#2c2c2e] border-[#e5e5ea] dark:border-white/10 text-[#8e8e93]"
                            )}
                        >
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#f2f2f7] dark:bg-[#3a3a3c] shrink-0">
                                {cat.avatar && cat.avatar !== '🐈' ? (
                                    <img src={cat.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px]">🐈</div>
                                )}
                            </div>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Verification Banner (Optional, sticky below header) */}
            {verificationQueue.length > 0 && (
                <div
                    onClick={() => setIsVerificationOpen(true)}
                    className="mx-5 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between cursor-pointer active:opacity-70 transition-opacity"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-100">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                {verificationQueue.length}枚の確認が必要です
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                AIが自信を持てない写真があります
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-[#c7c7cc]" />
                        <p className="text-[13px] text-[#8e8e93]">読み込み中...</p>
                    </div>
                ) : allPhotos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-8">
                        <div className="w-20 h-20 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center">
                            <Camera className="w-8 h-8 text-[#c7c7cc]" />
                        </div>
                        <p className="text-[15px] font-bold text-[#8e8e93]">まだ写真がありません</p>
                    </div>
                ) : (
                    <div className="pb-24 pt-4">

                        {/* ─── DISCOVER TAB ─── */}
                        {activeTab === 'discover' && (
                            <div className="px-5 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* 1. Today's Pick */}
                                {discoverItems.dailyPick ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">今日の1枚</h3>
                                        </div>
                                        <div
                                            className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-lg cursor-pointer active:scale-[0.98] transition-all"
                                            onClick={() => openDetail(discoverItems.dailyPick!)}
                                        >
                                            <img src={discoverItems.dailyPick.url} className="w-full h-full object-cover" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            <div className="absolute bottom-4 left-4 right-4">
                                                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[11px] font-bold mb-1">
                                                    {discoverItems.dailyPick.catName}
                                                </div>
                                                {discoverItems.dailyPick.aiAnalysis?.uiTags && (
                                                    <p className="text-white text-[13px] font-medium opacity-90">
                                                        #{discoverItems.dailyPick.aiAnalysis.uiTags[0]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-[#f2f2f7] rounded-2xl">
                                        <p className="text-[#8e8e93] text-sm">今日の写真はまだありません</p>
                                    </div>
                                )}

                                {/* 2. Weekly Highlight */}
                                {discoverItems.weeklyHighlight.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">
                                                {discoverItems.isFallback ? '最近のハイライト' : '今週のハイライト'}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {discoverItems.weeklyHighlight.map((photo, i) => (
                                                <div
                                                    key={photo.id}
                                                    className={cn(
                                                        "relative rounded-xl overflow-hidden cursor-pointer",
                                                        i === 0 ? "aspect-square col-span-2" : "aspect-square"
                                                    )}
                                                    onClick={() => openDetail(photo)}
                                                >
                                                    <img src={photo.url} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Similar Day */}
                                {discoverItems.similarDay && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">似ている日</h3>
                                        </div>
                                        <div className="flex items-center gap-4 bg-[#f2f2f7] p-4 rounded-2xl cursor-pointer" onClick={() => openDetail(discoverItems.similarDay!)}>
                                            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                                                <img src={discoverItems.similarDay.url} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#1c1c1e] text-[15px] mb-1">
                                                    {new Date(discoverItems.similarDay.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-[12px] text-[#8e8e93]">
                                                    {discoverItems.similarDay.aiAnalysis?.labels?.moment === discoverItems.dailyPick?.aiAnalysis?.labels?.moment
                                                        ? '同じような行動をしていました'
                                                        : '同じ場所で過ごしていました'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── ENCYCLOPEDIA TAB ─── */}
                        {activeTab === 'encyclopedia' && (
                            <div className="px-5 space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                {encyclopediaShelves.length > 0 ? (
                                    <div className="space-y-4">
                                        {encyclopediaShelves
                                            .filter(s => showEmptyShelves || s.photos.length > 0)
                                            .map((shelf, shelfIdx) => (
                                                <ShelfRow
                                                    key={shelf.name}
                                                    shelf={shelf}
                                                    index={shelfIdx}
                                                    onTap={() => setSelectedShelf(shelf)}
                                                    onPhotoTap={openDetail}
                                                />
                                            ))
                                        }

                                        {/* Show Empty Shelves Toggle */}
                                        <div className="pt-8 pb-12 flex justify-center">
                                            <button
                                                onClick={() => setShowEmptyShelves(!showEmptyShelves)}
                                                className="px-5 py-2.5 bg-[#8e8e93]/10 dark:bg-white/5 rounded-full text-[13px] font-bold text-[#8e8e93] active:scale-95 transition-all"
                                            >
                                                {showEmptyShelves ? "空の棚を隠す" : `空の棚も表示する (${encyclopediaShelves.filter(s => s.photos.length === 0).length})`}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-[#8e8e93]">
                                        <p>まだコレクションがありません</p>
                                        <button onClick={runBatchTagging} className="mt-4 text-[#007AFF] text-sm font-bold">
                                            AIで写真を整理する
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>

            <PhotoDetailView
                isOpen={!!selectedDetailImage}
                onClose={() => setSelectedDetailImage(null)}
                image={selectedDetailImage}
            />

            {/* Weekly Album Modal */}
            <AnimatePresence>
                {showWeeklyAlbum && (
                    <WeeklyPageClient onClose={() => setShowWeeklyAlbum(false)} />
                )}
            </AnimatePresence>

            {/* Verification Modal */}
            <AnimatePresence>
                {isVerificationOpen && (
                    <VerificationModal
                        queue={verificationQueue}
                        onClose={() => {
                            setIsVerificationOpen(false);
                            loadPhotos();
                        }}
                        cats={cats}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────
// Verification Modal
// ─────────────────────────────────
function VerificationModal({
    queue,
    onClose,
    cats,
}: {
    queue: any[];
    onClose: () => void;
    cats: any[];
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { updateCatImage } = useCatContext();
    const currentItem = queue[currentIndex];

    const handleConfirm = async (catId: string) => {
        if (!currentItem) return;

        // Update the image with the confirmed catId and remove the flag
        const updates = {
            cat_id: catId,
            cat_ids: [catId], // Update array too
            ai_analysis: {
                ...currentItem.aiAnalysis,
                catId: catId,
                needUserConfirm: false,
                userConfirmed: true,
                confirmedAt: new Date().toISOString()
            }
        };

        await updateCatImage(currentItem.id, updates);

        if (currentIndex < queue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    if (!currentItem) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col pt-[env(safe-area-inset-top)]"
        >
            <div className="flex items-center justify-between px-5 h-14 shrink-0">
                <h2 className="text-white font-bold text-[17px]">この子はだれ？</h2>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto">
                {/* Photo */}
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <img src={currentItem.url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                        <p className="text-white text-[11px] font-bold">
                            判定待ち: {currentIndex + 1} / {queue.length}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-white/60 text-center text-sm">
                        AIが自信を持って判断できませんでした。<br />正しい子を選んでください。
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {cats.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleConfirm(cat.id)}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 active:bg-white/10 transition-colors"
                            >
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent">
                                    {cat.avatar && cat.avatar !== '🐈' ? (
                                        <img src={cat.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-[#2c2c2e] flex items-center justify-center text-[#8e8e93]">
                                            <ImageIcon className="w-8 h-8 opacity-40" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-white font-bold">{cat.name}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => handleConfirm('null')} // Explicitly set to unknown
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:bg-white/10 transition-colors col-span-2"
                        >
                            <span className="text-white/40 font-bold text-sm">どちらでもない / 分からない</span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────
// Shelf Row (Apple Photos style)
// ─────────────────────────────────
// ─────────────────────────────────
// Shelf Row (Apple Photos style)
// ─────────────────────────────────
function ShelfRow({
    shelf,
    index,
    onTap,
    onPhotoTap,
}: {
    shelf: Shelf;
    index: number;
    onTap: () => void;
    onPhotoTap: (photo: ShelfPhoto) => void;
}) {
    // Number of photos to show directly (max 2 if there's a count card, otherwise up to 3)
    const displayCount = shelf.photos.length > 3 ? 2 : 3;
    const items = shelf.photos.slice(0, displayCount);
    // Fill with nulls to maintain 3 columns
    const placeholders = Array(Math.max(0, 3 - shelf.photos.length)).fill(null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4, ease: "easeOut" }}
            className="mb-8"
        >
            <button
                onClick={onTap}
                className="w-full h-[54px] flex items-center justify-between px-5 group active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors rounded-xl"
            >
                <div className="flex items-baseline gap-2">
                    <h3 className="text-[20px] font-bold text-[#1c1c1e] dark:text-white tracking-tight leading-none">
                        {shelf.name}
                    </h3>
                    <span className="text-[14px] font-bold text-[#c7c7cc] tabular-nums leading-none">
                        {shelf.photos.length}
                    </span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#c7c7cc] group-active:translate-x-0.5 transition-transform" />
            </button>

            <div className="grid grid-cols-3 gap-[4px] px-5 mt-0.5">
                {items.map((photo, idx) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.12) }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer active:scale-[0.97] transition-all ring-1 ring-black/[0.05] shadow-sm"
                        onClick={() => onPhotoTap(photo)}
                    >
                        <img
                            src={photo.url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                ))}

                {shelf.photos.length > 3 ? (
                    <button
                        onClick={onTap}
                        className="aspect-square rounded-xl bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-black/[0.05] flex flex-col items-center justify-center gap-0 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-all overflow-hidden group shadow-sm"
                    >
                        <span className="text-[21px] font-bold text-[#818186] dark:text-[#a1a1a6] tabular-nums group-active:scale-110 transition-transform leading-none">
                            +{shelf.photos.length - 2}
                        </span>
                        <div className="text-[10px] font-black text-[#8e8e93] opacity-60 mt-1.5 uppercase tracking-wider">残り</div>
                    </button>
                ) : (
                    placeholders.map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="aspect-square rounded-xl bg-[#f5f5f7]/50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                        />
                    ))
                )}
            </div>
        </motion.div>
    );
}
