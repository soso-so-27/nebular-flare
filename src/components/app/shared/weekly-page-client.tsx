"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";

import { useWeeklySummary } from "@/hooks/use-weekly-summary";
import { StoryCoverView } from "./story-cover-view";
import {
    ChevronLeft,
    Share2,
    LayoutGrid,
    Columns,
    Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image"; // Switch to html-to-image
import { toast } from "sonner";

interface WeeklyPageClientProps {
    onClose?: () => void;
}

export function WeeklyPageClient({ onClose }: WeeklyPageClientProps) {
    const { cats, incidents } = useAppState();
    const dummyCat = cats[0];

    // Helper to get public URL
    const getPublicUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const supabase = createClient();
        const bucket = path.startsWith('cat-photos/') ? 'cat-images' : 'avatars';
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    };

    // Filter photos early to get count for hook
    const weeklyPhotos = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const photos: { url: string; date: string }[] = [];
        incidents.forEach(inc => {
            if (new Date(inc.created_at) >= sevenDaysAgo && inc.photos) {
                inc.photos.forEach((path: string) => {
                    photos.push({ url: getPublicUrl(path), date: inc.created_at });
                });
            }
        });
        return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [incidents]);

    const { layout, weekKey, updateLayout } = useWeeklySummary(dummyCat?.id, weeklyPhotos.length);
    const [isSharing, setIsSharing] = useState(false);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!dummyCat || !mounted) return null;

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const cardElement = document.getElementById("album-card");
            if (!cardElement) throw new Error("Card element not found");

            // Capture using html-to-image which handles modern CSS better
            const dataUrl = await toPng(cardElement, {
                pixelRatio: 2, // High resolution
                backgroundColor: "#FBFBFB", // Match card bg
                cacheBust: true,
            });

            // DataURL to Blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], `album-${weekKey}.png`, { type: "image/png" });

            // Web Share API
            if (navigator.share && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Weekly Album',
                        text: '今週のアルバムをシェアします！'
                    });
                    toast.success("シェアしました");
                } catch (shareError) {
                    console.log("Share skipped/failed", shareError);
                }
            } else {
                // Fallback download
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = `weekly-album-${weekKey}.png`;
                link.click();
                toast.success("画像を保存しました");
            }

        } catch (error) {
            console.error("Share error:", error);
            toast.error("画像の生成に失敗しました");
        } finally {
            setIsSharing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-[#F2F0E9] flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Top Bar (Simplified: Close button only) */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start pointer-events-none">
                <button
                    onClick={onClose}
                    className="pointer-events-auto bg-black/5 hover:bg-black/10 backdrop-blur-sm transition-colors text-slate-800 rounded-full p-2"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center justify-start pb-40">
                {/* ID added for html2canvas capture */}
                <div id="album-card" className="w-full max-w-sm mx-auto shadow-2xl rounded-[2rem]">
                    <StoryCoverView
                        cat={{ ...dummyCat, name: "FAMILY MEMORIES" }}
                        weekKey={weekKey}
                        layout={layout}
                        photos={weeklyPhotos}
                    />
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 inset-x-0 p-6 pb-8 bg-gradient-to-t from-[#F2F0E9] via-[#F2F0E9] to-transparent z-20 flex flex-col gap-6">

                {/* Layout Switcher */}
                <div className="self-center bg-white rounded-2xl p-1.5 flex gap-1 shadow-lg border border-slate-100 ring-1 ring-black/5">
                    <button
                        onClick={() => updateLayout('hero3')}
                        className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all ${layout === 'hero3' ? 'bg-[#4A4A4A] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <ImageIcon size={20} strokeWidth={layout === 'hero3' ? 2 : 1.5} />
                    </button>

                    <button
                        onClick={() => updateLayout('grid4')}
                        className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all ${layout === 'grid4' ? 'bg-[#4A4A4A] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <LayoutGrid size={20} strokeWidth={layout === 'grid4' ? 2 : 1.5} />
                    </button>

                    <button
                        onClick={() => updateLayout('filmstrip')}
                        className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all ${layout === 'filmstrip' ? 'bg-[#4A4A4A] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Columns size={20} strokeWidth={layout === 'filmstrip' ? 2 : 1.5} />
                    </button>
                </div>

                {/* Main Action Button */}
                <Button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full bg-white text-slate-800 font-bold text-sm h-14 rounded-2xl shadow-xl border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-70 disabled:pointer-events-none"
                >
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors" />
                    <Share2 size={18} className={isSharing ? "animate-spin" : ""} />
                    {isSharing ? "GENERATING..." : "SHARE CARD"}
                </Button>
            </div>
        </div>,
        document.body
    );
}
