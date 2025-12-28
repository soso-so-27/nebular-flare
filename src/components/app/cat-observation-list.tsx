"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Check, AlertTriangle, Utensils, Droplets, Pill, Cat } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

interface CatObservation {
    id: string;
    label: string;
    Icon: LucideIcon;
    type: string; // for Supabase observation type
    inputType?: 'ok-notice' | 'count' | 'choice';
    category?: string;
    done: boolean;
    value?: string;
    isAbnormal?: boolean;
}

// Map notice category to icons
function getIconForCategory(category: string): LucideIcon {
    switch (category) {
        case 'eating': return Utensils;
        case 'toilet': return Droplets;
        case 'behavior': return AlertTriangle;
        case 'health': return Pill;
        default: return Cat;
    }
}


// Get choices for observation - prefer from definition, fallback to category-based defaults
function getChoicesForObservation(obs: CatObservation, noticeDefs: any[]): string[] {
    // First try to get choices from the notice definition
    const def = noticeDefs.find(n => n.id === obs.id);
    if (def?.choices && def.choices.length > 0) {
        return def.choices;
    }

    // Fallback to category-based defaults
    const category = obs.category || 'health';
    const title = obs.label;

    if (category === 'eating') return ['完食', '半分', '少し', 'なし'];
    if (category === 'toilet') {
        if (title.includes('うんち') || title.includes('便')) return ['普通', 'ゆるい', '硬い', 'なし'];
        return ['普通', '多め', '少なめ', '気になる'];
    }
    if (category === 'behavior') return ['普通', '多め', '気になる'];
    return ['あり', 'なし'];
}

