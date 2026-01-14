"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronDown, MessageCircle, Grid3X3, Camera, Zap, Cat } from "lucide-react";
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
    onOpenCalendar: () => void;
}

export function LayoutIslandNeo({
    onOpenPickup,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenIncident,
    onOpenIncidentDetail,
    onOpenActionMenu,
    onOpenCalendar
}: LayoutIslandNeoProps) {
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [showCareList, setShowCareList] = React.useState(false);

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
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(64px) saturate(3)',
        boxShadow: '0 12px 48px -8px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 2px 0 0 rgba(255, 255, 255, 0.1)'
    };

    // Style for passing to UnifiedCareList to match Island aesthetic
    const expandedListStyle = {
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(40px) saturate(1.6)',
        boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
        marginTop: '12px',
        borderRadius: '28px'
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
                    footprints={stats.householdTotal}
                    onOpenPhoto={onOpenPhoto}
                    onOpenIncident={onOpenIncident}
                    onOpenCalendar={onOpenCalendar}
                    onOpenExchange={onOpenExchange}
                />

                {/* Notifications Overlay (From Top) */}
                <AnimatePresence>
                    {showNotifications && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-[calc(100vw-48px)] max-w-sm mt-3"
                        >
                            <UnifiedCareList
                                alertItems={alertItems}
                                careItems={[]}
                                onOpenPickup={onOpenPickup}
                                onOpenIncident={onOpenIncident}
                                onOpenIncidentDetail={onOpenIncidentDetail}
                                onOpenPhoto={onOpenPhoto}
                                addCareLog={addCareLog}
                                activeCatId={activeCatId}
                                awardForCare={awardForCare}
                                markPhotosAsSeen={markPhotosAsSeen}
                                initialTab="notifications"
                                contrastMode="dark"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Care List Overlay (From Bottom) */}
            <AnimatePresence>
                {showCareList && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[100] w-[calc(100%-48px)] max-w-sm pointer-events-auto"
                    >
                        <UnifiedCareList
                            alertItems={[]}
                            careItems={careItems}
                            onOpenPickup={onOpenPickup}
                            onOpenIncident={onOpenIncident}
                            onOpenIncidentDetail={onOpenIncidentDetail}
                            onOpenPhoto={onOpenPhoto}
                            addCareLog={addCareLog}
                            activeCatId={activeCatId}
                            awardForCare={awardForCare}
                            markPhotosAsSeen={markPhotosAsSeen}
                            initialTab="care"
                            contrastMode="dark"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Center: Floating Dock */}
            <motion.div
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                <div
                    className="flex items-center gap-8 px-8 py-3.5 rounded-[32px] shadow-2xl"
                    style={glassStyle}
                >
                    {isV2 ? (
                        <>
                            {/* v2 Optimized: 3 Actions */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    setShowCareList(!showCareList);
                                    if (showNotifications) setShowNotifications(false);
                                }}
                                className="flex flex-col items-center gap-1.5 group"
                            >
                                <Cat className="w-6 h-6 text-white group-hover:text-white/80 transition-colors drop-shadow-md" />
                                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md">onegai</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    onOpenActionMenu();
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-950/20 hover:bg-slate-950/30 border border-white/20 backdrop-blur-xl transition-all shadow-xl"
                            >
                                <span className="text-white text-xl font-bold drop-shadow-sm">＋</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('light');
                                    onOpenMenu();
                                }}
                                className="flex flex-col items-center gap-1.5 group"
                            >
                                <Grid3X3 className="w-6 h-6 text-white group-hover:text-white/80 transition-colors drop-shadow-md" />
                                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md">menu</span>
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
                                    setShowCareList(!showCareList);
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
                {(showNotifications || showCareList) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 pointer-events-auto"
                        onClick={() => { setShowNotifications(false); setShowCareList(false); }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
