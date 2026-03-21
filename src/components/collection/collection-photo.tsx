"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useCatContext, useCoreContext } from "@/store/app-store";
import {
    Plus, Image as ImageIcon, Loader2, CheckCircle2, Camera,
    Utensils, MessageCircle, Cat as CatIcon, Wand2
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { PhotoSortModal } from "@/components/app/modals/photo-sort-modal";
import { PhotoDetailView } from "@/components/app/immersive/photo-detail-view";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

interface GalleryImage {
    id: string;
    storagePath: string;
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
    aiAnalysis?: any;
}

export function CollectionPhoto({ onOpenImport }: { onOpenImport: () => void }) {
    const { cats, uploadCatImage, deleteCatImage, updateCatImage, analyzeCatImage } = useCatContext();
    const { isDemo, householdId } = useCoreContext();

    const [filterCatId, setFilterCatId] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [activeSource, setActiveSource] = useState<'all' | 'profile' | 'care' | 'observation'>('all');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

    const [images, setImages] = useState<GalleryImage[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [availableTags, setAvailableTags] = useState<string[]>(['寝顔', 'ごはん', 'おもちゃ', '日向ぼっこ', 'リラックス']);

    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [photosToSort, setPhotosToSort] = useState<Array<{ id: string; url: string }>>([]);
    const [selectedDetailImage, setSelectedDetailImage] = useState<GalleryImage | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const limit = 30;

    const loadImages = useCallback(async (isInitial = false) => {
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

        if (error) { console.error(error); setLoading(false); return; }

        const newImages = (data as any[] || []).map((img: any) => ({
            id: img.id,
            catId: img.cat_id,
            catIds: img.cat_ids || (img.cat_id ? [img.cat_id] : []),
            catName: img.cat_name,
            storagePath: img.url,
            url: img.is_url ? img.url : getFullImageUrl(img.url),
            source: img.source,
            createdAt: img.created_at,
            isUrl: img.is_url,
            is_favorite: img.is_favorite,
            memo: img.memo,
            tags: img.tags,
            aiAnalysis: img.ai_analysis,
        }));

        if (isInitial) { setImages(newImages); setOffset(limit); }
        else { setImages(prev => [...prev, ...newImages]); setOffset(currentOffset + limit); }
        setHasMore(newImages.length === limit);
        setLoading(false);

        if (newImages.length > 0) {
            const tagSet = new Set(availableTags);
            newImages.forEach((img: any) => {
                if (img.tags && Array.isArray(img.tags)) {
                    img.tags.forEach((t: any) => { if (t.name) tagSet.add(t.name); });
                }
            });
            const sorted = Array.from(tagSet);
            if (sorted.length !== availableTags.length) setAvailableTags(sorted);
        }
    }, [householdId, filterCatId, filterTag, offset, hasMore, loading, availableTags]);

    useEffect(() => { loadImages(true); }, [filterCatId, filterTag, activeSource, householdId]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) loadImages();
    };

    const displayImages = useMemo(() => {
        if (activeSource === 'all') return images;
        return images.filter(img => img.source === activeSource);
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

    const untaggedCount = useMemo(() => images.filter(i => !i.aiAnalysis || !i.aiAnalysis.pose).length, [images]);

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
                    const d = data as any;
                    uploaded.push({ id: d.id, url: getFullImageUrl(d.storagePath) });
                }
            }
            if (uploaded.length > 0) { setPhotosToSort(uploaded); setIsSortModalOpen(true); }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const toggleSelection = (id: string) => {
        const s = new Set(selectedImageIds);
        if (s.has(id)) s.delete(id); else s.add(id);
        setSelectedImageIds(s);
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
        toast.success(`${count}枚削除しました`);
        setSelectedImageIds(new Set());
        setIsSelectMode(false);
        loadImages(true);
    };

    const handleBatchAnalyze = async () => {
        const untagged = images.filter(i => !i.aiAnalysis || !i.aiAnalysis.pose);
        if (untagged.length === 0) return;
        toast.info(`${untagged.length}枚をAI分析中...`);
        for (let i = 0; i < untagged.length; i++) {
            const photo = untagged[i];
            const imageUrl = getFullImageUrl(photo.storagePath, { width: 800, height: 800, resize: 'contain', quality: 90 });
            try { await analyzeCatImage(photo.id, imageUrl); } catch (e) { console.error(e); }
            if (i < untagged.length - 1) await new Promise(r => setTimeout(r, 2000));
        }
        toast.success("AI分析が完了しました");
        loadImages(true);
    };

    return (
        <div className="fixed inset-0 z-0 flex flex-col bg-[#FDF8F1] dark:bg-[#121214]">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#FDF8F1]/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-[#F2EFEA] dark:border-white/10 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center justify-between px-5 h-14">
                    {isSelectMode ? (
                        <>
                            <button onClick={() => { setIsSelectMode(false); setSelectedImageIds(new Set()); }} className="text-[15px] font-medium text-[#787570]">
                                キャンセル
                            </button>
                            <span className="text-[15px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">{selectedImageIds.size}枚選択</span>
                            <button onClick={handleBatchDelete} disabled={selectedImageIds.size === 0} className="text-[15px] font-bold text-red-500 disabled:opacity-30">
                                削除
                            </button>
                        </>
                    ) : (
                        <>
                            <h1 className="text-[20px] font-black text-[#4E342E] dark:text-[#E8E6E1]">フォト</h1>
                            <div className="flex items-center gap-2">
                                {untaggedCount > 0 && (
                                    <button
                                        onClick={handleBatchAnalyze}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-peach/10 text-brand-peach text-[13px] font-bold active:scale-95 transition-transform"
                                    >
                                        <Wand2 className="w-4 h-4" />
                                        <span>AI分析 ({untaggedCount})</span>
                                    </button>
                                )}
                                <button
                                    onClick={onOpenImport}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-[#787570] dark:text-[#E8E6E1]/70 text-[13px] font-bold active:scale-95 transition-transform"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    <span>インポート</span>
                                </button>
                                <button onClick={() => setIsSelectMode(true)} className="text-[14px] font-bold text-brand-peach">
                                    選択
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Cat Selector */}
                <div className="px-4 py-3 flex gap-3 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setFilterCatId(null)}
                        className="flex flex-col items-center gap-1.5 shrink-0"
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2",
                            !filterCatId ? "bg-[#4E342E] border-[#4E342E] shadow-md" : "bg-white dark:bg-[#2c2c2e] border-transparent shadow-sm"
                        )}>
                            <ImageIcon className={cn("w-5 h-5", !filterCatId ? "text-white" : "text-[#787570]")} />
                        </div>
                        <span className={cn("text-[10px] font-bold", !filterCatId ? "text-[#4E342E]" : "text-[#787570]")}>すべて</span>
                    </button>
                    {cats.map(cat => (
                        <button key={cat.id} onClick={() => setFilterCatId(cat.id)} className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl overflow-hidden transition-all border-2",
                                filterCatId === cat.id ? "border-brand-peach shadow-md scale-105" : "border-transparent shadow-sm"
                            )}>
                                {cat.avatar ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#F2EFEA] flex items-center justify-center text-[#B8B3AD]">
                                        <CatIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                            <span className={cn("text-[10px] font-bold truncate w-12 text-center", filterCatId === cat.id ? "text-brand-peach" : "text-[#787570]")}>
                                {cat.name}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Source Filters */}
                <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                    {[
                        { key: 'all' as const, label: 'すべて', icon: null },
                        { key: 'profile' as const, label: '写真', icon: <Camera className="w-3 h-3" /> },
                        { key: 'care' as const, label: 'お世話', icon: <Utensils className="w-3 h-3" /> },
                        { key: 'observation' as const, label: '記録', icon: <MessageCircle className="w-3 h-3" /> },
                    ].map(s => (
                        <button
                            key={s.key}
                            onClick={() => setActiveSource(s.key)}
                            className={cn(
                                "px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                                activeSource === s.key
                                    ? "bg-[#4E342E] text-white shadow-sm"
                                    : "bg-white dark:bg-[#2c2c2e] text-[#787570] border border-[#F2EFEA] dark:border-white/10"
                            )}
                        >
                            {s.icon}{s.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Photo Grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
                {displayImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-[#D4CFC9]" />
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-[#F2EFEA] flex items-center justify-center">
                                    <Camera className="w-6 h-6 text-[#D4CFC9]" />
                                </div>
                                <p className="text-[15px] font-bold text-[#787570]">写真がありません</p>
                                <p className="text-[13px] text-[#8E8B85]">日々の思い出を記録しましょう</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 pb-32">
                        {Object.entries(groupedImages).map(([month, monthImages]) => (
                            <div key={month}>
                                <div className="px-4 sticky top-0 z-10 py-2 bg-[#FDF8F1]/80 dark:bg-[#121214]/80 backdrop-blur-md">
                                    <h3 className="text-[13px] font-bold text-[#787570]">{month}</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-0.5 px-0.5">
                                    {monthImages.map((img, idx) => (
                                        <div
                                            key={`${img.id}_${idx}`}
                                            className="relative aspect-square bg-[#F2EFEA] dark:bg-[#2c2c2e] cursor-pointer overflow-hidden"
                                            onClick={() => isSelectMode ? toggleSelection(img.id) : setSelectedDetailImage(img)}
                                        >
                                            <img
                                                src={img.url} alt="" loading="lazy" decoding="async"
                                                className={cn(
                                                    "w-full h-full object-cover transition-transform duration-300",
                                                    isSelectMode && selectedImageIds.has(img.id) ? "scale-90 opacity-60 rounded-lg" : ""
                                                )}
                                            />
                                            {!isSelectMode && (
                                                <>
                                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded-full text-[9px] text-white font-bold max-w-[80%] truncate">
                                                        {img.catIds && img.catIds.length > 1 ? `${img.catName} +${img.catIds.length - 1}` : img.catName}
                                                    </div>
                                                    {/* AI tag badge */}
                                                    {img.aiAnalysis?.pose && (
                                                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-[#FF9500]/90 backdrop-blur-sm rounded-full text-[8px] text-white font-bold">
                                                            {img.aiAnalysis.pose}
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-1 right-1">
                                                        {img.source === 'care' && <div className="bg-brand-sage/90 p-1 rounded-full text-white"><Utensils className="w-2.5 h-2.5" /></div>}
                                                        {img.source === 'observation' && <div className="bg-sky-500/90 p-1 rounded-full text-white"><MessageCircle className="w-2.5 h-2.5" /></div>}
                                                        {img.source === 'profile' && <div className="bg-brand-peach/90 p-1 rounded-full text-white"><Camera className="w-2.5 h-2.5" /></div>}
                                                    </div>
                                                </>
                                            )}
                                            {isSelectMode && (
                                                <div className={cn(
                                                    "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                    selectedImageIds.has(img.id) ? "bg-brand-peach border-brand-peach text-white" : "bg-black/20 border-white/50"
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
                        <Loader2 className="h-6 w-6 animate-spin text-[#D4CFC9]" />
                    </div>
                )}
            </div>

            {/* FAB - positioned above bottom nav */}
            {
                !isSelectMode && (
                    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+90px)] right-5 z-[10004]">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || cats.length === 0}
                            className="w-14 h-14 rounded-2xl bg-brand-peach text-white shadow-xl shadow-brand-peach/30 flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
                        >
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-7 w-7" />}
                        </button>
                    </div>
                )
            }

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
                    if (!window.confirm("この写真をアルバムから削除しますか？")) return;
                    const { error } = await deleteCatImage(id, selectedDetailImage?.storagePath || '');
                    if (error) { toast.error("削除に失敗しました"); }
                    else { toast.success("削除しました"); setSelectedDetailImage(null); setImages(prev => prev.filter(i => i.id !== id)); }
                }}
                onUpdateTags={async (id, tags) => {
                    const { error } = await updateCatImage(id as any, { tags });
                    if (error) { toast.error("タグの更新に失敗しました"); }
                    else {
                        setImages(prev => prev.map(i => i.id === id ? { ...i, tags } : i));
                        if (selectedDetailImage?.id === id) setSelectedDetailImage({ ...selectedDetailImage, tags });
                    }
                }}
            />
        </div >
    );
}
