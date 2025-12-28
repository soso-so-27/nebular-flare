"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { X, Plus, Pencil, Trash2, Cat, Calendar, Camera, Upload, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CatSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CatSettingsModal({ isOpen, onClose }: CatSettingsModalProps) {
    const { cats, householdId, isDemo, refetchCats, addCatWeightRecord } = useAppState();
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

    // Form State
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [birthday, setBirthday] = useState("");
    const [sex, setSex] = useState("オス");
    const [weight, setWeight] = useState(""); // Add weight state
    const [avatar, setAvatar] = useState("🐈");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
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

    const resetForm = () => {
        setName("");
        setBirthday("");
        setSex("オス");
        setWeight(""); // Reset weight
        setAvatar("🐈");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setEditingCatId(null);
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
                const { error } = await supabase.from("cats").update({
                    name: name.trim(),
                    sex,
                    birthday: birthday || null,
                } as any).eq('id', currentCatId);

                if (error) throw error;
            }

            // 2. Upload Photos if any
            let newAvatarUrl = null;
            if (selectedFiles.length > 0 && currentCatId) {
                const { firstPublicUrl } = await uploadFiles(currentCatId);
                newAvatarUrl = firstPublicUrl;
            }

            // 3. Update Avatar URL if we got a new one
            if (newAvatarUrl && currentCatId) {
                await supabase.from("cats").update({ avatar: newAvatarUrl }).eq('id', currentCatId);
            }

            toast.success(editingCatId ? "更新しました" : "追加しました");
            refetchCats();
            resetForm();

        } catch (err: any) {
            console.error("Error saving cat:", err);
            toast.error("保存に失敗しました: " + err.message);
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
        setEditingCatId(cat.id);
        setName(cat.name);
        setBirthday(cat.birthday || "");
        setSex(cat.sex || "オス");
        setAvatar(cat.avatar || "🐈");
        setSelectedFiles([]);
        setPreviewUrls([]);
        // Load existing images? For now, we only support adding NEW images.
        // Ideally we would load existing gallery images to show preview, but that requires fetching.
        // We will keep it simple: Show current avatar as preview if no new files.
        setViewMode('form');
    };

    const startAdd = () => {
        resetForm();
        setViewMode('form');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
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
                                                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
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
            </div>
        </div>
    );
}
