"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Plus, Image as ImageIcon, Loader2, CheckCircle2, ChevronRight, Camera, X, Utensils, MessageCircle, Cat as CatIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { CatGalleryModal } from "./cat-gallery-modal";
import { CatProfileDetail } from "./cat-profile-detail";
import { CatSettingsModal } from "./cat-settings-modal";
import { PhotoSortModal } from "./photo-sort-modal";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

interface GalleryImage {
    id: string;
    storagePath: string; // or the full URL if isUrl is true, logic handles it.
    catId: string;
    catName: string;
    createdAt: string;
    source: 'profile' | 'care' | 'observation';
    isUrl?: boolean;
    url?: string;
    type?: string;
    is_favorite?: boolean;
}

// Unified Header Component
function ScreenHeader({ title, onClose }: { title: string; onClose?: () => void }) {
    return (
        <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">{title}</h2>
            <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-white/10"
            >
                <X className="h-5 w-5 text-slate-300" />
            </Button>
        </div>
    );
}

interface GalleryScreenProps {
    onClose?: () => void;
    initialCatId?: string | null;
}

export function GalleryScreen({ onClose, initialCatId }: GalleryScreenProps) {
    const { cats, householdId, uploadCatImage, deleteCatImage, updateCatImage } = useAppState();

    // UI State
    const [filterCatId, setFilterCatId] = useState<string | null>(initialCatId || null);
    const [activeSource, setActiveSource] = useState<'all' | 'profile' | 'care' | 'observation'>('all');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

    // Infinite Scroll State
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Modal states
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [photosToSort, setPhotosToSort] = useState<Array<{ id: string; url: string }>>([]);
    const [profileCatId, setProfileCatId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const limit = 30;

    const getPublicUrl = (path: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
    };

    // Load images
    const loadImages = async (isInitial = false) => {
        if (!householdId || loading || (!isInitial && !hasMore)) return;

        setLoading(true);
        const currentOffset = isInitial ? 0 : offset;
        const supabase = createClient();

        const { data, error } = await (supabase.rpc as any)('get_unified_gallery', {
            target_household_id: householdId,
            filter_cat_id: filterCatId || undefined,
            limit_count: limit,
            offset_count: currentOffset
        });

        if (error) {
            console.error('Error fetching gallery:', error);
            setLoading(false);
            return;
        }

        const newImages = (data as any[] || []).map(img => ({
            id: img.id,
            catId: img.cat_id,
            catName: img.cat_name,
            storagePath: img.url,
            url: img.url,
            source: img.source,
            type: img.type,
            createdAt: img.created_at,
            isUrl: img.is_url,
            is_favorite: img.is_favorite
        }));

        if (isInitial) {
            setImages(newImages);
            setOffset(limit);
        } else {
            setImages(prev => [...prev, ...newImages]);
            setOffset(currentOffset + limit);
        }

        setHasMore(newImages.length === limit);
        setLoading(false);
    };

    // Reset and reload when filters change
    useEffect(() => {
        loadImages(true);
    }, [filterCatId, householdId]);

    // Handle scroll for infinite loading
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
            loadImages();
        }
    };

    const displayImages = useMemo(() => {
        if (activeSource === 'all') return images;
        return images.filter(img => img.source === activeSource);
    }, [images, activeSource]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploading(true);

        if (cats.length === 1 || filterCatId) {
            const targetId = filterCatId || cats[0].id;
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                await uploadCatImage(targetId, file);
            }
            toast.success("アップロードしました");
            loadImages(true);
        } else {
            const uploaded: any[] = [];
            for (const file of files) {
                const { data, error } = await uploadCatImage(cats[0].id, file);
                if (!error && data) {
                    const typedData = data as any;
                    uploaded.push({
                        id: typedData.id,
                        url: getPublicUrl(typedData.storagePath)
                    });
                }
            }
            if (uploaded.length > 0) {
                setPhotosToSort(uploaded);
                setIsSortModalOpen(true);
            }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedImageIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedImageIds(newSet);
    };

    const handleBatchDelete = async () => {
        if (selectedImageIds.size === 0) return;
        if (!confirm(`${selectedImageIds.size}枚削除しますか？`)) return;

        let count = 0;
        for (const id of Array.from(selectedImageIds)) {
            const img = images.find(i => i.id === id);
            if (img && img.source === 'profile') {
                const { error } = await deleteCatImage(img.id, img.storagePath);
                if (!error) count++;
            }
        }

        toast.success(`${count}枚削除しました（プロフィール作成の写真のみ削除可能です）`);
        setSelectedImageIds(new Set());
        setIsSelectMode(false);
        loadImages(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 fixed inset-0 z-50">
            {/* Unified Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 h-14">
                    {isSelectMode ? (
                        <>
                            <button onClick={() => { setIsSelectMode(false); setSelectedImageIds(new Set()); }} className="text-[15px] font-medium text-slate-500">
                                キャンセル
                            </button>
                            <span className="text-[15px] font-bold">{selectedImageIds.size}枚選択</span>
                            <button onClick={handleBatchDelete} disabled={selectedImageIds.size === 0} className="text-[15px] font-bold text-red-500 disabled:opacity-30">
                                削除
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5" />
                            </button>
                            <h2 className="text-[17px] font-bold">ギャラリー</h2>
                            <button onClick={() => setIsSelectMode(true)} className="text-[15px] font-medium text-[#E8B4A0]">
                                選択
                            </button>
                        </>
                    )}
                </div>

                {/* Cat Selector - Improved UI */}
                <div className="px-4 py-3 flex gap-4 overflow-x-auto scrollbar-hide border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setFilterCatId(null)}
                        className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2",
                            !filterCatId ? "bg-[#E8B4A0] border-[#E8B4A0] shadow-lg scale-105" : "bg-white dark:bg-slate-800 border-transparent shadow-sm"
                        )}>
                            <ImageIcon className={cn("w-6 h-6", !filterCatId ? "text-white" : "text-slate-400")} />
                        </div>
                        <span className={cn("text-[11px] font-bold", !filterCatId ? "text-[#E8B4A0]" : "text-slate-500")}>すべて</span>
                    </button>
                    {cats.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilterCatId(cat.id)}
                            className="flex flex-col items-center gap-1.5 shrink-0"
                        >
                            <div className={cn(
                                "w-14 h-14 rounded-2xl overflow-hidden transition-all border-2",
                                filterCatId === cat.id ? "border-[#E8B4A0] shadow-lg scale-105" : "border-transparent shadow-sm"
                            )}>
                                {cat.avatar ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xl">🐈</div>
                                )}
                            </div>
                            <span className={cn("text-[11px] font-bold truncate w-14 text-center", filterCatId === cat.id ? "text-[#E8B4A0]" : "text-slate-500")}>
                                {cat.name}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Source Tabs */}
                <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'all', label: 'すべて', icon: ImageIcon },
                        { id: 'profile', label: 'フォト', icon: Camera },
                        { id: 'care', label: 'お世話', icon: Utensils },
                        { id: 'observation', label: '気づき', icon: MessageCircle },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSource(tab.id as any)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold transition-all",
                                activeSource === tab.id
                                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                                    : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Photo Feed */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-0.5"
                onScroll={handleScroll}
            >
                {displayImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin opacity-30" />
                        ) : (
                            <>
                                <ImageIcon className="h-12 w-12 mb-3 opacity-20" />
                                <p className="text-[15px] font-medium">写真がありません</p>
                                <p className="text-[13px] opacity-70 mt-1">日々の思い出を記録しましょう</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-0.5">
                        {displayImages.map((img, idx) => (
                            <div
                                key={`${img.id}_${idx}`}
                                className="relative aspect-square bg-slate-200 dark:bg-slate-800 cursor-pointer overflow-hidden animate-in fade-in duration-500"
                                onClick={() => isSelectMode && toggleSelection(img.id)}
                            >
                                <img
                                    src={img.isUrl ? img.url : getPublicUrl(img.storagePath)}
                                    alt=""
                                    loading="lazy"
                                    className={cn(
                                        "w-full h-full object-cover transition-transform duration-500",
                                        isSelectMode && selectedImageIds.has(img.id) ? "scale-90 opacity-60" : "scale-100 group-hover:scale-105"
                                    )}
                                />

                                {/* Source & Info Badges */}
                                {!isSelectMode && (
                                    <>
                                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded-full text-[9px] text-white font-bold max-w-[80%] truncate shadow-sm">
                                            {img.catName}
                                        </div>
                                        <div className="absolute bottom-1 right-1">
                                            {img.source === 'care' && (
                                                <div className="bg-emerald-500/90 p-1 rounded-full text-white shadow-sm"><Utensils className="w-2.5 h-2.5" /></div>
                                            )}
                                            {img.source === 'observation' && (
                                                <div className="bg-sky-500/90 p-1 rounded-full text-white shadow-sm"><MessageCircle className="w-2.5 h-2.5" /></div>
                                            )}
                                            {img.source === 'profile' && (
                                                <div className="bg-[#E8B4A0]/90 p-1 rounded-full text-white shadow-sm"><Camera className="w-2.5 h-2.5" /></div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {isSelectMode && (
                                    <div className={cn(
                                        "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-lg",
                                        selectedImageIds.has(img.id) ? "bg-[#E8B4A0] border-[#E8B4A0] text-white" : "bg-black/20 border-white/50"
                                    )}>
                                        {selectedImageIds.has(img.id) && <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {loading && hasMore && (
                    <div className="py-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            {!isSelectMode && (
                <div className="fixed bottom-6 right-6">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || cats.length === 0}
                        className="w-14 h-14 rounded-2xl bg-[#E8B4A0] text-white shadow-xl shadow-[#E8B4A0]/40 flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-7 w-7" />}
                    </button>
                </div>
            )}

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />

            <PhotoSortModal
                isOpen={isSortModalOpen}
                onClose={() => setIsSortModalOpen(false)}
                photos={photosToSort}
                onAssign={async (pid, cid) => {
                    await updateCatImage(pid, { cat_id: cid });
                    loadImages(true);
                }}
            />
        </div>
    );
}
