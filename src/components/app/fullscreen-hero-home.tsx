"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronUp, Heart, Cat } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckSection } from "./check-section";
import { AnomalyAlertBanner } from "./anomaly-alert-banner";
import { ActivityFeed } from "./activity-feed";

// Fullscreen Hero Component
function FullscreenHero() {
    const { cats, activeCatId, setActiveCatId } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    const daysTogetherCount = React.useMemo(() => {
        if (!activeCat?.birthday) return null;
        const startDate = new Date(activeCat.birthday);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
    }, [activeCat?.birthday]);

    const greeting = React.useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "おはよう";
        if (hour < 18) return "こんにちは";
        return "こんばんは";
    }, []);

    const currentIndex = cats.findIndex(c => c.id === activeCatId);
    const goToPrev = () => {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : cats.length - 1;
        setActiveCatId(cats[prevIndex].id);
    };
    const goToNext = () => {
        const nextIndex = currentIndex < cats.length - 1 ? currentIndex + 1 : 0;
        setActiveCatId(cats[nextIndex].id);
    };

    if (!activeCat) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full"
            style={{ height: 'calc(80vh - env(safe-area-inset-top))' }}
        >
            {/* Full Photo */}
            <div className="absolute inset-0 overflow-hidden rounded-b-3xl">
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
                        <span className="text-9xl opacity-80">🐱</span>
                    </div>
                )}

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
            </div>

            {/* Text overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <p className="text-lg opacity-90">{greeting}、</p>
                    <h1 className="text-4xl font-bold mt-1">{activeCat.name}！</h1>
                    {daysTogetherCount && (
                        <p className="text-base opacity-80 mt-2 flex items-center gap-2">
                            <span className="text-xl">🧡</span>
                            一緒に {daysTogetherCount}日目
                        </p>
                    )}
                </motion.div>

                {/* Swipe indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 flex flex-col items-center"
                >
                    <ChevronUp className="w-6 h-6 animate-bounce" />
                    <span className="text-xs opacity-70">スワイプで詳細</span>
                </motion.div>
            </div>

            {/* Navigation arrows (if multiple cats) */}
            {cats.length > 1 && (
                <>
                    <button
                        onClick={goToPrev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </>
            )}

            {/* Dot indicators */}
            {cats.length > 1 && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
                    {cats.map((cat, index) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCatId(cat.id)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentIndex
                                ? "bg-white w-6"
                                : "bg-white/50 hover:bg-white/70"
                                }`}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// Action Buttons
function ActionButtons({ onOpenSection }: { onOpenSection: (section: 'care' | 'cat' | 'inventory') => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
        >
            <button
                onClick={() => onOpenSection('care')}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-800 font-semibold rounded-2xl shadow-sm border border-amber-200/50 transition-all active:scale-95"
            >
                <Heart className="w-5 h-5 text-amber-600" />
                <span>お世話</span>
            </button>
            <button
                onClick={() => onOpenSection('cat')}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-br from-amber-50 to-yellow-100 hover:from-amber-100 hover:to-yellow-200 text-amber-800 font-semibold rounded-2xl shadow-sm border border-amber-200/50 transition-all active:scale-95"
            >
                <Cat className="w-5 h-5 text-amber-600" />
                <span>様子</span>
            </button>
        </motion.div>
    );
}

// Main Fullscreen Hero Home Screen
interface FullscreenHeroHomeScreenProps {
    onCareClick: () => void;
    onObservationClick: () => void;
}

export function FullscreenHeroHomeScreen({ onCareClick, onObservationClick }: FullscreenHeroHomeScreenProps) {
    return (
        <div className="relative -mx-4 -mt-4">
            {/* Fullscreen Hero - Takes 80% of viewport */}
            <FullscreenHero />

            {/* Scrollable Content Below */}
            <div className="px-4 pt-6 pb-20 space-y-4 bg-background">
                {/* Anomaly Alert */}
                <AnomalyAlertBanner />

                {/* Action Buttons - Open Swipe Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-2 gap-3"
                >
                    <button
                        onClick={onCareClick}
                        className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-800 font-semibold rounded-2xl shadow-sm border border-amber-200/50 transition-all active:scale-95"
                    >
                        <Heart className="w-5 h-5 text-amber-600" />
                        <span>お世話</span>
                    </button>
                    <button
                        onClick={onObservationClick}
                        className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-br from-amber-50 to-yellow-100 hover:from-amber-100 hover:to-yellow-200 text-amber-800 font-semibold rounded-2xl shadow-sm border border-amber-200/50 transition-all active:scale-95"
                    >
                        <Cat className="w-5 h-5 text-amber-600" />
                        <span>様子</span>
                    </button>
                </motion.div>

                {/* Pickup Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <CheckSection />
                </motion.div>

                {/* Activity Feed */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <ActivityFeed />
                </motion.div>
            </div>
        </div>
    );
}
