"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { X, Plus, Trash2, Edit2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NoticeDef, ObservationCategory, ObservationInputType } from "@/types";

interface NoticeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NoticeSettingsModal({ isOpen, onClose }: NoticeSettingsModalProps) {
    const { noticeDefs, addNoticeDef, updateNoticeDef, deleteNoticeDef } = useAppState();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<ObservationCategory>("health");
    const [inputType, setInputType] = useState<ObservationInputType>("ok-notice");
    const [required, setRequired] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [choices, setChoices] = useState<string[]>([]);
    const [newChoice, setNewChoice] = useState("");

    const resetForm = () => {
        setTitle("");
        setCategory("health");
        setInputType("ok-notice");
        setRequired(false);
        setEnabled(true);
        setChoices([]);
        setNewChoice("");
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSave = () => {
        if (!title.trim()) {
            toast.error("タイトルを入力してください");
            return;
        }

        if (editingId) {
            updateNoticeDef(editingId, {
                title,
                category,
                inputType,
                required,
                enabled,
                choices
            });
            toast.success("変更しました");
        } else {
            addNoticeDef(title, {
                category,
                inputType,
                required,
                enabled,
                choices
            });
            toast.success("追加しました");
        }
        resetForm();
    };

    const startEdit = (def: NoticeDef) => {
        setEditingId(def.id);
        setTitle(def.title);
        setCategory(def.category);
        setInputType(def.inputType);
        setRequired(def.required);
        setEnabled(def.enabled !== false); // default to true if undefined
        setChoices(def.choices || []);
        setIsAdding(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                        記録設定
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4">
                        {noticeDefs.map(def => (
                            <div key={def.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                                {editingId === def.id ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                            placeholder="タイトル"
                                        />

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-bold text-slate-500">カテゴリ</label>
                                                <select
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value as ObservationCategory)}
                                                    className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                >
                                                    <option value="health">体調</option>
                                                    <option value="eating">食事</option>
                                                    <option value="toilet">トイレ</option>
                                                    <option value="behavior">行動</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-bold text-slate-500">入力タイプ</label>
                                                <select
                                                    value={inputType}
                                                    onChange={(e) => setInputType(e.target.value as ObservationInputType)}
                                                    className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                >
                                                    <option value="ok-notice">OK / 注意</option>
                                                    <option value="count">回数・数値</option>
                                                    <option value="choice">選択肢</option>
                                                </select>
                                            </div>
                                        </div>

                                        {inputType === 'choice' && (
                                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <label className="text-xs font-bold text-slate-500">選択肢</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {choices.map((c, idx) => (
                                                        <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                                                            <span>{c}</span>
                                                            <button
                                                                onClick={() => setChoices(prev => prev.filter((_, i) => i !== idx))}
                                                                className="hover:text-red-500"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newChoice}
                                                        onChange={(e) => setNewChoice(e.target.value)}
                                                        placeholder="選択肢を追加"
                                                        className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (newChoice.trim()) {
                                                                    setChoices([...choices, newChoice.trim()]);
                                                                    setNewChoice("");
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (newChoice.trim()) {
                                                                setChoices([...choices, newChoice.trim()]);
                                                                setNewChoice("");
                                                            }
                                                        }}
                                                        className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`req-${def.id}`}
                                                checked={required}
                                                onChange={(e) => setRequired(e.target.checked)}
                                                className="rounded border-slate-300"
                                            />
                                            <label htmlFor={`req-${def.id}`} className="text-sm">必須項目にする</label>
                                        </div>

                                        {/* Enabled Toggle */}
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">この項目を有効にする</span>
                                            <button
                                                type="button"
                                                onClick={() => setEnabled(!enabled)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                                    enabled ? "bg-primary" : "bg-slate-200"
                                                )}
                                                role="switch"
                                                aria-checked={enabled}
                                            >
                                                <span
                                                    className={cn(
                                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                        enabled ? "translate-x-5" : "translate-x-0"
                                                    )}
                                                />
                                            </button>
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
                                    <div className={cn(
                                        "flex items-center justify-between",
                                        def.enabled === false && "opacity-50"
                                    )}>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm flex items-center gap-2">
                                                {def.title}
                                                {def.required && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded">必須</span>}
                                                {def.enabled === false && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded">無効</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {def.category} • {def.inputType}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => startEdit(def)}
                                                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                <Edit2 className="h-4 w-4 text-slate-500" />
                                            </button>
                                            <button
                                                onClick={() => deleteNoticeDef(def.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add New */}
                    {!isAdding && !editingId && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            新しい記録項目を追加
                        </button>
                    )}

                    {isAdding && (
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                            <p className="text-sm font-bold">新規作成</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    placeholder="タイトルを入力 (例: 嘔吐)"
                                />
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
                            <p className="text-[10px] text-slate-400">※追加後に詳細設定を編集できます</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