export function CatObservationList() {
    const {
        noticeDefs, noticeLogs, activeCatId, cats,
        setNoticeLogs, setActiveCatId,
        isDemo, observations, addObservation
    } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    const [today, setToday] = useState<string>("");
    useEffect(() => {
        setToday(new Date().toISOString().split('T')[0]);
    }, []);

    // Get per-cat observations (health checks)
    const observationItems: CatObservation[] = useMemo(() => {
        const catLogs = noticeLogs[activeCatId] || {};

        return noticeDefs
            .filter(n => n.enabled !== false && n.kind === 'notice')
            .map(notice => {
                const type = notice.category || 'other'; // Use category from definition
                let isDone = false;
                let value: string | undefined;
                let isAbnormal = false;

                if (isDemo) {
                    // Demo mode: check local noticeLogs
                    const log = catLogs[notice.id];
                    const isToday = log?.at?.startsWith(today);
                    isDone = !!(isToday && log?.done);
                    value = log?.value;
                    // Check logic based on input type if needed, but keeping simple for now
                    isAbnormal = !!(log?.value &&
                        log.value !== "いつも通り" &&
                        log.value !== "なし" &&
                        log.value !== "記録した");
                } else {
                    // Supabase mode: check observations
                    // Use UUID directly
                    const matchingObs = observations.find(o => o.cat_id === activeCatId && o.type === notice.id);
                    isDone = !!matchingObs;
                    value = matchingObs?.value;
                    isAbnormal = !!(matchingObs?.value &&
                        matchingObs.value !== "いつも通り");
                }

                return {
                    id: notice.id,
                    label: notice.title,
                    Icon: getIconForCategory(notice.category),
                    type,
                    inputType: notice.inputType || 'ok-notice',
                    category: notice.category,
                    done: isDone,
                    value,
                    isAbnormal,
                };
            });
    }, [noticeDefs, noticeLogs, activeCatId, today, isDemo, observations]);

    const completedCount = observationItems.filter(o => o.done).length;
    const totalCount = observationItems.length;

    async function handleQuickRecord(obs: CatObservation, value: string) {
        if (isDemo) {
            // Demo mode: update local state
            setNoticeLogs(prev => ({
                ...prev,
                [activeCatId]: {
                    ...prev[activeCatId],
                    [obs.id]: {
                        id: `${activeCatId}_${obs.id}_${Date.now()}`,
                        catId: activeCatId,
                        noticeId: obs.id,
                        value,
                        at: new Date().toISOString(),
                        done: true,
                        later: false
                    }
                }
            }));
            toast.success(`${obs.label}: ${value}`);
        } else {
            // Supabase mode: add observation
            // Use obs.id (which is the UUID from noticeDefs)
            const result = await addObservation(activeCatId, obs.id, value);
            if (result?.error) {
                toast.error("記録に失敗しました");
            } else {
                toast.success(`${obs.label}: ${value}`);
            }
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm overflow-hidden">
            {/* Header Row */}
            <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <Cat className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {activeCat?.name}の様子
                    </h3>
                </div>
                <span className="text-slate-400">›</span>
            </div>

            {/* Cat Switcher */}
            {cats.length > 1 && (
                <div className="px-5 pb-3 flex gap-2">
                    {cats.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCatId(cat.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                cat.id === activeCatId
                                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
                            )}
                        >{(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                            <img src={cat.avatar} alt={cat.name} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                            <span className="text-sm">{cat.avatar || "🐈"}</span>
                        )}
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Stats Row */}
            <div className="px-5 pb-4 flex items-end gap-6">
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">{completedCount}</span>
                        <span className="text-sm text-slate-400">/{totalCount}</span>
                    </div>
                    <span className="text-xs text-slate-400">確認済み</span>
                </div>

                {/* Mini Progress Bars */}
                <div className="flex-1 flex items-end gap-1 h-10">
                    {observationItems.map((obs) => (
                        <div
                            key={obs.id}
                            className={cn(
                                "flex-1 rounded-sm transition-all",
                                obs.done
                                    ? obs.isAbnormal
                                        ? "bg-amber-400"
                                        : "bg-rose-400 dark:bg-rose-500"
                                    : "bg-slate-200 dark:bg-slate-700"
                            )}
                            style={{ height: obs.done ? '100%' : '40%' }}
                        />
                    ))}
                </div>
            </div>

            {/* Observation Items - Compact */}
            <div className="px-5 pb-4 space-y-2">
                {observationItems.map((obs) => (
                    <div
                        key={obs.id}
                        className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl",
                            obs.isAbnormal
                                ? "bg-amber-50 dark:bg-amber-900/20"
                                : obs.done
                                    ? "bg-slate-50 dark:bg-slate-800/50"
                                    : "bg-slate-100 dark:bg-slate-800"
                        )}
                    >
                        <div className="flex items-center gap-2.5">
                            <obs.Icon className={cn(
                                "h-4 w-4",
                                obs.done ? "text-slate-400" : "text-slate-600 dark:text-slate-300"
                            )} />
                            <span className={cn(
                                "text-sm font-medium",
                                obs.done ? "text-slate-400" : "text-slate-700 dark:text-slate-200"
                            )}>
                                {obs.label}
                            </span>
                            {obs.isAbnormal && (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            )}
                        </div>

                        {obs.done ? (
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-full",
                                    obs.isAbnormal
                                        ? "bg-amber-200 text-amber-700"
                                        : "bg-emerald-100 text-emerald-600"
                                )}>
                                    {obs.value}
                                </span>
                                <Check className={cn(
                                    "h-4 w-4",
                                    obs.isAbnormal ? "text-amber-500" : "text-emerald-500"
                                )} />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {obs.inputType === 'choice' ? (
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                        {getChoicesForObservation(obs, noticeDefs).map((choice: string) => (
                                            <button
                                                key={choice}
                                                onClick={() => handleQuickRecord(obs, choice)}
                                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors"
                                            >
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                ) : obs.inputType === 'count' ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                const val = prompt('数値を入力', '1');
                                                if (val) handleQuickRecord(obs, val);
                                            }}
                                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
                                        >
                                            記録
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleQuickRecord(obs, 'いつも通り')}
                                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
                                        >
                                            ✓ OK
                                        </button>
                                        <button
                                            onClick={() => handleQuickRecord(obs, 'ちょっと違う')}
                                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95 transition-all"
                                        >
                                            ⚠ 注意
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

        </div>
    );
}
