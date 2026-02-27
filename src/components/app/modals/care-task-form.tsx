"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getIcon, getIconList } from "@/lib/icon-utils";
import { Frequency, MealSlot } from "@/types";

interface CareTaskFormProps {
    activeTab: "basic" | "schedule" | "advanced";
    setActiveTab: (tab: "basic" | "schedule" | "advanced") => void;
    timingStyle: "fixed" | "goal" | "interval" | "anytime";
    setTimingStyle: (style: "fixed" | "goal" | "interval" | "anytime") => void;
    form: {
        title: string;
        setTitle: (v: string) => void;
        icon: string;
        setIcon: (v: string) => void;
        frequency: Frequency;
        setFrequency: (v: Frequency) => void;
        frequencyCount: number | "";
        setFrequencyCount: (v: number | "") => void;
        intervalHours: number | "";
        setIntervalHours: (v: number | "") => void;
        perCat: boolean;
        setPerCat: (v: boolean) => void;
        targetCatIds: string[];
        setTargetCatIds: React.Dispatch<React.SetStateAction<string[]>>;
        priority: "low" | "normal" | "high";
        setPriority: (v: "low" | "normal" | "high") => void;
        userNotes: string;
        setUserNotes: (v: string) => void;
        enabled: boolean;
        setEnabled: (v: boolean) => void;
        mealSlots: MealSlot[];
        setMealSlots: React.Dispatch<React.SetStateAction<MealSlot[]>>;
    };
    cats: any[];
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    taskInfo?: { title: string; icon: string; priority: string };
}

