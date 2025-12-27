"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { X, Plus, Trash2, Calendar, Clock, Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CareTaskDef, Frequency, TimeOfDay } from "@/types";
import { getIcon, getIconList } from "@/lib/icon-utils";

interface CareSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CareSettingsModal({ isOpen, onClose }: CareSettingsModalProps) {
    const { careTaskDefs, addCareTask, updateCareTask, deleteCareTask, isDemo } = useAppState();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [icon, setIcon] = useState("📋");
    const [frequency, setFrequency] = useState<Frequency>("once-daily");
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("anytime");
    const [perCat, setPerCat] = useState(false);
    const [enabled, setEnabled] = useState(true);

    const resetForm = () => {
        setTitle("");
        setIcon("📋");
        setFrequency("once-daily");
        setTimeOfDay("anytime");
        setPerCat(false);
        setEnabled(true);
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSave = () => {
        if (!title.trim()) {
            toast.error("タイトルを入力してください");
            return;
        }

        if (editingId) {
            updateCareTask(editingId, {
                title,
                icon,
                frequency,
                timeOfDay,
                perCat,
                enabled
            });
            toast.success("変更しました");
        } else {
            addCareTask(title);
            toast.success("追加しました");
        }
        resetForm();
    };

    const startEdit = (task: CareTaskDef) => {
        setEditingId(task.id);
        setTitle(task.title);
        setIcon(task.icon);
        setFrequency(task.frequency);
        setTimeOfDay(task.timeOfDay);
        setPerCat(task.perCat);
        setEnabled(task.enabled !== false); // default to true if undefined
        setIsAdding(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        お世話設定
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4">
                        {careTaskDefs.map(task => (
                            <div key={task.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                                {editingId === task.id ? (
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500">アイコン</label>
                                            <div className="flex flex-wrap gap-2">
                                                {getIconList().map(item => {
                                                    const IconComp = item.Icon;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => setIcon(item.id)}
                                                            className={cn(
                                                                "p-2 rounded-lg border transition-all",
                                                                icon === item.id
                                                                    ? "bg-primary text-white border-primary"
                                                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50"
                                                            )}
                                                            title={item.label}
                                                        >
                                                            <IconComp className="h-4 w-4" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500">タイトル</label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                placeholder="タイトル"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={frequency}
                                                onChange={(e) => setFrequency(e.target.value as Frequency)}
                                                className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                            >
                                                <option value="once-daily">1日1回</option>
                                                <option value="twice-daily">1日2回</option>
                                                <option value="weekly">週1回</option>
                                            </select>
                                            <select
                                                value={timeOfDay}
                                                onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
                                                className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                            >
                                                <option value="anytime">いつでも</option>
                                                <option value="morning">朝</option>
                                                <option value="evening">夜</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`perCat-${task.id}`}
                                                checked={perCat}
                                                onChange={(e) => setPerCat(e.target.checked)}
                                                className="rounded border-slate-300"
                                            />
                                            <label htmlFor={`perCat-${task.id}`} className="text-sm">猫ごとに記録する</label>
                                        </div>

                                        {/* Enabled Toggle */}
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">このお世話を有効にする</span>
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
                                        task.enabled === false && "opacity-50"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            {(() => { const Icon = getIcon(task.icon); return <Icon className="w-6 h-6" />; })()}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm">{task.title}</p>
                                                    {task.enabled === false && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded">無効</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {task.frequency} • {task.timeOfDay}
                                                    {task.perCat && " • 猫ごと"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => startEdit(task)}
                                                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                <Edit2 className="h-4 w-4 text-slate-500" />
                                            </button>
                                            <button
                                                onClick={() => deleteCareTask(task.id)}
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
                            新しいお世話を追加
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
                                    placeholder="タイトルを入力 (例: 爪切り)"
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
        </div>
    );
}
