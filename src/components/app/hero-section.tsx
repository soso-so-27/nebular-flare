"use client";

import React from "react";
import { useAppState } from "@/store/app-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function HeroSection() {
    const { cats, activeCatId, setActiveCatId } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    // Calculate days together
    const daysTogetherCount = React.useMemo(() => {
        if (!activeCat?.birthday) return null;
        const startDate = new Date(activeCat.birthday);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
    }, [activeCat?.birthday]);

    // Get greeting based on time
    const greeting = React.useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "おはよう";
        if (hour < 18) return "こんにちは";
        return "こんばんは";
    }, []);

    // Navigate between cats
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-100 to-amber-50 shadow-sm"
        >
            {/* Cat Photo */}
            <div className="relative aspect-[16/9] overflow-hidden">
                {activeCat.avatar ? (
                    <img
                        src={activeCat.avatar}
                        alt={activeCat.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-200 to-amber-100 flex items-center justify-center">
                        <span className="text-6xl">🐱</span>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <p className="text-sm opacity-90">{greeting}、</p>
                    <h2 className="text-2xl font-bold">{activeCat.name}！</h2>
                    {daysTogetherCount && (
                        <p className="text-sm opacity-80 mt-1">
                            一緒に {daysTogetherCount}日目 🧡
                        </p>
                    )}
                </div>

                {/* Navigation arrows (if multiple cats) */}
                {cats.length > 1 && (
                    <>
                        <button
                            onClick={goToPrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center hover:bg-white/50 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <button
                            onClick={goToNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center hover:bg-white/50 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </>
                )}
            </div>

            {/* Dot indicators */}
            {cats.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {cats.map((cat, index) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCatId(cat.id)}
                            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                    ? "bg-white w-4"
                                    : "bg-white/50 hover:bg-white/70"
                                }`}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
