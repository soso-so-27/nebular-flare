"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronDown, Camera, Grid3X3, AlertCircle } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { UnifiedCareList, useCareData } from "./unified-care-list";
import { useFootprintContext } from "@/providers/footprint-provider";

interface LayoutIslandProps {
    progress?: number;
    onOpenPickup: () => void;
    onOpenGallery: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
    onOpenIncident: () => void;
}

export function LayoutIsland({
    progress: _inputProgress = 0,
    onOpenPickup,
    onOpenGallery,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenIncident,
}: LayoutIslandProps) {
    const { stats } = useFootprintContext();
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Use Centralized Data Hook
    const {
        careItems,
        alertItems,
        progress,
        addCareLog,
        activeCatId,
        awardForCare
    } = useCareData();

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };

    // Style for passing to UnifiedCareList to match Island aesthetic
    const expandedListStyle = {
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        marginTop: '8px'
    };

    const ENABLE_INTEGRATED_PICKUP = true;

    return (
        <>
            {/* Top Center: Status Pill */}
            <motion.div
                className="absolute top-[2.5rem] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <div
                    className="flex items-center gap-0 rounded-full overflow-hidden relative z-50"
                    style={glassStyle}
                >
                    {/* Footprint Points - Tap to open exchange */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenExchange}
                        className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-white/30 transition-colors"
                    >
                        <span className="text-lg">🐾</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--peach)' }}>
                            {stats.householdTotal}
                        </span>
                    </motion.button>

                    {/* Separator */}
                    <div className="w-px h-6 bg-slate-300/50" />

                    {/* Progress - Tap to toggle inline care list */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/30 transition-colors relative"
                    >
                        {/* Alert Badge */}
                        {alertItems.length > 0 && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E8B4A0] ring-2 ring-white/50 animate-pulse" />
                        )}

                        <Heart className="w-4 h-4" style={{ color: 'var(--peach)' }} />
                        <span className="text-sm font-bold text-slate-600 tabular-nums">
                            {Math.round(progress * 100)}%
                        </span>
                        <div className="h-2 w-12 bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'var(--peach)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </motion.div>
                    </motion.button>
                </div>

                {/* Inline Expanded Care List */}
                <AnimatePresence>
                    {isExpanded && (
                        <UnifiedCareList
                            alertItems={alertItems}
                            careItems={careItems}
                            onOpenPickup={onOpenPickup}
                            onOpenIncident={onOpenIncident}
                            onOpenPhoto={onOpenPhoto}
                            addCareLog={addCareLog}
                            activeCatId={activeCatId}
                            awardForCare={awardForCare}
                            style={expandedListStyle}
                        />
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Bottom Center: Floating Dock */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                <div
                    className="flex items-center gap-3 px-4 py-3 rounded-full"
                    style={glassStyle}
                >
                    {/* Pickup Button (Heart) - Only show if integration is DISABLED (which it isn't here, but logic kept for safety) */}
                    {!ENABLE_INTEGRATED_PICKUP && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPickup}
                            className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                        >
                            <Heart className="w-5 h-5" style={{ color: 'var(--peach)' }} />
                        </motion.button>
                    )}

                    {/* Today's Photo Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenPhoto}
                        className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                    >
                        <Camera className="w-5 h-5 text-slate-600" />
                    </motion.button>

                    {/* Menu Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenMenu}
                        className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                    >
                        <Grid3X3 className="w-5 h-5 text-slate-600" />
                    </motion.button>
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
