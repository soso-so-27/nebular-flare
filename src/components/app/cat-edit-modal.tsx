"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    X,
    Cake,
    Cpu,
    FileText,
    Save,
    Trash2
} from "lucide-react";

interface CatEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    catId: string;
}

export function CatEditModal({ isOpen, onClose, catId }: CatEditModalProps) {
    const { cats, updateCat, isDemo } = useAppState();
    const cat = cats.find(c => c.id === catId);

    const [editData, setEditData] = useState({
        microchip_id: cat?.microchip_id || "",
        notes: cat?.notes || "",
        birthday: cat?.birthday || ""
    });

    // Update local state when cat changes (if modal is open)
    React.useEffect(() => {
        if (cat) {
            setEditData({
                microchip_id: cat.microchip_id || "",
                notes: cat.notes || "",
                birthday: cat.birthday || ""
            });
        }
    }, [cat, isOpen]);

    if (!cat) return null;

    const handleDelete = async () => {
        if (!confirm("本当にこの猫を削除しますか？\n※データはアーカイブされます")) return;

        if (isDemo) {
            toast.success("猫を削除しました");
            onClose();
            return;
        }

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

        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">プロフィール編集</h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Cake className="w-3.5 h-3.5" />
                                        Birthday
                                    </span>
                                    <input
                                        type="date"
                                        value={editData.birthday}
                                        onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                                        className="w-full text-base bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-white"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Cpu className="w-3.5 h-3.5" />
                                        Microchip ID
                                    </span>
                                    <input
                                        type="text"
                                        value={editData.microchip_id}
                                        onChange={(e) => setEditData({ ...editData, microchip_id: e.target.value })}
                                        className="w-full text-base bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-slate-800 dark:text-white"
                                        placeholder="15桁の数字"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                        <FileText className="w-3.5 h-3.5" />
                                        Notes
                                    </span>
                                    <textarea
                                        value={editData.notes}
                                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                        className="w-full text-base bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 min-h-[100px] focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none text-slate-800 dark:text-white"
                                        placeholder="特徴や性格など..."
                                    />
                                </label>
                            </div>

                            <button
                                onClick={handleDelete}
                                className="w-full py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                この猫を削除する
                            </button>
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleSave}
                                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl font-bold text-l g shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                保存する
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
