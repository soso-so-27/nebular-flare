"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    format,
    addWeeks,
    subWeeks,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval
} from "date-fns";
import {
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Menu
} from "lucide-react";
import { WeeklyGrid } from "./weekly-grid";
import { DayDetailView } from "./day-detail-view";
import { WeeklyFeedCarousel } from "./weekly-feed-carousel";
// HomeBackground はコンテキストプロップスが必要なため、WeeklyHomeでは使用しない

// UI Layout Constants
const HEADER_BAR_HEIGHT = 56;
const BENTO_TOP_GAP = 16;
const BENTO_BOTTOM_GAP = 16;
const CAROUSEL_AREA_HEIGHT = 160;
const FAB_HEIGHT = 56;
const FAB_BOTTOM_PADDING = 12;
const HAIRLINE = 1;
const MARGIN = 16;
const GUTTER = 1;

interface WeeklyHomeProps {
    onOpenSidebar: () => void;
    onOpenNewEvent: () => void;
    onNavigate?: (id: string) => void;
    onToggleView?: () => void;
    selectedCatIds: string[];
}

export function WeeklyHome({
    onOpenSidebar,
    onOpenNewEvent,
    onNavigate,
    onToggleView,
    selectedCatIds
}: WeeklyHomeProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [screenWidth, setScreenWidth] = useState(0);
    const [screenHeight, setScreenHeight] = useState(0);
    const [safeAreaTop, setSafeAreaTop] = useState(0);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);

    // Initial measurement
    useEffect(() => {
        const updateDimensions = () => {
            setScreenWidth(window.innerWidth);
            setScreenHeight(window.innerHeight);
            // safeAreaTop/Bottom は CSS 側で設定されている前提、あるいはここでは0とする(後で計算に含める)
            const root = document.documentElement;
            const sat = parseFloat(getComputedStyle(root).getPropertyValue('--sat') || '0');
            const sab = parseFloat(getComputedStyle(root).getPropertyValue('--sab') || '0');
            setSafeAreaTop(sat);
            setSafeAreaBottom(sab);
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Bento寸法計算 - 物理画素スナップ (Integer Pixel Snap)
    const layoutData = useMemo(() => {
        // 全ての入力を整数に丸める
        const sTop = Math.floor(safeAreaTop);
        const sBottom = Math.floor(safeAreaBottom);
        const sWidth = Math.floor(screenWidth);
        const sHeight = Math.floor(screenHeight);

        // 1. 幅の決定
        const availableW = sWidth - MARGIN * 2;
        const unitW = Math.floor((availableW - 4 * HAIRLINE) / 3);
        const contentWidth = unitW * 3 + 4 * HAIRLINE;
        const xOffset = Math.floor((sWidth - contentWidth) / 2);

        // 2. 高さの決定
        const headerBottomY = sTop + HEADER_BAR_HEIGHT;
        const bentoTopY = headerBottomY + BENTO_TOP_GAP;

        const fabTopY = sHeight - sBottom - FAB_BOTTOM_PADDING - FAB_HEIGHT;
        const totalGridAvailableH = fabTopY - bentoTopY - CAROUSEL_AREA_HEIGHT - BENTO_BOTTOM_GAP;

        const unitH = Math.floor((totalGridAvailableH - 5 * HAIRLINE) / 4);
        const bentoH = unitH * 4 + 5 * HAIRLINE;

        return {
            bentoH,
            bentoTop: bentoTopY,
            contentWidth,
            screenWidth: sWidth,
            unitW,
            unitH,
            xOffset,
        };
    }, [screenWidth, screenHeight, safeAreaTop, safeAreaBottom]);

    const weekDays = useMemo(() => {
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
    }, [currentWeekStart]);

    const weekRangeLabel = useMemo(() => {
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        const startStr = format(currentWeekStart, "MMM d");
        const endStr = format(weekEnd, "d");
        return `${startStr} – ${endStr}`;
    }, [currentWeekStart]);

    const handlePrevWeek = useCallback(() => setCurrentWeekStart(prev => subWeeks(prev, 1)), []);
    const handleNextWeek = useCallback(() => setCurrentWeekStart(prev => addWeeks(prev, 1)), []);
    const handleDaySelect = useCallback((day: Date) => setSelectedDay(day), []);
    const handleBackToGrid = useCallback(() => setSelectedDay(null), []);

    return (
        <div className="fixed inset-0 bg-[#0A0A0B] overflow-hidden select-none">

            {/* Header Area - Perfectly Integer Positioned */}
            {!selectedDay && (
                <header
                    style={{
                        position: 'absolute',
                        top: Math.floor(safeAreaTop),
                        left: 0,
                        right: 0,
                        height: HEADER_BAR_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        zIndex: 30
                    }}
                >
                    <button onClick={onOpenSidebar} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <Menu className="w-6 h-6 text-white/70" />
                    </button>
                    <span className="text-white/80 font-medium">{weekRangeLabel}</span>
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevWeek} className="p-1.5 rounded-full hover:bg-white/10">
                            <ChevronLeft className="w-5 h-5 text-white/70" />
                        </button>
                        <button onClick={handleNextWeek} className="p-1.5 rounded-full hover:bg-white/10">
                            <ChevronRight className="w-5 h-5 text-white/70" />
                        </button>
                        {onToggleView && (
                            <button onClick={onToggleView} className="p-1.5 rounded-full hover:bg-white/10 ml-1">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </button>
                        )}
                    </div>
                </header>
            )}

            {/* Content Layer */}
            <AnimatePresence mode="wait">
                {selectedDay ? (
                    <motion.div
                        key="detail"
                        className="absolute inset-0 z-40 bg-[#0A0A0B]"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <DayDetailView
                            day={selectedDay}
                            selectedCatIds={selectedCatIds}
                            onBack={handleBackToGrid}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="grid-layer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0"
                    >
                        <WeeklyGrid
                            weekDays={weekDays}
                            selectedCatIds={selectedCatIds}
                            onDaySelect={handleDaySelect}
                            layoutData={layoutData}
                        />

                        {/* Carousel Layer - Positioned exactly relative to grid */}
                        <div
                            style={{
                                position: 'absolute',
                                top: layoutData.bentoTop + layoutData.bentoH + 16,
                                width: '100%',
                                height: CAROUSEL_AREA_HEIGHT,
                            }}
                        >
                            <WeeklyFeedCarousel screenWidth={screenWidth} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB Area */}
            {!selectedDay && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: Math.floor(safeAreaBottom) + FAB_BOTTOM_PADDING,
                        right: 16,
                        zIndex: 50,
                    }}
                >
                    <button
                        onClick={onOpenNewEvent}
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
                        style={{
                            background: 'linear-gradient(135deg, #52525b 0%, #3f3f46 100%)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
