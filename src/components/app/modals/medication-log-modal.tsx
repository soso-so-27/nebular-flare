"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { X, Plus, Trash2, Pill, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MedicationLog } from "@/types";

interface MedicationLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    catId: string;
}

export function MedicationLogModal({ isOpen, onClose, catId }: MedicationLogModalProps) {
    const { medicationLogs, addMedicationLog, updateMedicationLog, deleteMedicationLog, cats } = useAppState();
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);

    // Form state
    const [productName, setProductName] = useState("");
    const [dosage, setDosage] = useState("");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState("");
    const [frequency, setFrequency] = useState<'once' | 'daily' | 'twice_daily' | 'weekly' | 'as_needed'>('daily');
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const cat = cats.find(c => c.id === catId);
    const catLogs = medicationLogs.filter(log => log.cat_id === catId);

    const resetForm = () => {
        setProductName("");
        setDosage("");
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate("");
        setFrequency('daily');
        setNotes("");
        setEditingLogId(null);
        setIsLoading(false);
        setViewMode('list');
    };

    const startEdit = (log: MedicationLog) => {
        setEditingLogId(log.id);
        setProductName(log.product_name);
        setDosage(log.dosage || "");
        setStartDate(log.starts_at.split('T')[0]);
        setEndDate(log.end_date ? log.end_date.split('T')[0] : "");
        setFrequency(log.frequency || 'daily');
        setNotes(log.notes || "");
        setViewMode('form');
    };

    const handleSubmit = async () => {
        if (!productName.trim()) {
            toast.error("お薬の名前を入力してください");
            return;
        }

        setIsLoading(true);
        try {
            const logData = {
                cat_id: catId,
                product_name: productName.trim(),
                dosage: dosage.trim() || null,
                starts_at: new Date(startDate).toISOString(),
                end_date: endDate ? new Date(endDate).toISOString() : null,
                frequency,
                notes: notes.trim() || null,
            };

            if (editingLogId) {
                const { error } = await updateMedicationLog(editingLogId, logData as any);
                if (error) throw error;
                toast.success("投薬情報を更新しました");
            } else {
                const { error } = await addMedicationLog(logData as any);
                if (error) throw error;
                toast.success("投薬情報を追加しました");
            }

            resetForm();
        } catch (err: any) {
            console.error("Error saving medication log:", err);
            toast.error("保存に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この投薬記録を削除しますか？")) return;

        try {
            const { error } = await deleteMedicationLog(id);
            if (error) throw error;
            toast.success("削除しました");
        } catch (err: any) {
            toast.error("削除に失敗しました");
        }
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10003] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-[2px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background dark:bg-background w-full max-w-sm max-h-[85vh] sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Pill className="h-4 w-4 text-primary" />
                                {cat?.name}の投薬管理
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
                        <div className="p-4 overflow-y-auto flex-1 bottom-thick-scroll">
                            {viewMode === 'list' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        {catLogs.length > 0 ? (
                                            catLogs.map(log => (
                                                <div
                                                    key={log.id}
                                                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl relative group hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                                    onClick={() => startEdit(log)}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{log.product_name}</p>
                                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {log.frequency === 'daily' ? '1日1回' :
                                                                        log.frequency === 'twice_daily' ? '1日2回' :
                                                                            log.frequency === 'weekly' ? '週1回' :
                                                                                log.frequency === 'once' ? '1回のみ' : '頓服'}
                                                                </p>
                                                                {log.dosage && (
                                                                    <p className="text-[10px] text-slate-500">
                                                                        量: {log.dosage}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                {new Date(log.starts_at).toLocaleDateString()} 〜
                                                                {log.end_date ? new Date(log.end_date).toLocaleDateString() : '継続中'}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(log.id);
                                                            }}
                                                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                <p className="text-xs text-slate-400">登録されている投薬はありません</p>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setViewMode('form')}
                                        className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        新しいお薬を追加
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500">お薬の名前</label>
                                            <input
                                                type="text"
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                                placeholder="例：ゼレニア、抗生剤など"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">投与量</label>
                                                <input
                                                    type="text"
                                                    value={dosage}
                                                    onChange={(e) => setDosage(e.target.value)}
                                                    placeholder="例：1錠、0.5ml"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">頻度</label>
                                                <select
                                                    value={frequency}
                                                    onChange={(e) => setFrequency(e.target.value as any)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                >
                                                    <option value="daily">1日1回</option>
                                                    <option value="twice_daily">1日2回</option>
                                                    <option value="weekly">週1回</option>
                                                    <option value="once">1回のみ</option>
                                                    <option value="as_needed">頓服（必要時）</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">開始日</label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">終了日（任意）</label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500">メモ</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="飲ませ方のコツや注意点など"
                                                rows={2}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98]"
                                        >
                                            {isLoading ? "保存中..." : editingLogId ? "更新する" : "保存する"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => resetForm()}
                                            className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
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
