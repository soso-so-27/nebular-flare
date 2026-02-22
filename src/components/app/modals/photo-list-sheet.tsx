"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ChevronRight, Heart, MessageCircle, Calendar, Cat } from "lucide-react";
import { useCatContext, useSettingsContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { useUserReadTimestamps } from "@/hooks/use-supabase-data";
import { ImmersivePhotoView } from "../immersive/ImmersivePhotoView";

interface PhotoListSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

interface PhotoItem {
    id: string;
    catId: string;
    catIds?: string[];
    storagePath: string;
    createdAt: string;
    isFavorite?: boolean;
    memo?: string;
    tags?: any[];
}

export function PhotoListSheet({ isOpen, onClose }: PhotoListSheetProps) {
    const { cats } = useCatContext();
    const { settings } = useSettingsContext();
    const { user } = useAuth();
    const { markPhotosAsSeen } = useUserReadTimestamps();
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
    const [reactions, setReactions] = useState<Record<string, { emoji: string; userId: string }[]>>({});
    const [myReaction, setMyReaction] = useState<string | null>(null);

    const isIsland = settings.layoutType === 'v2-island';
    const supabase = createClient();

    // Handle close - mark photos as seen when sheet closes
    const handleClose = () => {
        markPhotosAsSeen();
        onClose();
    };

    // Fetch reactions when a specific photo is selected
    useEffect(() => {
        if (selectedPhoto && user) {
            fetchReactions(selectedPhoto.id);
        }
    }, [selectedPhoto?.id, user]);

    const fetchReactions = async (imageId: string) => {
        const { data } = await (supabase as any)
            .from('photo_reactions')
            .select('reaction, user_id')
            .eq('image_id', imageId);

        if (data) {
            const grouped = data.reduce((acc: Record<string, { emoji: string; userId: string }[]>, r: any) => {
                acc[imageId] = acc[imageId] || [];
                acc[imageId].push({ emoji: r.reaction, userId: r.user_id });
                return acc;
            }, {} as Record<string, { emoji: string; userId: string }[]>);
            setReactions(prev => ({ ...prev, ...grouped }));

            // Find my reaction
            const mine = data.find((r: any) => r.user_id === user?.id);
            setMyReaction(mine?.reaction || null);
        }
    };

    const handleStampClick = async (emoji: string) => {
        if (!selectedPhoto || !user) return;

        try {
            if (myReaction === emoji) {
                // Remove reaction
                await (supabase as any)
                    .from('photo_reactions')
                    .delete()
                    .eq('image_id', selectedPhoto.id)
                    .eq('user_id', user.id);
                setMyReaction(null);
            } else {
                // Upsert reaction
                await (supabase as any)
                    .from('photo_reactions')
                    .upsert({
                        image_id: selectedPhoto.id,
                        user_id: user.id,
                        reaction: emoji
                    }, { onConflict: 'image_id,user_id' });
                setMyReaction(emoji);
            }
            fetchReactions(selectedPhoto.id);
        } catch (e) {
            console.error('Failed to update reaction:', e);
            toast.error('スタンプの更新に失敗しました');
        }
    };

    // Get all photos from all cats, sorted by date (newest first)
    const allPhotos = useMemo(() => {
        const photos: (PhotoItem & { catName: string; catAvatar: string })[] = [];

        cats.forEach(cat => {
            if (cat.images && cat.images.length > 0) {
                cat.images.forEach(img => {
                    if (img.storagePath) {
                        photos.push({
                            ...img,
                            catId: cat.id,
                            catName: cat.name,
                            catAvatar: cat.avatar || '🐈' // Keep emoji as marker, handle in UI
                        });
                    }
                });
            }
        });

        // Sort by createdAt, newest first
        return photos.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [cats]);

    // Get recent photos (last 30 days)
    const recentPhotos = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return allPhotos.filter(photo =>
            new Date(photo.createdAt) > thirtyDaysAgo
        );
    }, [allPhotos]);

    // Group photos by date
    const groupedPhotos = useMemo(() => {
        const groups: Record<string, (PhotoItem & { catName: string; catAvatar: string })[]> = {};

        recentPhotos.forEach(photo => {
            const date = new Date(photo.createdAt);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            let groupKey = "";
            if (date.toDateString() === today.toDateString()) {
                groupKey = "今日";
            } else if (date.toDateString() === yesterday.toDateString()) {
                groupKey = "昨日";
            } else {
                groupKey = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
            }

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(photo);
        });

        return Object.entries(groups) as [string, (PhotoItem & { catName: string; catAvatar: string })[]][];
    }, [recentPhotos]);

    // Fetch reactions for all photos when sheet opens
    useEffect(() => {
        if (isOpen && user && recentPhotos.length > 0) {
            const fetchAllReactions = async () => {
                const imageIds = recentPhotos.map(p => p.id);
                const { data } = await (supabase as any)
                    .from('photo_reactions')
                    .select('image_id, reaction, user_id')
                    .in('image_id', imageIds);

                if (data) {
                    const grouped = data.reduce((acc: Record<string, { emoji: string; userId: string }[]>, r: any) => {
                        acc[r.image_id] = acc[r.image_id] || [];
                        acc[r.image_id].push({ emoji: r.reaction, userId: r.user_id });
                        return acc;
                    }, {} as Record<string, { emoji: string; userId: string }[]>);
                    setReactions(grouped);
                }
            };
            fetchAllReactions();
        }
    }, [isOpen, user, recentPhotos, supabase]);

    // Help get public URL with proper bucket detection
    const { getFullImageUrl } = require("@/lib/utils");

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const sheetVariants = {
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring" as const, damping: 30, stiffness: 250 } },
        exit: { y: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 250 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 z-[10000] bg-[#4E342E]/10 backdrop-blur-sm"
                    />

                    {/* Sheet / Modal */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed bottom-0 inset-x-0 z-[10001] pointer-events-auto"
                    >
                        <div
                            className="bg-[#fefefe] rounded-t-[40px] flex flex-col w-full max-h-[90vh] border-t border-black/5 shadow-[0_-8px_40px_rgba(78,52,46,0.1)] overflow-hidden"
                        >
                            {/* Handle */}
                            <div className="w-full flex justify-center pt-4 pb-2">
                                <div className="w-10 h-1.5 rounded-full bg-black/5" />
                            </div>

                            {/* Header */}
                            <div className="px-8 py-6 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <h1 className="text-[22px] font-black text-[#1c1c1e] tracking-tight">とどいた写真</h1>
                                        <p className="text-xs text-brand-peach font-bold animate-pulse">スタンプを届けて反応しよう！</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center active:bg-black/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-[#1c1c1e]/40" />
                                </button>
                            </div>

                            {/* Photo List */}
                            <div className="flex-1 overflow-y-auto px-6 py-2 pb-[env(safe-area-inset-bottom,24px)]">
                                {recentPhotos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
                                            <Camera className="w-8 h-8 text-[#1c1c1e]/20" />
                                        </div>
                                        <p className="text-[#1c1c1e]/40 font-medium">まだ写真がありません</p>
                                        <p className="text-xs text-[#1c1c1e]/20 mt-1">猫ちゃんの写真をとどけてね</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 relative">
                                        {/* Timeline Line */}
                                        <div className="absolute left-3 top-2 bottom-0 w-px bg-gradient-to-b from-black/10 via-black/5 to-transparent" />

                                        {groupedPhotos.map(([groupName, photos], gIdx) => (
                                            <div key={groupName} className="space-y-2">
                                                <div className="flex items-center gap-3 pl-1.5 py-0.5">
                                                    <div className="w-3 h-3 rounded-full bg-[#fefefe] border-[1.5px] border-brand-peach shrink-0 z-20" />
                                                    <h2 className="text-[10px] font-black text-[#1c1c1e]/30 tracking-widest uppercase">
                                                        {groupName}
                                                    </h2>
                                                </div>

                                                <div className="grid gap-2 pl-8">
                                                    {photos.map((photo, pIdx) => {
                                                        const isNew = new Date().getTime() - new Date(photo.createdAt).getTime() < 24 * 60 * 60 * 1000;
                                                        return (
                                                            <motion.button
                                                                key={photo.id}
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                transition={{ delay: (gIdx * 0.05) + (pIdx * 0.03) }}
                                                                onClick={() => setSelectedPhoto(photo)}
                                                                className="relative bg-black/[0.02] hover:bg-black/[0.04] rounded-[20px] p-3 border border-[#f0f0f0] flex flex-col gap-1.5 text-left transition-all active:scale-[0.98] group"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-black text-[#1c1c1e]">{photo.catName}</span>
                                                                        {isNew && (
                                                                            <span className="w-1 h-1 rounded-full bg-brand-peach shadow-[0_0_8px_rgba(var(--brand-peach-rgb),1)]" />
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-[#1c1c1e]/30 tabular-nums">
                                                                        {formatTime(photo.createdAt)}
                                                                    </div>
                                                                </div>

                                                                {photo.memo ? (
                                                                    <p className="text-xs text-[#1c1c1e]/50 font-medium leading-normal line-clamp-2">
                                                                        {photo.memo}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[10px] text-[#1c1c1e]/20 italic">写真が届きました</p>
                                                                )}

                                                                {/* Reactions Bar */}
                                                                {reactions[photo.id] && reactions[photo.id].length > 0 && (
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <div className="flex -space-x-1">
                                                                            {[...new Set(reactions[photo.id].map(r => r.emoji))].slice(0, 3).map((emoji, i) => (
                                                                                <span key={i} className="text-[10px]">{emoji}</span>
                                                                            ))}
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-[#1c1c1e]/30">
                                                                            {reactions[photo.id].length}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Photo Detail View */}
                    <ImmersivePhotoView
                        isOpen={!!selectedPhoto}
                        onClose={() => setSelectedPhoto(null)}
                        image={selectedPhoto ? {
                            id: selectedPhoto.id,
                            url: getFullImageUrl(selectedPhoto.storagePath),
                            catName: (selectedPhoto as any).catName,
                            catAvatar: (selectedPhoto as any).catAvatar,
                            createdAt: selectedPhoto.createdAt,
                            memo: selectedPhoto.memo,
                            storagePath: selectedPhoto.storagePath
                        } : null}
                        reactions={selectedPhoto ? (reactions[selectedPhoto.id] || []) : []}
                        myReaction={myReaction}
                        onReactionClick={handleStampClick}
                    />
                </>
            )}
        </AnimatePresence>
    );
}
