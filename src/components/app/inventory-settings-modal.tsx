"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { useAppState } from "@/store/app-store";

interface InventorySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface InventoryItem {
    id: string;
    label: string;
    last_bought: string | null;
    range_max: number;
}

export function InventorySettingsModal({ isOpen, onClose }: InventorySettingsModalProps) {
    const { householdId } = useAppState();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [label, setLabel] = useState("");
    const [rangeMax, setRangeMax] = useState(30);

    const supabase = createClient() as any;

    useEffect(() => {
        if (isOpen && householdId) {
            fetchItems();
        }
    }, [isOpen, householdId]);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('id, label, last_bought, range_max')
            .eq('household_id', householdId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setItems(data);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setLabel("");
        setRangeMax(30);
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!label.trim()) {
            toast.error("アイテム名を入力してください");
            return;
        }

        if (editingId) {
            // Update existing
            const { error } = await supabase
                .from('inventory')
                .update({ label, range_max: rangeMax })
                .eq('id', editingId);

            if (error) {
                toast.error("更新に失敗しました");
                return;
            }
            toast.success("更新しました");
        } else {
            // Add new
            const { error } = await supabase
                .from('inventory')
                .insert({
                    household_id: householdId,
                    label,
                    range_max: rangeMax,
                    range_min: Math.floor(rangeMax * 0.7) // default range_min to 70% of range_max
                });

            if (error) {
                toast.error("追加に失敗しました");
                return;
            }
            toast.success("追加しました");
        }

        resetForm();
        fetchItems();
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('inventory')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            toast.error("削除に失敗しました");
            return;
        }
        toast.success("削除しました");
        fetchItems();
    };

    const startEdit = (item: InventoryItem) => {
        setEditingId(item.id);
        setLabel(item.label);
        setRangeMax(item.range_max || 30);
        setIsAdding(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        在庫設定
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">読み込み中...</div>
                    ) : (
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
                                                        min={7}
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
                                                        {item.range_max || 30}日サイクル
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
                    )}

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
                                        min={7}
                                        max={90}
                                        value={rangeMax}
                                        onChange={(e) => setRangeMax(parseInt(e.target.value))}
                                        className="flex-1"
                                    />
                                    <span className="text-sm font-bold w-12 text-right">{rangeMax}日</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
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
            </div>
        </div>
    );
}
