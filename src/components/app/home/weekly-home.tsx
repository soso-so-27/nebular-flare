"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCatContext } from "@/store/app-store";
import {
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    format,
    eachDayOfInterval
} from "date-fns";
import { WeeklyGrid } from "./weekly-grid";
import { DayDetailView } from "./day-detail-view";
import { cn } from "@/lib/utils";
import { WeeklyFeedCarousel } from "./weekly-feed-carousel";

interface WeeklyHomeProps {
    onOpenSidebar?: () => void;
    onOpenNewEvent?: () => void;
    onNavigate?: (tab: string) => void;
    onToggleView?: () => void; // Toggle to Immersive Home
}

// Layout constants - アンカーポイント
const HEADER_BAR_HEIGHT = 44;
const FAB_HEIGHT = 56;
const FAB_BOTTOM_PADDING = 12;
const BENTO_TOP_GAP = 12;    // HeaderBottom + 12px
const BENTO_BOTTOM_GAP = 16; // FABTop - 16px (Adjusted for breathing room)
const MARGIN = 16;           // 左右マージン
const GUTTER = 6;            // ガター

export function WeeklyHome({
    onOpenSidebar,
    onOpenNewEvent,
    onNavigate,
    onToggleView
}: WeeklyHomeProps) {
    const { cats } = useCatContext();

    // State
    const [currentWeekStart, setCurrentWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);

    // Screen dimensions
    const [screenWidth, setScreenWidth] = useState(375);
    const [screenHeight, setScreenHeight] = useState(812);
    const [safeAreaTop, setSafeAreaTop] = useState(47);
    const [safeAreaBottom, setSafeAreaBottom] = useState(34);

    useEffect(() => {
        const updateDimensions = () => {
            setScreenWidth(window.innerWidth);
            setScreenHeight(window.innerHeight);

            const isNotched = window.innerHeight >= 812 && window.innerWidth <= 430;
            setSafeAreaTop(isNotched ? 47 : 20);
            setSafeAreaBottom(isNotched ? 34 : 0);
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Bento寸法計算 - アンカーベース
    const layoutData = useMemo(() => {
        const safeH = screenHeight - safeAreaTop - safeAreaBottom;
        const contentWidth = screenWidth - MARGIN * 2;

        // アンカーポイントからBento高さを算出
        const headerBottom = safeAreaTop + HEADER_BAR_HEIGHT;
        const fabTop = screenHeight - safeAreaBottom - FAB_BOTTOM_PADDING - FAB_HEIGHT;
        const bentoTop = headerBottom + BENTO_TOP_GAP;
        const bentoBottom = fabTop - BENTO_BOTTOM_GAP;
        const bentoH = bentoBottom - bentoTop;

        return {
            safeH,
            bentoH,
            bentoTop,
            contentWidth,
            screenWidth,
            gutter: GUTTER,
            margin: MARGIN
        };
    }, [screenWidth, screenHeight, safeAreaTop, safeAreaBottom]);

    // Computed week data
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

    // Handlers
    const handlePrevWeek = useCallback(() => {
        setCurrentWeekStart(prev => subWeeks(prev, 1));
    }, []);

    const handleNextWeek = useCallback(() => {
        setCurrentWeekStart(prev => addWeeks(prev, 1));
    }, []);

    const handleDaySelect = useCallback((day: Date) => {
        setSelectedDay(day);
    }, []);

    const handleBackToGrid = useCallback(() => {
        setSelectedDay(null);
    }, []);

    return (
        <div
            className="flex flex-col text-white"
            style={{
                background: '#0A0A0B',
                height: screenHeight,
                overflow: 'hidden'
            }}
        >
            {/* Safe Area Top Spacer */}
            <div style={{ height: safeAreaTop, flexShrink: 0, background: '#0A0A0B' }} />

            {/* Header Bar - 詳細表示時は非表示 */}
            {!selectedDay && (
                <header
                    className="flex items-center justify-between shrink-0"
                    style={{
                        height: HEADER_BAR_HEIGHT,
                        paddingLeft: 16,
                        paddingRight: 16,
                        background: '#0A0A0B'
                    }}
                >
                    <button
                        onClick={onOpenSidebar}
                        className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Menu className="w-6 h-6 text-white/70" />
                    </button>

                    <span className="text-sm font-medium text-white/80">
                        {weekRangeLabel}
                    </span>

                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevWeek} className="p-1.5 rounded-full hover:bg-white/10">
                            <ChevronLeft className="w-5 h-5 text-white/70" />
                        </button>
                        <button onClick={handleNextWeek} className="p-1.5 rounded-full hover:bg-white/10">
                            <ChevronRight className="w-5 h-5 text-white/70" />
                        </button>
                        {onToggleView && (
                            <button
                                onClick={onToggleView}
                                className="p-1.5 rounded-full hover:bg-white/10 ml-1"
                                title="旧ホームに切替"
                            >
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </button>
                        )}
                    </div>
                </header>
            )}

            {/* Main Content Area - Fixed height, no outer scroll */}
            <div className="flex-1 flex flex-col min-h-0 relative px-0 overflow-hidden">
                {/* Bento Area - Use flex-1 when DayDetailView is shown to allow scrolling */}
                <div
                    className={cn("relative transition-all duration-300", selectedDay ? "flex-1" : "shrink-0")}
                    style={{ position: 'relative' }}
                >
                    <AnimatePresence mode="wait">
                        {selectedDay ? (
                            <motion.div
                                key="detail"
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
                                key="grid"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            >
                                <WeeklyGrid
                                    weekDays={weekDays}
                                    selectedCatIds={selectedCatIds}
                                    onDaySelect={handleDaySelect}
                                    layoutData={layoutData}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Horizontal Feed Carousel - Place with comfortable gap below Bento grid */}
                {!selectedDay && (
                    <div className="flex-1 flex flex-col justify-start pt-4 min-h-0">
                        <WeeklyFeedCarousel screenWidth={screenWidth} />
                    </div>
                )}
            </div>

            {/* Fixed FAB Area - Pattern 1: Side FAB (Right Corner) */}
            {!selectedDay && (
                <div
                    className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none overflow-hidden"
                    style={{ height: FAB_HEIGHT + FAB_BOTTOM_PADDING + safeAreaBottom + 40 }}
                >
                    {/* Minimal corner protection if needed, or none for 100% clarity */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0A0A0B]/80 to-transparent pointer-events-none" />

                    <div className="relative w-full h-full flex items-center">
                        <div className="absolute left-6 pointer-events-auto" style={{ bottom: 20 + safeAreaBottom }}>
                            <button
                                onClick={() => onNavigate?.('home')}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-lg"
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}
                            >
                                N
                            </button>
                        </div>

                        <button
                            onClick={onOpenNewEvent}
                            className="absolute right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl pointer-events-auto"
                            style={{
                                background: 'linear-gradient(135deg, #52525b 0%, #3f3f46 100%)',
                                bottom: 12 + safeAreaBottom,
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
