"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { Cat as CatIcon, Edit, Cake, Scale, Cpu, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { WeightChart } from "./weight-chart";
import { CatEditModal } from "./cat-edit-modal";

interface CatScreenProps {
    externalSwipeMode?: boolean;
    onSwipeModeChange?: (show: boolean) => void;
}

export function CatScreen({ externalSwipeMode = false, onSwipeModeChange }: CatScreenProps) {
    const {
        cats,
        activeCatId,
        setActiveCatId,
        isDemo,
        addCatWeightRecord
    } = useAppState();
    const selectedCat = cats.find(c => c.id === activeCatId) || cats[0];

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Helper for Age Text
    const getAgeText = () => {
        if (!selectedCat?.birthday) return selectedCat?.age;
        const birthDate = new Date(selectedCat.birthday);
        const now = new Date();
        const years = differenceInYears(now, birthDate);
        const months = differenceInMonths(now, birthDate) % 12;

        if (years === 0) {
            return `${months}ヶ月`;
        } else if (months === 0) {
            return `${years}歳`;
        } else {
            return `${years}歳${months}ヶ月`;
        }
    };

    if (cats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <CatIcon className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">まだ猫がいません</h2>
                <p className="text-sm text-slate-500 mb-4">設定から猫を追加してください</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-background">
            <CatEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                catId={activeCatId}
            />

            {/* Main Content */}
            <div className="pb-24 transition-all duration-500">

                {selectedCat && (
                    <div className="relative mb-8">
                        {/* Immersive Hero Header - Seamless Edge-to-Edge */}
                        <div className="relative h-[280px] w-full overflow-hidden z-0">
                            {(selectedCat.avatar?.startsWith('http') || selectedCat.avatar?.startsWith('/')) ? (
                                <img src={selectedCat.avatar} alt={selectedCat.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-8xl">
                                    {selectedCat.avatar || "🐈"}
                                </div>
                            )}
                            {/* Gradient Overlay - Top and Bottom for seamless integration */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

                            {/* Header Controls (Floating) */}
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
                                >
                                    <Edit className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Cat Switcher (Floating Top Left) */}
                            {cats.length > 1 && (
                                <div className="absolute top-4 left-4 z-10 flex gap-2 overflow-x-auto scrollbar-hide max-w-[60%] py-1 px-1">
                                    {cats.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCatId(cat.id)}
                                            className={cn(
                                                "w-10 h-10 rounded-full border-2 overflow-hidden transition-all flex-shrink-0 shadow-lg",
                                                activeCatId === cat.id
                                                    ? "border-amber-500 scale-110 ring-2 ring-amber-500/50 z-10"
                                                    : "border-white/50 opacity-70 hover:opacity-100 hover:scale-105"
                                            )}
                                        >
                                            {(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                                                <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xs">{cat.avatar || "🐈"}</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Info Overlay (Bottom Left) */}
                            <div className="absolute bottom-0 left-0 w-full p-6 pb-8 flex items-end justify-between">
                                <div>
                                    <motion.h1
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-4xl font-extrabold text-white drop-shadow-md mb-2 tracking-tight"
                                    >
                                        {selectedCat.name}
                                    </motion.h1>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="flex items-center gap-2 text-white/95 font-medium text-sm"
                                    >
                                        <span className="bg-white/15 backdrop-blur-lg px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                                            {selectedCat.sex === 'オス' ? '♂ 男の子' : selectedCat.sex === 'メス' ? '♀ 女の子' : '性別不明'}
                                        </span>
                                        <span className="bg-white/15 backdrop-blur-lg px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                                            {getAgeText()}
                                        </span>
                                        {selectedCat.weight && (
                                            <span className="bg-white/15 backdrop-blur-lg px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                                                {selectedCat.weight}kg
                                            </span>
                                        )}
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dashboard Content - Single Scroll View */}
                <div className="px-4 space-y-6 pt-6">

                    {/* 1. Weight Chart (Main Focus) */}
                    <div>
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">健康管理</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card p-5 rounded-2xl shadow-md border border-border"
                        >
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground text-base">体重推移</h3>
                                    <p className="text-xs text-muted-foreground">健康管理の基本です</p>
                                </div>
                            </div>
                            <WeightChart
                                catId={activeCatId}
                                currentWeight={selectedCat?.weight || undefined}
                                weightHistory={selectedCat?.weightHistory || []}
                                onAddWeight={(w, n) => addCatWeightRecord(activeCatId, w, n)}
                                isDemo={isDemo}
                            />
                        </motion.div>
                    </div>

                    {/* 2. Detailed Profile Info */}
                    <div className="pt-4">
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">プロフィール</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-1 gap-3"
                        >
                            <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Cake className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-0.5">誕生日</div>
                                        <div className="text-base font-bold text-foreground">
                                            {selectedCat?.birthday ? format(new Date(selectedCat.birthday), 'yyyy.MM.dd') : '未設定'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedCat?.microchip_id && (
                                <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground mb-0.5">マイクロチップID</div>
                                            <div className="text-base font-mono font-bold text-foreground tracking-wide">
                                                {selectedCat.microchip_id}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedCat?.notes && (
                                <div className="bg-card p-4 rounded-2xl shadow-sm border border-border">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-muted rounded-lg text-muted-foreground">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-foreground text-sm">メモ</h3>
                                    </div>
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/50 p-3 rounded-xl">
                                        {selectedCat.notes}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

