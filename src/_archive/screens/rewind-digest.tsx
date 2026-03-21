"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    X,
    Share2,
    Film,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfWeek, subDays } from "date-fns";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────
// Types
// ─────────────────────────────────
interface DigestPhoto {
    id: string;
    url: string;
    catName: string;
    createdAt: string;
    memo?: string;
}

interface RewindDigestCardProps {
    allPhotos: DigestPhoto[];
    onPhotoTap?: (photo: DigestPhoto) => void;
}

type Period = "week" | "month" | "all";

// ─────────────────────────────────
// Helper: Group photos by date, pick best per day
// ─────────────────────────────────
function getDailyBestPhotos(photos: DigestPhoto[], period: Period): DigestPhoto[] {
    const now = new Date();
    let cutoff: Date;

    switch (period) {
        case "week":
            cutoff = startOfWeek(now, { weekStartsOn: 1 });
            break;
        case "month":
            cutoff = subDays(now, 30);
            break;
        case "all":
            cutoff = new Date(0);
            break;
    }

    // Filter by period
    const filtered = photos.filter(
        (p) => new Date(p.createdAt) >= cutoff
    );

    // Group by date string (YYYY-MM-DD)
    const byDate: Record<string, DigestPhoto[]> = {};
    filtered.forEach((photo) => {
        const dateKey = new Date(photo.createdAt).toISOString().split("T")[0];
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(photo);
    });

    // Pick first photo per day (sorted by date ascending for chronological playback)
    const dailyPicks = Object.keys(byDate)
        .sort()
        .map((dateKey) => byDate[dateKey][0]);

    return dailyPicks;
}

