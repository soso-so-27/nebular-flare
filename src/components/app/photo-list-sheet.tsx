"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ChevronRight, Heart, MessageCircle, Calendar } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { useUserReadTimestamps } from "@/hooks/use-user-read-timestamps";
import { ImmersivePhotoView } from "./immersive/ImmersivePhotoView";

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
    const { cats, settings } = useAppState();
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
                            catAvatar: cat.avatar || '🐈'
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

    // Helper function to get public URL with proper bucket detection
    const getPublicUrl = (path: string, options?: { width: number, quality: number }) => {
        const supabase = createClient();
        const bucket = path.startsWith('cat-photos/') ? 'cat-images' : 'avatars';
        const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
            transform: options ? {
                width: options.width,
                quality: options.quality,
            } : undefined
        });
        return data.publicUrl;
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const sheetVariants = {
        hidden: { y: "110%", opacity: 0, scale: 0.95 },
        visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
        exit: { y: "110%", opacity: 0, scale: 0.95, transition: { type: "spring" as const, damping: 25, stiffness: 300 } }
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
                        className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm"
                    />

                    {/* Sheet / Modal */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`fixed inset-x-0 z-[10001] pointer-events-auto flex justify-center
                            ${isIsland ? 'bottom-0' : 'bottom-24 px-4'}`}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) handleClose();
                        }}
                    >
                        <motion.div
                            animate={{
                                scale: selectedPhoto ? 0.96 : 1,
                                opacity: selectedPhoto ? 0.7 : 1,
                                filter: selectedPhoto ? 'blur(4px)' : 'blur(0px)',
                                y: selectedPhoto ? -10 : 0
                            }}
                            transition={{ type: "spring", damping: 30, stiffness: 200 }}
                            className={`
                                bg-[#1E1E23]/85 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col w-full max-w-lg transition-all duration-300 relative overflow-hidden
                                ${isIsland
                                    ? 'rounded-t-[32px] h-[75vh] max-h-[650px]'
                                    : 'rounded-[32px] h-[65vh] max-h-[600px]'}
                            `}
                        >
                            {/* Specular */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 z-10" />

                            {/* Drag Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing z-10" onClick={handleClose}>
                                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                            </div>

                            {/* Header */}
                            <div className="px-6 py-3 flex items-center justify-between shrink-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <h1 className="text-lg font-bold text-white tracking-tight">とどいた写真</h1>
                                        <p className="text-xs text-[#E8B4A0] font-bold animate-pulse">スタンプを届けて反応しよう！</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>

                            {/* Photo List */}
                            <div className="flex-1 overflow-y-auto px-4 pb-10 [&::-webkit-scrollbar]:hidden z-10">
                                {recentPhotos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-white/10">
                                            <Camera className="w-8 h-8 text-slate-500" />
                                        </div>
                                        <p className="text-slate-400 font-medium">まだ写真がありません</p>
                                        <p className="text-xs text-slate-600 mt-1">猫ちゃんの写真をとどけてね</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 relative">
                                        {/* Timeline Line */}
                                        <div className="absolute left-3 top-2 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

                                        {groupedPhotos.map(([groupName, photos], gIdx) => (
                                            <div key={groupName} className="space-y-2">
                                                <div className="flex items-center gap-3 pl-1.5 py-0.5">
                                                    <div className="w-3 h-3 rounded-full bg-[#1E1E23] border-[1.5px] border-[#E8B4A0] shrink-0 z-20" />
                                                    <h2 className="text-[10px] font-black text-slate-500 tracking-widest uppercase">
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
                                                                className="relative bg-[#1E1E23]/40 hover:bg-[#1E1E23]/60 backdrop-blur-md rounded-[20px] p-3 border border-white/5 flex flex-col gap-1.5 text-left transition-all active:scale-[0.98] group"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-black text-slate-200">{photo.catName}</span>
                                                                        {isNew && (
                                                                            <span className="w-1 h-1 rounded-full bg-[#E8B4A0] shadow-[0_0_8px_#E8B4A0]" />
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-slate-500 tabular-nums">
                                                                        {formatTime(photo.createdAt)}
                                                                    </div>
                                                                </div>

                                                                {photo.memo ? (
                                                                    <p className="text-xs text-slate-300 font-medium leading-normal line-clamp-2">
                                                                        {photo.memo}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[10px] text-slate-600 italic">写真が届きました</p>
                                                                )}

                                                                {/* Reactions Bar */}
                                                                {reactions[photo.id] && reactions[photo.id].length > 0 && (
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <div className="flex -space-x-1">
                                                                            {[...new Set(reactions[photo.id].map(r => r.emoji))].slice(0, 3).map((emoji, i) => (
                                                                                <span key={i} className="text-[10px]">{emoji}</span>
                                                                            ))}
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-slate-600">
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
                        </motion.div>
                    </motion.div>

                    {/* Photo Detail View */}
                    <ImmersivePhotoView
                        isOpen={!!selectedPhoto}
                        onClose={() => setSelectedPhoto(null)}
                        image={selectedPhoto ? {
                            id: selectedPhoto.id,
                            url: getPublicUrl(selectedPhoto.storagePath),
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
