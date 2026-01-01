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
        <div className="space-y-4">
            {/* Header / Stats */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center shadow-sm">
                        <Cat className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                            {activeCat?.name}の様子
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">
                                {completedCount}/{totalCount} 完了
                            </span>
                            {/* Mini Progress Bars */}
                            <div className="flex gap-0.5 h-1.5 w-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                {observationItems.map((obs) => (
                                    <div
                                        key={obs.id}
                                        className={cn(
                                            "flex-1 transition-all duration-500",
                                            obs.done
                                                ? obs.isAbnormal
                                                    ? "bg-amber-400"
                                                    : "bg-rose-400"
                                                : "bg-transparent"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cat Switcher (Compact) */}
                {cats.length > 1 && (
                    <div className="flex -space-x-2">
                        {cats.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCatId(cat.id)}
                                className={cn(
                                    "w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 overflow-hidden transition-transform",
                                    cat.id === activeCatId ? "z-10 scale-110 ring-2 ring-rose-400" : "opacity-60 hover:opacity-100 hover:scale-105"
                                )}
                            >
                                {(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xs">
                                        {cat.avatar || "🐈"}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Observation Grid */}
            <div className="grid grid-cols-2 gap-3">
                {observationItems.map((obs) => (
                    <div
                        key={obs.id}
                        className={cn(
                            "relative overflow-hidden rounded-3xl p-4 transition-all duration-300 border backdrop-blur-md flex flex-col justify-between min-h-[140px]",
                            obs.done
                                ? obs.isAbnormal
                                    ? "bg-amber-50/80 border-amber-200/50 shadow-inner" // Done & Abnormal
                                    : "bg-white/40 border-white/20 opacity-80 grayscale-[0.3]" // Done & Normal
                                : "bg-white/70 dark:bg-slate-800/60 border-white/40 dark:border-slate-700 shadow-lg shadow-slate-200/50 hover:scale-[1.02] active:scale-[0.98]" // Pending
                        )}
                    >
                        {/* Header: Icon & Label */}
                        <div className="flex items-start justify-between">
                            <div className={cn(
                                "p-2.5 rounded-2xl",
                                obs.done
                                    ? "bg-slate-100 dark:bg-slate-700 text-slate-400"
                                    : obs.isAbnormal
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-gradient-to-br from-rose-100 to-orange-50 text-rose-500"
                            )}>
                                <obs.Icon className="w-5 h-5" />
                            </div>
                            {obs.done && (
                                <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        <div>
                            <span className={cn(
                                "block text-sm font-bold mb-1",
                                obs.done ? "text-slate-500" : "text-slate-800 dark:text-slate-100"
                            )}>
                                {obs.label}
                            </span>

                            {/* Actions / Status */}
                            <div className="mt-2">
                                {obs.done ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "text-xs font-bold px-2 py-0.5 rounded-md",
                                            obs.isAbnormal
                                                ? "bg-amber-200/50 text-amber-700"
                                                : "bg-slate-200/50 text-slate-500"
                                        )}>
                                            {obs.value}
                                        </span>
                                        {/* Undo/Edit trigger could go here */}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {obs.inputType === 'choice' ? (
                                            <div className="flex flex-wrap gap-1">
                                                {getChoicesForObservation(obs, noticeDefs).slice(0, 2).map((choice) => (
                                                    <button
                                                        key={choice}
                                                        onClick={(e) => { e.stopPropagation(); handleQuickRecord(obs, choice); }}
                                                        className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-white/80 border border-slate-100 shadow-sm hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                                    >
                                                        {choice}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : obs.inputType === 'count' ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const val = prompt('数値を入力', '1');
                                                    if (val) handleQuickRecord(obs, val);
                                                }}
                                                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                                            >
                                                入力
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickRecord(obs, 'いつも通り'); }}
                                                    className="flex-1 text-xs font-bold py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-md shadow-emerald-200 hover:opacity-90 active:scale-95 transition-all"
                                                >
                                                    OK
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickRecord(obs, 'ちょっと違う'); }}
                                                    className="w-8 flex items-center justify-center rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-95 transition-all"
                                                >
                                                    <AlertTriangle className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
