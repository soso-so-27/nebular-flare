"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Check, Cat as CatIcon, ChevronDown, ChevronUp, TrendingUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useCatContext, useCoreContext, useCareContext } from "@/store/app-store";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

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
    const { cats } = useCatContext();
    const { householdId, isDemo } = useCoreContext();
    const { noticeDefs } = useCareContext();
    const [observations, setObservations] = useState<ObservationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [todayStr, setTodayStr] = useState<string>("");
    const [yesterdayStr, setYesterdayStr] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"charts" | "history">("charts");

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

    // --- Chart Data Preparation ---
    const chartData = useMemo(() => {
        const filtered = selectedCatId ? observations.filter(o => o.cat_id === selectedCatId) : observations;

        // Group by Date for 'all' cats or single cat
        // weight will be stored per catId to allow multiple lines: { [catId]: number }
        const byDate: Record<string, { weights: Record<string, number>, incidentCount: number }> = {};

        // Merge WeightHistory from Cats
        const targetCats = selectedCatId ? cats.filter(c => c.id === selectedCatId) : cats;
        targetCats.forEach(cat => {
            if (cat.weightHistory) {
                cat.weightHistory.forEach(w => {
                    const date = w.recorded_at.split('T')[0];
                    if (!byDate[date]) {
                        byDate[date] = { weights: {}, incidentCount: 0 };
                    }
                    // Weight from dedicated feature takes precedence
                    byDate[date].weights[cat.id] = w.weight;
                });
            }
        });

        filtered.forEach(obs => {
            const date = obs.recorded_at.split('T')[0];
            if (!byDate[date]) {
                byDate[date] = { weights: {}, incidentCount: 0 };
            }

            // Identify Weight (Fallback for legacy observations)
            if (obs.type === 'n_weight' || obs.type === '体重') {
                const num = parseFloat(obs.value);
                // Only overwrite if not already populated by weightHistory
                if (!isNaN(num) && byDate[date].weights[obs.cat_id] === undefined) {
                    byDate[date].weights[obs.cat_id] = num;
                }
            } else if (isAbnormal(obs.value)) {
                // Count abnormal incidents
                byDate[date].incidentCount += 1;
            }
        });

        const sortedDates = Object.keys(byDate).sort((a, b) => a.localeCompare(b));
        // Ensure we show at least last 7 days even if empty
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const mergedDates = Array.from(new Set([...last7Days, ...sortedDates])).sort((a, b) => a.localeCompare(b));
        // Take the latest 14 days for charts
        const finalDates = mergedDates.slice(-14);

        return finalDates.map(date => {
            // Short date for X axis (e.g. "2/25")
            const d = new Date(date);
            const shortDate = `${d.getMonth() + 1}/${d.getDate()}`;

            // Format data for Recharts
            // To support multiple lines, we need flat keys: 'cat1': 4.5, 'cat2': 5.0
            const res: any = {
                date,
                shortDate,
                incidentCount: byDate[date]?.incidentCount || 0
            };

            if (byDate[date]?.weights) {
                Object.entries(byDate[date].weights).forEach(([catId, w]) => {
                    res[catId] = w;
                });
            }
            return res;
        });
    }, [observations, selectedCatId]);

    // Check if any weight data exists across all days and cats
    const hasAnyWeightData = chartData.some(d => Object.keys(d).some(k => k !== 'date' && k !== 'shortDate' && k !== 'incidentCount'));

    // Filter cats to only those who have weight data in the current chart to prevent Recharts domain Infinity bugs
    const activeCatsForChart = cats.filter(c => chartData.some(d => d[c.id] !== undefined && d[c.id] !== null));

    // Colors for multiple cats (Sage, Peach, Lavender, Taupe)
    const COLORS = ['#8BA888', '#E8B4A0', '#A898C8', '#B8B0A8'];

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#4E342E]/20 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-[#FDF8F1] w-full max-w-md max-h-[90vh] sm:rounded-[32px] rounded-t-[32px] overflow-hidden flex flex-col relative shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Area (Unified White Background) */}
                        <div className="bg-white shrink-0 z-10 rounded-t-[32px] sm:rounded-t-[32px] border-b border-[#F2EFEA] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                            {/* Title */}
                            <div className="flex items-center justify-between px-5 pt-6 pb-4">
                                <h2 className="text-lg font-bold text-[#4E342E] flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-brand-lavender" />
                                    健康推移
                                </h2>
                                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-[#FDF8F1] text-[#A6A29A]">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Tabs (Segmented Control Style) */}
                            <div className="px-5 pb-4">
                                <div className="flex p-1 bg-[#FDF8F1] rounded-[16px]">
                                    <button
                                        onClick={() => setActiveTab('charts')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all",
                                            activeTab === 'charts'
                                                ? "bg-white text-[#4E342E] shadow-sm"
                                                : "text-[#A6A29A] hover:text-[#787570]"
                                        )}
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        グラフ
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all",
                                            activeTab === 'history'
                                                ? "bg-white text-[#4E342E] shadow-sm"
                                                : "text-[#A6A29A] hover:text-[#787570]"
                                        )}
                                    >
                                        <History className="w-4 h-4" />
                                        履歴
                                    </button>
                                </div>
                            </div>

                            {/* Cat Filter */}
                            {cats.length > 1 && (
                                <div className="px-5 pb-4 pt-1 flex gap-2 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setSelectedCatId(null)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                            selectedCatId === null
                                                ? "bg-brand-sage/10 border-brand-sage/30 text-[#4E342E]"
                                                : "bg-[#FDF8F1] border-transparent text-[#A6A29A] hover:bg-[#F2EFEA]"
                                        )}
                                    >
                                        すべて
                                    </button>
                                    {cats.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCatId(cat.id)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                                selectedCatId === cat.id
                                                    ? "bg-brand-sage/10 border-brand-sage/30 text-[#4E342E]"
                                                    : "bg-[#FDF8F1] border-transparent text-[#A6A29A] hover:bg-[#F2EFEA]"
                                            )}
                                        >
                                            {(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                                                <img src={cat.avatar} alt={cat.name} className="w-4.5 h-4.5 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-4.5 h-4.5 flex items-center justify-center bg-white rounded-full text-[#1c1c1e]/20 shadow-sm">
                                                    <CatIcon className="w-3 h-3" />
                                                </div>
                                            )}
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
                            {loading ? (
                                <div className="text-center py-10 text-[#A6A29A] font-bold">読み込み中...</div>
                            ) : isDemo ? (
                                <div className="text-center py-10 text-[#A6A29A] font-bold">デモモードでは履歴は表示されません</div>
                            ) : groupedObservations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <CatIcon className="w-8 h-8 text-[#D4CFC9]" />
                                    <div className="text-center text-[#A6A29A] font-bold text-sm">まだ記録がありません</div>
                                </div>
                            ) : activeTab === 'charts' ? (
                                <div className="space-y-6 pb-6">
                                    {/* Weight Trend Chart */}
                                    <section className="bg-white p-5 rounded-[24px] border border-[#F2EFEA] shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-[#4E342E] text-[14px]">体重推移 (kg)</h3>
                                            {!hasAnyWeightData && <span className="text-[10px] text-[#A6A29A] font-medium px-2 py-0.5 bg-[#FDF8F1] rounded-full">データなし</span>}
                                        </div>
                                        {hasAnyWeightData ? (
                                            <div className="h-40 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EFEA" />
                                                        <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A6A29A' }} dy={10} />
                                                        <YAxis
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fontSize: 10, fill: '#A6A29A' }}
                                                            domain={([dataMin, dataMax]: any) => {
                                                                const min = isFinite(dataMin) && dataMin !== null ? Math.max(0, dataMin - 0.2) : 0;
                                                                const max = isFinite(dataMax) && dataMax !== null ? dataMax + 0.2 : 10;
                                                                return [Number(min.toFixed(2)), Number(max.toFixed(2))];
                                                            }}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold', color: '#4E342E' }}
                                                            itemStyle={{ color: '#4E342E' }}
                                                            labelStyle={{ color: '#A6A29A', marginBottom: '4px' }}
                                                            formatter={(val: any, name: any) => {
                                                                // Convert catId back to name in tooltip if multiple
                                                                if (name !== 'weight' && name !== selectedCatId) {
                                                                    const catName = cats.find(c => c.id === name)?.name || '体重';
                                                                    return [`${val} kg`, catName];
                                                                }
                                                                return [`${val} kg`, '体重'];
                                                            }}
                                                        />
                                                        {selectedCatId ? (
                                                            <Line type="monotone" dataKey={selectedCatId} stroke="#8BA888" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#8BA888', stroke: '#fff', strokeWidth: 2 }} connectNulls />
                                                        ) : (
                                                            activeCatsForChart.map((cat, idx) => (
                                                                <Line
                                                                    key={cat.id}
                                                                    type="monotone"
                                                                    dataKey={cat.id}
                                                                    name={cat.id}
                                                                    stroke={COLORS[idx % COLORS.length]}
                                                                    strokeWidth={3}
                                                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                                                    activeDot={{ r: 6, fill: COLORS[idx % COLORS.length], stroke: '#fff', strokeWidth: 2 }}
                                                                    connectNulls
                                                                />
                                                            ))
                                                        )}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-32 flex items-center justify-center border-2 border-dashed border-[#F2EFEA] rounded-2xl">
                                                <p className="text-[12px] text-[#A6A29A] font-bold">体重記録がまだありません</p>
                                            </div>
                                        )}
                                    </section>

                                    {/* Incidents (Abnormal observation frequency) */}
                                    <section className="bg-white p-5 rounded-[24px] border border-[#F2EFEA] shadow-sm">
                                        <div className="mb-4">
                                            <h3 className="font-bold text-[#4E342E] text-[14px]">気になる記録の頻度</h3>
                                            <p className="text-[11px] text-[#A6A29A] mt-1">吐き戻しや普段と違う様子の回数</p>
                                        </div>
                                        <div className="h-40 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EFEA" />
                                                    <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A6A29A' }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A6A29A' }} allowDecimals={false} />
                                                    <Tooltip
                                                        cursor={{ fill: '#FDF8F1' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }}
                                                        formatter={(val: any) => [val > 0 ? `${val}件` : 'なし', '記録件数']}
                                                    />
                                                    <Bar dataKey="incidentCount" radius={[4, 4, 0, 0]} barSize={14}>
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.incidentCount > 0 ? '#A898C8' : '#F2EFEA'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                groupedObservations.map(([date, records]) => (
                                    <div key={date} className="rounded-2xl bg-white border border-[#F2EFEA] overflow-hidden shadow-sm">
                                        {/* Day Header */}
                                        <button
                                            onClick={() => toggleDay(date)}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-[#4E342E]">
                                                    {formatDate(date)}
                                                </span>
                                                <span className="text-xs text-[#A6A29A] font-bold">{records.length}件</span>
                                                {records.some(r => isAbnormal(r.value)) && (
                                                    <AlertTriangle className="h-4 w-4 text-brand-lavender fill-brand-lavender/10" />
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
                                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden text-[#1c1c1e]/20">
                                                                        {(catAvatar?.startsWith('http') || catAvatar?.startsWith('/')) ? (
                                                                            <img src={catAvatar} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <CatIcon className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="text-xs font-medium text-slate-700">
                                                                        {noticeDefs?.find(n => n.id === obs.type)?.title || obs.type}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#A6A29A] font-medium">
                                                                        {formatTime(obs.recorded_at)}
                                                                        {!selectedCatId && ` · ${getCatName(obs.cat_id)}`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "text-xs font-bold px-2.5 py-1 rounded-lg",
                                                                    abnormal
                                                                        ? "bg-brand-lavender/10 text-brand-lavender"
                                                                        : "bg-brand-sage/10 text-brand-sage"
                                                                )}>
                                                                    {obs.value}
                                                                </span>
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
