"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ChevronRight, Heart, MessageCircle, Calendar } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";

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
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

    const isIsland = settings.layoutType === 'v2-island';

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

    // Helper function to get public URL
    const getPublicUrl = (path: string, options?: { width: number, quality: number }) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path, {
            transform: options ? {
                width: options.width,
                quality: options.quality,
                resize: 'cover',
            } : undefined
        });
        return data.publicUrl;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
                        onClick={onClose}
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
                            if (info.offset.y > 100) onClose();
                        }}
                    >
                        <div className={`
                            bg-[#1E1E23]/85 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col w-full max-w-lg transition-all duration-300
                            ${isIsland
                                ? 'rounded-t-[32px] h-[75vh] max-h-[650px] border-b-0'
                                : 'rounded-[32px] h-[65vh] max-h-[600px] border-b'}
                        `}>
                            {/* Specular */}
                            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 ${isIsland ? 'rounded-t-[32px]' : 'rounded-[32px]'}`} />

                            {/* Drag Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing" onClick={onClose}>
                                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                            </div>

                            {/* Header */}
                            <div className="px-6 py-3 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#E8B4A0]/20 flex items-center justify-center ring-1 ring-[#E8B4A0]/30">
                                        <Camera className="w-5 h-5 text-[#E8B4A0]" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-white tracking-tight">とどけられた写真</h1>
                                        <p className="text-xs text-slate-400">{recentPhotos.length}枚の新しい写真</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>

                            {/* Photo List */}
                            <div className="flex-1 overflow-y-auto px-4 pb-10 [&::-webkit-scrollbar]:hidden">
                                {recentPhotos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-white/10">
                                            <Camera className="w-8 h-8 text-slate-500" />
                                        </div>
                                        <p className="text-slate-400 font-medium">まだ写真がありません</p>
                                        <p className="text-xs text-slate-600 mt-1">猫ちゃんの写真をとどけてね</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {recentPhotos.map((photo) => (
                                            <motion.button
                                                key={photo.id}
                                                onClick={() => setSelectedPhoto(photo)}
                                                className="bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-3 text-left transition-all group"
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {/* Thumbnail */}
                                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative border border-white/20">
                                                    <img
                                                        src={getPublicUrl(photo.storagePath, { width: 200, quality: 80 })}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {photo.isFavorite && (
                                                        <div className="absolute top-1 right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shadow-md">
                                                            <Heart className="w-3 h-3 text-white fill-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <img
                                                            src={photo.catAvatar}
                                                            alt=""
                                                            className="w-5 h-5 rounded-full object-cover border border-white/20"
                                                        />
                                                        <span className="text-sm font-bold text-slate-200">{photo.catName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>{formatDate(photo.createdAt)}</span>
                                                    </div>
                                                    {photo.memo && (
                                                        <p className="text-xs text-slate-400 mt-1 truncate">{photo.memo}</p>
                                                    )}
                                                </div>

                                                {/* Arrow */}
                                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Photo Detail Modal */}
                    <AnimatePresence>
                        {selectedPhoto && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[10010] bg-black/80 backdrop-blur-sm"
                                    onClick={() => setSelectedPhoto(null)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="fixed inset-4 z-[10011] flex items-center justify-center pointer-events-none"
                                >
                                    <div
                                        className="bg-[#1E1E23] border border-white/20 rounded-3xl overflow-hidden max-w-lg w-full max-h-[80vh] shadow-2xl pointer-events-auto flex flex-col"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {/* Photo - Scrollable if too tall, but mainly fit */}
                                        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={getPublicUrl(selectedPhoto.storagePath, { width: 1200, quality: 90 })}
                                                alt=""
                                                className="max-w-full max-h-[60vh] object-contain"
                                            />
                                            <button
                                                onClick={() => setSelectedPhoto(null)}
                                                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Info */}
                                        <div className="p-5 bg-[#1E1E23]">
                                            <div className="flex items-center gap-3 mb-3">
                                                <img
                                                    src={(selectedPhoto as any).catAvatar}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-md"
                                                />
                                                <div>
                                                    <p className="font-bold text-white">{(selectedPhoto as any).catName}</p>
                                                    <p className="text-xs text-slate-400">{formatDate(selectedPhoto.createdAt)}</p>
                                                </div>
                                            </div>
                                            {selectedPhoto.memo && (
                                                <p className="text-sm text-slate-300 bg-white/5 rounded-xl p-3 border border-white/5">
                                                    {selectedPhoto.memo}
                                                </p>
                                            )}
                                            {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {selectedPhoto.tags.map((tag, i) => (
                                                        <span key={i} className="px-3 py-1 bg-[#E8B4A0]/20 text-[#E8B4A0] text-xs font-medium rounded-full border border-[#E8B4A0]/20">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}

