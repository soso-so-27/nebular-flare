"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { X, Plus, Pencil, Trash2, Cat, Calendar, Camera, Upload, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface CatSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CatSettingsModal({ isOpen, onClose }: CatSettingsModalProps) {
    const { cats, householdId, isDemo, refetchCats, addCatWeightRecord } = useAppState();
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Form State
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [birthday, setBirthday] = useState("");
    const [sex, setSex] = useState("オス");
    const [weight, setWeight] = useState(""); // Add weight state
    const [avatar, setAvatar] = useState("🐈");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Background Settings
    const [backgroundMode, setBackgroundMode] = useState<'random' | 'media' | 'avatar'>('random');
    const [backgroundMedia, setBackgroundMedia] = useState<string | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const supabase = createClient() as any;

    const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        setSelectedFiles(prev => [...prev, ...newFiles]);

        // Create previews
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviews]);

        // If no avatar set yet (or it's default emoji), set first format as avatar
        if (avatar === "🐈" && newPreviews.length > 0) {
            setAvatar(newPreviews[0]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => {
            const newUrls = prev.filter((_, i) => i !== index);
            if (avatar === prev[index]) {
                if (newUrls.length > 0) setAvatar(newUrls[0]);
                else setAvatar("🐈");
            }
            return newUrls;
        });
    };

    const handleBgFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setBgFile(file);
        setBgPreview(URL.createObjectURL(file));
        setBackgroundMode('media'); // Auto switch to media mode
    };

    const resetForm = () => {
        setName("");
        setBirthday("");
        setSex("オス");
        setWeight(""); // Reset weight
        setAvatar("🐈");
        setAvatar("🐈");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setEditingCatId(null);
        // Reset background settings
        setBackgroundMode('random');
        setBackgroundMedia(null);
        setBgFile(null);
        setBgPreview(null);
        setViewMode('list');
    };

    const uploadFiles = async (catId: string) => {
        const uploadedPaths: string[] = [];
        let firstPublicUrl: string | null = null;

        for (const file of selectedFiles) {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${catId}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                if (!firstPublicUrl) firstPublicUrl = publicUrl;
                uploadedPaths.push(fileName);

                await supabase.from("cat_images").insert({
                    cat_id: catId,
                    storage_path: fileName,
                    is_favorite: true
                });

            } catch (e) {
                console.error("Upload failed for file", file.name, e);
            }
        }
        return { firstPublicUrl, uploadedPaths };
        return { firstPublicUrl, uploadedPaths };
    };

    const uploadBgMedia = async (catId: string) => {
        if (!bgFile) return null;
        try {
            const fileExt = bgFile.name.split('.').pop();
            const fileName = `${catId}/bg-${Date.now()}.${fileExt}`;

            // Using 'cat-images' bucket for general media to act as background
            const { error: uploadError } = await supabase.storage
                .from('avatars') // Reuse avatars bucket for now as it's definitely public
                .upload(fileName, bgFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error("Upload error detail:", uploadError);
                throw new Error(`Upload Failed: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (e: any) {
            console.error("BG Upload failed", e);
            // Re-throw so handleSubmit catches it and shows toast
            throw e;
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("名前を入力してください");
            return;
        }

        if (isDemo && !editingCatId) {
            toast.error("デモモードでは保存できません");
            return;
        }

        if (!householdId) {
            toast.error("世帯IDがありません");
            return;
        }

        setIsLoading(true);
        try {
            const { data: user } = await supabase.auth.getUser();
            let currentCatId = editingCatId;

            // 1. Create or Update Cat basic info
            if (!currentCatId) {
                // Add New
                const parsedWeight = weight ? parseFloat(weight) : null;
                const { data: newCat, error } = await supabase.from("cats").insert({
                    household_id: householdId,
                    name: name.trim(),
                    sex,
                    birthday: birthday || null,
                    weight: parsedWeight, // Set initial weight
                    avatar: "🐈", // Temp
                    created_by: user.user?.id,
                } as any).select().single();

                if (error) throw error;
                currentCatId = newCat.id;

                // Create initial weight history
                if (parsedWeight) {
                    await addCatWeightRecord(newCat.id, parsedWeight, "初期登録");
                }

            } else {
                // Update (Skip weight update here, use profile detail)
                // Update handled in step 3 for atomicity if possible, 
                // but let's keep basic check here or just skip.
                // Let's SKIP update here and do it all at step 3 for existing cats.
                currentCatId = editingCatId;
            }

            // 2. Upload Photos/Media
            let newAvatarUrl = null;
            if (selectedFiles.length > 0 && currentCatId) {
                const { firstPublicUrl } = await uploadFiles(currentCatId);
                newAvatarUrl = firstPublicUrl;
            }

            let newBgMediaUrl = backgroundMedia;
            if (bgFile && currentCatId) {
                const uploadedBg = await uploadBgMedia(currentCatId);
                if (uploadedBg) newBgMediaUrl = uploadedBg;
            }

            // 3. Final Update (Single Query)
            if (currentCatId) {
                let updates: any = {};

                if (editingCatId) {
                    // Full update for existing cat
                    updates = {
                        name: name.trim(),
                        sex,
                        birthday: birthday || null,
                        background_mode: backgroundMode,
                        background_media: newBgMediaUrl
                    };
                    if (newAvatarUrl) updates.avatar = newAvatarUrl;

                    const { error } = await supabase.from("cats").update(updates).eq('id', currentCatId);
                    if (error) throw error;

                } else {
                    // For NEW cat, we just update the extras (media & background)
                    updates = {
                        background_mode: backgroundMode,
                        background_media: newBgMediaUrl
                    };
                    if (newAvatarUrl) updates.avatar = newAvatarUrl;

                    const { error } = await supabase.from("cats").update(updates).eq('id', currentCatId);
                    if (error) throw error;
                }
            }









            toast.success(editingCatId ? "更新しました" : "追加しました");
            refetchCats();

            if (editingCatId) {
                // If editing, close modal to reflect changes and prevent confusion
                resetForm(); // Clean up state
                onClose();   // Close modal
            } else {
                // If adding, stay open or reset for next add
                resetForm();
            }

        } catch (err: any) {
            console.error("Error saving cat:", err);
            // Show detailed error for debugging
            const msg = err.message || "Unknown error";
            const details = err.details || err.hint || "";
            toast.error(`保存失敗: ${msg} ${details ? `(${details})` : ""}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (catId: string, catName: string) => {
        if (!confirm(`${catName}を削除しますか？この操作は取り消せません。`)) {
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("cats")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", catId);

            if (error) throw error;

            toast.success(`${catName}を削除しました`);
            refetchCats();
        } catch (err: any) {
            console.error("Error deleting cat:", err);
            toast.error("削除に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const startEdit = (cat: any) => {
        console.log("startEdit cat:", cat); // Debugging
        setEditingCatId(cat.id);
        setName(cat.name);
        setBirthday(cat.birthday || "");
        setSex(cat.sex || "オス");
        setWeight(cat.weight ? String(cat.weight) : ""); // Fix: Load weight too
        setAvatar(cat.avatar || "🐈");
        setSelectedFiles([]);
        setPreviewUrls([]);

        // Background settings - Prioritize 'random' if undefined
        const bgMode = cat.background_mode || 'random';
        const bgMedia = cat.background_media || null;
        console.log("Setting BG Mode:", bgMode, "Media:", bgMedia);

        setBackgroundMode(bgMode);
        setBackgroundMedia(bgMedia);
        setBgFile(null);
        setBgPreview(bgMedia); // This will be used as initial preview URL

        setViewMode('form');
    };

    const startAdd = () => {
        resetForm();
        setViewMode('form');
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-[2px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#FAF9F7]/85 dark:bg-[#1E1E23]/85 backdrop-blur-xl border border-white/40 dark:border-white/10 w-full max-w-md max-h-[90vh] sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/20 dark:border-white/5 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Cat className="h-5 w-5 text-primary" />
                                {viewMode === 'list' ? '猫を管理' : (editingCatId ? '猫を編集' : '猫を追加')}
                            </h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto flex-1">
                            {viewMode === 'list' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        {cats.map(cat => (
                                            <div
                                                key={cat.id}
                                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                                                        {cat.avatar?.startsWith('http') ? (
                                                            <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-2xl">{cat.avatar || "🐈"}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{cat.name}</p>
                                                        <p className="text-xs text-slate-500">{cat.age} • {cat.sex}</p>
                                                    </div>
                                                </div>
                                                {!isDemo && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(cat)}
                                                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        >
                                                            <Pencil className="h-4 w-4 text-slate-500" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(cat.id, cat.name)}
                                                            className="p-2 rounded-lg hover:bg-[#B8A6D9]/10 dark:hover:bg-[#B8A6D9]/20"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-[#B8A6D9]" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {!isDemo && (
                                        <button
                                            type="button"
                                            onClick={startAdd}
                                            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            猫を追加
                                        </button>
                                    )}
                                    {isDemo && (
                                        <p className="text-xs text-slate-400 text-center">
                                            デモモードでは編集できません
                                        </p>
                                    )}
                                </div>
                            ) : (
                                // Form View
                                <div className="space-y-4">
                                    {/* Photo Upload Area */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary hover:text-primary transition-colors bg-slate-50 dark:bg-slate-800"
                                        >
                                            <Camera className="h-6 w-6" />
                                            <span className="text-[10px] font-bold">写真を追加</span>
                                        </button>
                                        {previewUrls.length > 0 ? (
                                            previewUrls.map((url, idx) => (
                                                <div key={idx} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeFile(idx)}
                                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                    {idx === 0 && (
                                                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                                                            メイン
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            // Show current avatar if no new files selected
                                            avatar !== "🐈" && (
                                                <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                    {avatar.startsWith('http') ? (
                                                        <img src={avatar} alt="current" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-3xl">{avatar}</div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFilesSelect}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500">名前</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="例：タマ"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">性別</label>
                                                <select
                                                    value={sex}
                                                    onChange={(e) => setSex(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                >
                                                    <option value="オス">オス ♂</option>
                                                    <option value="メス">メス ♀</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">誕生日（推定）</label>
                                                <input
                                                    type="date"
                                                    value={birthday}
                                                    onChange={(e) => setBirthday(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {!editingCatId && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <Scale className="h-3 w-3" />
                                                    現在の体重 (kg)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={weight}
                                                    onChange={(e) => setWeight(e.target.value)}
                                                    placeholder="例：4.5"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Background Settings Section */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-xs font-bold text-slate-500 block mb-2">ホーム背景</label>
                                        <div className="space-y-3">
                                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                                {(['random', 'media', 'avatar'] as const).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setBackgroundMode(mode)}
                                                        className={cn(
                                                            "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                                                            backgroundMode === mode
                                                                ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                        )}
                                                    >
                                                        {mode === 'random' && "ランダム"}
                                                        {mode === 'media' && "固定 (動画OK)"}
                                                        {mode === 'avatar' && "アバター"}
                                                    </button>
                                                ))}
                                            </div>

                                            {backgroundMode === 'random' && (
                                                <div className="text-xs text-slate-400 px-1">
                                                    アルバムの写真がランダムで背景になります
                                                </div>
                                            )}

                                            {backgroundMode === 'media' && (
                                                <div className="space-y-2">
                                                    <div
                                                        onClick={() => document.getElementById('bg-file-input')?.click()}
                                                        className="relative w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 hover:border-primary hover:text-primary transition-colors cursor-pointer overflow-hidden"
                                                    >
                                                        {bgPreview ? (
                                                            bgFile?.type.startsWith('video') || bgPreview.match(/\.(mp4|webm|mov)$/i) ? (
                                                                <video src={bgPreview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                                            ) : (
                                                                <img src={bgPreview} alt="bg" className="w-full h-full object-cover" />
                                                            )
                                                        ) : (
                                                            <div className="text-center text-slate-400">
                                                                <Upload className="h-6 w-6 mx-auto mb-1" />
                                                                <span className="text-xs">動画または画像を選択</span>
                                                            </div>
                                                        )}

                                                        {/* Label overlay if preview exists */}
                                                        {bgPreview && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                                                                <span className="text-white text-xs font-bold">変更する</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="bg-file-input"
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*,video/*"
                                                        onChange={handleBgFileSelect}
                                                    />

                                                    {/* Upload Guidelines */}
                                                    <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg space-y-1 mt-2">
                                                        <p className="font-bold flex items-center gap-1">
                                                            <Upload className="h-3 w-3" />
                                                            動画アップロードのヒント
                                                        </p>
                                                        <ul className="list-disc list-inside space-y-0.5 ml-1 opacity-80">
                                                            <li>推奨サイズ: 50MB以下（Wi-Fi推奨）</li>
                                                            <li>推奨長さ: 10〜15秒のループ素材</li>
                                                            <li>スマホ全画面向けに<strong>縦型動画</strong>がおすすめです</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}

                                            {backgroundMode === 'avatar' && (
                                                <div className="text-xs text-slate-400 px-1">
                                                    現在のアバター写真が常に背景になります
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98]"
                                        >
                                            {isLoading ? "保存中..." : "保存する"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
