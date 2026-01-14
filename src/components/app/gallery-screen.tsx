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
import { PhotoDetailView } from "./immersive/photo-detail-view";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

interface GalleryImage {
    id: string;
    storagePath: string; // or the full URL if isUrl is true, logic handles it.
    catId: string;
    catIds: string[];
    catName: string;
    createdAt: string;
    source: 'profile' | 'care' | 'observation';
    url: string;
    isUrl?: boolean;
    is_favorite?: boolean;
    memo?: string;
    tags?: any[];
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
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [activeSource, setActiveSource] = useState<'all' | 'profile' | 'care' | 'observation'>('all');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

    // Infinite Scroll State
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [availableTags, setAvailableTags] = useState<string[]>(['寝顔', 'ごはん', 'おもちゃ', '日向ぼっこ', 'リラックス']);

    // Modal states
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [photosToSort, setPhotosToSort] = useState<Array<{ id: string; url: string }>>([]);
    const [profileCatId, setProfileCatId] = useState<string | null>(null);
    const [selectedDetailImage, setSelectedDetailImage] = useState<GalleryImage | null>(null);

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
            filter_tag: filterTag || undefined,
            limit_count: limit,
            offset_count: currentOffset
        });

        if (error) {
            console.error('Error fetching gallery:', error);
            setLoading(false);
            return;
        }

        const newImages = (data as any[] || []).map(img => {
            const path = img.url;
            let finalUrl = img.url;

            if (!img.is_url) {
                // Heuristic: cat-images bucket uses 'cat-photos/' prefix. 
                // Legacy images in 'avatars' bucket use '{catId}/' structure.
                const bucket = path.startsWith('cat-photos/') ? 'cat-images' : 'avatars';

                const { data: urlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(path, {
                        transform: {
                            width: 300,
                            height: 300,
                            resize: 'cover',
                            quality: 80
                        }
                    });
                finalUrl = urlData.publicUrl;
            }

            return {
                id: img.id,
                catId: img.cat_id,
                catIds: img.cat_ids || (img.cat_id ? [img.cat_id] : []),
                catName: img.cat_name,
                storagePath: img.url,
                url: finalUrl,
                source: img.source,
                type: img.type,
                createdAt: img.created_at,
                isUrl: img.is_url,
                is_favorite: img.is_favorite,
                memo: img.memo,
                tags: img.tags
            };
        });

        if (isInitial) {
            setImages(newImages);
            setOffset(limit);
        } else {
            setImages(prev => [...prev, ...newImages]);
            setOffset(currentOffset + limit);
        }

        setHasMore(newImages.length === limit);
        setLoading(false);

        // Extract and update available tags
        if (newImages.length > 0) {
            const tagSet = new Set(availableTags);
            newImages.forEach(img => {
                if (img.tags && Array.isArray(img.tags)) {
                    img.tags.forEach((t: any) => {
                        if (t.name) tagSet.add(t.name);
                    });
                }
            });
            const sortedTags = Array.from(tagSet);
            if (sortedTags.length !== availableTags.length) {
                setAvailableTags(sortedTags);
            }
        }
    };

    // Reset and reload when filters change
    useEffect(() => {
        loadImages(true);
    }, [filterCatId, filterTag, activeSource, householdId]);

    // Handle scroll for infinite loading
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
            loadImages();
        }
    };

    const displayImages = useMemo(() => {
        let filtered = images;
        if (activeSource !== 'all') {
            filtered = images.filter(img => img.source === activeSource);
        }
        return filtered;
    }, [images, activeSource]);

    const groupedImages = useMemo(() => {
        const groups: Record<string, GalleryImage[]> = {};
        displayImages.forEach(img => {
            const date = new Date(img.createdAt);
            const monthKey = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(img);
        });
        return groups;
    }, [displayImages]);

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
                            <h2 className="text-[17px] font-bold">アルバム</h2>
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

                {/* Source & Tag Filters */}
                <div className="px-4 py-2 flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800">
                    {/* Source Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                        <button
                            onClick={() => setActiveSource('all')}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                activeSource === 'all' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            )}
                        >
                            すべて
                        </button>
                        <button
                            onClick={() => setActiveSource('profile')}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                activeSource === 'profile' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            )}
                        >
                            写真
                        </button>
                        <button
                            onClick={() => setActiveSource('care')}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                                activeSource === 'care' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            )}
                        >
                            <Utensils className="w-3 h-3" />
                            お世話
                        </button>
                        <button
                            onClick={() => setActiveSource('observation')}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                                activeSource === 'observation' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            )}
                        >
                            <MessageCircle className="w-3 h-3" />
                            記録
                        </button>
                    </div>

                    {/* Tag Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar">
                        {['すべて', ...availableTags].map(tag => (
                            <button
                                key={tag}
                                onClick={() => setFilterTag(tag === 'すべて' ? null : tag)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border shadow-sm",
                                    (tag === 'すべて' ? !filterTag : filterTag === tag)
                                        ? "bg-[#E8B4A0] text-white border-[#E8B4A0]"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-[#E8B4A0]/30 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
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
                    <div className="space-y-6 pb-20">
                        {Object.entries(groupedImages).map(([month, monthImages]) => (
                            <div key={month} className="space-y-2">
                                <div className="px-4 sticky top-0 z-10 py-2 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
                                    <h3 className="text-sm font-bold text-slate-500">{month}</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-0.5">
                                    {monthImages.map((img, idx) => (
                                        <div
                                            key={`${img.id}_${idx}`}
                                            className="relative aspect-square bg-slate-200 dark:bg-slate-800 cursor-pointer overflow-hidden animate-in fade-in duration-500"
                                            onClick={() => isSelectMode ? toggleSelection(img.id) : setSelectedDetailImage(img)}
                                        >
                                            <img
                                                src={img.url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className={cn(
                                                    "w-full h-full object-cover transition-transform duration-500",
                                                    isSelectMode && selectedImageIds.has(img.id) ? "scale-90 opacity-60" : "scale-100 group-hover:scale-105"
                                                )}
                                            />

                                            {/* Source & Info Badges */}
                                            {!isSelectMode && (
                                                <>
                                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded-full text-[9px] text-white font-bold max-w-[80%] truncate shadow-sm">
                                                        {img.catIds && img.catIds.length > 1 ? `${img.catName} +${img.catIds.length - 1}` : img.catName}
                                                    </div>
                                                    <div className="absolute bottom-1 right-1">
                                                        {img.source === 'care' && (
                                                            <div className="bg-[color:var(--sage)]/90 p-1 rounded-full text-white shadow-sm"><Utensils className="w-2.5 h-2.5" /></div>
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

            <PhotoDetailView
                isOpen={!!selectedDetailImage}
                onClose={() => setSelectedDetailImage(null)}
                image={selectedDetailImage}
                onDelete={async (id) => {
                    const confirm = window.confirm("この写真をアルバムから削除しますか？\n(お世話記録などの写真は本体は残ります)");
                    if (!confirm) return;

                    const { error } = await deleteCatImage(id, selectedDetailImage?.storagePath || '');
                    if (error) {
                        toast.error("削除に失敗しました");
                    } else {
                        toast.success("削除しました");
                        setSelectedDetailImage(null);
                        setImages(prev => prev.filter(img => img.id !== id));
                    }
                }}
                onUpdateTags={async (id, tags) => {
                    const { error } = await updateCatImage(id as any, { tags });
                    if (error) {
                        toast.error("タグの更新に失敗しました");
                    } else {
                        setImages(prev => prev.map(img =>
                            img.id === id ? { ...img, tags } : img
                        ));
                        // Update the local state for the opened modal if necessary
                        if (selectedDetailImage?.id === id) {
                            setSelectedDetailImage({ ...selectedDetailImage, tags });
                        }
                    }
                }}
            />
        </div>
    );
}
