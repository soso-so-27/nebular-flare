"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronDown, MessageCircle, Grid3X3, Camera, Zap } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { UnifiedCareList, useCareData } from "./unified-care-list";
import { useFootprintContext } from "@/providers/footprint-provider";
import { IntegratedNotificationPill } from "./integrated-notification-pill";
import { triggerFeedback } from "@/lib/haptics";

interface LayoutIslandNeoProps {
    progress?: number;
    onOpenPickup: () => void;
    onOpenGallery: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
    onOpenIncident: () => void;
    onOpenIncidentDetail: (id: string) => void;
    onOpenActionMenu: () => void;
}

export function LayoutIslandNeo({
    onOpenPickup,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenIncident,
    onOpenIncidentDetail,
    onOpenActionMenu
}: LayoutIslandNeoProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [initialTab, setInitialTab] = React.useState<'care' | 'notifications'>('notifications');

    const { cats, settings } = useAppState();
    const { stats } = useFootprintContext();
    const {
        progress,
        careItems,
        alertItems,
        addCareLog,
        activeCatId,
        awardForCare,
        markPhotosAsSeen
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

    const isV2 = settings.layoutType.startsWith('v2-');

    return (
        <>
            {/* Top Center: Status Pill / Notification Pill */}
            <motion.div
                className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <IntegratedNotificationPill
                    progress={progress}
                    alertItems={alertItems}
                    isExpanded={isExpanded}
                    footprints={stats.householdTotal}
                    onToggle={() => {
                        triggerFeedback('medium');
                        setInitialTab('notifications');
                        setIsExpanded(!isExpanded);
                    }}
                    onFootprintClick={onOpenExchange}
                />

                {/* Care List placement moved to modal overlay for Neo layouts */}
            </motion.div>

            {/* Care List Overlay (Centered Modal) */}
            <AnimatePresence>
                {isExpanded && (
                    <div className="fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-[100] w-[calc(100%-48px)] max-w-sm pointer-events-auto">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h2 className="text-white font-bold text-lg drop-shadow-md">いたわる</h2>
                            <button
                                onClick={() => {
                                    triggerFeedback('light');
                                    setIsExpanded(false);
                                }}
                                className="bg-white/20 p-2 rounded-full backdrop-blur-md"
                            >
                                <ChevronDown className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <UnifiedCareList
                            alertItems={alertItems}
                            careItems={careItems}
                            onOpenPickup={onOpenPickup}
                            onOpenIncident={onOpenIncident}
                            onOpenIncidentDetail={onOpenIncidentDetail}
                            onOpenPhoto={onOpenPhoto}
                            addCareLog={addCareLog}
                            activeCatId={activeCatId}
                            awardForCare={awardForCare}
                            markPhotosAsSeen={markPhotosAsSeen}
                            initialTab={initialTab}
                            contrastMode="dark"
                        />
                    </div>
                )}
            </AnimatePresence>

            {/* Bottom Center: Floating Dock */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                <div
                    className="flex items-center gap-6 px-6 py-3 rounded-full shadow-2xl"
                    style={glassStyle}
                >
                    {isV2 ? (
                        <>
                            {/* v2 Optimized: 3 Actions */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    setInitialTab('care');
                                    setIsExpanded(!isExpanded);
                                }}
                                className="flex flex-col items-center gap-0.5"
                            >
                                <Heart className="w-6 h-6" style={{ color: 'var(--peach)' }} />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">care</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    onOpenActionMenu();
                                }}
                                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                                style={{ background: 'var(--peach)' }}
                            >
                                <span className="text-white text-xl font-bold">＋</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('light');
                                    onOpenMenu();
                                }}
                                className="flex flex-col items-center gap-0.5"
                            >
                                <Grid3X3 className="w-6 h-6 text-slate-600" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">menu</span>
                            </motion.button>
                        </>
                    ) : (
                        <>
                            {/* v1 Legacy: 5 Icons */}
                            <motion.button whileTap={{ scale: 0.9 }} onClick={onOpenPickup} className="p-2">
                                <MessageCircle className="w-6 h-6 text-slate-400" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={onOpenIncident} className="p-2 relative">
                                <Zap className="w-6 h-6 text-slate-400" />
                                {alertItems.length > 0 && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400 ring-2 ring-white" />
                                )}
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    setInitialTab('care');
                                    setIsExpanded(!isExpanded);
                                }}
                                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                                style={{ background: 'var(--peach)' }}
                            >
                                <Heart className="w-6 h-6 text-white" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={onOpenPhoto} className="p-2">
                                <Camera className="w-6 h-6 text-slate-400" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={onOpenMenu} className="p-2">
                                <Grid3X3 className="w-6 h-6 text-slate-400" />
                            </motion.button>
                        </>
                    )}
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
