"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
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
        birthday: cat?.birthday || "",
        last_vaccine_date: cat?.last_vaccine_date || "",
        vaccine_type: cat?.vaccine_type || ""
    });

    // Update local state when cat changes (if modal is open)
    React.useEffect(() => {
        if (cat) {
            setEditData({
                microchip_id: cat.microchip_id || "",
                notes: cat.notes || "",
                birthday: cat.birthday || "",
                last_vaccine_date: cat.last_vaccine_date || "",
                vaccine_type: cat.vaccine_type || ""
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
            birthday: editData.birthday || undefined,
            last_vaccine_date: editData.last_vaccine_date || undefined,
            vaccine_type: editData.vaccine_type || undefined
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

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-[#FAF9F7]/90 backdrop-blur-xl border border-white/40 shadow-2xl w-full max-w-md max-h-[90vh] sm:rounded-2xl rounded-t-[32px] overflow-hidden flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">プロフィール編集</h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-hide">
                            <div className="space-y-4">
                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Cake className="w-3.5 h-3.5" />
                                        誕生日
                                    </span>
                                    <input
                                        type="date"
                                        value={editData.birthday}
                                        onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                                        className="w-full text-base bg-white/50 border border-black/5 rounded-xl p-3 min-h-[50px] focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all resize-none text-slate-800"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Cpu className="w-3.5 h-3.5" />
                                        マイクロチップID
                                    </span>
                                    <input
                                        type="text"
                                        value={editData.microchip_id}
                                        onChange={(e) => setEditData({ ...editData, microchip_id: e.target.value })}
                                        className="w-full text-base bg-white/50 border border-black/5 rounded-xl p-3 focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all font-mono text-slate-800"
                                        placeholder="15桁の数字"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                                        <FileText className="w-3.5 h-3.5" />
                                        最新のワクチン接種日
                                    </span>
                                    <input
                                        type="date"
                                        value={editData.last_vaccine_date}
                                        onChange={(e) => setEditData({ ...editData, last_vaccine_date: e.target.value })}
                                        className="w-full text-base bg-white/50 border border-black/5 rounded-xl p-3 focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all text-slate-800"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                                        <FileText className="w-3.5 h-3.5" />
                                        ワクチンの種類
                                    </span>
                                    <input
                                        type="text"
                                        value={editData.vaccine_type}
                                        onChange={(e) => setEditData({ ...editData, vaccine_type: e.target.value })}
                                        className="w-full text-base bg-white/50 border border-black/5 rounded-xl p-3 focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all text-slate-800"
                                        placeholder="3種、5種など"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                                        <FileText className="w-3.5 h-3.5" />
                                        メモ
                                    </span>
                                    <textarea
                                        value={editData.notes}
                                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                        className="w-full text-base bg-white/50 border border-black/5 rounded-xl p-3 min-h-[100px] focus:ring-2 focus:ring-[#7CAA8E] outline-none transition-all resize-none text-slate-800"
                                        placeholder="特徴や性格など..."
                                    />
                                </label>
                            </div>

                            <button
                                onClick={handleDelete}
                                className="w-full py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                この猫を削除する
                            </button>
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t border-black/5 shrink-0 bg-[#FAF9F7]/95 backdrop-blur-md safe-area-pb">
                            <button
                                onClick={handleSave}
                                className="w-full py-3.5 bg-[#7CAA8E] hover:bg-[#6B9B7A] active:scale-[0.98] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#7CAA8E]/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                保存する
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
