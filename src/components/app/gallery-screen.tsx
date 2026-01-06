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
    const { cats, uploadCatImage, deleteCatImage, updateCatImage } = useAppState();
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [showAllPhotos, setShowAllPhotos] = useState(false);

    // Filter State
    const [filterCatId, setFilterCatId] = useState<string | null>(initialCatId || null);

    const [uploading, setUploading] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
    const [profileCatId, setProfileCatId] = useState<string | null>(null);
    const [isCatSettingsOpen, setIsCatSettingsOpen] = useState(false);
    const [photosToSort, setPhotosToSort] = useState<Array<{ id: string; url: string }>>([]);
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedCat = cats.find(c => c.id === selectedCatId);

    // Effect: If initialCatId is provided, enforce "All Photos" mode immediately?
    // User request: "Touch photo -> Jump to gallery of that child".
    // "Gallery of that child" implies the timeline view filtered by that child.
    useEffect(() => {
        if (initialCatId) {
            setShowAllPhotos(true);
            setFilterCatId(initialCatId);
        }
    }, [initialCatId]);

    const getPublicUrl = (path: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
    };

    const [activeTab, setActiveTab] = useState<'all' | 'profile' | 'care' | 'observation'>('all');
    const [fetchedImages, setFetchedImages] = useState<any[]>([]);
    const [fetching, setFetching] = useState(true);

    // Fetch images from other sources
    React.useEffect(() => {
        const fetchOtherImages = async () => {
            const supabase = createClient();

            // 1. Fetch Observations
            const { data: obsData } = await supabase
                .from('observations')
                .select('id, cat_id, images, created_at, type') // type is valuable for badge
                .not('images', 'is', null)
                .is('deleted_at', null);

            // 2. Fetch Care Logs
            const { data: careData } = await supabase
                .from('care_logs')
                .select('id, cat_id, images, done_at, type')
                .not('images', 'is', null)
                .is('deleted_at', null);

            const merged: any[] = [];

            // Process Observations
            if (obsData) {
                obsData.forEach((obs: any) => {
                    if (Array.isArray(obs.images)) {
                        obs.images.forEach((url: string) => {
                            merged.push({
                                id: obs.id + '_' + url, // Unique ID for grid
                                originalSortId: obs.id, // Sort by record
                                source: 'observation',
                                type: obs.type, // e.g., 'funny', 'toy'
                                catId: obs.cat_id,
                                storagePath: url.split('/').slice(-4).join('/'), // Extract path relative to storage? Or is it full URL? Upload returns publicURL actually check data hook.
                                // Wait, uploadCatImage returns FULL URL for obs/care logs usually? 
                                // Let's check hook: it returns publicUrl. 
                                // BUT `cats` table `images` stores JSON object {id, storagePath, publicUrl} usually? 
                                // Let's check `cats` structure below:
                                // cats.images is usually the JSON storage structure.
                                // logs.images is TEXT[] of URLs.
                                // We need to unify.
                                isUrl: true, // Marker to skip getPublicUrl wrapper if it's already a URL
                                url: url,
                                createdAt: obs.created_at
                            });
                        });
                    }
                });
            }

            // Process Care Logs
            if (careData) {
                careData.forEach((log: any) => {
                    if (Array.isArray(log.images)) {
                        log.images.forEach((url: string) => {
                            merged.push({
                                id: log.id + '_' + url,
                                originalSortId: log.id,
                                source: 'care',
                                type: log.type, // e.g., 'food:morning'
                                catId: log.cat_id,
                                isUrl: true,
                                url: url,
                                createdAt: log.done_at
                            });
                        });
                    }
                });
            }

            setFetchedImages(merged);
            setFetching(false);
        };

        fetchOtherImages();
    }, [cats]); // Re-fetch when cats change (refresh)

    const allImages: GalleryImage[] = useMemo(() => {
        // 1. Profile Images (Existing structure)
        const profileImages = cats.flatMap(cat =>
            (cat.images || []).map(img => ({
                ...img,
                source: 'profile' as const,
                catId: cat.id,
                catName: cat.name,
                createdAt: img.createdAt || new Date().toISOString() // Fallback
            }))
        );

        // 2. Merge with fetched images
        const combined: GalleryImage[] = [...profileImages];

        fetchedImages.forEach(img => {
            const cat = cats.find(c => c.id === img.catId);
            if (cat) {
                combined.push({
                    ...img,
                    catName: cat.name
                });
            } else if (!img.catId) {
                // Household common? defaults to first cat or specific label
                combined.push({
                    ...img,
                    catName: 'Household'
                });
            }
        });

        // 3. Sort
        return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [cats, fetchedImages]);

    const filteredImages = useMemo(() => {
        let result = allImages;
        if (activeTab !== 'all') {
            result = result.filter(img => img.source === activeTab);
        }
        if (filterCatId) {
            result = result.filter(img => img.catId === filterCatId);
        }
        return result;
    }, [allImages, activeTab, filterCatId]);

    const displayImages = filteredImages; // Helper alias


    const totalPhotoCount = allImages.length;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        if (cats.length === 0) {
            toast.error("猫を先に登録してください");
            return;
        }

        const files = Array.from(e.target.files);
        setUploading(true);

        // For single cat, upload directly
        if (cats.length === 1) {
            let successCount = 0;
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                const { error } = await uploadCatImage(cats[0].id, file);
                if (!error) successCount++;
            }
            if (successCount > 0) toast.success(`${successCount}枚追加しました`);
        } else {
            // For multiple cats, show sorting modal
            const uploadedPhotos: Array<{ id: string; url: string }> = [];
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                // Upload to first cat temporarily, will be reassigned
                const { data, error } = await uploadCatImage(cats[0].id, file);
                if (!error && data) {
                    const typedData = data as any;
                    const supabase = createClient();
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(typedData.storagePath);
                    uploadedPhotos.push({
                        id: typedData.id,
                        url: urlData.publicUrl
                    });
                }
            }

            if (uploadedPhotos.length > 0) {
                setPhotosToSort(uploadedPhotos);
                setIsSortModalOpen(true);
            }
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSortAssign = async (photoId: string, catId: string) => {
        const { error } = await updateCatImage(photoId, { cat_id: catId });
        if (error) {
            toast.error("写真の振り分けに失敗しました");
        }
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
            const img = allImages.find(i => i.id === id);
            if (img) {
                const { error } = await deleteCatImage(img.id, img.storagePath);
                if (!error) count++;
            }
        }
        toast.success(`${count}枚削除しました`);
        setSelectedImageIds(new Set());
        setIsSelectMode(false);
    };

    // All Photos View
    if (showAllPhotos) {
        return (
            <div className="flex flex-col h-full bg-background dark:bg-slate-950 fixed inset-0 z-50">
                <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between px-4 h-14">
                        {isSelectMode ? (
                            <>
                                <button
                                    onClick={() => { setIsSelectMode(false); setSelectedImageIds(new Set()); }}
                                    className="text-[15px] text-slate-600 dark:text-slate-400 active:opacity-50"
                                >
                                    キャンセル
                                </button>
                                <span className="text-[15px] font-semibold text-slate-800 dark:text-white">
                                    {selectedImageIds.size}枚選択
                                </span>
                                <button
                                    onClick={handleBatchDelete}
                                    disabled={selectedImageIds.size === 0}
                                    className="text-[15px] text-red-500 disabled:opacity-30 active:opacity-50"
                                >
                                    削除
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setShowAllPhotos(false)}
                                    className="text-[15px] text-slate-600 dark:text-slate-400 active:opacity-50 flex items-center gap-1"
                                >
                                    <ChevronRight className="h-5 w-5 rotate-180" /> 戻る
                                </button>
                                <div className="flex flex-col items-center">
                                    <span className="text-[15px] font-semibold text-slate-800 dark:text-white leading-none">
                                        ギャラリー
                                    </span>
                                    {filterCatId && (
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full mt-0.5">
                                            <Filter className="w-2.5 h-2.5" />
                                            {cats.find(c => c.id === filterCatId)?.name || '...'}
                                            <button onClick={(e) => { e.stopPropagation(); setFilterCatId(null); }} className="hover:text-red-500 ml-1"><X className="w-2.5 h-2.5" /></button>
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsSelectMode(true)}
                                    className="text-[15px] text-slate-600 dark:text-slate-400 active:opacity-50"
                                >
                                    選択
                                </button>
                            </>
                        )}
                    </div>

                    {/* Tabs (Only in view mode) */}
                    {!isSelectMode && (
                        <div className="px-2 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'all', label: 'すべて', icon: ImageIcon },
                                { id: 'profile', label: 'フォト', icon: Camera },
                                { id: 'care', label: 'お世話', icon: Utensils },
                                { id: 'observation', label: '気づき', icon: MessageCircle },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md"
                                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    )}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pb-20 p-1">
                    {displayImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            {fetching ? (
                                <Loader2 className="h-8 w-8 animate-spin opacity-30" />
                            ) : (
                                <>
                                    <ImageIcon className="h-10 w-10 mb-3 opacity-30" />
                                    <p className="text-[15px]">写真がありません</p>
                                    <p className="text-[13px] mt-1">猫との思い出を記録しましょう</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-0.5">
                            {displayImages.map(img => (
                                <div
                                    key={img.id}
                                    className="relative aspect-square bg-slate-100 dark:bg-slate-800"
                                    onClick={() => isSelectMode && toggleSelection(img.id)}
                                >
                                    <img
                                        src={img.isUrl ? img.url : getPublicUrl(img.storagePath)}
                                        alt=""
                                        loading="lazy"
                                        className={cn(
                                            "w-full h-full object-cover transition-all",
                                            isSelectMode && selectedImageIds.has(img.id) && "opacity-60 scale-90"
                                        )}
                                    />
                                    {/* Source Badge (Bottom Right) */}
                                    {!isSelectMode && (
                                        <div className="absolute bottom-1 right-1">
                                            {img.source === 'care' && (
                                                <div className="bg-emerald-500/90 p-1 rounded-full text-white shadow-sm backdrop-blur-sm">
                                                    <Utensils className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                            {img.source === 'observation' && (
                                                <div className="bg-amber-500/90 p-1 rounded-full text-white shadow-sm backdrop-blur-sm">
                                                    <MessageCircle className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                            {img.source === 'profile' && (
                                                <div className="bg-blue-500/90 p-1 rounded-full text-white shadow-sm backdrop-blur-sm">
                                                    <Camera className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <span className="absolute top-1 left-1 text-[10px] bg-black/50 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full shadow-sm max-w-[80%] truncate">
                                        {img.catName}
                                    </span>
                                    {isSelectMode && (
                                        <div className={cn(
                                            "absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedImageIds.has(img.id)
                                                ? "bg-blue-500 border-blue-500 shadow-lg scale-110"
                                                : "border-white bg-black/20"
                                        )}>
                                            {selectedImageIds.has(img.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Photo Sort Modal */}
                <PhotoSortModal
                    isOpen={isSortModalOpen}
                    onClose={() => setIsSortModalOpen(false)}
                    photos={photosToSort}
                    onAssign={handleSortAssign}
                />
            </div>
        );
    }

    // Main View - iOS Card Style
    return (
        <div className="min-h-screen bg-transparent pb-20">
            <ScreenHeader title="ギャラリー" onClose={onClose} />
            <div className="p-4 space-y-4">
                {/* All Photos Card - Glass Style */}
                <div
                    className="relative aspect-[2/1] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform shadow-lg border border-white/30"
                    onClick={() => setShowAllPhotos(true)}
                >
                    {allImages[0] ? (
                        <img src={getPublicUrl(allImages[0].storagePath)} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-slate-400" />
                        </div>
                    )}
                    {/* Gradient overlay with text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                            <p className="text-white font-semibold text-[15px]">すべての写真</p>
                            <p className="text-white/70 text-[13px]">{totalPhotoCount}枚</p>
                        </div>
                        {/* Photo add button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                            disabled={uploading || cats.length === 0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-[13px] disabled:opacity-40 active:scale-95 transition-all outline-none"
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Camera className="h-4 w-4" /> 追加</>}
                        </button>
                    </div>
                    <ChevronRight className="absolute top-3 right-3 h-5 w-5 text-white/70" />
                </div>

                {/* Cat Grid - Glass Style */}
                <div className="grid grid-cols-3 gap-2">
                    {cats.map(cat => {
                        const hasAvatar = cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/');
                        const hasImage = cat.images?.[0];

                        return (
                            <div key={cat.id}>
                                {/* Image - tap to open gallery */}
                                <div
                                    className="aspect-square rounded-xl overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/30 relative cursor-pointer active:scale-95 transition-transform"
                                    onClick={() => setSelectedCatId(cat.id)}
                                >
                                    {hasAvatar ? (
                                        <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                    ) : hasImage ? (
                                        <img src={getPublicUrl(cat.images![0].storagePath)} alt={cat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl">
                                            {cat.avatar || "🐈"}
                                        </div>
                                    )}
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                </div>
                                {/* Name - tap to open profile detail */}
                                <button
                                    onClick={() => setProfileCatId(cat.id)}
                                    className="w-full text-center hover:bg-white/20 rounded-lg py-1 mt-1 transition-colors"
                                >
                                    <p className="text-[13px] font-medium text-slate-800 dark:text-white truncate drop-shadow-sm">{cat.name}</p>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                        タップして詳細
                                    </p>
                                </button>
                            </div>
                        );
                    })}

                    {/* Add Cat Card */}
                    <div
                        className="cursor-pointer active:scale-95 transition-transform"
                        onClick={() => setIsCatSettingsOpen(true)}
                    >
                        <div className="aspect-square rounded-xl overflow-hidden bg-white/20 dark:bg-slate-900/20 backdrop-blur-md border border-white/30 border-dashed flex items-center justify-center">
                            <Plus className="h-8 w-8 text-slate-400 dark:text-slate-200" />
                        </div>
                        <p className="text-[13px] font-medium text-slate-600 dark:text-slate-200 mt-1.5 text-center shadow-sm">新しい猫を追加</p>
                    </div>
                </div>

                {/* Empty State */}
                {cats.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-3">📷</div>
                        <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
                            猫を登録しましょう
                        </p>
                        <button
                            onClick={() => setIsCatSettingsOpen(true)}
                            className="mt-3 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 active:scale-95 transition-all"
                        >
                            猫を追加
                        </button>
                    </div>
                )}

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />

                {selectedCat && (
                    <CatGalleryModal isOpen={!!selectedCatId} onClose={() => setSelectedCatId(null)} catId={selectedCat.id} catName={selectedCat.name} />
                )}

                {/* Cat Profile Detail Modal */}
                {profileCatId && (
                    <CatProfileDetail
                        isOpen={!!profileCatId}
                        onClose={() => setProfileCatId(null)}
                        catId={profileCatId}
                    />
                )}

                {/* Cat Settings Modal */}
                <CatSettingsModal
                    isOpen={isCatSettingsOpen}
                    onClose={() => setIsCatSettingsOpen(false)}
                />
            </div>
        </div>
    );
}