export const CareTaskForm = ({
    activeTab, setActiveTab,
    timingStyle, setTimingStyle,
    form,
    cats,
    onSave,
    onCancel,
    isSaving,
    taskInfo
}: CareTaskFormProps) => {
    return (
        <div className="space-y-4">
            {taskInfo && (
                <div className="flex items-center gap-3 pb-4 border-b border-[#4E342E]/5">
                    <div className={cn("w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm border border-[#4E342E]/5", taskInfo.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-white text-[#4E342E]')}>
                        {(() => { const Icon = getIcon(taskInfo.icon); return <Icon className="w-5 h-5" />; })()}
                    </div>
                    <div>
                        <p className="font-black text-[#4E342E]">{taskInfo.title}</p>
                        <p className="text-xs text-[#4E342E]/50 font-bold">編集中</p>
                    </div>
                </div>
            )}

            <div className="flex p-1 bg-[#4E342E]/5 rounded-[16px]">
                {(["basic", "schedule", "advanced"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-[12px] transition-all",
                            activeTab === tab ? "bg-white shadow-sm text-[#4E342E]" : "text-[#4E342E]/40 hover:text-[#4E342E]/60"
                        )}
                    >
                        {tab === "basic" ? "基本" : tab === "schedule" ? "周期" : "高度"}
                    </button>
                ))}
            </div>

            <div className="space-y-4 min-h-[280px]">
                {activeTab === "basic" && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[#4E342E]/40 uppercase tracking-wider pl-1">タイトル</label>
                            <input type="text" value={form.title} onChange={(e) => form.setTitle(e.target.value)} className="w-full px-4 py-3 rounded-[16px] border border-[#4E342E]/5 bg-white/50 text-[#4E342E] shadow-sm focus:bg-white focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600/30 outline-none transition-all placeholder-[#4E342E]/20 font-bold" placeholder="タイトル" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#4E342E]/40 uppercase tracking-wider pl-1">アイコン</label>
                            <div className="flex flex-wrap gap-2">
                                {getIconList().map(item => {
                                    const IconComp = item.Icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => form.setIcon(item.id)}
                                            className={cn(
                                                "p-3 rounded-[16px] border transition-all",
                                                form.icon === item.id ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20 scale-110" : "bg-white/50 border-[#4E342E]/10 text-[#4E342E]/40 hover:bg-white hover:border-[#4E342E]/20"
                                            )}
                                        >
                                            <IconComp className="h-4 w-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between p-4 rounded-[24px] bg-white/60 border border-[#4E342E]/5 shadow-sm">
                                <div className="space-y-0.5"><span className="text-sm font-bold text-[#4E342E]">猫ごとに記録する</span><p className="text-[10px] text-[#4E342E]/50 font-medium">個別の完了チェックが必要になります</p></div>
                                <button onClick={() => { const newVal = !form.perCat; form.setPerCat(newVal); if (newVal && form.targetCatIds.length === 0) form.setTargetCatIds(cats.map(c => c.id)); }} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out", form.perCat ? "bg-amber-600" : "bg-[#4E342E]/10")}>
                                    <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white transition duration-200", form.perCat ? "translate-x-5" : "translate-x-0")} />
                                </button>
                            </div>
                            {form.perCat && (
                                <div className="pl-2 flex flex-wrap gap-2">
                                    {cats.map(cat => (
                                        <button key={cat.id} onClick={() => form.setTargetCatIds(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])} className={cn("px-4 py-2 rounded-full text-xs font-bold border transition-all shadow-sm", form.targetCatIds.includes(cat.id) ? "bg-amber-600 text-white border-amber-600 shadow-amber-600/20" : "bg-white/50 border-[#4E342E]/5 text-[#4E342E]/40 hover:bg-white")}>{cat.name}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === "schedule" && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#4E342E]/40 uppercase tracking-wider pl-1">タイミングの指定方法</label>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-[#4E342E]/5 rounded-[16px]">
                                {(["fixed", "goal", "interval", "anytime"] as const).map(style => (
                                    <button
                                        key={style}
                                        onClick={() => setTimingStyle(style)}
                                        className={cn(
                                            "py-2.5 text-[11px] font-bold rounded-[12px] transition-all",
                                            timingStyle === style ? "bg-white shadow-sm text-[#4E342E]" : "text-[#4E342E]/40 hover:text-[#4E342E]/60"
                                        )}
                                    >
                                        {style === "fixed" ? "定時" : style === "goal" ? "目標数" : style === "interval" ? "周期" : "随時"}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-[#4E342E]/50 px-2 font-medium">
                                {timingStyle === "fixed" ? "朝・昼など決まった時間に実施します" :
                                    timingStyle === "goal" ? "「週に3回」などの目標回数を指定します" :
                                        timingStyle === "interval" ? "完了してから◯時間おきに表示します" :
                                            "今日中に1回、好きな時に実施します"}
                            </p>
                        </div>

                        {timingStyle === "fixed" && (
                            <div className="space-y-4 p-5 bg-white/60 border border-[#4E342E]/5 shadow-sm rounded-[24px] animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-[#4E342E] block">実施する時間帯（複数選択可）</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(["morning", "noon", "evening", "night"] as const).map(slot => (
                                        <button
                                            key={slot}
                                            onClick={() => form.setMealSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot])}
                                            className={cn(
                                                "py-3 rounded-[16px] text-xs font-black border transition-all",
                                                form.mealSlots.includes(slot) ? "bg-amber-600/10 border-amber-600/30 text-amber-700 shadow-sm" : "bg-white border-[#4E342E]/10 text-[#4E342E]/40 hover:bg-white hover:border-[#4E342E]/20"
                                            )}
                                        >
                                            {slot === "morning" ? "朝" : slot === "noon" ? "昼" : slot === "evening" ? "夕" : "夜"}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-[#4E342E]/40 font-bold">※ 選択した数だけ、毎日リクエストが表示されます。</p>
                            </div>
                        )}

                        {timingStyle === "goal" && (
                            <div className="space-y-5 p-5 bg-white/60 border border-[#4E342E]/5 shadow-sm rounded-[24px] animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#4E342E]">期間</label>
                                    <select value={form.frequency} onChange={(e) => form.setFrequency(e.target.value as Frequency)} className="w-full px-4 py-3 rounded-[16px] border border-[#4E342E]/10 bg-white font-bold text-[#4E342E] text-sm outline-none focus:border-amber-600/30 focus:ring-2 focus:ring-amber-600/20">
                                        <option value="daily">毎日</option>
                                        <option value="weekly">週単位</option>
                                        <option value="monthly">月単位</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#4E342E]">実施回数 (期間内)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={form.frequencyCount}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                form.setFrequencyCount(val === "" ? "" : parseInt(val));
                                            }}
                                            className="flex-1 px-4 py-3 rounded-[16px] border border-[#4E342E]/10 bg-white text-[#4E342E] font-bold text-sm outline-none focus:border-amber-600/30 focus:ring-2 focus:ring-amber-600/20"
                                            min={1}
                                            max={31}
                                        />
                                        <span className="text-sm font-bold text-[#4E342E]/50">回</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-[#4E342E]/40">
                                        {form.frequency === 'daily' ? '1日のうちに実施する合計回数' : form.frequency === 'weekly' ? '1週間のうちに実施する合計回数' : '1ヶ月のうちに実施する合計回数'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {timingStyle === "interval" && (
                            <div className="p-5 bg-white/60 border border-[#4E342E]/5 shadow-sm rounded-[24px] animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-[#4E342E] block mb-3">繰り返す間隔</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={form.intervalHours}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            form.setIntervalHours(val === "" ? "" : parseInt(val));
                                        }}
                                        className="flex-1 px-4 py-3 rounded-[16px] border border-[#4E342E]/10 bg-white text-[#4E342E] font-bold text-sm outline-none focus:border-amber-600/30 focus:ring-2 focus:ring-amber-600/20"
                                        min={1}
                                    />
                                    <span className="text-sm font-bold text-[#4E342E]/50">時間おき</span>
                                </div>
                                <p className="text-[10px] font-bold text-[#4E342E]/40 mt-3">完了してから指定時間が経過すると再表示されます。</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === "advanced" && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#4E342E]/40 uppercase tracking-wider pl-1">優先度</label>
                            <div className="flex gap-2">
                                {(["low", "normal", "high"] as const).map(p => (
                                    <button key={p} onClick={() => form.setPriority(p)} className={cn("flex-1 py-3 rounded-[16px] border text-xs font-bold transition-all shadow-sm", form.priority === p ? "bg-amber-600/10 border-amber-600/30 text-amber-700" : "bg-white/50 border-[#4E342E]/10 text-[#4E342E]/40 hover:bg-white")}>{p === "low" ? "低" : p === "high" ? "高" : "通常"}</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[#4E342E]/40 uppercase tracking-wider pl-1">実施手順・メモ</label>
                            <textarea value={form.userNotes} onChange={(e) => form.setUserNotes(e.target.value)} className="w-full px-4 py-3 rounded-[16px] border border-[#4E342E]/5 bg-white/50 text-[#4E342E] min-h-[100px] text-sm font-medium outline-none focus:bg-white focus:border-amber-600/30 focus:ring-2 focus:ring-amber-600/20 shadow-sm transition-all" placeholder="例：いつものお皿で半分だけあげる" />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-[24px] bg-white/60 border border-[#4E342E]/5 shadow-sm">
                            <span className="text-sm font-bold text-[#4E342E]">有効にする</span>
                            <button onClick={() => form.setEnabled(!form.enabled)} className={cn("relative inline-flex h-6 w-11 rounded-full border-2 transition-colors", form.enabled ? "bg-amber-600" : "bg-[#4E342E]/10")}>
                                <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white transition", form.enabled ? "translate-x-5" : "translate-x-0")} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#4E342E]/5">
                <button onClick={onCancel} className="px-6 py-3 rounded-[16px] bg-[#4E342E]/5 hover:bg-[#4E342E]/10 text-[#4E342E]/60 text-sm font-bold transition-colors">戻る</button>
                <button onClick={onSave} disabled={isSaving} className="flex-1 py-3 rounded-[16px] bg-amber-600 hover:bg-amber-700 text-white text-sm font-black shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-colors">
                    {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    保存する
                </button>
            </div>
        </div>
    );
};
