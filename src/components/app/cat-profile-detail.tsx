"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    X,
    Calendar,
    Scale,
    Cpu,
    FileText,
    Edit,
    Save,
    Cake,
    Camera,
    Trash2
} from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { WeightChart } from "./weight-chart";

interface CatProfileDetailProps {
    isOpen: boolean;
    onClose: () => void;
    catId: string;
}

export function CatProfileDetail({ isOpen, onClose, catId }: CatProfileDetailProps) {
    const { cats, updateCat, addCatWeightRecord, isDemo } = useAppState();
    const cat = cats.find(c => c.id === catId);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        weight: cat?.weight?.toString() || "",
        microchip_id: cat?.microchip_id || "",
        notes: cat?.notes || "",
        birthday: cat?.birthday || ""
    });

    if (!cat) return null;

    const hasImageAvatar = cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/');

    // Calculate age from birthday
    const getAgeText = () => {
        if (!cat.birthday) return cat.age;
        const birthDate = new Date(cat.birthday);
        const now = new Date();
        const years = differenceInYears(now, birthDate);
        const months = differenceInMonths(now, birthDate) % 12;

        if (years === 0) {
            return `${months}ヶ月`;
        } else if (months === 0) {
            return `${years}歳`;
        } else {
            return `${years}歳${months}ヶ月`;
        }
    };

    const handleDelete = async () => {
        if (!confirm("本当にこの猫を削除しますか？\n※データはアーカイブされます")) return;

        if (isDemo) {
            toast.success("猫を削除しました");
            onClose();
            return;
        }

        // Logic deletion
        const result = await updateCat(catId, { deleted_at: new Date().toISOString() } as any);
        if (result?.error) {
            toast.error("削除に失敗しました");
            return;
        }
        toast.success("猫を削除しました");
        onClose();
    };

    const handleSave = async () => {
        const updates = {
            microchip_id: editData.microchip_id || undefined,
            notes: editData.notes || undefined,
            birthday: editData.birthday || undefined
        };

        if (isDemo) {
            toast.success("プロフィールを更新しました");
        } else {
            const result = await updateCat(catId, updates);
            if (result?.error) {
                toast.error("更新に失敗しました");
                return;
            }
            toast.success("プロフィールを更新しました");
        }

        setIsEditing(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-slate-50 dark:bg-slate-900 w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative h-64 shrink-0">
                            {hasImageAvatar ? (
                                <img
                                    src={cat.avatar!}
                                    alt={cat.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#7CAA8E]/10 dark:bg-[#7CAA8E]/20 flex items-center justify-center text-8xl">
                                    {cat.avatar || "🐈"}
                                </div>
                            )}

                            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                                    >
                                        <Edit className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSave}
                                        className="p-2 bg-[#7CAA8E] rounded-full text-white hover:bg-[#6B9B7A] transition-colors shadow-lg"
                                    >
                                        <Save className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                                <h2 className="text-3xl font-bold mb-1">{cat.name}</h2>
                                <p className="opacity-90 flex items-center gap-2 text-sm">
                                    <span>{cat.sex}</span>
                                    <span>•</span>
                                    <span>{getAgeText()}</span>
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6 bg-slate-50 dark:bg-slate-900">

                            {isEditing ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm space-y-4 border border-slate-100 dark:border-slate-700">
                                        <label className="block space-y-1.5">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Cake className="w-3.5 h-3.5" />
                                                誕生日
                                            </span>
                                            <input
                                                type="date"
                                                value={editData.birthday}
                                                onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                                                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all"
                                            />
                                        </label>

                                        <label className="block space-y-1.5">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Cpu className="w-3.5 h-3.5" />
                                                マイクロチップID
                                            </span>
                                            <input
                                                type="text"
                                                value={editData.microchip_id}
                                                onChange={(e) => setEditData({ ...editData, microchip_id: e.target.value })}
                                                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all"
                                                placeholder="15桁の数字"
                                            />
                                        </label>

                                        <label className="block space-y-1.5">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" />
                                                メモ
                                            </span>
                                            <textarea
                                                value={editData.notes}
                                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 min-h-[80px] focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all resize-none"
                                                placeholder="特徴や性格など..."
                                            />
                                        </label>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <button
                                            onClick={handleDelete}
                                            className="w-full py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            この猫を削除する
                                        </button>
                                        <p className="text-xs text-center text-slate-400 mt-2">
                                            ※お世話履歴は残りますが、一覧からは表示されなくなります
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                                <Scale className="w-4 h-4" />
                                                <span className="text-xs font-medium">現在の体重</span>
                                            </div>
                                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                                {cat.weight ? `${cat.weight}kg` : '-'}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                                <Cake className="w-4 h-4" />
                                                <span className="text-xs font-medium">誕生日</span>
                                            </div>
                                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                                {cat.birthday ? format(new Date(cat.birthday), 'M月d日') : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info List */}
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                        {cat.microchip_id && (
                                            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                    <Cpu className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">マイクロチップID</div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white font-mono">{cat.microchip_id}</div>
                                                </div>
                                            </div>
                                        )}
                                        {cat.notes && (
                                            <div className="flex items-start gap-3 p-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                                    <FileText className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">メモ</div>
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                        {cat.notes}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {!cat.microchip_id && !cat.notes && (
                                            <div className="p-8 text-center text-slate-400 text-sm">
                                                詳しい情報はまだ登録されていません
                                            </div>
                                        )}
                                    </div>

                                    {/* Weight Chart */}
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                        <WeightChart
                                            catId={catId}
                                            currentWeight={cat.weight || undefined}
                                            weightHistory={cat.weightHistory || []}
                                            onAddWeight={(w, n) => addCatWeightRecord(catId, w, n)}
                                            isDemo={isDemo}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
