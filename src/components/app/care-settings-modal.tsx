"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { X, Plus, Trash2, Calendar, Clock, Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CareTaskDef, Frequency, MealSlot } from "@/types";
import { getIcon, getIconList } from "@/lib/icon-utils";

interface CareSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CareSettingsModal({ isOpen, onClose }: CareSettingsModalProps) {
    const { careTaskDefs, addCareTask, updateCareTask, deleteCareTask, isDemo, cats } = useAppState();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const [activeTab, setActiveTab] = useState<"basic" | "schedule" | "advanced">("basic");
    const [timingStyle, setTimingStyle] = useState<"fixed" | "goal" | "interval" | "anytime">("anytime");

    const [title, setTitle] = useState("");
    const [icon, setIcon] = useState("📋");
    const [frequency, setFrequency] = useState<Frequency>("daily");
    const [frequencyType, setFrequencyType] = useState<"fixed" | "interval">("fixed");
    const [intervalHours, setIntervalHours] = useState<number | "">(24);
    const [frequencyCount, setFrequencyCount] = useState<number | "">(1);
    const [perCat, setPerCat] = useState(false);
    const [targetCatIds, setTargetCatIds] = useState<string[]>([]);
    const [enabled, setEnabled] = useState(true);
    const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
    const [startOffsetMinutes, setStartOffsetMinutes] = useState<number | "">(0);
    const [userNotes, setUserNotes] = useState("");
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | "">(15);
    const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);

    const resetForm = () => {
        setTitle("");
        setIcon("📋");
        setFrequency("daily");
        setFrequencyType("fixed");
        setIntervalHours(24);
        setFrequencyCount(1);
        setPerCat(false);
        setTargetCatIds([]);
        setEnabled(true);
        setPriority("normal");
        setStartOffsetMinutes(0);
        setUserNotes("");
        setReminderEnabled(false);
        setReminderOffsetMinutes(15);
        setMealSlots([]);
        setTimingStyle("anytime");
        setIsAdding(false);
        setEditingId(null);
        setActiveTab("basic");
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("タイトルを入力してください");
            return;
        }

        // Map timingStyle to DB fields
        let finalFrequency: Frequency = frequency;
        let finalFrequencyType: "fixed" | "interval" = "fixed";
        let finalMealSlots = mealSlots;
        let finalCount = frequencyCount;
        let finalInterval = intervalHours;

        if (timingStyle === "fixed") {
            finalFrequency = "daily";
            finalFrequencyType = "fixed";
            finalCount = mealSlots.length || 1;
        } else if (timingStyle === "goal") {
            finalFrequencyType = "fixed";
            finalMealSlots = [];
        } else if (timingStyle === "interval") {
            finalFrequency = "as-needed";
            finalFrequencyType = "interval";
            finalMealSlots = [];
        } else if (timingStyle === "anytime") {
            finalFrequency = "daily";
            finalFrequencyType = "fixed";
            finalMealSlots = [];
            finalCount = 1;
        }

        const settings = {
            title,
            icon,
            frequency: finalFrequency,
            frequencyType: finalFrequencyType,
            intervalHours: finalFrequencyType === "interval" ? (Number(finalInterval) || 24) : undefined,
            frequencyCount: finalFrequency !== "as-needed" ? (Number(finalCount) || 1) : undefined,
            perCat,
            targetCatIds: perCat ? targetCatIds : undefined,
            enabled,
            priority,
            startOffsetMinutes: Number(startOffsetMinutes) || 0,
            userNotes,
            reminderEnabled,
            reminderOffsetMinutes: Number(reminderOffsetMinutes) || 15,
            mealSlots: finalMealSlots
        };

        setIsSaving(true);
        try {
            if (editingId) {
                await updateCareTask(editingId, settings);
                toast.success("変更しました");
                // Explicitly stay in edit mode - do NOT call resetForm() or setEditingId(null)
            } else {
                await addCareTask(title, settings);
                toast.success("追加しました");
                resetForm(); // Only reset for new tasks
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("保存に失敗しました。もう一度お試しください。");
        } finally {
            setIsSaving(false);
        }
    };

    const startEdit = (task: CareTaskDef) => {
        setEditingId(task.id);
        setTitle(task.title);
        setIcon(task.icon);

        // Deduce Timing Style
        let style: "fixed" | "goal" | "interval" | "anytime" = "anytime";
        if (task.frequencyType === "interval") {
            style = "interval";
        } else if (task.mealSlots && task.mealSlots.length > 0) {
            style = "fixed";
        } else if (task.frequency === "weekly" || task.frequency === "monthly" || (task.frequencyCount && task.frequencyCount > 1)) {
            style = "goal";
        }

        setTimingStyle(style);
        setFrequency(task.frequency || "daily");
        setFrequencyType(task.frequencyType || "fixed");
        setIntervalHours(task.intervalHours || 24);
        setFrequencyCount(task.frequencyCount || 1);
        setPerCat(task.perCat);
        setTargetCatIds(task.targetCatIds || cats.map(c => c.id));
        setEnabled(task.enabled !== false);
        setPriority(task.priority || "normal");
        setStartOffsetMinutes(task.startOffsetMinutes || 0);
        setUserNotes(task.userNotes || "");
        setReminderEnabled(task.reminderEnabled || false);
        setReminderOffsetMinutes(task.reminderOffsetMinutes || 15);
        setMealSlots(task.mealSlots || []);
        setIsAdding(false);
        setActiveTab("basic");
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-[2px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#FAF9F7]/95 dark:bg-[#1E1E23]/95 backdrop-blur-xl border border-white/40 dark:border-white/10 w-full max-w-md max-h-full sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/20 dark:border-white/5 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary" />
                                ONEGAIの設定
                            </h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                {careTaskDefs.map(task => (
                                    <div key={task.id} className="p-3 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-2xl space-y-3">
                                        {editingId === task.id ? (
                                            <div className="space-y-4">
                                                {/* Edit Header - Shows which task is being edited */}
                                                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary')}>
                                                        {(() => { const Icon = getIcon(task.icon); return <Icon className="w-6 h-6" />; })()}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white">{task.title}</p>
                                                        <p className="text-xs text-slate-500">編集中</p>
                                                    </div>
                                                </div>

                                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                                    {(["basic", "schedule", "advanced"] as const).map((tab) => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setActiveTab(tab)}
                                                            className={cn(
                                                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                                                activeTab === tab ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500"
                                                            )}
                                                        >
                                                            {tab === "basic" ? "基本" : tab === "schedule" ? "周期" : "高度"}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="space-y-4 min-h-[280px]">
                                                    {activeTab === "basic" && (
                                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">タイトル</label>
                                                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="タイトル" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">アイコン</label>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {getIconList().map(item => {
                                                                        const IconComp = item.Icon;
                                                                        return (
                                                                            <button
                                                                                key={item.id}
                                                                                onClick={() => setIcon(item.id)}
                                                                                className={cn(
                                                                                    "p-2.5 rounded-xl border transition-all",
                                                                                    icon === item.id ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                                                                                )}
                                                                            >
                                                                                <IconComp className="h-4 w-4" />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                                    <div className="space-y-0.5"><span className="text-sm font-bold">猫ごとに記録する</span><p className="text-[10px] text-slate-500">個別の完了チェックが必要になります</p></div>
                                                                    <button onClick={() => { const newVal = !perCat; setPerCat(newVal); if (newVal && targetCatIds.length === 0) setTargetCatIds(cats.map(c => c.id)); }} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out", perCat ? "bg-primary" : "bg-slate-200 dark:bg-slate-700")}>
                                                                        <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white transition duration-200", perCat ? "translate-x-5" : "translate-x-0")} />
                                                                    </button>
                                                                </div>
                                                                {perCat && (
                                                                    <div className="pl-2 flex flex-wrap gap-2">
                                                                        {cats.map(cat => (
                                                                            <button key={cat.id} onClick={() => setTargetCatIds(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])} className={cn("px-3 py-1.5 rounded-full text-xs font-bold border transition-all", targetCatIds.includes(cat.id) ? "bg-primary text-white border-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>{cat.name}</button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {activeTab === "schedule" && (
                                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">タイミングの指定方法</label>
                                                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                                                    {(["fixed", "goal", "interval", "anytime"] as const).map(style => (
                                                                        <button
                                                                            key={style}
                                                                            onClick={() => setTimingStyle(style)}
                                                                            className={cn(
                                                                                "py-2 text-[11px] font-bold rounded-lg transition-all",
                                                                                timingStyle === style ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500"
                                                                            )}
                                                                        >
                                                                            {style === "fixed" ? "定時" : style === "goal" ? "目標数" : style === "interval" ? "周期" : "随時"}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 px-1">
                                                                    {timingStyle === "fixed" ? "朝・昼など決まった時間に実施します" :
                                                                        timingStyle === "goal" ? "「週に3回」などの目標回数を指定します" :
                                                                            timingStyle === "interval" ? "完了してから◯時間おきに表示します" :
                                                                                "今日中に1回、好きな時に実施します"}
                                                                </p>
                                                            </div>

                                                            {timingStyle === "fixed" && (
                                                                <div className="space-y-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block pb-1">実施する時間帯（複数選択可）</label>
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {(["morning", "noon", "evening", "night"] as const).map(slot => (
                                                                            <button
                                                                                key={slot}
                                                                                onClick={() => setMealSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot])}
                                                                                className={cn(
                                                                                    "py-2 rounded-xl text-[10px] font-black border transition-all",
                                                                                    mealSlots.includes(slot) ? "bg-primary/20 border-primary text-primary" : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"
                                                                                )}
                                                                            >
                                                                                {slot === "morning" ? "朝" : slot === "noon" ? "昼" : slot === "evening" ? "夕" : "夜"}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <p className="text-[10px] text-primary/70 font-medium">※ 選択した数だけ、毎日リクエストが表示されます。</p>
                                                                </div>
                                                            )}

                                                            {timingStyle === "goal" && (
                                                                <div className="space-y-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                                                    <div className="space-y-2">
                                                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">期間</label>
                                                                        <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                                                                            <option value="daily">毎日</option>
                                                                            <option value="weekly">週単位</option>
                                                                            <option value="monthly">月単位</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">実施回数 (期間内)</label>
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="number"
                                                                                value={frequencyCount}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    setFrequencyCount(val === "" ? "" : parseInt(val));
                                                                                }}
                                                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                                                min={1}
                                                                                max={31}
                                                                            />
                                                                            <span className="text-sm font-bold text-slate-500">回</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-400">
                                                                            {frequency === 'daily' ? '1日のうちに実施する合計回数' : frequency === 'weekly' ? '1週間のうちに実施する合計回数' : '1ヶ月のうちに実施する合計回数'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {timingStyle === "interval" && (
                                                                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2">繰り返す間隔</label>
                                                                    <div className="flex items-center gap-3">
                                                                        <input
                                                                            type="number"
                                                                            value={intervalHours}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setIntervalHours(val === "" ? "" : parseInt(val));
                                                                            }}
                                                                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                                            min={1}
                                                                        />
                                                                        <span className="text-sm font-bold text-slate-500">時間おき</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 mt-2">完了してから指定時間が経過すると再表示されます。</p>
                                                                </div>
                                                            )}

                                                            {/* Anytime has no special settings */}

                                                        </motion.div>
                                                    )}

                                                    {activeTab === "advanced" && (
                                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">優先度</label>
                                                                <div className="flex gap-2">
                                                                    {(["low", "normal", "high"] as const).map(p => (
                                                                        <button key={p} onClick={() => setPriority(p)} className={cn("flex-1 py-2 rounded-xl border text-xs font-bold transition-all", priority === p ? "bg-primary/10 border-primary text-primary" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500")}>{p === "low" ? "低" : p === "high" ? "高" : "通常"}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">実施手順・メモ</label>
                                                                <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[80px] text-sm" placeholder="例：いつものお皿で半分だけあげる" />
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                                <span className="text-sm font-bold">有効にする</span>
                                                                <button onClick={() => setEnabled(!enabled)} className={cn("relative inline-flex h-6 w-11 rounded-full border-2 transition-colors", enabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700")}>
                                                                    <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white transition", enabled ? "translate-x-5" : "translate-x-0")} />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20">保存</button>
                                                    <button onClick={resetForm} className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm font-bold">戻る</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={cn("flex items-center justify-between", task.enabled === false && "opacity-50")}>
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary')}>
                                                        {(() => { const Icon = getIcon(task.icon); return <Icon className="w-6 h-6" />; })()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-slate-900 dark:text-white">{task.title}</p>
                                                            {task.priority === 'high' && <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-red-500 text-white rounded-full">High</span>}
                                                            {task.enabled === false && <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded">無効</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {task.frequencyType === 'interval' ? `${task.intervalHours}h毎` : task.frequency}
                                                            <span className="mx-1">•</span>
                                                            {task.perCat ? '猫ごと' : '共通'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => startEdit(task)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                                                    <button onClick={() => deleteCareTask(task.id)} className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="h-4 w-4 text-red-400" /></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {!isAdding && !editingId && (
                                    <button onClick={() => setIsAdding(true)} className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm font-black flex items-center justify-center gap-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                                        <Plus className="h-5 w-5" />
                                        新しいおねがいを定義
                                    </button>
                                )}

                                {isAdding && (
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /><p className="text-sm font-black text-primary">新規おねがい</p></div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-primary/60 uppercase">名前</label>
                                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-primary/30 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-primary/40" placeholder="例：ちゅ〜る、ブラッシング" autoFocus />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20">定義する</button>
                                            <button onClick={resetForm} className="px-4 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-500 text-sm font-bold border border-slate-200 dark:border-slate-700">やめる</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
