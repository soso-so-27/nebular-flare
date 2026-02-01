"use client";

import React, { useState } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, isToday, addMonths, subMonths, subWeeks, addWeeks } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getFullImageUrl, cn } from "@/lib/utils";

interface DekigotoCalendarProps {
    dailyPhotos: Record<string, string>; // YYYY-MM-DD -> photoUrl
    onSelectDate?: (date: Date) => void;
    selectedDate?: Date;
}

export const DekigotoCalendar = ({ dailyPhotos, onSelectDate, selectedDate = new Date() }: DekigotoCalendarProps) => {
    const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Weekly View Days
    const weeklyDays = eachDayOfInterval({
        start: currentWeek,
        end: endOfWeek(currentWeek, { weekStartsOn: 1 }),
    });

    // Monthly View Days
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const monthlyDays = eachDayOfInterval({ start: startDate, end: endDate });

    const handlePrev = () => {
        if (viewMode === "weekly") setCurrentWeek(subWeeks(currentWeek, 1));
        else setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNext = () => {
        if (viewMode === "weekly") setCurrentWeek(addWeeks(currentWeek, 1));
        else setCurrentMonth(addMonths(currentMonth, 1));
    };

    const toggleView = () => setViewMode(prev => prev === "weekly" ? "monthly" : "weekly");

    return (
        <div className="w-full shrink-0 px-4 pt-2 pb-4">
            {/* Header: Journal Style Month/Year */}
            <div className="flex items-end justify-between mb-4 px-2">
                <button
                    onClick={toggleView}
                    className="flex flex-col items-start group"
                >
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">
                        {format(viewMode === "weekly" ? currentWeek : currentMonth, "yyyy", { locale: ja })}
                    </span>
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-white tracking-widest leading-none">
                            {format(viewMode === "weekly" ? currentWeek : currentMonth, "M月", { locale: ja })}
                        </h2>
                        <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            {viewMode === "weekly" ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronUp className="w-3 h-3 text-white/40" />}
                        </div>
                    </div>
                </button>

                <div className="flex items-center gap-0.5 pb-1">
                    <button onClick={handlePrev} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                        <ChevronLeft className="w-4 h-4 text-white/30" />
                    </button>
                    <button onClick={handleNext} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                        <ChevronRight className="w-4 h-4 text-white/30" />
                    </button>
                </div>
            </div>

            {/* Calendar Body: Floating Scrapbook Style */}
            <motion.div
                layout
                className="grid grid-cols-7 gap-y-4 gap-x-1"
            >
                {/* Weekday Labels (Minimalist) */}
                {["月", "火", "水", "木", "金", "土", "日"].map((day, idx) => (
                    <div
                        key={day}
                        className={cn(
                            "text-center text-[10px] font-black tracking-widest pb-1",
                            idx === 5 ? "text-blue-400/30" : idx === 6 ? "text-rose-400/30" : "text-white/10"
                        )}
                    >
                        {day}
                    </div>
                ))}

                <AnimatePresence mode="popLayout" initial={false}>
                    {(viewMode === "weekly" ? weeklyDays : monthlyDays).map((date, idx) => {
                        const dateKey = format(date, "yyyy-MM-dd");
                        const photoUrl = dailyPhotos[dateKey];
                        const isCurrentMonth = viewMode === "weekly" || date.getMonth() === currentMonth.getMonth();
                        const isTodayDate = isToday(date);
                        const isSelected = isSameDay(date, selectedDate);

                        const colIdx = (idx % 7);

                        return (
                            <motion.button
                                key={dateKey}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => onSelectDate?.(date)}
                                className={cn(
                                    "relative flex flex-col items-center group transition-all duration-300",
                                    !isCurrentMonth && "opacity-10 grayscale pointer-events-none",
                                    isSelected && "z-10"
                                )}
                            >
                                {/* Date Label: Clear & Minimal */}
                                <div className="mb-1 flex flex-col items-center min-h-[16px]">
                                    <span className={cn(
                                        "text-[10px] font-black leading-none transition-colors",
                                        isTodayDate ? "text-brand-peach underline underline-offset-4 decoration-2" : isSelected ? "text-white" : "text-white/20",
                                    )}>
                                        {format(date, "d")}
                                    </span>
                                </div>

                                {/* Photo Slot: Analog Scrapbook Piece */}
                                <div className={cn(
                                    "w-full aspect-square relative transition-all duration-500",
                                    photoUrl
                                        ? "p-0.5 bg-[#FAF9F6] shadow-xl rotate-[1.5deg] group-hover:rotate-0 rounded-[1px]"
                                        : "bg-white/[0.02] rounded-sm flex items-center justify-center",
                                    isSelected && !photoUrl && "bg-white/[0.08]"
                                )}>
                                    {photoUrl ? (
                                        <div className="w-full h-full relative overflow-hidden rounded-[0.5px]">
                                            <img
                                                src={getFullImageUrl(photoUrl)}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                alt=""
                                            />
                                            {/* Masking Tape Effect (Top Label) */}
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white/20 backdrop-blur-[2px] rotate-[-2deg] rounded-sm opacity-60" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Photo Corner Designs */}
                                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/10 rounded-tl-sm" />
                                            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/10 rounded-tr-sm" />
                                            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/10 rounded-bl-sm" />
                                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/10 rounded-br-sm" />

                                            <div className="opacity-0 group-hover:opacity-40 transition-opacity">
                                                <div className="w-2.5 h-[1px] bg-white absolute" />
                                                <div className="h-2.5 w-[1px] bg-white absolute" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
