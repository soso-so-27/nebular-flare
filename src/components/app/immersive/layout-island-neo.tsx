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
            {/* Top Center: Status Pill / Notification Pill - ensure pointer-events-none on parent */}
            <motion.div
                className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}
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

            {/* Top Left System Cluster (Unified Pill) - surgical touch fix */}
            <motion.div
                className="fixed left-6 z-[100] pointer-events-none"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            >
                <div
                    className="flex items-center backdrop-blur-xl rounded-full border border-[#E8B4A0]/40 p-1 shadow-lg shadow-[#E8B4A0]/20 pointer-events-auto"
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
                className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[calc(100%-48px)] max-w-sm"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.2 }}
            >
                {/* Floating Action List (Care Items) */}
                <AnimatePresence>
                    {showCareList && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="absolute bottom-full mb-6 w-80 left-1/2 -translate-x-1/2 z-[60]"
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
                                style={expandedListStyle}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Integrated Island Bar */}
                <div
                    className="flex items-center gap-1 p-1.5 rounded-full relative overflow-hidden backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full"
                    style={{
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)'
                    }}
                >
                    {/* Glass Specular */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    <div className="flex items-center gap-1.5 p-1 w-full">
                        {/* Care Button (Input) */}
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                                triggerFeedback('light');
                                onOpenNyannlogSheet('requests');
                            }}
                            className="flex flex-col items-center justify-center gap-1 flex-1 h-16 rounded-[24px] hover:bg-white/10 transition-all outline-none group relative"
                        >
                            <div className="relative">
                                <Cat className="w-6 h-6 text-white drop-shadow-sm transition-transform group-active:scale-90" strokeWidth={1.5} />
                                {alertItems.length > 0 && (
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#E8B4A0] shadow-[0_0_8px_#E8B4A0] ring-1 ring-black/20" />
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-white/90 tracking-tight leading-none">おねがい</span>
                        </motion.button>

                        {/* Divider */}
                        <div className="w-px h-8 bg-white/10 mx-0.5" />

                        {/* Events Button (Output) */}
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                                triggerFeedback('light');
                                onOpenNyannlogSheet('events');
                            }}
                            className="flex flex-col items-center justify-center gap-1 flex-1 h-16 rounded-[24px] hover:bg-white/10 transition-all outline-none group"
                        >
                            <BookOpen className="w-6 h-6 text-white drop-shadow-sm transition-transform group-active:scale-90" strokeWidth={1.5} />
                            <span className="text-[10px] font-bold text-white/90 tracking-tight leading-none">できごと</span>
                        </motion.button>
                    </div>

                    {/* Subtle Liquid Progress Indicator (Background) */}
                    <motion.div
                        className="absolute inset-0 -z-10 bg-[#E8B4A0]/10 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: (progress || 0) / 100 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
            </motion.div >
        </>
    );
}
