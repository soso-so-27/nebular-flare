"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft, Settings, Camera, Plus, Edit2, Trash2,
    Calendar, Heart, Activity, Ruler, Weight, Shield,
    AlertCircle, CheckCircle2, Info, ArrowRight, Save, X,
    Cat as CatIcon, History, FileText, Pill, Stethoscope,
    ChevronRight, MoreHorizontal, Sparkles, Utensils, Droplets,
    Box, Moon, Brush
} from "lucide-react";
import { useCatContext, useCareContext, useIncidentContext } from "@/store/app-store";
import { format, subDays, startOfToday } from "date-fns";
import { ja } from "date-fns/locale";
import { triggerFeedback } from "@/lib/haptics";
import { toast } from "sonner";
import { cn, getFullImageUrl } from "@/lib/utils";

/* eslint-disable @next/next/no-img-element */

export function CatScreen() {
    const { cats, activeCatId, setActiveCatId } = useCatContext();
    const { careLogs, careTaskDefs } = useCareContext();
    const { incidents } = useIncidentContext();
    const [view, setView] = useState<'profile' | 'health' | 'history'>('profile');

    const activeCat = cats.find(c => c.id === activeCatId) || cats[0];

    if (!activeCat) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-bg-primary p-8 text-center dark:bg-[#121214]">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-bg-elevated shadow-sm dark:bg-white/5">
                    <CatIcon className="w-10 h-10 text-accent-primary" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-text-primary dark:text-[#E8E6E1]">うちの子が登録されていません</h2>
                <p className="text-sm text-text-tertiary">まずは「ホーム」から猫ちゃんを登録してみましょう。</p>
            </div>
        );
    }

    // ─────────────────────────────────
    // Helper: Get recent care summary
    // ─────────────────────────────────
    const recentCare = careTaskDefs?.map(def => {
        const lastLog = careLogs
            ?.filter(l => l.cat_id === activeCat.id && l.type.startsWith(def.id))
            .sort((a, b) => new Date(b.done_at).getTime() - new Date(a.done_at).getTime())[0];

        return {
            ...def,
            lastDone: lastLog ? new Date(lastLog.done_at) : null
        };
    }) || [];

    // ─────────────────────────────────
    // Helper: Get recent incidents
    // ─────────────────────────────────
    const catIncidents = incidents
        ?.filter(i => i.cat_id === activeCat.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5) || [];

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F2F1EF] pb-32 dark:bg-[#121214]">
            {/* ─── Header area with cover ─── */}
            <div className="relative h-[280px] shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#3D5A80]/25 to-transparent dark:from-black/40" />
                {activeCat.avatar && activeCat.avatar !== 'cat-fallback' ? (
                    <img src={activeCat.avatar} className="w-full h-full object-cover" alt={activeCat.name} />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-bg-secondary dark:bg-white/5">
                        <CatIcon className="w-20 h-20 text-white/50" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/20 dark:from-[#121214] dark:via-black/20" />

                {/* Cat Info Overlay */}
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md w-fit border border-white/30">
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{activeCat.breed || 'ミックス'}</span>
                        </div>
                        <h1 className="text-3xl font-black text-[#1E2840] dark:text-[#E8E6E1] drop-shadow-sm">{activeCat.name}</h1>
                        <p className="text-[#1E2840]/70 dark:text-[#E8E6E1]/70 font-bold ml-0.5">
                            {activeCat.sex === 'male' ? '男の子' : '女の子'} ・ {activeCat.birthday ? `${format(new Date(activeCat.birthday), 'yyyy/MM/dd')}生まれ` : '年齢不明'}
                        </p>
                    </div>
                    <button
                        onClick={() => triggerFeedback('light')}
                        className="w-12 h-12 rounded-full bg-white dark:bg-[#1c1c1e] shadow-lg flex items-center justify-center text-[#1E2840] dark:text-[#E8E6E1] border border-border-subtle"
                    >
                        <Settings className="w-6 h-6" />
                    </button>
                </div>

                {/* Switcher if multiple cats */}
                {cats.length > 1 && (
                    <div className="absolute top-[env(safe-area-inset-top)] left-1/2 -translate-x-1/2 mt-4 px-1.5 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex gap-1">
                        {cats.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => { triggerFeedback('light'); setActiveCatId(c.id); }}
                                className={cn(
                                    "w-8 h-8 rounded-full overflow-hidden border-2 transition-all",
                                    c.id === activeCatId ? "border-white scale-110 shadow-md" : "border-transparent opacity-60 scale-90"
                                )}
                            >
                                <img src={c.avatar} className="w-full h-full object-cover" alt="" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Tabs ─── */}
            <div className="flex shrink-0 gap-8 border-b border-border-subtle bg-bg-primary px-6 dark:border-white/5 dark:bg-[#121214]">
                <button
                    onClick={() => setView('profile')}
                    className={cn(
                        "pb-3 text-sm font-black transition-all relative",
                        view === 'profile' ? "text-[#1E2840] dark:text-[#E8E6E1]" : "text-[#8A8988] dark:text-[#A6A29A]"
                    )}
                >
                    プロフィール
                    {view === 'profile' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-[#3D5A80] rounded-full" />}
                </button>
                <button
                    onClick={() => setView('health')}
                    className={cn(
                        "pb-3 text-sm font-black transition-all relative",
                        view === 'health' ? "text-[#1E2840] dark:text-[#E8E6E1]" : "text-[#8A8988] dark:text-[#A6A29A]"
                    )}
                >
                    健康手帳
                    {view === 'health' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-[#3D5A80] rounded-full" />}
                </button>
                <button
                    onClick={() => setView('history')}
                    className={cn(
                        "pb-3 text-sm font-black transition-all relative",
                        view === 'history' ? "text-[#1E2840] dark:text-[#E8E6E1]" : "text-[#8A8988] dark:text-[#A6A29A]"
                    )}
                >
                    できごと
                    {view === 'history' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-[#3D5A80] rounded-full" />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-8">
                {view === 'profile' && (
                    <>
                        {/* Status Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-[24px] border border-black/5 bg-bg-elevated p-5 shadow-sm dark:bg-[#1c1c1e]">
                                <Activity className="w-6 h-6 text-[#3D5A80] mb-3" />
                                <h3 className="text-[11px] font-black text-[#8A8988] uppercase tracking-wider mb-1">健康状態</h3>
                                <p className="text-[15px] font-bold text-[#1E2840] dark:text-[#E8E6E1]">良好です</p>
                            </div>
                            <div className="rounded-[24px] border border-black/5 bg-bg-elevated p-5 shadow-sm dark:bg-[#1c1c1e]">
                                <Weight className="w-6 h-6 text-[#3D5A80] mb-3" />
                                <h3 className="text-[11px] font-black text-[#8A8988] uppercase tracking-wider mb-1">最新の体重</h3>
                                <p className="text-[15px] font-bold text-[#1E2840] dark:text-[#E8E6E1]">4.25 kg</p>
                            </div>
                        </div>

                        {/* Behavior section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[17px] font-black text-[#1E2840] dark:text-[#E8E6E1]">よくする行動</h2>
                                <button className="text-[#3D5A80] text-[13px] font-bold">もっと見る</button>
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-6 px-6">
                                {['香箱座り', 'へそ天', 'ふみふみ', 'スフィンクス'].map(pose => (
                                    <div key={pose} className="bg-white dark:bg-[#1c1c1e] px-5 py-3.5 rounded-full shadow-sm border border-black/5 shrink-0 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-[#3D5A80]" />
                                        <span className="text-[14px] font-bold text-[#1E2840] dark:text-[#E8E6E1]">{pose}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Recent Care Summary */}
                        <section className="space-y-4">
                            <h2 className="text-[17px] font-black text-[#1E2840] dark:text-[#E8E6E1]">最近のお世話</h2>
                            <div className="space-y-3">
                                {recentCare.slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#1c1c1e] rounded-[24px] shadow-sm border border-black/5">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-11 h-11 rounded-full bg-[#E7E6E3] dark:bg-black/20 flex items-center justify-center text-[#3D5A80]">
                                                {task.icon === 'utensils' && <Utensils className="w-5 h-5" />}
                                                {task.icon === 'droplets' && <Droplets className="w-5 h-5" />}
                                                {task.icon === 'box' && <Box className="w-5 h-5" />}
                                                {task.icon === 'moon' && <Moon className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-bold text-[#1E2840] dark:text-[#E8E6E1]">{task.title}</p>
                                                <p className="text-[12px] text-[#8A8988] font-medium">
                                                    {task.lastDone ? format(task.lastDone, 'HH:mm 更新') : '未実施'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-[#E7E6E3] dark:bg-black/20 px-3 py-1 rounded-full">
                                            <span className="text-[11px] font-black text-[#3D5A80]">次回 18:00</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {view === 'health' && (
                    <div className="space-y-8 pb-10">
                        <div className="bg-[#3D5A80] dark:bg-[#2c2c2e] p-6 rounded-[28px] text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                <Stethoscope className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-white/60 text-[12px] font-black uppercase tracking-wider mb-1">健康スコア</h3>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-4xl font-black">92</span>
                                    <span className="text-white/60 text-sm font-bold">/ 100</span>
                                </div>
                                <p className="text-white/80 text-sm font-medium leading-relaxed">
                                    最近は食欲もあり、運動量も安定しています。<br />来月の定期健診を忘れずに。
                                </p>
                            </div>
                        </div>

                        <section className="space-y-4">
                            <h2 className="text-[17px] font-black text-[#1E2840] dark:text-[#E8E6E1]">予定されているケア</h2>
                            <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] shadow-sm border border-black/5 divide-y divide-[#DDDCD8] dark:divide-white/5 overflow-hidden">
                                {[
                                    { title: 'ワクチン接種', date: '2024/05/12', icon: <Shield className="w-5 h-5 text-blue-500" /> },
                                    { title: 'ノミ・マダニ予防', date: '2024/04/15', icon: <AlertCircle className="w-5 h-5 text-amber-500" /> },
                                    { title: '爪切り・ブラッシング', date: '今日', icon: <Brush className="w-5 h-5 text-emerald-500" />, highlight: true }
                                ].map((item, i) => (
                                    <div key={i} className="p-5 flex items-center justify-between group active:bg-black/[0.02]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center transition-transform group-active:scale-90">
                                                {item.icon}
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-black text-[#1E2840] dark:text-[#E8E6E1]">{item.title}</p>
                                                <p className={cn("text-[12px] font-bold", item.highlight ? "text-[#3D5A80]" : "text-[#8A8988]")}>{item.date}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-[#DDDCD8]" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {view === 'history' && (
                    <div className="space-y-6 pb-10">
                        <section className="space-y-4">
                            <h2 className="text-[17px] font-black text-[#1E2840] dark:text-[#E8E6E1]">最近の記録</h2>
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-[#DDDCD8] dark:bg-white/5" />

                                <div className="space-y-8">
                                    {catIncidents.length > 0 ? catIncidents.map((inc, i) => (
                                        <div key={inc.id} className="relative pl-14 group">
                                            {/* dot */}
                                            <div className="absolute left-[16px] top-1 w-4 h-4 rounded-full bg-[#FAFAF9] dark:bg-[#121214] border-2 border-[#DDDCD8] group-first:border-[#3D5A80] z-10" />

                                            <div className="space-y-2">
                                                <span className="text-[11px] font-black text-[#8A8988] uppercase tracking-[0.1em]">
                                                    {format(new Date(inc.created_at), 'MM/dd HH:mm')}
                                                </span>
                                                <div className="bg-white dark:bg-[#1c1c1e] p-5 rounded-[24px] shadow-sm border border-black/5 active:scale-[0.98] transition-all">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        {inc.type === 'hospital' && <Stethoscope className="w-4 h-4 text-rose-500" />}
                                                        {inc.type === 'medicine' && <Pill className="w-4 h-4 text-blue-500" />}
                                                        {inc.type === 'incident' && <FileText className="w-4 h-4 text-slate-500" />}
                                                        <h4 className="text-[15px] font-bold text-[#1E2840] dark:text-[#E8E6E1]">
                                                            {inc.type === 'hospital' ? '病院の記録' : inc.type === 'medicine' ? 'おくすり' : '普段の様子'}
                                                        </h4>
                                                    </div>
                                                    <p className="text-[13px] text-[#1E2840]/80 dark:text-[#E8E6E1]/80 leading-relaxed font-medium">
                                                        {inc.note || '詳細な記録はありません'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center p-10 opacity-40">
                                            <History className="w-12 h-12 mb-4" />
                                            <p className="text-sm font-bold">まだ記録がありません</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
