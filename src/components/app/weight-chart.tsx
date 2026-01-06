"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WeightRecord {
    id: string;
    weight: number;
    recorded_at: string;
    notes?: string;
}

interface WeightChartProps {
    catId: string;
    currentWeight?: number;
    weightHistory: WeightRecord[];
    onAddWeight: (weight: number, notes?: string) => Promise<any>;
    isDemo?: boolean;
    variant?: 'default' | 'glass';
}

export function WeightChart({ catId, currentWeight, weightHistory, onAddWeight, isDemo, variant = 'default' }: WeightChartProps) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [newWeight, setNewWeight] = useState(currentWeight?.toString() || "");
    const [notes, setNotes] = useState("");

    const isGlass = variant === 'glass';
    const axisColor = isGlass ? '#ffffff80' : '#94a3b8';
    const gridColor = isGlass ? '#ffffff20' : '#e2e8f0';
    const textColor = isGlass ? '#ffffff' : '#1e293b';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/10 text-white' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white';

    // Prepare chart data
    const chartData = useMemo(() => {
        // Sort by date ascending first, then map
        const sortedHistory = [...weightHistory].sort((a, b) =>
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );

        return sortedHistory.map(record => ({
            date: format(new Date(record.recorded_at), 'M/d'),
            weight: record.weight,
            fullDate: format(new Date(record.recorded_at), 'yyyy年M月d日', { locale: ja })
        }));
    }, [weightHistory]);

    // Calculate weight trend
    const trend = useMemo(() => {
        if (chartData.length < 2) return null;
        const latest = chartData[chartData.length - 1].weight;
        const previous = chartData[chartData.length - 2].weight;
        const diff = latest - previous;
        return {
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
            amount: Math.abs(diff).toFixed(2)
        };
    }, [chartData]);

    const handleAdd = async () => {
        const weight = parseFloat(newWeight);
        if (isNaN(weight) || weight <= 0) {
            toast.error("正しい体重を入力してください");
            return;
        }
        if (weight > 20) {
            // Basic sanity check for cats
            if (!confirm("20kgを超えています。正しい入力ですか？")) return;
        }

        try {
            const result = await onAddWeight(weight, notes || undefined);
            if (result && result.error) {
                throw new Error(result.error);
            }
            setShowAddModal(false);
            setNewWeight("");
            setNotes("");
            toast.success("体重を記録しました");
        } catch (error) {
            console.error("Failed to add weight:", error);
            toast.error("保存に失敗しました。もう一度お試しください。");
        }
    };

    // Demo data for preview
    const demoData = [
        { date: '10/1', weight: 4.2, fullDate: '2024年10月1日' },
        { date: '10/15', weight: 4.3, fullDate: '2024年10月15日' },
        { date: '11/1', weight: 4.25, fullDate: '2024年11月1日' },
        { date: '11/15', weight: 4.4, fullDate: '2024年11月15日' },
        { date: '12/1', weight: 4.35, fullDate: '2024年12月1日' },
    ];

    const displayData = isDemo && chartData.length === 0 ? demoData : chartData;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", isGlass ? "text-white/90" : "text-slate-700 dark:text-slate-200")}>体重推移</span>
                    {trend && (
                        <span className={cn(
                            "flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full",
                            isGlass
                                ? "bg-white/20 text-white backdrop-blur-sm"
                                : trend.direction === 'up'
                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                    : trend.direction === 'down'
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        )}>
                            {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                            {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                            {trend.direction === 'stable' && <Minus className="h-3 w-3" />}
                            {trend.amount}kg
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className={cn(
                        "flex items-center gap-1 text-xs transition-colors",
                        isGlass ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                >
                    <Plus className="h-3 w-3" />
                    記録
                </button>
            </div>

            {/* Chart */}
            {displayData.length > 0 ? (
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={displayData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: axisColor }}
                                axisLine={{ stroke: gridColor }}
                            />
                            <YAxis
                                domain={['dataMin - 0.2', 'dataMax + 0.2']}
                                tick={{ fontSize: 10, fill: axisColor }}
                                axisLine={{ stroke: gridColor }}
                                tickFormatter={(value) => `${value}kg`}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-lg shadow-lg px-3 py-2 text-xs border border-white/20">
                                                <p className="text-slate-500 dark:text-slate-400">{payload[0].payload.fullDate}</p>
                                                <p className="font-bold text-slate-800 dark:text-white">{payload[0].value} kg</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="weight"
                                stroke={isGlass ? "#fbbf24" : "#f59e0b"}
                                strokeWidth={2}
                                dot={{ fill: isGlass ? "#fbbf24" : "#f59e0b", strokeWidth: 0, r: 4 }}
                                activeDot={{ r: 6, fill: isGlass ? "#fff" : "#d97706" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className={cn(
                    "h-24 flex items-center justify-center rounded-xl",
                    isGlass ? "bg-white/5 border border-white/10" : "bg-slate-50 dark:bg-slate-800"
                )}>
                    <p className={cn("text-sm", isGlass ? "text-white/40" : "text-slate-400")}>記録がありません</p>
                </div>
            )}

            {/* Add Weight Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-xs"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">体重記録</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">体重 (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={newWeight}
                                        onChange={(e) => setNewWeight(e.target.value)}
                                        placeholder="4.5"
                                        className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700 text-lg font-medium"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">メモ（任意）</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="ダイエット中..."
                                        className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={!newWeight || parseFloat(newWeight) <= 0}
                                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-50"
                                >
                                    保存
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