// ─────────────────────────────────
// Fullscreen Player
// ─────────────────────────────────
function RewindFullscreenPlayer({
    photos,
    isOpen,
    onClose,
    initialIndex = 0,
}: {
    photos: DigestPhoto[];
    isOpen: boolean;
    onClose: () => void;
    initialIndex?: number;
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPlaying, setIsPlaying] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setIsPlaying(true);
        }
    }, [isOpen, initialIndex]);

    // Auto advance
    useEffect(() => {
        if (!isOpen || !isPlaying || photos.length <= 1) return;

        intervalRef.current = setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev >= photos.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 2500);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isOpen, isPlaying, photos.length]);

    const togglePlayPause = useCallback(() => {
        setIsPlaying((p) => !p);
    }, []);

    const goTo = useCallback((idx: number) => {
        setCurrentIndex(idx);
        setIsPlaying(false);
    }, []);

    const handleShare = useCallback(async () => {
        const current = photos[currentIndex];
        if (!current) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${current.catName}のダイジェスト`,
                    text: `${new Date(current.createdAt).toLocaleDateString("ja-JP")}`,
                    url: current.url,
                });
            } catch {
                // User cancelled
            }
        }
    }, [photos, currentIndex]);

    if (!isOpen || photos.length === 0) return null;

    const current = photos[currentIndex];
    const dateLabel = new Date(current.createdAt).toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
        weekday: "short",
    });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
        >
            {/* Header */}
            <div className="absolute top-0 inset-x-0 z-20 pt-[env(safe-area-inset-top)] px-5">
                <div className="flex items-center justify-between h-14">
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="text-center">
                        <p className="text-white/90 text-[13px] font-bold">
                            にゃるほど Rewind
                        </p>
                        <p className="text-white/50 text-[11px]">
                            {photos.length}日間のダイジェスト
                        </p>
                    </div>
                    <button
                        onClick={handleShare}
                        className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:bg-white/20 transition-colors"
                    >
                        <Share2 className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* Photo Area */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current.id}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0"
                    >
                        <img
                            src={current.url}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                        {/* Gradient overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
                    </motion.div>
                </AnimatePresence>

                {/* Date + Cat Label */}
                <div className="absolute bottom-28 left-6 right-6 z-10">
                    <motion.div
                        key={`label-${currentIndex}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <p className="text-white text-[28px] font-bold leading-tight mb-1">
                            {dateLabel}
                        </p>
                        <p className="text-white/70 text-[15px] font-medium">
                            {current.catName}
                        </p>
                        {current.memo && (
                            <p className="text-white/50 text-[13px] mt-1 line-clamp-2">
                                {current.memo}
                            </p>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 inset-x-0 z-20 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] px-6">
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-5">
                    {photos.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goTo(idx)}
                            className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                idx === currentIndex
                                    ? "w-6 bg-white"
                                    : idx < currentIndex
                                        ? "w-1.5 bg-white/50"
                                        : "w-1.5 bg-white/20"
                            )}
                        />
                    ))}
                </div>

                {/* Play/Pause */}
                <div className="flex items-center justify-center">
                    <button
                        onClick={togglePlayPause}
                        className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
                    >
                        {isPlaying ? (
                            <Pause className="w-6 h-6 text-white" fill="white" />
                        ) : (
                            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────
// Inline Card for Discover Tab
// ─────────────────────────────────
export function RewindDigestCard({ allPhotos, onPhotoTap }: RewindDigestCardProps) {
    const [period, setPeriod] = useState<Period>("week");
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);

    const dailyPhotos = useMemo(
        () => getDailyBestPhotos(allPhotos, period),
        [allPhotos, period]
    );

    // Auto-preview: cycle through thumbnails
    const [previewIndex, setPreviewIndex] = useState(0);
    useEffect(() => {
        if (dailyPhotos.length <= 1) return;
        const timer = setInterval(() => {
            setPreviewIndex((prev) => (prev + 1) % dailyPhotos.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [dailyPhotos.length]);

    if (allPhotos.length < 2) return null; // Not enough photos for a digest

    const periodLabels: Record<Period, string> = {
        week: "今週",
        month: "今月",
        all: "全期間",
    };

    return (
        <>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">
                            ダイジェスト
                        </h3>
                        <Film className="w-4 h-4 text-[#8e8e93]" />
                    </div>
                    {/* Period Switcher */}
                    <div className="flex gap-1 p-0.5 bg-[#767680]/10 rounded-lg">
                        {(["week", "month", "all"] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                                    period === p
                                        ? "bg-white dark:bg-[#3a3a3c] text-[#1c1c1e] dark:text-white shadow-sm"
                                        : "text-[#8e8e93]"
                                )}
                            >
                                {periodLabels[p]}
                            </button>
                        ))}
                    </div>
                </div>

                {dailyPhotos.length === 0 ? (
                    <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-2xl p-6 text-center">
                        <Film className="w-8 h-8 text-[#c7c7cc] mx-auto mb-2" />
                        <p className="text-[13px] text-[#8e8e93]">
                            {periodLabels[period]}の写真がまだありません
                        </p>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsPlayerOpen(true)}
                        className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden group active:scale-[0.98] transition-all shadow-lg"
                    >
                        {/* Background: auto-cycling preview */}
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={dailyPhotos[previewIndex]?.id}
                                src={dailyPhotos[previewIndex]?.url}
                                alt=""
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8 }}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </AnimatePresence>

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent z-10" />

                        {/* Content overlay */}
                        <div className="absolute inset-0 z-20 flex flex-col justify-between p-4">
                            {/* Top: Mini progress */}
                            <div className="flex gap-0.5">
                                {dailyPhotos.slice(0, Math.min(dailyPhotos.length, 20)).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "h-0.5 flex-1 rounded-full transition-colors",
                                            idx <= previewIndex
                                                ? "bg-white/80"
                                                : "bg-white/20"
                                        )}
                                    />
                                ))}
                            </div>

                            {/* Bottom: Label + Play */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-white text-[15px] font-bold leading-tight">
                                        {periodLabels[period]}のダイジェスト
                                    </p>
                                    <p className="text-white/60 text-[12px] font-medium">
                                        {dailyPhotos.length}日間 · タップで再生
                                    </p>
                                </div>
                                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-colors border border-white/10">
                                    <Play
                                        className="w-5 h-5 text-white ml-0.5"
                                        fill="white"
                                    />
                                </div>
                            </div>
                        </div>
                    </button>
                )}
            </div>

            {/* Fullscreen Player */}
            <AnimatePresence>
                {isPlayerOpen && (
                    <RewindFullscreenPlayer
                        photos={dailyPhotos}
                        isOpen={isPlayerOpen}
                        onClose={() => setIsPlayerOpen(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
