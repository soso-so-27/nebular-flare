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
        <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
            <CatEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                catId={activeCatId}
            />

            {/* 1. Full Screen Background Layer */}
            {selectedCat && (
                <div className="fixed inset-0 z-0">
                    {(selectedCat.avatar?.startsWith('http') || selectedCat.avatar?.startsWith('/')) ? (
                        <motion.img
                            key={selectedCat.id}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.7 }}
                            src={selectedCat.avatar}
                            alt={selectedCat.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-amber-900">
                            <span className="text-9xl">{selectedCat.avatar || "🐈"}</span>
                        </div>
                    )}
                    {/* Dark Overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
                </div>
            )}

            {/* 2. Main Scrollable Content */}
            <div className="relative z-10 h-screen overflow-y-auto overflow-x-hidden pb-32 scrollbar-hide">

                {/* Header Actions */}
                <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-4">
                    {/* Cat Switcher */}
                    <div className="flex gap-2 p-1 overflow-x-auto scrollbar-hide max-w-[70%] mask-linear-fade">
                        {cats.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCatId(cat.id)}
                                className={cn(
                                    "w-10 h-10 rounded-full border border-white/20 overflow-hidden transition-all flex-shrink-0 shadow-lg relative",
                                    activeCatId === cat.id
                                        ? "scale-110 ring-2 ring-amber-500 z-10"
                                        : "opacity-60 hover:opacity-100 scale-95 grayscale"
                                )}
                            >
                                {(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs">{cat.avatar || "🐈"}</div>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2.5 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                        <Edit className="h-5 w-5" />
                    </button>
                </div>

                {/* Hero Section */}
                <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-2xl mb-3 tracking-tight leading-none">
                            {selectedCat.name}
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-white/80 text-sm font-medium">
                            <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                {selectedCat.sex === 'オス' ? '♂ 男の子' : selectedCat.sex === 'メス' ? '♀ 女の子' : '性別不明'}
                            </span>
                            <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                {getAgeText()}
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Glass Content Area */}
                <div className="px-4 space-y-4">

                    {/* Weight Chart Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-5 shadow-2xl overflow-hidden relative"
                    >
                        {/* Decorative background glow */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <WeightChart
                                catId={activeCatId}
                                currentWeight={selectedCat?.weight || undefined}
                                weightHistory={selectedCat?.weightHistory || []}
                                onAddWeight={(w, n) => addCatWeightRecord(activeCatId, w, n)}
                                isDemo={isDemo}
                                variant="glass"
                            />
                        </div>
                    </motion.div>

                    {/* Profile Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-3xl bg-black/20 backdrop-blur-lg border border-white/10 p-4 shadow-lg flex flex-col items-center justify-center text-center gap-2"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-amber-300 mb-1">
                                <Cake className="w-5 h-5" />
                            </div>
                            <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Birthday</div>
                            <div className="text-lg font-bold text-white">
                                {selectedCat?.birthday ? format(new Date(selectedCat.birthday), 'yyyy.MM.dd') : '---'}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                            className="rounded-3xl bg-black/20 backdrop-blur-lg border border-white/10 p-4 shadow-lg flex flex-col items-center justify-center text-center gap-2"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-300 mb-1">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Microchip</div>
                            <div className="text-sm font-mono font-bold text-white/90">
                                {selectedCat.microchip_id || '---'}
                            </div>
                        </motion.div>
                    </div>

                    {/* Notes Card */}
                    {selectedCat?.notes && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-5 shadow-lg"
                        >
                            <div className="flex items-center gap-2 mb-3 text-white/70">
                                <FileText className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Memo</span>
                            </div>
                            <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                                {selectedCat.notes}
                            </div>
                        </motion.div>
                    )}

                    {/* Bottom Spacer for global fab/nav */}
                    <div className="h-20" />
                </div>
            </div>
        </div>
    );
}


