"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useAppState } from "@/store/app-store";
import { motion } from "framer-motion";
import { Heart, Cat, ChevronLeft, ChevronRight } from "lucide-react";
import { CheckSection } from "./check-section";
import { ActivityFeed } from "./activity-feed";
import { AnomalyAlertBanner } from "./anomaly-alert-banner";

// Hero Card Component (Bento Item)
function HeroCard() {
    const { cats, activeCatId, setActiveCatId } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);
    const currentIndex = cats.findIndex(c => c.id === activeCatId);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "おはよう";
        if (hour < 18) return "こんにちは";
        return "こんばんは";
    }, []);

    const daysTogetherCount = useMemo(() => {
        if (!activeCat?.birthday) return null;
        const startDate = new Date(activeCat.birthday);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
    }, [activeCat?.birthday]);

    const goToPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : cats.length - 1;
        setActiveCatId(cats[prevIndex].id);
    };
    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextIndex = currentIndex < cats.length - 1 ? currentIndex + 1 : 0;
        setActiveCatId(cats[nextIndex].id);
    };

    if (!activeCat) return null;

    return (
        <motion.div
            className="relative col-span-1 row-span-2 aspect-[4/5] rounded-[2rem] overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-800"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Dynamic Photo */}
            {activeCat.avatar ? (
                <Image
                    src={activeCat.avatar}
                    alt={activeCat.name}
                    fill
                    className="object-cover"
                    priority
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-200 via-amber-100 to-orange-100 flex items-center justify-center">
                    <span className="text-6xl opacity-80">🐱</span>
                </div>
            )}

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <p className="text-sm opacity-90 font-medium">{greeting}、</p>
                <h2 className="text-2xl font-bold">{activeCat.name}</h2>
                {daysTogetherCount && (
                    <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                        <span>🧡</span> {daysTogetherCount}日目
                    </p>
                )}
            </div>

            {/* Cat Navigation (if multiple) */}
            {cats.length > 1 && (
                <>
                    <button
                        onClick={goToPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    {/* Dots */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {cats.map((cat, idx) => (
                            <div
                                key={cat.id}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? "bg-white w-3" : "bg-white/50"}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </motion.div>
    );
}

// Action Buttons Component
function ActionButtons({
    onCare,
    onObs,
    careCount,
    obsCount
}: {
    onCare: () => void;
    onObs: () => void;
    careCount: number;
    obsCount: number;
}) {
    return (
        <>
            <motion.button
                onClick={onCare}
                className="relative col-span-1 row-span-1 rounded-[2rem] bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border border-white/50 dark:border-white/10 shadow-sm flex flex-col items-center justify-center gap-2 p-2 active:scale-95 transition-transform"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-bold text-amber-900 dark:text-amber-100">お世話</span>

                {careCount > 0 && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white dark:border-slate-900">
                        {careCount}
                    </span>
                )}
            </motion.button>

            <motion.button
                onClick={onObs}
                className="relative col-span-1 row-span-1 rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border border-white/50 dark:border-white/10 shadow-sm flex flex-col items-center justify-center gap-2 p-2 active:scale-95 transition-transform"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
                    <Cat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">様子</span>

                {obsCount > 0 && (
                    <span className="absolute top-3 right-3 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white dark:border-slate-900">
                        {obsCount}
                    </span>
                )}
            </motion.button>
        </>
    );
}

interface BentoGridHomeScreenProps {
    onCareClick: () => void;
    onObservationClick: () => void;
    careCount?: number;
    observationCount?: number;
}

export function BentoGridHomeScreen({
    onCareClick,
    onObservationClick,
    careCount = 0,
    observationCount = 0
}: BentoGridHomeScreenProps) {
    return (
        <div className="pb-32 space-y-3">
            {/* Header / Alerts Area - If any */}
            <div className="px-4 pt-2">
                <AnomalyAlertBanner />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-2 gap-3 px-4">
                {/* Hero Photo (Left, Tall) */}
                <HeroCard />

                {/* Actions Stack (Right, 2 items) */}
                <div className="col-span-1 row-span-2 grid grid-rows-2 gap-3 h-full">
                    <ActionButtons
                        onCare={onCareClick}
                        onObs={onObservationClick}
                        careCount={careCount}
                        obsCount={observationCount}
                    />
                </div>

                {/* Pickup Section (Full Width) */}
                <motion.div
                    className="col-span-2 mt-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <CheckSection />
                </motion.div>

                {/* Activity Feed (Full Width) */}
                <motion.div
                    className="col-span-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <ActivityFeed />
                </motion.div>
            </div>
        </div>
    );
}
