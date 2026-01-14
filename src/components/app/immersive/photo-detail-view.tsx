"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Download, Share, User, Calendar, MessageCircle, Cat, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppState } from "@/store/app-store";

interface PhotoTag {
    name: string;
    isAi: boolean;
    confirmed: boolean;
}

interface PhotoDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    image: {
        id: string;
        url: string;
        catName: string;
        catIds?: string[];
        createdAt: string;
        source: string;
        memo?: string;
        uploaderName?: string;
        tags?: PhotoTag[];
    } | null;
    onDelete?: (id: string) => void;
    onUpdateTags?: (id: string, tags: PhotoTag[]) => Promise<void>;
}

export function PhotoDetailView({ isOpen, onClose, image, onDelete, onUpdateTags }: PhotoDetailViewProps) {
    const { cats } = useAppState();
    const [newTag, setNewTag] = React.useState('');

    if (!image) return null;

    const formattedDate = new Date(image.createdAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `nyaru-photo-${image.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(image.url);
            alert('URLをコピーしました');
        }
    };

    const handleUpdateTags = async (updatedTags: PhotoTag[]) => {
        if (onUpdateTags && image) {
            await onUpdateTags(image.id, updatedTags);
        }
    };

    const addTag = () => {
        if (!newTag.trim() || !image) return;
        const currentTags = image.tags || [];
        if (currentTags.some(t => t.name === newTag.trim())) {
            setNewTag('');
            return;
        }
        const updated = [...currentTags, { name: newTag.trim(), isAi: false, confirmed: true }];
        handleUpdateTags(updated);
        setNewTag('');
    };

    const removeTag = (tagName: string) => {
        if (!image) return;
        const updated = (image.tags || []).filter(t => t.name !== tagName);
        handleUpdateTags(updated);
    };

    const confirmAiTag = (tagName: string) => {
        if (!image) return;
        const updated = (image.tags || []).map(t =>
            t.name === tagName ? { ...t, confirmed: true } : t
        );
        handleUpdateTags(updated);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-0"
                    onClick={onClose}
                >
                    {/* Header Controls */}
                    <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center justify-between px-6 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="p-2 rounded-full bg-white/10 text-white backdrop-blur-md pointer-events-auto active:scale-90 transition-transform"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex gap-3 pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                                className="p-2 rounded-full bg-white/10 text-white backdrop-blur-md active:scale-90 transition-transform"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                className="p-2 rounded-full bg-white/10 text-white backdrop-blur-md active:scale-90 transition-transform"
                            >
                                <Share className="w-5 h-5" />
                            </button>
                            {onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                                    className="p-2 rounded-full bg-red-500/20 text-red-500 backdrop-blur-md active:scale-90 transition-transform border border-red-500/30"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main Image */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full h-full flex items-center justify-center pointer-events-none"
                    >
                        <img
                            src={image.url.replace('&width=300&height=300&resize=cover', '')} // Get high res version if possible
                            alt=""
                            className="max-w-full max-h-full object-contain shadow-2xl pointer-events-auto cursor-zoom-in"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>

                    {/* Info Overlay */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"
                    >
                        <div className="max-w-xl mx-auto space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-[#E8B4A0] p-1.5 rounded-lg shadow-lg">
                                    <Cat className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    {image.catIds && image.catIds.length > 0
                                        ? image.catIds.map(id => cats.find(c => c.id === id)?.name).filter(Boolean).join(' & ')
                                        : image.catName}
                                </h3>
                            </div>

                            {image.memo && (
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                                    <p className="text-white/90 text-sm leading-relaxed">
                                        {image.memo}
                                    </p>
                                </div>
                            )}

                            {/* Tags Area */}
                            <div className="space-y-3 pointer-events-auto">
                                <div className="flex flex-wrap gap-2">
                                    {image.tags?.map((tag, idx) => (
                                        <div
                                            key={`${tag.name}-${idx}`}
                                            className={cn(
                                                "flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-sm",
                                                tag.isAi && !tag.confirmed
                                                    ? "bg-purple-500/20 text-purple-200 border border-purple-500/30 animate-pulse"
                                                    : "bg-white/10 text-white/90 border border-white/20"
                                            )}
                                        >
                                            {tag.isAi && !tag.confirmed && <span>✨</span>}
                                            <span>{tag.name}</span>
                                            {tag.isAi && !tag.confirmed ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); confirmAiTag(tag.name); }}
                                                    className="ml-1 hover:text-white"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeTag(tag.name); }}
                                                    className="ml-1 opacity-50 hover:opacity-100"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-2 py-1 focus-within:bg-white/10 transition-colors">
                                        <Plus className="w-3 h-3 text-white/40 ml-1" />
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.stopPropagation();
                                                    addTag();
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="タグを追加..."
                                            className="bg-transparent border-none focus:ring-0 text-[11px] text-white placeholder:text-white/20 w-20 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 text-white/50 text-xs font-medium">
                                <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />
                                    <span>{image.uploaderName || '家族メンバー'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formattedDate}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
