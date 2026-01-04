"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Calendar, Cat, X, Plus, Heart, Menu, Check } from "lucide-react";
import { getCatchUpItems } from "@/lib/utils-catchup";
import { getToday } from "@/lib/date-utils";
import { toast } from "sonner";

interface MagicBubbleProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenCare: () => void;
    onOpenActivity: () => void;
    contrastMode: 'light' | 'dark';
}

export function MagicBubble({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenCare, onOpenActivity, contrastMode }: MagicBubbleProps) {
    const [expandedSection, setExpandedSection] = useState<'care' | 'observation' | null>(null);
    const { careLogs, careTaskDefs, activeCatId, cats, catsLoading, noticeDefs, observations, settings, addCareLog, addObservation, inventory, noticeLogs } = useAppState();

    const isLight = contrastMode === 'light';



    // --- Improved Care Calculation (Ported from SidebarMenu) ---
    const { dayStartHour } = settings;

    // Calculate "today" based on custom day start time (Consistent with other components)
    const todayStr = useMemo(() => {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < dayStartHour) {
            now.setDate(now.getDate() - 1);
        }
        return now.toISOString().split('T')[0];
    }, [dayStartHour]);

    // Helper for slot labels
    const getSlotLabel = (slot: string) => {
        switch (slot) {
            case 'morning': return '朝';
            case 'noon': return '昼';
            case 'evening': return '夕';
            case 'night': return '夜';
            default: return '';
        }
    };

    const careItems = useMemo(() => {
        if (!careTaskDefs) return [];
        return careTaskDefs
            .filter(def => def.enabled !== false)
            .flatMap(def => {
                const isTarget = !def.perCat || (def.targetCatIds?.includes(activeCatId) ?? true);
                if (!isTarget) return [];

                const shouldSplit = def.mealSlots && def.mealSlots.length > 0 &&
                    (def.frequency === 'twice-daily' || def.frequency === 'three-times-daily' || def.frequency === 'four-times-daily');
                const slots = shouldSplit ? (def.mealSlots || []) : [null];

                return slots.map(slot => {
                    const type = slot ? `${def.id}:${slot}` : def.id;
                    const label = slot ? `${def.title}（${getSlotLabel(slot)}）` : def.title;

                    const taskLogs = careLogs.filter(log => log.type === type);
                    let isDone = false;

                    // More robust check logic matching SidebarMenu
                    if (taskLogs.length > 0) {
                        const sortedLogs = [...taskLogs].sort((a, b) =>
                            new Date(b.done_at).getTime() - new Date(a.done_at).getTime()
                        );
                        const lastLog = sortedLogs[0];
                        const adjustedLogDate = new Date(lastLog.done_at);
                        adjustedLogDate.setHours(adjustedLogDate.getHours() - dayStartHour);
                        const logDateStr = adjustedLogDate.toISOString().split('T')[0];
                        isDone = logDateStr === todayStr;
                    }

                    return {
                        id: type, // Unique ID for key
                        defId: def.id,
                        label,
                        // icon: def.icon, // We render icon manually or import getIcon? Let's just use checkmark for now or simplistic logic
                        perCat: def.perCat,
                        done: isDone
                    };
                });
            });
    }, [careTaskDefs, careLogs, todayStr, dayStartHour, activeCatId]);

    const careCompletedCount = careItems.filter(c => c.done).length;
    const careTotalCount = careItems.length;
    const progress = careTotalCount > 0 ? careCompletedCount / careTotalCount : 1;

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

    // Calculate Pickup Items
    const pickupData = useMemo(() => getCatchUpItems({
        tasks: [], // tasks not in app-store
        noticeLogs: noticeLogs || {},
        inventory: inventory || [],
        lastSeenAt: "1970-01-01", // Show all relevant
        settings,
        cats,
        careTaskDefs,
        careLogs,
        noticeDefs,
        today: todayStr,
        observations
    }), [noticeLogs, inventory, settings, cats, careTaskDefs, careLogs, noticeDefs, todayStr, observations]);

    const activeCount = catsLoading ? 0 : pickupData.items.length;

    // Progress Ring Logic
    const radius = 22; // Smaller for the side indicator
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress * circumference);

    // Get Active Cat for Avatar
    const activeCat = cats.find(c => c.id === activeCatId);

    // Dynamic Styles based on Contrast Mode
    const styles = {
        text: isLight ? 'text-zinc-900 drop-shadow-sm' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
        textSub: isLight ? 'text-zinc-600' : 'text-white/70',
        ringTrack: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
        careColor: isLight ? (progress >= 1 ? '#059669' : '#d97706') : (progress >= 1 ? '#10b981' : '#fbbf24'),
        obsColor: isLight ? (observationProgress.progress >= 1 ? '#059669' : '#0284c7') : (observationProgress.progress >= 1 ? '#10b981' : '#38bdf8'),
        iconFill: isLight ? 'fill-zinc-900' : 'fill-white',
        iconStroke: isLight ? 'text-zinc-900' : 'text-white',
        glassBg: isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10',
        glassHover: isLight ? 'hover:bg-black/10' : 'hover:bg-white/10',
        buttonBg: isLight ? 'bg-white/40' : 'bg-white/20',
        buttonText: isLight ? 'text-zinc-900' : 'text-white',
    };

    return (
        <>
            {/* 
              === BACKDROP for Expanded HUD === 
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
              === FLOATING HUD SATELLITES (Returned to Top-Left) === 
              Restored to Top-Left for natural dropdown expansion.
            */}
            <div className="absolute top-8 left-6 z-40 flex flex-col gap-6 items-start pointer-events-auto max-h-[85vh] overflow-y-auto no-scrollbar pb-20 pr-4">

                {/* CARE RING */}
                <div className="flex flex-col gap-2">
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSection(expandedSection === 'care' ? null : 'care');
                        }}
                    >
                        {/* Ring Container */}
                        <div className="relative w-10 h-10 transition-transform group-active:scale-95">
                            <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                <circle cx="30" cy="30" r={26} fill="none" stroke={styles.ringTrack} strokeWidth="4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                                <motion.circle
                                    cx="30" cy="30" r={26} fill="none" stroke={styles.careColor} strokeWidth="4" strokeLinecap="round"
                                    initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                    animate={{ strokeDashoffset: (2 * Math.PI * 26) - (progress * (2 * Math.PI * 26)) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                                />
                            </svg>
                            <div className={`absolute inset-0 flex items-center justify-center ${styles.text}`}>
                                <Heart className={`w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${expandedSection === 'care' ? styles.iconFill : ''}`} />
                            </div>
                        </div>

                        {/* Text Data */}
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold tracking-wider ${styles.text}`}>
                                お世話
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-light tracking-tight ${styles.text}`}>
                                    {Math.round(progress * 100)}
                                </span>
                                <span className={`text-xs font-medium ${styles.text}`}>%</span>
                            </div>
                        </div>
                    </div>
                    {/* Expanded Care List - Flows Downwards (Natural Accordion) */}
                    <AnimatePresence>
                        {expandedSection === 'care' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`ml-2 pl-4 border-l-2 ${isLight ? 'border-black/20' : 'border-white/20'} overflow-hidden`}
                            >
                                <div className="py-2 space-y-3 w-[200px]">
                                    {careItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!item.done && addCareLog) {
                                                    await addCareLog(item.id, item.perCat ? activeCatId : undefined);
                                                    toast.success(`${item.label} 完了`);
                                                }
                                            }}
                                            className={`flex items-center gap-3 w-full text-left transition-all ${item.done ? 'opacity-50' : `hover:bg-white/10 rounded-lg p-1 -m-1`}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500 border-emerald-500' : (isLight ? 'border-black/60' : 'border-white/60')}`}>
                                                {item.done && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={`text-sm font-medium truncate ${styles.text}`}>{item.label}</span>
                                        </button>
                                    ))}
                                    <div className="pt-2"><button onClick={onOpenCare} className={`text-xs underline ${styles.textSub}`}>すべて見る & 設定</button></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* OBSERVATION RING */}
                <div className="flex flex-col gap-2">
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setExpandedSection(expandedSection === 'observation' ? null : 'observation')}
                    >
                        {/* Ring Container */}
                        <div className="relative w-10 h-10 transition-transform group-active:scale-95">
                            <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                <circle cx="30" cy="30" r={26} fill="none" stroke={styles.ringTrack} strokeWidth="4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                                <motion.circle
                                    cx="30" cy="30" r={26} fill="none" stroke={styles.obsColor} strokeWidth="4" strokeLinecap="round"
                                    initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                    animate={{ strokeDashoffset: (2 * Math.PI * 26) - (observationProgress.progress * (2 * Math.PI * 26)) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                                />
                            </svg>
                            <div className={`absolute inset-0 flex items-center justify-center ${styles.text}`}>
                                <Cat className={`w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${expandedSection === 'observation' ? styles.iconFill : ''}`} />
                            </div>
                        </div>

                        {/* Text Data */}
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold tracking-wider ${styles.text}`}>
                                猫の様子
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-light tracking-tight ${styles.text}`}>
                                    {Math.round(observationProgress.progress * 100)}
                                </span>
                                <span className={`text-xs font-medium ${styles.text}`}>%</span>
                            </div>
                        </div>
                    </div>
                    {/* Expanded Obs List - Flows Downwards */}
                    <AnimatePresence>
                        {expandedSection === 'observation' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`ml-2 pl-4 border-l-2 ${isLight ? 'border-black/20' : 'border-white/20'} overflow-hidden`}
                            >
                                <div className="py-2 space-y-4 w-[200px]">
                                    {/* Simplified Obs List Reuse */}
                                    {noticeDefs.filter(def => def.enabled !== false && def.kind === 'notice').map(notice => {
                                        const isDone = observations.some(o => o.type === notice.id && o.cat_id === activeCatId);
                                        return (
                                            <div key={notice.id} className="flex flex-col gap-1">
                                                <span className={`text-sm font-medium drop-shadow-md ${styles.text}`}>{notice.title}</span>
                                                {!isDone ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={async (e) => { e.stopPropagation(); if (addObservation) { await addObservation(activeCatId, notice.id, "いつも通り"); toast.success(`${notice.title} 記録完了`); } }} className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border ${styles.buttonBg} ${styles.buttonText} border-white/20 hover:bg-white/30`}>OK</button>
                                                        <button onClick={(e) => { e.stopPropagation(); onOpenActivity?.(); }} className={`px-3 py-1 rounded-full bg-transparent hover:bg-white/10 text-xs border border-white/20 ${styles.textSub}`}>注意</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                                        <Check className="w-3 h-3" />
                                                        <span>記録済み</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    <div className="pt-2"><button onClick={onOpenActivity} className={`text-xs underline ${styles.textSub}`}>詳しく見る</button></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>


            {/* 
              === SOCIAL RIGHT STACK (Right-Edge Actions) === 
              Vertical stack of actions on the right edge, optimized for thumb reach.
            */}
            <div className="fixed right-4 bottom-10 z-50 flex flex-col gap-5 items-center pointer-events-none">

                {/* Pickup Widget (Notification Badge Style) */}
                <div className="pointer-events-auto">
                    <AnimatePresence>
                        {activeCount > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5, x: 20 }}
                                onClick={onOpenPickup}
                                className="relative group"
                            >
                                {/* Main Icon Ring - Double Layer */}
                                <div className={`w-14 h-14 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-2xl transition-all group-active:scale-95 ${styles.glassBg} ${styles.glassHover}`}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-inner ring-2 ring-black/10">
                                        <span className="text-white font-bold text-sm font-sans drop-shadow-md">{activeCount}</span>
                                    </div>
                                </div>

                                {/* Label Tooltip (Left side) */}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                                    <span className="text-xs text-white font-bold tracking-wide">{pickupData.items[0]?.title || 'Pickup'}</span>
                                    {/* Small arrow */}
                                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-black/60 border-t border-r border-white/10 transform rotate-45"></div>
                                </div>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Menu Trigger (Unified Design) */}
                <div className="pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenPickup();
                        }}
                        className={`group relative w-14 h-14 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-2xl transition-all active:scale-95 ${styles.glassBg} ${styles.glassHover}`}
                    >
                        {/* Inner Circle (For stylistic unity with Pickup) */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner transition-colors ${isLight ? 'bg-black/5 group-hover:bg-black/10' : 'bg-white/10 group-hover:bg-white/10'}`}>
                            <LayoutGrid className={`w-5 h-5 drop-shadow-md opacity-90 group-hover:opacity-100 ${styles.iconStroke}`} />
                        </div>
                    </motion.button>
                </div>

            </div>
        </>
    );
}
