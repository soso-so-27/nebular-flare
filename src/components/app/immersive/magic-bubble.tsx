"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Calendar, Cat, X, Plus, Heart, Menu, Check } from "lucide-react";
import { BubblePickupList } from "./bubble-pickup-list";

interface MagicBubbleProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenCare: () => void;
    onOpenActivity: () => void;
}

export function MagicBubble({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenCare, onOpenActivity }: MagicBubbleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState<'care' | 'observation' | null>(null);
    const { careLogs, careTaskDefs, activeCatId, cats, noticeDefs, observations, settings, addCareLog, addObservation } = useAppState();

    // Calculate Care Progress
    const remainingItemsCount = useMemo(() => {
        const careRemaining = careTaskDefs.filter(def => {
            return !careLogs.some(l => l.type.startsWith(def.id) && (!def.perCat || l.cat_id === activeCatId));
        }).length;

        return careRemaining;
    }, [careTaskDefs, careLogs, activeCatId]);

    const progress = Math.max(0, Math.min(1, 1 - (remainingItemsCount / 5))); // Assume 5 tasks max for visual scale

    // Calculate Observation Progress (for active cat) - Using persisted observations from Supabase
    const observationProgress = useMemo(() => {
        const enabledNotices = noticeDefs.filter(n => n.enabled !== false && n.kind === 'notice');
        if (enabledNotices.length === 0) return { done: 0, total: 0, progress: 1 };

        // Filter observations for today and active cat
        // observations already filtered by today in useTodayHouseholdObservations hook
        const catObservations = observations.filter(o => o.cat_id === activeCatId);

        let doneCount = 0;
        enabledNotices.forEach(notice => {
            // Check if there's an observation for this notice type
            const hasObservation = catObservations.some(o => o.type === notice.id);
            if (hasObservation) {
                doneCount++;
            }
        });

        const total = enabledNotices.length;
        return {
            done: doneCount,
            total,
            progress: total > 0 ? doneCount / total : 1
        };
    }, [noticeDefs, observations, activeCatId]);

    // Progress Ring Logic
    const radius = 22; // Smaller for the side indicator
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress * circumference);

    const toggleOpen = () => setIsOpen(!isOpen);

    // Get Active Cat for Avatar
    const activeCat = cats.find(c => c.id === activeCatId);

    const menuItems = [
        { icon: Cat, label: "猫", action: onOpenGallery, color: "text-emerald-400", delay: 0 },
        { icon: Calendar, label: "予定", action: onOpenCalendar, color: "text-blue-400", delay: 0.1 },
        { icon: Menu, label: "お世話", action: onOpenCare, color: "text-slate-200", delay: 0.15 },
    ];

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-end justify-center pb-12">
            {/* 
              === HUD STATUS DISPLAY (Top Left) === 
              Moved to Root for correct Top-Left positioning relative to Viewport.
            */}
            {/* 
              === VISIBILITY: Strong Drop Shadows === 
              Switched from gradient to strong shadows to avoid "square box" artifacts.
            */}

            {/* 
              === BACKDROP for Expanded HUD === 
              Appears when a section is expanded to focus attention.
            */}
            <AnimatePresence>
                {expandedSection && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 pointer-events-auto"
                        onClick={() => setExpandedSection(null)}
                    />
                )}
            </AnimatePresence>

            {/* 
              === HUD STATUS DISPLAY (Top Left) === 
              Stacking Care and Observation in a vertical flex container to allow expansion "pushing" elements down.
            */}
            <div className="absolute top-8 left-6 z-40 flex flex-col gap-6 items-start pointer-events-auto max-h-[85vh] overflow-y-auto no-scrollbar pb-20 pr-4">

                {/* === CARE SECTION === */}
                <div className="flex flex-col gap-2">
                    {/* Header / Ring */}
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setExpandedSection(expandedSection === 'care' ? null : 'care')}
                    >
                        {/* Ring Container */}
                        <div className="relative w-10 h-10 transition-transform group-active:scale-95">
                            {/* Background Track */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                <circle
                                    cx="30" cy="30" r={26}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeWidth="4"
                                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
                                />
                                <motion.circle
                                    cx="30" cy="30" r={26}
                                    fill="none"
                                    stroke={progress >= 1 ? "#10b981" : "#fbbf24"}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                    animate={{ strokeDashoffset: (2 * Math.PI * 26) - (progress * (2 * Math.PI * 26)) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                                />
                            </svg>

                            {/* Center Icon */}
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <Heart className={`w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${expandedSection === 'care' ? 'fill-white' : ''}`} />
                            </div>
                        </div>

                        {/* Text Data */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                お世話
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-light text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                    {Math.round(progress * 100)}
                                </span>
                                <span className="text-sm text-white font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Care List */}
                    <AnimatePresence>
                        {expandedSection === 'care' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="ml-2 pl-4 border-l-2 border-white/20 overflow-hidden"
                            >
                                <div className="py-2 space-y-3 w-[200px]">
                                    {careTaskDefs
                                        .filter(def => !def.perCat || (def.targetCatIds && def.targetCatIds.includes(activeCatId)) || !def.targetCatIds)
                                        .map(task => {
                                            const isDone = careLogs.some(l => l.type.startsWith(task.id) && l.cat_id === activeCatId && new Date(l.done_at).toDateString() === new Date().toDateString()); // Simplified check
                                            // Note: Better check requires logic similar to HomeScreen but keeping it simple for "today"

                                            return (
                                                <button
                                                    key={task.id}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!isDone && addCareLog) {
                                                            await addCareLog(task.id, task.perCat ? activeCatId : undefined);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 w-full text-left transition-all ${isDone ? 'opacity-50' : 'hover:bg-white/10 rounded-lg p-1 -m-1'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-white/60'}`}>
                                                        {isDone && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="text-sm text-white shadow-black drop-shadow-md font-medium truncate">
                                                        {task.title}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    <div className="pt-2">
                                        <button
                                            onClick={onOpenCare}
                                            className="text-xs text-white/70 hover:text-white underline"
                                        >
                                            すべて見る & 設定
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* === OBSERVATION SECTION === */}
                <div className="flex flex-col gap-2">
                    {/* Header / Ring */}
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setExpandedSection(expandedSection === 'observation' ? null : 'observation')}
                    >
                        {/* Ring Container */}
                        <div className="relative w-10 h-10 transition-transform group-active:scale-95">
                            {/* Background Track */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                <circle
                                    cx="30" cy="30" r={26}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeWidth="4"
                                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
                                />
                                <motion.circle
                                    cx="30" cy="30" r={26}
                                    fill="none"
                                    stroke={observationProgress.progress >= 1 ? "#10b981" : "#38bdf8"}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                    animate={{ strokeDashoffset: (2 * Math.PI * 26) - (observationProgress.progress * (2 * Math.PI * 26)) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                                />
                            </svg>

                            {/* Center Icon */}
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <Cat className={`w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${expandedSection === 'observation' ? 'fill-white' : ''}`} />
                            </div>
                        </div>

                        {/* Text Data */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                猫の様子
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-light text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                    {Math.round(observationProgress.progress * 100)}
                                </span>
                                <span className="text-sm text-white font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Observation List */}
                    <AnimatePresence>
                        {expandedSection === 'observation' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="ml-2 pl-4 border-l-2 border-white/20 overflow-hidden"
                            >
                                <div className="py-2 space-y-4 w-[200px]">
                                    {noticeDefs
                                        .filter(def => def.enabled !== false && def.kind === 'notice')
                                        .map(notice => {
                                            const obs = observations.find(o => o.type === notice.id && o.cat_id === activeCatId && new Date(o.created_at).toDateString() === new Date().toDateString());

                                            if (obs) return null; // Hide already logged items to reduce clutter? Or show as Done? Let's hide for "Things to do" feel, looks cleaner.

                                            // Actually, showing done items is better for confirmation.
                                            // Re-finding 'obs' without date filter for 'done' check in a robust way is hard here without duplicated logic.
                                            // Let's use the 'observationProgress' logic's knowledge or just simple 'some' check.
                                            // The 'observationProgress' calc used earlier filters by today implicitly via hook often.
                                            // Let's assume 'observations' passed in are relevant ones.

                                            const isDone = observations.some(o => o.type === notice.id && o.cat_id === activeCatId); // Simplified

                                            return (
                                                <div key={notice.id} className="flex flex-col gap-1">
                                                    <span className="text-sm text-white font-medium drop-shadow-md">{notice.title}</span>
                                                    {!isDone ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addObservation && addObservation(activeCatId, notice.id, "いつも通り");
                                                                }}
                                                                className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs text-white font-bold backdrop-blur-md border border-white/20"
                                                            >
                                                                OK
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Open full modal for custom input
                                                                    onOpenActivity?.();
                                                                }}
                                                                className="px-3 py-1 rounded-full bg-transparent hover:bg-white/10 text-xs text-white/80 border border-white/20"
                                                            >
                                                                注意
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                                            <Check className="w-3 h-3" />
                                                            <span>記録済み</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    <div className="pt-2">
                                        <button
                                            onClick={onOpenActivity}
                                            className="text-xs text-white/70 hover:text-white underline"
                                        >
                                            詳しく見る
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>

            <div className="relative flex items-center justify-center pointer-events-auto">

                {/* Expanded Menu Actions */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop to close */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1]"
                                onClick={() => setIsOpen(false)}
                            />

                            {/* Auto-Open Pickup List */}
                            <BubblePickupList onClose={() => setIsOpen(false)} />

                            {/* Menu Row */}
                            <div className="absolute bottom-24 z-50 flex gap-4 items-end justify-center mb-4">
                                {menuItems.map((item, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => {
                                            item.action();
                                            setIsOpen(false);
                                        }}
                                        initial={{ opacity: 0, y: 20, scale: 0.5 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                            transition: { delay: item.delay, type: "spring", stiffness: 300, damping: 20 }
                                        }}
                                        exit={{ opacity: 0, y: 10, scale: 0.5 }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className={`p-4 rounded-full shadow-lg border border-white/20 backdrop-blur-md bg-white/10 hover:bg-white/20 transition-all active:scale-95`}>
                                            <item.icon className={`w-6 h-6 ${item.color} drop-shadow-sm`} />
                                        </div>
                                        <span className="text-white text-[10px] font-bold drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full">
                                            {item.label}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        </>
                    )}
                </AnimatePresence>

                {/* 
                  === SEPARATE PROGRESS INDICATOR === 
                  Positioned to the RIGHT of the main button.
                */}
                {/* 
                  === HUD MOVED TO TOP === 
                */}


                {/* 
                  === MAIN BUTTON (Restored) === 
                  Simple White Orb
                */}
                <div className="relative w-20 h-20 flex items-center justify-center">

                    {/* Glow */}
                    <motion.div
                        className="absolute inset-0 bg-white/20 blur-xl rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    />

                    <motion.button
                        onClick={toggleOpen}
                        whileTap={{ scale: 0.9 }}
                        animate={{
                            scale: isOpen ? 0.9 : 1,
                            rotate: isOpen ? 90 : 0
                        }}
                        className={`
                            relative z-10 w-16 h-16 rounded-full 
                            bg-gradient-to-br from-white/40 to-white/10 
                            backdrop-blur-md border border-white/30 
                            shadow-[0_0_20px_rgba(255,255,255,0.3)]
                            flex items-center justify-center text-white
                            transition-all duration-300
                            ${isOpen ? 'bg-white/20' : 'hover:bg-white/30'}
                        `}
                    >
                        {isOpen ? (
                            <X className="w-8 h-8 stroke-[1.5]" />
                        ) : (
                            // Original Simple Center Dot
                            <div className="w-6 h-6 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
