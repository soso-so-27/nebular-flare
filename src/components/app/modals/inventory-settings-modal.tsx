"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoreContext } from "@/store/app-store";
import { useInventorySettings } from "@/hooks/use-inventory-settings";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface InventorySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InventorySettingsModal({ isOpen, onClose }: InventorySettingsModalProps) {
    const { isDemo } = useCoreContext();
    const {
        inventory: items,
        editingId,
        isAdding, setIsAdding,
        label, setLabel,
        rangeMax, setRangeMax,
        lastBought, setLastBought,
        handleSave,
        handleDelete,
        startEdit,
        resetForm
    } = useInventorySettings();

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center bg-[#4E342E]/10 backdrop-blur-sm"
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
                                <Package className="h-5 w-5 text-primary" />
                                在庫設定
                            </h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="space-y-3">
                                {items.map(item => (
                                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        {editingId === item.id ? (
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500">アイテム名</label>
                                                    <input
                                                        type="text"
                                                        value={label}
                                                        onChange={(e) => setLabel(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        placeholder="フード、猫砂など"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500">補充サイクル（日数）</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="range"
                                                            min={1}
                                                            max={90}
                                                            value={rangeMax}
                                                            onChange={(e) => setRangeMax(parseInt(e.target.value))}
                                                            className="flex-1"
                                                        />
                                                        <span className="text-sm font-bold w-12 text-right">{rangeMax}日</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">
                                                        この日数を過ぎると「そろそろ補充」通知が届きます
                                                    </p>
                                                </div>

                                                <div className="space-y-1 pt-2">
                                                    <label className="text-xs font-bold text-slate-500">最終購入日</label>
                                                    <input
                                                        type="date"
                                                        value={lastBought}
                                                        onChange={(e) => setLastBought(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                    />
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        onClick={handleSave}
                                                        className="flex-1 py-1.5 rounded-lg bg-primary text-white text-xs font-bold"
                                                    >
                                                        保存
                                                    </button>
                                                    <button
                                                        onClick={resetForm}
                                                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold"
                                                    >
                                                        キャンセル
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <ShoppingCart className="w-5 h-5 text-slate-400" />
                                                    <div>
                                                        <p className="font-bold text-sm">{item.label}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.range_max || (Array.isArray(item.range) ? item.range[1] : 30)}日サイクル
                                                            {item.last_bought && ` • 最終購入: ${new Date(item.last_bought).toLocaleDateString('ja-JP')}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                                    >
                                                        <Edit2 className="h-4 w-4 text-slate-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {items.length === 0 && !isAdding && (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        在庫アイテムがありません
                                    </div>
                                )}
                            </div>

                            {/* Add New */}
                            {!isAdding && !editingId && (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    新しい在庫を追加
                                </button>
                            )}

                            {/* New Item Form */}
                            {isAdding && (
                                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                                    <p className="text-sm font-bold">新規作成</p>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">アイテム名</label>
                                        <input
                                            type="text"
                                            value={label}
                                            onChange={(e) => setLabel(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                            placeholder="例: おやつ"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">補充サイクル（日数）</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min={1}
                                                max={90}
                                                value={rangeMax}
                                                onChange={(e) => setRangeMax(parseInt(e.target.value))}
                                                className="flex-1"
                                            />
                                            <span className="text-sm font-bold w-12 text-right">{rangeMax}日</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1 pt-2">
                                        <label className="text-xs font-bold text-slate-500">最終購入日</label>
                                        <input
                                            type="date"
                                            value={lastBought}
                                            onChange={(e) => setLastBought(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={handleSave}
                                            className="flex-1 py-1.5 rounded-lg bg-primary text-white text-xs font-bold"
                                        >
                                            追加
                                        </button>
                                        <button
                                            onClick={resetForm}
                                            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold"
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
