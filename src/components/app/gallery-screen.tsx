"use client";

import React, { useState, useRef, useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { Plus, Image as ImageIcon, Loader2, CheckCircle2, ChevronRight, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { CatGalleryModal } from "./cat-gallery-modal";
import { CatProfileDetail } from "./cat-profile-detail";
import { CatSettingsModal } from "./cat-settings-modal";
import { PhotoSortModal } from "./photo-sort-modal";

export function GalleryScreen() {
    const { cats, uploadCatImage, deleteCatImage, updateCatImage } = useAppState();
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [showAllPhotos, setShowAllPhotos] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
    const [profileCatId, setProfileCatId] = useState<string | null>(null);
    const [isCatSettingsOpen, setIsCatSettingsOpen] = useState(false);
    const [photosToSort, setPhotosToSort] = useState<Array<{ id: string; url: string }>>([]);
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedCat = cats.find(c => c.id === selectedCatId);

    const getPublicUrl = (path: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
    };

    const allImages = useMemo(() => {
        return cats.flatMap(cat =>
            (cat.images || []).map(img => ({
                ...img,
                catId: cat.id,
                catName: cat.name,
            }))
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [cats]);

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
                    const supabase = createClient();
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.storagePath);
                    uploadedPhotos.push({
                        id: data.id,
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
            <div className="flex flex-col h-full -mx-4 -mt-4">
                <div className="sticky top-0 z-20 bg-[#faf9f7] dark:bg-slate-900">
                    <div className="flex items-center justify-between px-4 h-11">
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
                                    className="text-[15px] text-slate-600 dark:text-slate-400 active:opacity-50"
                                >
                                    ← 戻る
                                </button>
                                <span className="text-[15px] font-semibold text-slate-800 dark:text-white">
                                    すべての写真
                                </span>
                                <button
                                    onClick={() => setIsSelectMode(true)}
                                    className="text-[15px] text-slate-600 dark:text-slate-400 active:opacity-50"
                                >
                                    選択
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-20">
                    {allImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <ImageIcon className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-[15px]">まだ写真がありません</p>
                            <p className="text-[13px] mt-1">猫をタップして写真を追加しましょう</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-px">
                            {allImages.map(img => (
                                <div
                                    key={img.id}
                                    className="relative aspect-square"
                                    onClick={() => isSelectMode && toggleSelection(img.id)}
                                >
                                    <img
                                        src={getPublicUrl(img.storagePath)}
                                        alt=""
                                        loading="lazy"
                                        className={cn(
                                            "w-full h-full object-cover",
                                            isSelectMode && selectedImageIds.has(img.id) && "opacity-60"
                                        )}
                                    />
                                    <span className="absolute top-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                                        {img.catName}
                                    </span>
                                    {isSelectMode && (
                                        <div className={cn(
                                            "absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center",
                                            selectedImageIds.has(img.id)
                                                ? "bg-slate-700 border-slate-700"
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
        <div className="space-y-4">
            {/* All Photos Card - iOS style rounded rect */}
            <div
                className="relative aspect-[2/1] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setShowAllPhotos(true)}
            >
                {allImages[0] ? (
                    <img src={getPublicUrl(allImages[0].storagePath)} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
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
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-[13px] disabled:opacity-40 active:scale-95 transition-all"
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Camera className="h-4 w-4" /> 追加</>}
                    </button>
                </div>
                <ChevronRight className="absolute top-3 right-3 h-5 w-5 text-white/70" />
            </div>

            {/* Cat Grid - iOS Card Style with 8px gaps */}
            <div className="grid grid-cols-3 gap-2">
                {cats.map(cat => {
                    const photoCount = cat.images?.length || 0;
                    const hasAvatar = cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/');
                    const hasImage = cat.images?.[0];

                    return (
                        <div key={cat.id}>
                            {/* Image - tap to open gallery */}
                            <div
                                className="aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 relative cursor-pointer active:scale-95 transition-transform"
                                onClick={() => setSelectedCatId(cat.id)}
                            >
                                {hasAvatar ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                ) : hasImage ? (
                                    <img src={getPublicUrl(cat.images![0].storagePath)} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-100 dark:bg-slate-800">
                                        {cat.avatar || "🐈"}
                                    </div>
                                )}
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            </div>
                            {/* Name - tap to open profile detail */}
                            <button
                                onClick={() => setProfileCatId(cat.id)}
                                className="w-full text-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg py-1 mt-1 transition-colors"
                            >
                                <p className="text-[13px] font-medium text-slate-800 dark:text-white truncate">{cat.name}</p>
                                <p className="text-[11px] text-amber-600 dark:text-amber-400">
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
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                        <Plus className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 text-center">新しい猫を追加</p>
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
    );
}
