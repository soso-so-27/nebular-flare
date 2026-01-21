"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronDown, MessageCircle, Grid3X3, Camera, Zap, Cat, BookOpen, LayoutGrid, PawPrint } from "lucide-react";
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

    onOpenCalendar: () => void;
    onOpenNyannlogSheet: (tab?: 'events' | 'requests') => void;
}

export function LayoutIslandNeo({
    onOpenPickup,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenIncident,
    onOpenIncidentDetail,
    onOpenCalendar,
    onOpenNyannlogSheet
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

    const isUnified = settings.homeButtonMode === 'unified';

    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.05)',  /* Even more translucent */
        backdropFilter: 'blur(40px) saturate(2)', /* Softer blur */
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
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
                {/* IntegratedNotificationPill removed as per user request (moved to NyannlogSheet header) */}
                {/* 
                <IntegratedNotificationPill
                    progress={progress}
                    alertItems={alertItems}
                    footprints={stats.householdTotal}
                    onOpenCalendar={onOpenCalendar}
                    onOpenExchange={onOpenExchange}
                    onOpenNyannlog={() => onOpenNyannlogSheet('events')}
                />
                */}

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


            {/* Backdrop for Care List or Notifications */}
            <AnimatePresence>
                {(showCareList || showNotifications) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => { setShowCareList(false); setShowNotifications(false); }}
                    />
                )}
            </AnimatePresence>

            {/* Top Left System Cluster (Unified Pill) */}
            <motion.div
                className="fixed top-12 left-6 z-[100] pointer-events-auto"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            >
                <div
                    className="flex items-center backdrop-blur-xl rounded-full border border-[#E8B4A0]/40 p-1 shadow-lg shadow-[#E8B4A0]/20"
                    style={{
                        background: 'linear-gradient(145deg, rgba(232, 180, 160, 0.25), rgba(232, 180, 160, 0.1))'
                    }}
                >
                    {/* Footprint Badge (Opens Exchange) */}
                    <button
                        onClick={() => {
                            triggerFeedback('light');
                            onOpenExchange();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#E8B4A0]/20 transition-colors active:scale-95"
                    >
                        <PawPrint className="w-3.5 h-3.5 text-white/90" />
                        <span className="text-sm font-bold text-white font-mono tracking-wider">{stats.householdTotal}</span>
                    </button>

                    {/* Divider */}
                    <div className="w-px h-4 bg-[#E8B4A0]/40 mx-0.5" />

                    {/* Menu Button (System) */}
                    <button
                        onClick={() => {
                            triggerFeedback('light');
                            onOpenMenu();
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#E8B4A0]/20 transition-colors active:scale-90"
                    >
                        <LayoutGrid className="w-3.5 h-3.5 text-white/90" strokeWidth={2.5} />
                    </button>
                </div>
            </motion.div>


            {/* Island Dock */}
            <motion.div
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
                {/* Floating Action List (Care Items) */}
                <AnimatePresence>
                    {showCareList && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="absolute bottom-full mb-4 w-80 -left-10 origin-bottom"
                        >
                            <UnifiedCareList
                                alertItems={alertItems}
                                careItems={careItems}
                                onOpenPickup={onOpenPickup}
                                onOpenIncident={onOpenIncident}
                                onOpenPhoto={onOpenPhoto}
                                addCareLog={addCareLog}
                                activeCatId={activeCatId}
                                awardForCare={awardForCare}
                                markPhotosAsSeen={markPhotosAsSeen}
                                initialTab="care"
                                contrastMode="dark"
                                className="!mt-0"
                                style={expandedListStyle}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Dock */}
                <div
                    className="flex items-center gap-8 px-6 py-3 rounded-full relative overflow-hidden backdrop-blur-xl border border-[#E8B4A0]/40 shadow-lg shadow-[#E8B4A0]/20"
                    style={{
                        background: 'linear-gradient(145deg, rgba(232, 180, 160, 0.25), rgba(232, 180, 160, 0.1))'
                    }}
                >
                    {/* Glass Reflection */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                    {isUnified ? (
                        /* Unified Mode: Single Hub Button */
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                triggerFeedback('medium');
                                onOpenNyannlogSheet('events');
                            }}
                            className="w-12 h-12 rounded-[20px] bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors relative group border border-white/10 shadow-sm"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#E8B4A0]/20 to-transparent opacity-50 rounded-[20px]" />
                            <Cat className="w-6 h-6 text-white drop-shadow-sm" />
                            {alertItems.length > 0 && (
                                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#E8B4A0] shadow-[0_0_8px_#E8B4A0] ring-2 ring-[#1E1E23]/20" />
                            )}
                        </motion.button>
                    ) : (
                        /* Separated Mode: Distinct Buttons */
                        <>
                            {/* Heart / Care Button (Input) - Now First */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('light');
                                    onOpenNyannlogSheet('requests');
                                }}
                                className="flex flex-col items-center gap-1 group relative"
                            >
                                <Cat className="w-7 h-7 text-white/90 group-hover:text-white transition-colors filter drop-shadow-sm" strokeWidth={1.5} />
                                {alertItems.length > 0 && (
                                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E8B4A0] shadow-[0_0_8px_#E8B4A0]" />
                                )}
                                <span className="text-[11px] font-bold text-white/70 group-hover:text-white/90 transition-colors">おねがい</span>
                            </motion.button>

                            {/* Book / Events Button (Output) - Now Second */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('light');
                                    onOpenNyannlogSheet('events');
                                }}
                                className="flex flex-col items-center gap-1 group"
                            >
                                <BookOpen className="w-7 h-7 text-white/90 group-hover:text-white transition-colors filter drop-shadow-sm" strokeWidth={1.5} />
                                <span className="text-[11px] font-bold text-white/70 group-hover:text-white/90 transition-colors">できごと</span>
                            </motion.button>
                        </>
                    )}
                </div>
            </motion.div >
        </>
    );
}
