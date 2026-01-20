"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Download, Share, User, Calendar, Cat, CheckCircle2, Plus, Heart, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/store/app-store";

interface PhotoTag {
    name: string;
    isAi: boolean;
    confirmed: boolean;
}

interface Reaction {
    emoji: string;
    userId: string;
}

interface ImmersivePhotoViewProps {
    isOpen: boolean;
    onClose: () => void;
    image: {
        id: string;
        url: string;
        catName: string;
        catAvatar?: string;
        createdAt: string;
        memo?: string;
        uploaderName?: string;
        tags?: PhotoTag[] | string[];
        catIds?: string[];
        storagePath?: string;
    } | null;
    // Actions
    onDelete?: (id: string) => void;
    onUpdateTags?: (id: string, tags: any[]) => Promise<void>;
    // Reactions (for PhotoListSheet)
    reactions?: Reaction[];
    myReaction?: string | null;
    onReactionClick?: (emoji: string) => void;
}

const STAMP_OPTIONS = [
    { emoji: '❤️', label: 'かわいい' },
    { emoji: '😍', label: '最高' },
    { emoji: '😊', label: 'ほっこり' },
    { emoji: '😂', label: '笑った' },
    { emoji: '🥺', label: '尊い' },
];

export function ImmersivePhotoView({
    isOpen,
    onClose,
    image,
    onDelete,
    onUpdateTags,
    reactions = [],
    myReaction = null,
    onReactionClick
}: ImmersivePhotoViewProps) {
    const { cats } = useAppState();
    const [newTag, setNewTag] = React.useState('');
    const [mounted, setMounted] = useState(false);
    const [showUI, setShowUI] = useState(true);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!image || !mounted) return null;

    const formattedDate = new Date(image.createdAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });


    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'にゃるほど',
                    text: `${image.catName}のようす🐾`,
                    url: image.url,
                });
            } catch (err) {
                console.log('Share failed:', err);
            }
        } else {
            navigator.clipboard.writeText(image.url);
            alert('URLをコピーしました');
        }
    };

    const addTag = () => {
        if (!newTag.trim() || !onUpdateTags) return;
        const currentTags: any[] = image.tags || [];
        // Support both PhotoTag object and string
        const exists = currentTags.some(t => (typeof t === 'string' ? t : t.name) === newTag.trim());
        if (exists) {
            setNewTag('');
            return;
        }
        const updated = [...currentTags, { name: newTag.trim(), isAi: false, confirmed: true }];
        onUpdateTags(image.id, updated);
        setNewTag('');
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200000] bg-black flex flex-col items-center justify-center p-0 overflow-hidden cursor-pointer"
                    onClick={() => setShowUI(!showUI)}
                >
                    {/* Background is pure black (already set on parent) - iOS Photos style */}


                    {/* 2. Top Navigation Bar */}
                    <AnimatePresence>
                        {showUI && (
                            <motion.div
                                initial={{ y: -100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -100, opacity: 0 }}
                                className="absolute top-0 inset-x-0 h-24 z-50 flex items-center justify-between px-6 pointer-events-none"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                                    className="p-3 rounded-full bg-black/20 text-white backdrop-blur-md pointer-events-auto active:scale-95 transition-all border border-white/20"
                                >
                                    <X className="w-6 h-6 shadow-sm" />
                                </button>

                                <div className="flex gap-4 pointer-events-auto">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                        className="p-3 rounded-full bg-black/20 text-white backdrop-blur-md active:scale-95 transition-all border border-white/20"
                                    >
                                        <Share className="w-5 h-5" />
                                    </button>
                                    {onDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                                            className="p-3 rounded-full bg-red-500/20 text-red-400 backdrop-blur-md active:scale-95 transition-all border border-red-500/30"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 3. Main Photo Viewport */}
                    <motion.div
                        className="relative w-full h-full flex items-center justify-center z-10 pointer-events-none"
                    >
                        <img
                            src={image.url}
                            alt=""
                            className="max-w-full max-h-full object-contain pointer-events-auto"
                            onClick={(e) => { e.stopPropagation(); setShowUI(!showUI); }}
                        />
                    </motion.div>

                    {/* 4. Bottom Info Panel (Minimal Caption Style) */}
                    <AnimatePresence>
                        {showUI && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="absolute bottom-0 inset-x-0 z-50 pointer-events-none"
                            >
                                <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-32 pb-12 px-6 pointer-events-auto">
                                    <div className="max-w-3xl mx-auto space-y-4">
                                        <div className="flex items-end justify-between gap-6">
                                            <div className="flex flex-col gap-3 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full border border-white/30 shadow-lg overflow-hidden shrink-0">
                                                        {image.catAvatar && image.catAvatar.length > 2 ? (
                                                            <img src={image.catAvatar} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-white/10 flex items-center justify-center text-lg">🐈</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-white leading-none mb-1">
                                                            {image.catName}
                                                        </h3>
                                                        <div className="text-[10px] text-white/60 font-medium tracking-wider flex items-center gap-2">
                                                            <span>{formattedDate}</span>
                                                            {image.uploaderName && <span className="w-1 h-1 rounded-full bg-white/20" />}
                                                            {image.uploaderName && <span>{image.uploaderName}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {image.memo && (
                                                    <p className="text-sm md:text-base text-white/90 font-medium leading-relaxed max-w-lg">
                                                        {image.memo}
                                                    </p>
                                                )}

                                                {/* Compact Tags */}
                                                {onUpdateTags && (image.tags || []).length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {((image.tags || []) as any[]).map((tag, idx) => {
                                                            const tagName = typeof tag === 'string' ? tag : tag.name;
                                                            return (
                                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-[10px] text-white/80 font-bold">
                                                                    #{tagName}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Reactions (Desktop/Taller Side) */}
                                            {onReactionClick && (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex -space-x-2 mb-1">
                                                        {[...new Set(reactions.map(r => r.emoji))].slice(0, 3).map((e, idx) => (
                                                            <motion.div
                                                                key={idx}
                                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm shadow-lg"
                                                            >
                                                                {e}
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {STAMP_OPTIONS.slice(0, 3).map(stamp => (
                                                            <motion.button
                                                                key={stamp.emoji}
                                                                whileTap={{ scale: 0.8 }}
                                                                onClick={(e) => { e.stopPropagation(); onReactionClick(stamp.emoji); }}
                                                                className={cn(
                                                                    "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all",
                                                                    myReaction === stamp.emoji
                                                                        ? 'bg-[#E8B4A0] scale-110 shadow-lg'
                                                                        : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
                                                                )}
                                                            >
                                                                {stamp.emoji}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
