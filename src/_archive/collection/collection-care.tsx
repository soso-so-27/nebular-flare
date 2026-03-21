"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Cat as CatIcon, Cake, Scale, Edit, Heart, ShoppingCart,
    Camera, Check, AlertCircle, ChevronRight, Stethoscope,
    Syringe, Shield, Pill, Home, CheckCircle2, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { getIcon } from "@/lib/icon-utils";
import { getToday } from "@/lib/date-utils";
import {
    useCatContext, useCareContext, useSettingsContext,
    useCoreContext, useInventoryContext, useIncidentContext, useMedicationContext
} from "@/store/app-store";
import { CatEditModal } from "@/components/app/modals/cat-edit-modal";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

export function CollectionCare() {
    const { activeCatId, cats, setActiveCatId, addCatWeightRecord } = useCatContext();
    const { careTaskDefs, careLogs, addCareLog, noticeDefs, noticeLogs, observations, addObservation } = useCareContext();
    const { inventory, setInventory } = useInventoryContext();
    const { incidents } = useIncidentContext();
    const { medicationLogs } = useMedicationContext();
    const { settings } = useSettingsContext();
    const { isDemo } = useCoreContext();

    const selectedCat = cats.find(c => c.id === activeCatId) || cats[0];
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const today = useMemo(() => getToday(settings.dayStartHour), [settings.dayStartHour]);
    const [currentHour, setCurrentHour] = useState<number | null>(null);
    useEffect(() => { setCurrentHour(new Date().getHours()); }, []);

    const getAgeText = () => {
        if (!selectedCat?.birthday) return selectedCat?.age || '---';
        const birthDate = new Date(selectedCat.birthday);
        const now = new Date();
        const years = differenceInYears(now, birthDate);
        const months = differenceInMonths(now, birthDate) % 12;
        if (years === 0) return `${months}ヶ月`;
        if (months === 0) return `${years}歳`;
        return `${years}歳${months}ヶ月`;
    };

    // ─── Pending Care Items ───
    const getCurrentMealSlot = (hour: number) => {
        if (hour >= 5 && hour < 11) return 'morning';
        if (hour >= 11 && hour < 15) return 'noon';
        if (hour >= 15 && hour < 20) return 'evening';
        return 'night';
    };
    const getMealSlotLabel = (slot: string) => {
        switch (slot) { case 'morning': return '朝'; case 'noon': return '昼'; case 'evening': return '夕'; case 'night': return '夜'; default: return ''; }
    };

    const pendingCareItems = useMemo(() => {
        const hour = currentHour ?? new Date().getHours();
        const currentSlot = getCurrentMealSlot(hour);
        const slotOrder = ['morning', 'noon', 'evening', 'night'] as const;
        const currentSlotIndex = slotOrder.indexOf(currentSlot as any);
        const enabledTasks = careTaskDefs.filter(def => def.enabled !== false).filter(def => {
            if (def.perCat && def.targetCatIds?.length) return def.targetCatIds.includes(activeCatId);
            return true;
        });
        const items: any[] = [];
        enabledTasks.forEach(def => {
            const slots = def.mealSlots?.length ? def.mealSlots : [];
            if (def.frequency === 'as-needed' || slots.length === 0) {
                const done = careLogs.find(log => log.type === def.id && (!def.perCat || log.cat_id === activeCatId));
                if (!done) items.push({ id: def.id, label: def.title, icon: def.icon, defId: def.id, perCat: def.perCat });
                return;
            }
            for (const slot of slots) {
                const si = slotOrder.indexOf(slot as any);
                if (si > currentSlotIndex) continue;
                const type = `${def.id}:${slot}`;
                const done = careLogs.find(log => log.type === type && (!def.perCat || log.cat_id === activeCatId));
                if (!done) {
                    items.push({ id: `${def.id}_${slot}`, label: `${def.title}（${getMealSlotLabel(slot)}）`, icon: def.icon, defId: def.id, slot, perCat: def.perCat });
                    break;
                }
            }
        });
        return items;
    }, [careTaskDefs, careLogs, currentHour, activeCatId]);

    // ─── Alert observations ───
    const alertObservations = useMemo(() => {
        const catLogs = noticeLogs[activeCatId] || {};
        return noticeDefs.filter(n => n.enabled !== false && n.kind === 'notice').filter(notice => {
            if (isDemo) {
                const log = catLogs[notice.id];
                return log?.at?.startsWith(today) && log?.done && (log?.value?.startsWith('ちょっと違う') || log?.value === '注意');
            } else {
                const obs = observations.find(o => o.cat_id === activeCatId && o.type === notice.id);
                return obs && (obs.value?.startsWith('ちょっと違う') || obs.value === '注意');
            }
        });
    }, [noticeDefs, noticeLogs, observations, activeCatId, today, isDemo]);

    // ─── Low stock items ───
    const lowStockItems = useMemo(() => {
        return inventory.filter(it => it.enabled !== false && it.alertEnabled !== false && (it.stockLevel === 'low' || it.stockLevel === 'empty'));
    }, [inventory]);

    // ─── Recent incidents ───
    const recentIncidents = useMemo(() => {
        return (incidents || [])
            .filter(inc => inc.cat_id === activeCatId)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3);
    }, [incidents, activeCatId]);

    const totalPending = pendingCareItems.length + alertObservations.length + lowStockItems.length;

    if (cats.length === 0) {
        return (
            <div className="fixed inset-0 z-0 flex flex-col items-center justify-center bg-[#FDF8F1] gap-4 pb-32">
                <div className="w-16 h-16 rounded-full bg-[#F2EFEA] flex items-center justify-center">
                    <CatIcon className="w-8 h-8 text-[#D4CFC9]" />
                </div>
                <p className="text-[15px] font-bold text-[#787570]">まだ猫がいません</p>
                <p className="text-[13px] text-[#8E8B85]">設定から猫を追加してください</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-0 flex flex-col bg-[#FDF8F1] dark:bg-[#121214]">
            <CatEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} catId={activeCatId} />

            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#FDF8F1]/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-[#F2EFEA] dark:border-white/10 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center justify-between px-5 h-14">
                    <h1 className="text-[20px] font-black text-[#4E342E] dark:text-[#E8E6E1]">うちの子</h1>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2 rounded-full hover:bg-[#F2EFEA] transition-colors text-[#787570]"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                </div>

                {/* Cat Switcher */}
                {cats.length > 1 && (
                    <div className="px-4 pb-3 flex gap-3 overflow-x-auto scrollbar-hide">
                        {cats.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCatId(cat.id)} className="flex flex-col items-center gap-1 shrink-0">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl overflow-hidden transition-all border-2",
                                    activeCatId === cat.id ? "border-brand-peach shadow-md scale-105" : "border-transparent shadow-sm opacity-60"
                                )}>
                                    {cat.avatar ? (
                                        <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#F2EFEA] flex items-center justify-center"><CatIcon className="w-5 h-5 text-[#B8B3Ad]" /></div>
                                    )}
                                </div>
                                <span className={cn("text-[10px] font-bold", activeCatId === cat.id ? "text-[#4E342E]" : "text-[#787570]")}>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-y-auto pb-32">
                <div className="px-5 pt-5 space-y-5">

                    {/* ─── Cat Profile Hero ─── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1c1c1e] shadow-sm border border-[#F2EFEA] dark:border-white/5"
                    >
                        <div className="flex items-center gap-4 p-5">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md bg-[#F2EFEA]">
                                {selectedCat?.avatar ? (
                                    <img src={selectedCat.avatar} alt={selectedCat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><CatIcon className="w-10 h-10 text-[#D4CFC9]" /></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-[22px] font-black text-[#4E342E] dark:text-[#E8E6E1] leading-tight">{selectedCat?.name}</h2>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[12px] font-bold bg-[#F2EFEA] dark:bg-white/10 text-[#787570] px-2.5 py-0.5 rounded-full">
                                        {selectedCat?.sex === 'オス' ? '男の子' : selectedCat?.sex === 'メス' ? '女の子' : '性別不明'}
                                    </span>
                                    <span className="text-[12px] font-bold bg-[#F2EFEA] dark:bg-white/10 text-[#787570] px-2.5 py-0.5 rounded-full">
                                        {getAgeText()}
                                    </span>
                                    {selectedCat?.weight && (
                                        <span className="text-[12px] font-bold bg-[#F2EFEA] dark:bg-white/10 text-[#787570] px-2.5 py-0.5 rounded-full">
                                            {selectedCat.weight}kg
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ─── Pending Tasks Card ─── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-[24px] bg-white dark:bg-[#1c1c1e] shadow-sm border border-[#F2EFEA] dark:border-white/5 overflow-hidden"
                    >
                        <div className="px-5 py-3 flex items-center justify-between border-b border-[#F2EFEA] dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-brand-peach/10 flex items-center justify-center">
                                    <Heart className="w-3.5 h-3.5 text-brand-peach" />
                                </div>
                                <h3 className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">今日のお世話</h3>
                            </div>
                            {totalPending === 0 ? (
                                <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">✓ 全て完了</span>
                            ) : (
                                <span className="text-[12px] font-bold text-[#787570] bg-[#F2EFEA] px-2.5 py-0.5 rounded-full">{totalPending}件</span>
                            )}
                        </div>

                        <div className="divide-y divide-[#F2EFEA] dark:divide-white/5">
                            {totalPending === 0 && (
                                <div className="px-5 py-6 text-center">
                                    <p className="text-[13px] text-[#8E8B85]">おつかれさまです</p>
                                </div>
                            )}

                            {/* Care tasks */}
                            {pendingCareItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                        {item.icon ? React.createElement(getIcon(item.icon), { className: "h-4 w-4 text-brand-peach" }) : <Heart className="h-4 w-4 text-brand-peach" />}
                                        <span className="text-[14px] text-[#4E342E] dark:text-[#E8E6E1]">{item.label}</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const type = item.slot ? `${item.defId}:${item.slot}` : item.defId;
                                            const result = await addCareLog(type, item.perCat ? activeCatId : undefined);
                                            if (result?.error) toast.error("記録に失敗しました");
                                            else toast.success(`${item.label} 完了！`);
                                        }}
                                        className="text-[12px] font-bold px-4 py-1.5 rounded-full bg-brand-peach/10 text-brand-peach active:scale-95 transition-all"
                                    >
                                        完了
                                    </button>
                                </div>
                            ))}

                            {/* Alert observations */}
                            {alertObservations.map(notice => (
                                <div key={notice.id} className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                        <span className="text-[14px] text-[#4E342E] dark:text-[#E8E6E1]">{notice.alertLabel || notice.title}</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const result = await addObservation(activeCatId, notice.id, 'いつも通り');
                                            if (result?.error) toast.error("記録に失敗しました");
                                            else toast.success(`${notice.title} 確認済！`);
                                        }}
                                        className="text-[12px] font-bold px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 active:scale-95 transition-all"
                                    >
                                        確認済
                                    </button>
                                </div>
                            ))}

                            {/* Low stock */}
                            {lowStockItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <ShoppingCart className="h-4 w-4 text-brand-peach" />
                                        <span className="text-[14px] text-[#4E342E] dark:text-[#E8E6E1]">{item.label}</span>
                                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full font-bold",
                                            item.stockLevel === 'empty' ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                                        )}>{item.stockLevel === 'empty' ? 'なし' : '少ない'}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setInventory((prev: any[]) => prev.map((i: any) => i.id === item.id ? { ...i, stockLevel: 'full', lastRefillDate: new Date().toISOString() } : i));
                                            toast.success("補充完了！");
                                        }}
                                        className="text-[12px] font-bold px-4 py-1.5 rounded-full bg-brand-peach/10 text-brand-peach active:scale-95 transition-all"
                                    >
                                        補充済み
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* ─── Recent Incidents ─── */}
                    {recentIncidents.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-[24px] bg-white dark:bg-[#1c1c1e] shadow-sm border border-[#F2EFEA] dark:border-white/5 overflow-hidden"
                        >
                            <div className="px-5 py-3 flex items-center gap-2 border-b border-[#F2EFEA] dark:border-white/5">
                                <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center">
                                    <Stethoscope className="w-3.5 h-3.5 text-rose-500" />
                                </div>
                                <h3 className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">最近のできごと</h3>
                            </div>
                            <div className="divide-y divide-[#F2EFEA] dark:divide-white/5">
                                {recentIncidents.map((inc: any) => {
                                    const typeLabels: Record<string, string> = {
                                        'worried': '気になる様子', 'troubled': '困りごと', 'hospital': '通院記録',
                                        'medicine': 'おくすり', 'vomit': '吐き戻し', 'diarrhea': '下痢',
                                    };
                                    return (
                                        <div key={inc.id} className="px-5 py-3 flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                                                {inc.type === 'hospital' ? <Stethoscope className="w-4 h-4 text-rose-500" /> :
                                                    inc.type === 'medicine' ? <Pill className="w-4 h-4 text-blue-500" /> :
                                                        <AlertCircle className="w-4 h-4 text-amber-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">{typeLabels[inc.type] || 'できごと'}</p>
                                                {inc.note && <p className="text-[12px] text-[#787570] line-clamp-2 mt-0.5">{inc.note}</p>}
                                                <p className="text-[11px] text-[#8E8B85] mt-1">{format(new Date(inc.created_at), 'M/d (E)', { locale: ja })}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* ─── Health Summary ─── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-[24px] bg-white dark:bg-[#1c1c1e] shadow-sm border border-[#F2EFEA] dark:border-white/5 overflow-hidden"
                    >
                        <div className="px-5 py-3 flex items-center gap-2 border-b border-[#F2EFEA] dark:border-white/5">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <h3 className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">けんこう情報</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-[#F2EFEA] dark:bg-white/5">
                            {[
                                { label: '不妊手術', value: selectedCat?.neutered_status === 'neutered' ? '手術済み' : selectedCat?.neutered_status === 'intact' ? '未実施' : '未登録', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                                { label: '飼育環境', value: selectedCat?.living_environment === 'indoor' ? '完全室内' : selectedCat?.living_environment === 'outdoor' ? '室外' : selectedCat?.living_environment === 'both' ? '内外両方' : '未登録', icon: <Home className="w-4 h-4 text-amber-500" /> },
                                { label: '混合ワクチン', value: selectedCat?.last_vaccine_date ? format(new Date(selectedCat.last_vaccine_date), 'yyyy/MM/dd') : '未登録', icon: <Syringe className="w-4 h-4 text-blue-500" /> },
                                { label: 'お薬', value: `${medicationLogs.filter(l => l.cat_id === selectedCat?.id).length}件`, icon: <Pill className="w-4 h-4 text-purple-500" /> },
                            ].map((item, i) => (
                                <div key={i} className="bg-white dark:bg-[#1c1c1e] p-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        {item.icon}
                                        <span className="text-[11px] font-bold text-[#787570] uppercase tracking-wider">{item.label}</span>
                                    </div>
                                    <p className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
