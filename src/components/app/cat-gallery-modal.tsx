"use client";

import React, { useState, useRef, useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { X, Plus, Trash2, Image as ImageIcon, Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";

interface CatGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    catId: string;
    catName: string;
}

export function CatGalleryModal({ isOpen, onClose, catId, catName }: CatGalleryModalProps) {
    const { cats, uploadCatImage, deleteCatImage, refetchCats } = useAppState();
    const [uploading, setUploading] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeCat = cats.find(c => c.id === catId);
    const images = activeCat?.images || [];

    // Helper to get public URL
    const getPublicUrl = (path: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
    };

    // Group images by Month/Year
    const groupedImages = useMemo(() => {
        const groups: { [key: string]: typeof images } = {};

        // Sort by date (newest first)
        const sorted = [...images].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        sorted.forEach(img => {
            const date = new Date(img.createdAt);
            const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(img);
        });

        return groups;
    }, [images]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        setUploading(true);
        let successCount = 0;

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            // Skip refetch for individual uploads
            const { error } = await uploadCatImage(catId, file, true);
            if (error) {
                toast.error(`${file.name}のアップロードに失敗しました`);
            } else {
                successCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount}枚の写真をアップロードしました`);
            // Trigger single refetch after batch
            refetchCats();
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleBatchDelete = async () => {
        if (selectedImageIds.size === 0) return;
        if (!confirm(`${selectedImageIds.size}枚の写真を削除しますか？`)) return;

        let successCount = 0;
        for (const id of Array.from(selectedImageIds)) {
            const img = images.find(i => i.id === id);
            if (img) {
                const { error } = await deleteCatImage(img.id, img.storagePath);
                if (!error) successCount++;
            }
        }

        toast.success(`${successCount}枚削除しました`);
        setSelectedImageIds(new Set());
        setIsSelectMode(false);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedImageIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedImageIds(newSet);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-white dark:bg-slate-900 w-full h-full sm:h-[85vh] sm:max-w-2xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden relative"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>

                            <div className="flex flex-col items-center">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    {catName}
                                </h2>
                                <span className="text-[10px] text-slate-500">
                                    {images.length} Photos
                                </span>
                            </div>

                            <button
                                onClick={() => {
                                    setIsSelectMode(!isSelectMode);
                                    setSelectedImageIds(new Set());
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                    isSelectMode
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                )}
                            >
                                {isSelectMode ? "完了" : "選択"}
                            </button>
                        </div>

                        {/* Grid Content */}
                        <div className="flex-1 overflow-y-auto pb-24">
                            {images.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <ImageIcon className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p className="text-base font-bold text-slate-600 dark:text-slate-300">No Photos Yet</p>
                                    <p className="text-xs mt-1">Add your first photo to personalize the app</p>
                                </div>
                            ) : (
                                <div className="p-0.5 space-y-6">
                                    {Object.entries(groupedImages).map(([dateLabel, groupImages]) => (
                                        <div key={dateLabel}>
                                            <div className="sticky top-0 z-10 px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm mb-0.5">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{dateLabel}</h3>
                                            </div>
                                            <div className="grid grid-cols-3 gap-0.5">
                                                {groupImages.map(img => (
                                                    <div
                                                        key={img.id}
                                                        className="relative aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden"
                                                        onClick={() => {
                                                            if (isSelectMode) {
                                                                toggleSelection(img.id);
                                                            } else {
                                                                // View full screen? For now just simple view or nothing
                                                            }
                                                        }}
                                                    >
                                                        <img
                                                            src={getPublicUrl(img.storagePath)}
                                                            alt=""
                                                            loading="lazy"
                                                            className={cn(
                                                                "w-full h-full object-cover transition-all duration-300",
                                                                isSelectMode && selectedImageIds.has(img.id) ? "scale-90 opacity-80" : "scale-100"
                                                            )}
                                                        />

                                                        {isSelectMode && (
                                                            <div className="absolute inset-0 flex items-end justify-end p-2">
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                    selectedImageIds.has(img.id)
                                                                        ? "bg-blue-500 border-blue-500 text-white"
                                                                        : "bg-black/20 border-white/50"
                                                                )}>
                                                                    {selectedImageIds.has(img.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom Toolbar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-4 pb-8 sm:pb-4 safe-area-pb">
                            {isSelectMode ? (
                                <div className="flex items-center justify-between px-4">
                                    <span className="text-xs text-slate-500 font-bold">
                                        {selectedImageIds.size}枚選択中
                                    </span>
                                    <button
                                        onClick={handleBatchDelete}
                                        disabled={selectedImageIds.size === 0}
                                        className="p-2 rounded-full bg-red-50 text-red-500 disabled:opacity-50 disabled:bg-transparent disabled:text-slate-300 transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-full h-12 rounded-xl bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="h-5 w-5" />
                                                Add Photos
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
