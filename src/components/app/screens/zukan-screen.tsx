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
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { PhotoDetailView } from "../immersive/photo-detail-view";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────
// Types
// ─────────────────────────────────
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
}

interface Shelf {
    name: string;
    photos: ShelfPhoto[];
}

// ─────────────────────────────────
// Helpers
// ─────────────────────────────────
function resolvePhotoUrl(img: any, supabase: any): string {
    if (img.is_url) return img.url;
    const bucket = img.url?.startsWith("cat-photos/") ? "cat-images" : "avatars";
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(img.url, {
            transform: { width: 400, height: 400, resize: "cover", quality: 80 },
        });
    return data.publicUrl;
}

function resolveFullUrl(img: any, supabase: any): string {
    if (img.is_url) return img.url;
    const bucket = img.url?.startsWith("cat-photos/") ? "cat-images" : "avatars";
    const { data } = supabase.storage.from(bucket).getPublicUrl(img.url);
    return data.publicUrl;
}

function mapToShelfPhoto(img: any, supabase: any): ShelfPhoto {
    return {
        id: img.id,
        url: resolvePhotoUrl(img, supabase),
        storagePath: img.url,
        catId: img.cat_id,
        catName: img.cat_name,
        catIds: img.cat_ids,
        createdAt: img.created_at,
        source: img.source || "profile",
        memo: img.memo,
        tags: img.tags,
        isUrl: img.is_url,
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

    const [filterCatId, setFilterCatId] = useState<string | null>(null);
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
    const [selectedDetailImage, setSelectedDetailImage] = useState<any>(null);

    // Batch tagging state
    const [batchTagging, setBatchTagging] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, done: false });

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
        const photos = items.map((img) => mapToShelfPhoto(img, supabase));
        setAllPhotos(photos);
        setLoading(false);
    }, [householdId, filterCatId]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    // ─────────────────────────────────
    // Curation data
    // ─────────────────────────────────

    // Days together + milestone
    const daysTogether = useMemo(() => {
        if (allPhotos.length === 0) return null;
        const oldest = allPhotos.reduce((min, p) =>
            new Date(p.createdAt) < new Date(min.createdAt) ? p : min
        );
        const days = daysAgo(oldest.createdAt);
        // Milestone: 7, 14, 30, 60, 90, 100, 180, 365日
        const milestones = [7, 14, 30, 60, 90, 100, 180, 365];
        const activeMilestone = milestones.find(m => days >= m && days <= m + 2);
        return {
            days,
            photo: oldest,
            totalPhotos: allPhotos.length,
            milestone: activeMilestone || null,
        };
    }, [allPhotos]);

    // Recent best: photos from the last 30 days (works from day 1)
    const recentBestPhotos = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return allPhotos
            .filter((p) => new Date(p.createdAt) >= cutoff)
            .sort(() => Math.random() - 0.5)
            .slice(0, 6);
    }, [allPhotos]);

    // First photos: the earliest 3 photos ("はじめての思い出")
    const firstPhotos = useMemo(() => {
        if (allPhotos.length < 3) return []; // need enough photos to be meaningful
        return [...allPhotos]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .slice(0, 3);
    }, [allPhotos]);

    // 1 year ago
    const oneYearAgoPhotos = useMemo(() => {
        const now = new Date();
        return allPhotos.filter((p) => {
            const d = new Date(p.createdAt);
            const diffDays = Math.abs(
                Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) - 365
            );
            return diffDays <= 3;
        });
    }, [allPhotos]);

    // ─────────────────────────────────
    // Collection data (dynamic shelves from AI tags)
    // ─────────────────────────────────
    const shelves = useMemo(() => {
        const shelfMap = new Map<string, ShelfPhoto[]>();
        for (const photo of allPhotos) {
            if (!photo.tags || !Array.isArray(photo.tags) || photo.tags.length === 0) continue;
            for (const tag of photo.tags) {
                const tagName = typeof tag === "string" ? tag : tag.name;
                if (!tagName) continue;
                if (!shelfMap.has(tagName)) shelfMap.set(tagName, []);
                shelfMap.get(tagName)!.push(photo);
            }
        }
        return Array.from(shelfMap.entries())
            .map(([name, photos]) => ({
                name,
                photos: photos.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ),
            }))
            .sort((a, b) => b.photos.length - a.photos.length);
    }, [allPhotos]);

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
        });

    // ─────────────────────────────────
    // Batch AI tagging
    // ─────────────────────────────────
    const untaggedCount = useMemo(() => {
        return allPhotos.filter(
            (p) => p.source === "profile" && (!p.tags || (Array.isArray(p.tags) && p.tags.length === 0))
        ).length;
    }, [allPhotos]);

    const runBatchTagging = useCallback(async () => {
        const untagged = allPhotos.filter(
            (p) => p.source === "profile" && (!p.tags || (Array.isArray(p.tags) && p.tags.length === 0))
        );
        if (untagged.length === 0) return;

        setBatchTagging(true);
        setBatchProgress({ current: 0, total: untagged.length, done: false });

        for (let i = 0; i < untagged.length; i++) {
            const photo = untagged[i];
            const bucket = photo.storagePath?.startsWith("cat-photos/") ? "cat-images" : "avatars";
            const { data: urlData } = supabaseRef.current.storage.from(bucket).getPublicUrl(photo.storagePath);
            const imageUrl = urlData.publicUrl;

            try {
                const { error: invokeError } = await analyzeCatImage(photo.id, imageUrl);

                if (invokeError) {
                    console.error(`[AI Batch] Error (Photo ${i + 1}):`, invokeError);

                    // 401 Unauthorized または 403 Forbidden は致命的なので停止
                    const status = (invokeError as any).status;
                    const isFatal = status === 401 || status === 403 || invokeError.message?.includes("401");

                    if (isFatal) {
                        console.error("[AI Batch] Fatal auth error. Stopping.");
                        setBatchTagging(false);
                        return;
                    }

                    // それ以外のエラー（OpenAI側のタイムアウト等）は、少し待って次へ進む
                    console.warn(`[AI Batch] Sporadic error on photo ${i + 1}. Cooling down 5s...`);
                    await new Promise((r) => setTimeout(r, 5000));
                }
            } catch (e) {
                console.error("[AI Batch] Unexpected exception:", e);
                await new Promise((r) => setTimeout(r, 5000));
            }

            setBatchProgress({ current: i + 1, total: untagged.length, done: false });

            if (i < untagged.length - 1) {
                await new Promise((r) => setTimeout(r, 2000));
            }
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
                <div className="sticky top-0 z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10">
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
                                <img
                                    src={photo.url}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                />
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
            <div className="sticky top-0 z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10">
                <div className="flex items-center justify-between px-5 h-14">
                    <button
                        onClick={onClose}
                        className="p-1.5 -ml-1.5 rounded-full active:bg-black/5 dark:active:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5 text-[#8e8e93]" />
                    </button>
                    <h1 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">
                        コレクション
                    </h1>
                    {untaggedCount > 0 && !batchTagging ? (
                        <button
                            onClick={runBatchTagging}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-[12px] font-semibold active:bg-[#007AFF]/20 transition-colors"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            AI分析
                        </button>
                    ) : (
                        <div className="w-8" />
                    )}
                </div>
            </div>

            {/* Cat Filter */}
            {cats.length > 1 && (
                <div className="px-5 pt-3 pb-1">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setFilterCatId(null)}
                            className={cn(
                                "flex items-center gap-2 px-4 h-8 rounded-full text-[13px] font-semibold shrink-0 transition-all",
                                !filterCatId
                                    ? "bg-[#1c1c1e] dark:bg-white text-white dark:text-[#1c1c1e]"
                                    : "bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#8e8e93]"
                            )}
                        >
                            すべて
                        </button>
                        {cats.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCatId(cat.id)}
                                className={cn(
                                    "flex items-center gap-2 px-1.5 pr-3.5 h-8 rounded-full text-[13px] font-semibold shrink-0 transition-all",
                                    filterCatId === cat.id
                                        ? "bg-[#1c1c1e] dark:bg-white text-white dark:text-[#1c1c1e]"
                                        : "bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#8e8e93]"
                                )}
                            >
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-[#e5e5ea]">
                                    {cat.avatar && !cat.avatar.startsWith("🐈") ? (
                                        <img src={getFullImageUrl(cat.avatar)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs">🐈</div>
                                    )}
                                </div>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Batch Tagging Progress */}
            {batchTagging && (
                <div className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-[#007AFF] shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[12px] font-semibold text-[#1c1c1e] dark:text-white">
                                    AI分析中...
                                </p>
                                <p className="text-[12px] text-[#8e8e93] tabular-nums">
                                    {batchProgress.current}/{batchProgress.total}枚
                                </p>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#e5e5ea] dark:bg-[#3a3a3c] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-[#007AFF]"
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
                                    }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    </div>
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
                        <div className="text-center">
                            <p className="text-[17px] font-bold text-[#1c1c1e] dark:text-white mb-1">
                                まだ写真がありません
                            </p>
                            <p className="text-[13px] text-[#8e8e93] leading-relaxed">
                                写真を撮ると、ここに自動で<br />整理されていきます
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="pb-24">
                        {/* ──────────── CURATION SECTION ──────────── */}
                        <div className="px-5 pt-4 pb-2">
                            <h2 className="text-[22px] font-bold text-[#1c1c1e] dark:text-white tracking-tight">
                                For You
                            </h2>
                        </div>

                        {/* Days Together Card */}
                        {daysTogether && (
                            <div className="px-5 mb-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="relative rounded-2xl overflow-hidden bg-[#1c1c1e] h-[120px]"
                                >
                                    {/* Background thumbnail */}
                                    <img
                                        src={daysTogether.photo.url}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                                    <div className="relative h-full flex flex-col justify-center px-5">
                                        <div className="flex items-baseline gap-1.5 mb-1">
                                            <span className="text-[32px] font-black text-white tabular-nums leading-none">
                                                {daysTogether.days.toLocaleString()}
                                            </span>
                                            <span className="text-[14px] font-semibold text-white/70">日</span>
                                        </div>
                                        <p className="text-[13px] text-white/60 font-medium">
                                            一緒に過ごした日々 · {daysTogether.totalPhotos}枚の思い出
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Milestone Banner */}
                        {daysTogether?.milestone && (
                            <div className="px-5 mb-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="rounded-2xl bg-gradient-to-r from-[#FFD60A]/20 to-[#FF9F0A]/20 dark:from-[#FFD60A]/10 dark:to-[#FF9F0A]/10 p-4 border border-[#FFD60A]/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#FFD60A]/20 flex items-center justify-center">
                                            <Award className="w-5 h-5 text-[#FF9F0A]" />
                                        </div>
                                        <div>
                                            <p className="text-[15px] font-bold text-[#1c1c1e] dark:text-white">
                                                {daysTogether.milestone}日記念
                                            </p>
                                            <p className="text-[12px] text-[#8e8e93]">
                                                {daysTogether.totalPhotos}枚の思い出が集まりました
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Recent Best (30 days) */}
                        {recentBestPhotos.length > 0 && (
                            <div className="mb-5">
                                <div className="flex items-center gap-2 px-5 mb-2.5">
                                    <Sparkles className="w-4 h-4 text-[#8e8e93]" />
                                    <h3 className="text-[15px] font-bold text-[#1c1c1e] dark:text-white">
                                        最近のベスト
                                    </h3>
                                </div>
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5">
                                    {recentBestPhotos.map((photo, idx) => (
                                        <motion.div
                                            key={photo.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.08, duration: 0.4 }}
                                            className="shrink-0 w-[160px] h-[200px] rounded-xl overflow-hidden bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer relative active:scale-[0.97] transition-transform"
                                            onClick={() => openDetail(photo)}
                                        >
                                            <img
                                                src={photo.url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/50 to-transparent">
                                                <p className="text-[11px] font-medium text-white/80">
                                                    {photo.catName}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* First Photos */}
                        {firstPhotos.length > 0 && (
                            <div className="mb-5">
                                <div className="flex items-center gap-2 px-5 mb-2.5">
                                    <ImageIcon className="w-4 h-4 text-[#8e8e93]" />
                                    <h3 className="text-[15px] font-bold text-[#1c1c1e] dark:text-white">
                                        はじめての思い出
                                    </h3>
                                </div>
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5">
                                    {firstPhotos.map((photo, idx) => (
                                        <motion.div
                                            key={photo.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.08, duration: 0.4 }}
                                            className="shrink-0 w-[160px] h-[200px] rounded-xl overflow-hidden bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer relative active:scale-[0.97] transition-transform"
                                            onClick={() => openDetail(photo)}
                                        >
                                            <img
                                                src={photo.url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/50 to-transparent">
                                                <p className="text-[11px] font-medium text-white/80">
                                                    {new Date(photo.createdAt).toLocaleDateString("ja-JP")}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 1 Year Ago */}
                        {oneYearAgoPhotos.length > 0 && (
                            <div className="mb-5">
                                <div className="flex items-center gap-2 px-5 mb-2.5">
                                    <Calendar className="w-4 h-4 text-[#8e8e93]" />
                                    <h3 className="text-[15px] font-bold text-[#1c1c1e] dark:text-white">
                                        1年前の今日
                                    </h3>
                                </div>
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5">
                                    {oneYearAgoPhotos.map((photo, idx) => (
                                        <motion.div
                                            key={photo.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.08, duration: 0.4 }}
                                            className="shrink-0 w-[160px] h-[200px] rounded-xl overflow-hidden bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer relative active:scale-[0.97] transition-transform"
                                            onClick={() => openDetail(photo)}
                                        >
                                            <img
                                                src={photo.url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/50 to-transparent">
                                                <p className="text-[11px] font-medium text-white/80">
                                                    {new Date(photo.createdAt).toLocaleDateString("ja-JP")}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ──────────── COLLECTION SECTION ──────────── */}
                        {shelves.length > 0 && (
                            <>
                                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                                    <h2 className="text-[22px] font-bold text-[#1c1c1e] dark:text-white tracking-tight">
                                        コレクション
                                    </h2>
                                    <span className="text-[13px] text-[#8e8e93]">
                                        {shelves.length}カテゴリ
                                    </span>
                                </div>

                                {shelves.map((shelf, shelfIdx) => (
                                    <ShelfRow
                                        key={shelf.name}
                                        shelf={shelf}
                                        index={shelfIdx}
                                        onTap={() => setSelectedShelf(shelf)}
                                        onPhotoTap={openDetail}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                )}
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
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4, ease: "easeOut" }}
            className="mb-5"
        >
            <button
                onClick={onTap}
                className="w-full flex items-center justify-between px-5 pb-2 group active:opacity-60 transition-opacity"
            >
                <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white tracking-tight">
                        {shelf.name}
                    </h3>
                    <span className="text-[13px] font-medium text-[#8e8e93] tabular-nums">
                        {shelf.photos.length}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 text-[#007AFF]">
                    <span className="text-[13px] font-medium">すべて見る</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </div>
            </button>

            <div className="flex gap-[3px] overflow-x-auto scrollbar-hide px-5">
                {shelf.photos.slice(0, 8).map((photo, idx) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.12) }}
                        className="shrink-0 w-[120px] h-[120px] rounded-lg overflow-hidden bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer active:scale-[0.97] transition-transform"
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

                {shelf.photos.length > 8 && (
                    <button
                        onClick={onTap}
                        className="shrink-0 w-[120px] h-[120px] rounded-lg bg-[#f2f2f7] dark:bg-[#2c2c2e] flex flex-col items-center justify-center gap-1 active:bg-[#e5e5ea] transition-colors"
                    >
                        <span className="text-[20px] font-bold text-[#8e8e93] tabular-nums">
                            +{shelf.photos.length - 8}
                        </span>
                        <span className="text-[11px] font-medium text-[#8e8e93]">
                            すべて見る
                        </span>
                    </button>
                )}
            </div>
        </motion.div>
    );
}
