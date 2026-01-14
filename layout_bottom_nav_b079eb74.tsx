"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Camera, Grid3X3 } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { UnifiedCareList, useCareData } from "./unified-care-list";
import { useFootprintContext } from "@/providers/footprint-provider";

interface LayoutBottomNavProps {
    progress?: number;
    onOpenPickup: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
    onOpenIncident: () => void;
    onOpenIncidentDetail: (id: string) => void;
}

export function LayoutBottomNav({
    progress: _inputProgress = 0,
    onOpenPickup,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenIncident,
    onOpenIncidentDetail
}: LayoutBottomNavProps) {
    const { stats } = useFootprintContext();
    const [isExpanded, setIsExpanded] = useState(false);

    // Use Centralized Data Hook
    const {
        progress,
        careItems,
        alertItems,
        addCareLog,
        activeCatId,
        awardForCare
    } = useCareData();

    const ENABLE_INTEGRATED_PICKUP = true;

    const pillStyle = {
        background: 'rgba(250, 249, 247, 0.45)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.85)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        boxShadow: '0 -4px 32px -4px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)'
    };

    return (
        <>
            {/* Top Left: Care Progress Button - Toggles inline care list */}
            <motion.div
                className="absolute top-[2.5rem] left-6 z-50 pointer-events-auto flex flex-col items-start"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="relative z-50">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full relative z-50"
                        style={pillStyle}
                    >
                        {/* Alert Badge */}
                        {ENABLE_INTEGRATED_PICKUP && alertItems.length > 0 && (
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#E8B4A0] ring-2 ring-white animate-pulse" />
                        )}

                        <Heart className="w-5 h-5" style={{ color: 'var(--peach)' }} />
                        <span className="text-sm font-bold text-slate-600 tabular-nums">
                            {Math.round(progress * 100)}%
                        </span>
                        <div className="h-2 w-16 bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: '#E8B4A0' }}
                                animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                            />
                        </div>
                    </motion.button>
                </div>

                {/* Unified Inline Care List */}
                <AnimatePresence>
                    {isExpanded && (
                        <UnifiedCareList
                            alertItems={alertItems}
                            careItems={careItems}
                            onOpenPickup={onOpenPickup} // Full list
                            onOpenIncident={onOpenIncident}
                            onOpenIncidentDetail={onOpenIncidentDetail}
                            onOpenPhoto={onOpenPhoto}
                            addCareLog={addCareLog}
                            activeCatId={activeCatId}
                            awardForCare={awardForCare}
                        />
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Bottom Navigation Bar - All buttons equally styled */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto pb-safe"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div
                    className="mx-4 mb-4 rounded-2xl px-4 py-3"
                    style={glassStyle}
                >
                    <div className="flex items-center justify-around">
                        {/* Pickup (Heart) - Only show if integration is DISABLED */}
                        {!ENABLE_INTEGRATED_PICKUP && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onOpenPickup}
                                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                            >
                                <Heart className="w-6 h-6" style={{ color: 'var(--peach)' }} />
                                <span className="text-[10px] text-slate-500">ピックアチE�E</span>
                            </motion.button>
                        )}

                        {/* Footprints / Exchange - FIRST */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenExchange}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <div className="relative">
                                <span className="text-xl">🐾</span>
                                <div className="absolute -top-1 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--peach)' }}>
                                    {stats.householdTotal}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-500">足あと</span>
                        </motion.button>

                        {/* Photo Button (Camera) - SECOND */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPhoto}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <Camera className="w-6 h-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">今日の一极E/span>
                        </motion.button>

                        {/* Menu - THIRD */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenMenu}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <Grid3X3 className="w-6 h-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">メニュー</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Backdrop for outside click to close */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 pointer-events-auto"
                        onClick={() => setIsExpanded(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
