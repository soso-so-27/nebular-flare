"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle, Check, Cat, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useAppState } from "@/store/app-store";

interface ObservationRecord {
    id: string;
    cat_id: string;
    type: string;
    value: string;
    recorded_at: string;
    recorded_by?: string | null;
}

interface ObservationHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ObservationHistoryModal({ isOpen, onClose }: ObservationHistoryModalProps) {
    const { cats, householdId, isDemo } = useAppState();
    const [observations, setObservations] = useState<ObservationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [todayStr, setTodayStr] = useState<string>("");
    const [yesterdayStr, setYesterdayStr] = useState<string>("");

    // Fetch all observations for all cats in the household
    useEffect(() => {
        if (!isOpen || isDemo) {
            setLoading(false);
            return;
        }

        async function fetchAllObservations() {
            setLoading(true);
            const supabase = createClient() as any;

            // Get all cat IDs for this household
            const catIds = cats.map(c => c.id);
            if (catIds.length === 0) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('observations')
                .select('*')
                .in('cat_id', catIds)
                .is('deleted_at', null)
                .order('recorded_at', { ascending: false })
                .limit(100); // Limit to last 100 records

            if (!error && data) {
                setObservations(data);
            }
            setLoading(false);
        }

        fetchAllObservations();
    }, [isOpen, cats, isDemo]);

    // Group observations by date
    const groupedObservations = useMemo(() => {
        const filtered = selectedCatId
            ? observations.filter(o => o.cat_id === selectedCatId)
            : observations;

        const groups: Record<string, ObservationRecord[]> = {};
        filtered.forEach(obs => {
            const date = obs.recorded_at.split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(obs);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [observations, selectedCatId]);

    // Auto-expand today (client-side only)
    useEffect(() => {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        setTodayStr(todayString);
        setYesterdayStr(yesterdayString);
        setExpandedDays(new Set([todayString]));
    }, [isOpen]);

    const toggleDay = (date: string) => {
        setExpandedDays(prev => {
            const next = new Set(prev);
            if (next.has(date)) {
                next.delete(date);
            } else {
                next.add(date);
            }
            return next;
        });
    };

    const getCatName = (catId: string) => cats.find(c => c.id === catId)?.name || "不明";
    const getCatAvatar = (catId: string) => cats.find(c => c.id === catId)?.avatar;

    const isAbnormal = (value: string) => value !== "いつも通り" && value !== "なし" && value !== "記録した" && value !== "普通" && value !== "完食";

    const formatDate = (dateString: string) => {
        if (dateString === todayStr) return "今日";
        if (dateString === yesterdayStr) return "昨日";

        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
    };

    const formatTime = (dateTimeString: string) => {
        return new Date(dateTimeString).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">観察履歴</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Cat Filter */}
                {cats.length > 1 && (
                    <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setSelectedCatId(null)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                                selectedCatId === null
                                    ? "bg-primary text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            )}
                        >
                            すべて
                        </button>
                        {cats.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCatId(cat.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                                    selectedCatId === cat.id
                                        ? "bg-primary text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                )}
                            >
                                {(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                    <span className="text-sm">{cat.avatar || "🐈"}</span>
                                )}
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400">読み込み中...</div>
                    ) : isDemo ? (
                        <div className="text-center py-10 text-slate-400">デモモードでは履歴は表示されません</div>
                    ) : groupedObservations.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">まだ記録がありません</div>
                    ) : (
                        groupedObservations.map(([date, records]) => (
                            <div key={date} className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                                {/* Day Header */}
                                <button
                                    onClick={() => toggleDay(date)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {formatDate(date)}
                                        </span>
                                        <span className="text-xs text-slate-400">{records.length}件</span>
                                        {records.some(r => isAbnormal(r.value)) && (
                                            <AlertTriangle className="h-3.5 w-3.5 text-[#B8A6D9]" />
                                        )}
                                    </div>
                                    {expandedDays.has(date) ? (
                                        <ChevronUp className="h-4 w-4 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    )}
                                </button>

                                {/* Day Content */}
                                {expandedDays.has(date) && (
                                    <div className="px-4 pb-3 space-y-2">
                                        {records.map(obs => {
                                            const catAvatar = getCatAvatar(obs.cat_id);
                                            const abnormal = isAbnormal(obs.value);
                                            return (
                                                <div
                                                    key={obs.id}
                                                    className={cn(
                                                        "flex items-center justify-between px-3 py-2 rounded-xl",
                                                        abnormal
                                                            ? "bg-amber-50 dark:bg-amber-900/20"
                                                            : "bg-white dark:bg-slate-800"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {/* Cat Avatar (only if showing all cats) */}
                                                        {!selectedCatId && (
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                                                {(catAvatar?.startsWith('http') || catAvatar?.startsWith('/')) ? (
                                                                    <img src={catAvatar} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs">{catAvatar || "🐈"}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                                                {obs.type}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {formatTime(obs.recorded_at)}
                                                                {!selectedCatId && ` · ${getCatName(obs.cat_id)}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-xs font-medium px-2 py-0.5 rounded-full",
                                                            abnormal
                                                                ? "bg-amber-200 text-amber-700"
                                                                : "bg-[#E5F0EA] text-[#5A8C6E]"
                                                        )}>
                                                            {obs.value}
                                                        </span>
                                                        {abnormal ? (
                                                            <AlertTriangle className="h-3.5 w-3.5 text-[#B8A6D9]" />
                                                        ) : (
                                                            <Check className="h-3.5 w-3.5 text-[#7CAA8E]" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
