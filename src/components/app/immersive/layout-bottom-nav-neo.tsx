"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Grid3X3, Camera, Zap, Bell, ChevronDown } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { UnifiedCareList, useCareData } from "./unified-care-list";
import { useFootprintContext } from "@/providers/footprint-provider";
import { IntegratedNotificationPill } from "./integrated-notification-pill";
import { triggerFeedback } from "@/lib/haptics";

interface LayoutBottomNavNeoProps {
    progress?: number;
    onOpenPickup: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
    onOpenIncident: () => void;
    onOpenIncidentDetail: (id: string) => void;
    onOpenActionMenu: () => void;
}

export function LayoutBottomNavNeo({
    onOpenPickup,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenIncident,
    onOpenIncidentDetail,
    onOpenActionMenu
}: LayoutBottomNavNeoProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [initialTab, setInitialTab] = useState<'care' | 'notifications'>('notifications');

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

    const isV2 = settings.layoutType.startsWith('v2-');

    return (
        <>
            {/* Top Area: Integrated Notification Pill (Neo Standard) */}
            <div className={`fixed top-10 z-50 pointer-events-auto flex flex-col left-1/2 -translate-x-1/2 items-center`}>
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
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
                </motion.div>
            </div>

            {/* Care List Overlay (Centered Modal) */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 -translate-x-1/2 bottom-28 z-[100] w-[calc(100%-48px)] max-w-sm pointer-events-auto"
                    >
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
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Navigation Bar */}
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
                                    className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                                >
                                    <Heart className="w-6 h-6" style={{ color: 'var(--peach)' }} />
                                    <span className="text-[10px] text-slate-500 font-bold">care</span>
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        triggerFeedback('medium');
                                        onOpenActionMenu();
                                    }}
                                    className="flex flex-col items-center justify-center w-14 h-14 rounded-full -mt-8 shadow-lg border-4 border-white"
                                    style={{ background: 'var(--peach)' }}
                                >
                                    <span className="text-white text-2xl font-bold">＋</span>
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        triggerFeedback('light');
                                        onOpenMenu();
                                    }}
                                    className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                                >
                                    <Grid3X3 className="w-6 h-6 text-slate-500" />
                                    <span className="text-[10px] text-slate-500 font-bold">menu</span>
                                </motion.button>
                            </>
                        ) : (
                            <>
                                {/* v1 Legacy: 5 Icons */}
                                <motion.button whileTap={{ scale: 0.9 }} onClick={onOpenPickup} className="p-2">
                                    <Bell className="w-6 h-6 text-slate-400" />
                                </motion.button>
                                <motion.button whileTap={{ scale: 0.9 }} onClick={onOpenIncident} className="p-2 relative">
                                    <Zap className="w-6 h-6 text-slate-400" />
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        setInitialTab('care');
                                        setIsExpanded(!isExpanded);
                                    }}
                                    className="w-14 h-14 rounded-full flex items-center justify-center -mt-8 shadow-lg border-4 border-white"
                                    style={{ background: 'var(--peach)' }}
                                >
                                    <Heart className="w-7 h-7 text-white" />
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
