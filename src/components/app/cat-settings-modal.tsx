"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { X, Plus, Pencil, Trash2, Cat, Calendar, Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CatSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AVATARS = ["🐈", "🐈‍⬛", "🐕", "🐇", "🦁", "🐯", "🦊"];

export function CatSettingsModal({ isOpen, onClose }: CatSettingsModalProps) {
    const { cats, householdId, isDemo, refetchCats } = useAppState();
    const [isAdding, setIsAdding] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [birthday, setBirthday] = useState("");
    const [sex, setSex] = useState("オス");
    const [avatar, setAvatar] = useState("🐈");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const supabase = createClient() as any;

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!householdId) {
            toast.error("世帯情報は取得できませんでした");
            return;
        }

        setIsLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
            const filePath = `${householdId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('cat-photos')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('cat-photos')
                .getPublicUrl(filePath);

            setAvatar(publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('画像のアップロードに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setBirthday("");
        setSex("オス");
        setAvatar("🐈");
        setIsAdding(false);
        setEditingCatId(null);
    };

    const handleAdd = async () => {
        if (!name.trim()) {
            toast.error("名前を入力してください");
            return;
        }

        if (isDemo) {
            toast.error("デモモードでは猫の追加ができません");
            return;
        }

        if (!householdId) {
            toast.error("世帯IDがありません");
            return;
        }

        setIsLoading(true);
        try {
            const { data: user } = await supabase.auth.getUser();

            const { error } = await supabase.from("cats").insert({
                household_id: householdId,
                name: name.trim(),
                sex,
                birthday: birthday || null,
                avatar,
                created_by: user.user?.id,
            } as any);

            if (error) {
                console.error("Error adding cat:", error);
                toast.error("猫の追加に失敗しました");
            } else {
                toast.success(`${name}を追加しました！`);
                refetchCats();
                resetForm();
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("予期せぬエラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async (catId: string) => {
        if (!name.trim()) {
            toast.error("名前を入力してください");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("cats")
                .update({
                    name: name.trim(),
                    sex,
                    birthday: birthday || null,
                    avatar,
                } as any)
                .eq("id", catId);

            if (error) {
                console.error("Error updating cat:", error);
                toast.error("更新に失敗しました");
            } else {
                toast.success(`${name}を更新しました！`);
                refetchCats();
                resetForm();
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("予期せぬエラーが発生しました");
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
            // Soft delete
            const { error } = await supabase
                .from("cats")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", catId);

            if (error) {
                console.error("Error deleting cat:", error);
                toast.error("削除に失敗しました");
            } else {
                toast.success(`${catName}を削除しました`);
                refetchCats();
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("予期せぬエラーが発生しました");
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
        setIsAdding(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Cat className="h-5 w-5 text-primary" />
                        猫を管理
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
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {/* Cat List */}
                    <div className="space-y-2 mb-4">
                        {cats.map(cat => (
                            <div
                                key={cat.id}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                            >
                                {editingCatId === cat.id ? (
                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-2">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                                    {avatar.startsWith('http') ? (
                                                        <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-3xl">{avatar}</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white shadow-sm hover:bg-primary/90"
                                                >
                                                    <Camera className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="名前"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                                <div className="flex gap-2">
                                                    <select
                                                        value={sex}
                                                        onChange={(e) => setSex(e.target.value)}
                                                        className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                    >
                                                        <option value="オス">オス</option>
                                                        <option value="メス">メス</option>
                                                    </select>
                                                    <div className="flex-1 relative">
                                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                        <input
                                                            type="date"
                                                            value={birthday}
                                                            onChange={(e) => setBirthday(e.target.value)}
                                                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                {/* Avatar Selector */}
                                                <div className="flex gap-1 overflow-x-auto pb-1">
                                                    {AVATARS.map(av => (
                                                        <button
                                                            key={av}
                                                            type="button"
                                                            onClick={() => setAvatar(av)}
                                                            className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors border",
                                                                avatar === av ? "bg-primary/10 border-primary" : "border-transparent hover:bg-slate-100"
                                                            )}
                                                        >
                                                            {av}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(cat.id)}
                                                disabled={isLoading}
                                                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
                                            >
                                                保存
                                            </button>
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-bold"
                                            >
                                                キャンセル
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add New Cat Form */}
                    {isAdding ? (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="flex gap-2">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                        {avatar.startsWith('http') ? (
                                            <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl">{avatar}</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white shadow-sm hover:bg-primary/90"
                                    >
                                        <Camera className="h-3 w-3" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="名前"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={sex}
                                            onChange={(e) => setSex(e.target.value)}
                                            className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                        >
                                            <option value="オス">オス</option>
                                            <option value="メス">メス</option>
                                        </select>
                                        <div className="flex-1 relative">
                                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="date"
                                                value={birthday}
                                                onChange={(e) => setBirthday(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                            />
                                        </div>
                                    </div>
                                    {/* Avatar Selector */}
                                    <div className="flex gap-1 overflow-x-auto pb-1">
                                        {AVATARS.map(av => (
                                            <button
                                                key={av}
                                                type="button"
                                                onClick={() => setAvatar(av)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors border",
                                                    avatar === av ? "bg-primary/10 border-primary" : "border-transparent hover:bg-slate-100"
                                                )}
                                            >
                                                {av}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleAdd}
                                    disabled={isLoading}
                                    className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
                                >
                                    追加
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-bold"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    ) : (
                        !isDemo && (
                            <button
                                type="button"
                                onClick={() => setIsAdding(true)}
                                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                猫を追加
                            </button>
                        )
                    )}

                    {isDemo && (
                        <p className="text-xs text-slate-400 text-center mt-4">
                            デモモードでは編集できません
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
