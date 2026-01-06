"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAppState } from "@/store/app-store";
import { Check, AlertTriangle, Utensils, Droplets, Pill, Cat, Circle, Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CatObservation {
    id: string;
    label: string;
    Icon: LucideIcon;
    type: string; // for Supabase observation type
    inputType?: 'ok-notice' | 'count' | 'choice' | 'photo';
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

    // Optimistic UI State: Map of noticeId -> value
    const [optimisticLogs, setOptimisticLogs] = useState<Record<string, string>>({});

    // Photo handling state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingPhotoObsId, setPendingPhotoObsId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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

                // Check optimistic state first (Priority 1)
                const optimisticVal = optimisticLogs[notice.id];

                // If optimistic value exists, use it immediately
                if (optimisticVal) {
                    isDone = true;
                    value = optimisticVal;
                    isAbnormal = (optimisticVal !== "いつも通り" && optimisticVal !== "なし");
                }
                // Fallback to real data (Priority 2)
                else if (isDemo) {
                    // Demo mode
                    const log = catLogs[notice.id];
                    const isToday = log?.at?.startsWith(today);
                    isDone = !!(isToday && log?.done);
                    value = log?.value;
                    isAbnormal = !!(log?.value &&
                        log.value !== "いつも通り" &&
                        log.value !== "なし" &&
                        log.value !== "記録した");
                } else {
                    // Supabase mode
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
    }, [noticeDefs, noticeLogs, activeCatId, today, isDemo, observations, optimisticLogs]);

    const completedCount = observationItems.filter(o => o.done).length;
    const totalCount = observationItems.length;

    async function handleQuickRecord(obs: CatObservation, value: string) {
        // 1. Optimistic Update (Immediate Feedback)
        setOptimisticLogs(prev => ({ ...prev, [obs.id]: value }));

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
            try {
                const result = await addObservation(activeCatId, obs.id, value);
                if (result?.error) {
                    throw new Error(result.error.message);
                }
                toast.success(`${obs.label}: ${value}`);
                // Note: We don't clear optimistic log here immediately.
                // We wait for the real-time subscription to update `observations`.
            } catch (e: any) {
                // Revert optimistic update on error
                setOptimisticLogs(prev => {
                    const next = { ...prev };
                    delete next[obs.id];
                    return next;
                });
                toast.error("記録に失敗しました");
            }
        }
    }

    // Handle photo capture for Daily Snap (1-tap camera flow)
    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !pendingPhotoObsId) return;

        const file = e.target.files[0];
        const obsId = pendingPhotoObsId;

        // Find the observation to get label for toast
        const obs = observationItems.find(o => o.id === obsId);
        const label = obs?.label || '写真';

        // Clear pending state
        setPendingPhotoObsId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Optimistic update
        setOptimisticLogs(prev => ({ ...prev, [obsId]: '撮影した' }));
        setIsUploading(true);

        try {
            // Use addObservation with files parameter
            const result = await addObservation(activeCatId, obsId, '撮影した', undefined, [file]);
            if (result?.error) {
                throw new Error(result.error.message);
            }
            toast.success(`${label}を記録しました 📷`);
        } catch (err: any) {
            console.error(err);
            // Revert optimistic update
            setOptimisticLogs(prev => {
                const next = { ...prev };
                delete next[obsId];
                return next;
            });
            toast.error("写真の保存に失敗しました");
        } finally {
            setIsUploading(false);
        }
    };

    // Clean up optimistic logs when real data arrives
    useEffect(() => {
        if (Object.keys(optimisticLogs).length > 0) {
            setOptimisticLogs(prev => {
                const next = { ...prev };
                let changed = false;
                // Check if any optimistic log is now present in real observations
                Object.keys(next).forEach(noticeId => {
                    const existsInReal = observations.some(o => o.cat_id === activeCatId && o.type === noticeId);
                    if (existsInReal) {
                        delete next[noticeId];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [observations, activeCatId]);

    return (
        <div className="space-y-6">
            {/* Header / Stats */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-1">
                        今日の様子
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {completedCount}/{totalCount} 項目完了
                    </p>
                </div>

                {/* Progress Circle or Bar */}
                <div className="flex gap-1">
                    {observationItems.map((obs, i) => (
                        <div
                            key={obs.id}
                            className={cn(
                                "h-2 w-2 rounded-full transition-all duration-500",
                                obs.done
                                    ? obs.isAbnormal
                                        ? "bg-amber-500 scale-125"
                                        : "bg-slate-300 dark:bg-slate-700"
                                    : "bg-slate-200 dark:bg-slate-800"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Observation Grid */}
            <div className="grid grid-cols-2 gap-3">
                {observationItems.map((obs) => (
                    <motion.div
                        layout
                        key={obs.id}
                        initial={false}
                        animate={obs.done ? "done" : "idle"}
                        className={cn(
                            "relative overflow-hidden rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between min-h-[150px]",
                            obs.done
                                ? obs.isAbnormal
                                    ? "bg-amber-50 border border-amber-200/80 shadow-sm" // Done & Abnormal
                                    : "bg-card/50 border border-border/30 opacity-80" // Done & Normal
                                : "bg-card border border-border shadow-md hover:shadow-lg hover:border-primary/20 active:scale-[0.98]" // Pending
                        )}
                    >
                        {/* Header: Icon & Label */}
                        <div className="flex items-start justify-between mb-3">
                            <div className={cn(
                                "p-2.5 rounded-xl transition-colors",
                                obs.done
                                    ? obs.isAbnormal
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-muted text-muted-foreground"
                                    : "bg-primary/10 text-primary"
                            )}>
                                <obs.Icon className="w-5 h-5" />
                            </div>
                            {obs.done && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={cn(
                                        "px-2 py-1 rounded-full flex items-center gap-1",
                                        obs.isAbnormal ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                    )}>
                                    <span className="text-[10px] font-bold">{obs.value}</span>
                                    {obs.isAbnormal ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                </motion.div>
                            )}
                        </div>

                        <div>
                            <span className={cn(
                                "block text-sm font-bold mb-3 transition-colors leading-snug",
                                obs.done ? "text-muted-foreground" : "text-foreground"
                            )}>
                                {obs.label}
                            </span>

                            {/* Actions / Status */}
                            <div className="mt-auto relative z-10">
                                <AnimatePresence mode="wait">
                                    {!obs.done && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex gap-2"
                                        >
                                            {obs.inputType === 'choice' ? (
                                                <div className="flex flex-wrap gap-2 w-full">
                                                    {getChoicesForObservation(obs, noticeDefs).slice(0, 2).map((choice) => (
                                                        <button
                                                            key={choice}
                                                            onClick={(e) => { e.stopPropagation(); handleQuickRecord(obs, choice); }}
                                                            className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
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
                                                    className="w-full text-xs font-bold py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                                >
                                                    数値を入力
                                                </button>
                                            ) : obs.inputType === 'photo' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPendingPhotoObsId(obs.id);
                                                        fileInputRef.current?.click();
                                                    }}
                                                    disabled={isUploading}
                                                    className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {isUploading && pendingPhotoObsId === obs.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Camera className="w-4 h-4" />
                                                    )}
                                                    📷 撮影する
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleQuickRecord(obs, 'いつも通り'); }}
                                                        className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-sm hover:bg-primary/20 active:scale-95 transition-all"
                                                    >
                                                        OK
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleQuickRecord(obs, 'ちょっと違う'); }}
                                                        className="w-11 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-500 hover:bg-amber-100 active:scale-95 transition-all"
                                                    >
                                                        <AlertTriangle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Hidden file input for photo capture */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
            />
        </div>
    );
}
