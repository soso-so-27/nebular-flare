"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-[#FAF9F7]/90 backdrop-blur-xl border border-white/40 shadow-2xl w-full max-w-md max-h-[90vh] sm:rounded-2xl rounded-t-[32px] overflow-hidden flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 shrink-0 z-10">
                            <h2 className="text-lg font-bold text-slate-800">観察履歴</h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-black/5">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Cat Filter */}
                        {cats.length > 1 && (
                            <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-black/5 shrink-0 scrollbar-hide">
                                <button
                                    onClick={() => setSelectedCatId(null)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                                        selectedCatId === null
                                            ? "bg-[#7CAA8E] text-white shadow-md shadow-[#7CAA8E]/20"
                                            : "bg-white/50 text-slate-600 hover:bg-white/80"
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
                                                ? "bg-[#7CAA8E] text-white shadow-md shadow-[#7CAA8E]/20"
                                                : "bg-white/50 text-slate-600 hover:bg-white/80"
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
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                            {loading ? (
                                <div className="text-center py-10 text-slate-400">読み込み中...</div>
                            ) : isDemo ? (
                                <div className="text-center py-10 text-slate-400">デモモードでは履歴は表示されません</div>
                            ) : groupedObservations.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">まだ記録がありません</div>
                            ) : (
                                groupedObservations.map(([date, records]) => (
                                    <div key={date} className="rounded-2xl bg-white/40 border border-white/60 overflow-hidden shadow-sm">
                                        {/* Day Header */}
                                        <button
                                            onClick={() => toggleDay(date)}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-800">
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
                                                                "flex items-center justify-between px-3 py-2 rounded-xl border",
                                                                abnormal
                                                                    ? "bg-amber-50/80 border-amber-100"
                                                                    : "bg-white/60 border-transparent"
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
                                                                    <div className="text-xs font-medium text-slate-700">
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
                                                                        ? "bg-amber-100 text-amber-700"
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
