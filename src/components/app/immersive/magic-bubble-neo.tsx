import React, { useState, useEffect, useRef } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Heart, Calendar, Image as ImageIcon, Activity, Menu, Settings, ChevronDown, PawPrint } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { IncidentModal } from "../incident-modal";
import { PhotoModal } from "../photo-modal";
import { useFootprintContext } from "@/providers/footprint-provider";
import { UnifiedCareList, useCareData } from "./unified-care-list";
import { IntegratedNotificationPill } from "./integrated-notification-pill";

interface MagicBubbleNeoProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenCare: () => void;
    onOpenActivity: () => void;
    onOpenActionMenu: () => void;
    onOpenMenu: () => void;
    onOpenExchange?: () => void;
    onOpenPhoto?: () => void;    // For v2
    onOpenIncident?: () => void; // For v2
    onOpenNyannlogSheet?: (tab?: 'events' | 'requests') => void;
    contrastMode: 'light' | 'dark';
}

export function MagicBubbleNeo({
    onOpenPickup,
    onOpenCalendar,
    onOpenGallery,
    onOpenCare,
    onOpenActivity,
    onOpenActionMenu,
    onOpenMenu,
    onOpenExchange,
    onOpenPhoto,
    onOpenIncident,
    onOpenNyannlogSheet,
    contrastMode
}: MagicBubbleNeoProps) {
    const {
        progress,
        totalCareTasks,
        completedCareTasks,
        careItems,
        alertItems,
        addCareLog,
        activeCatId,
        awardForCare,
        markPhotosAsSeen
    } = useCareData();

    const [isSurging, setIsSurging] = useState(false);
    const prevProgress = useRef(progress);

    // Watch for progress changes to trigger "Surge"
    useEffect(() => {
        if (progress > prevProgress.current) {
            setIsSurging(true);
            const timer = setTimeout(() => setIsSurging(false), 2000);
            return () => clearTimeout(timer);
        }
        prevProgress.current = progress;
    }, [progress]);

    const { cats, settings } = useAppState();
    const { stats } = useFootprintContext();
    const isLight = contrastMode === 'light';
    const isV2 = settings.layoutType.startsWith('v2-');
    const isUnified = settings.homeButtonMode === 'unified';

    const triggerFeedback = (type: 'light' | 'medium' | 'success' = 'light') => {
        try {
            if (type === 'light') {
                haptics.impactLight();
                sounds.click().catch(e => console.warn(e));
            } else if (type === 'medium') {
                haptics.impactMedium();
                sounds.pop().catch(e => console.warn(e));
            } else if (type === 'success') {
                haptics.success();
                sounds.success().catch(e => console.warn(e));
            }
        } catch (e) {
            console.warn('Feedback error:', e);
        }
    };

    const [isExpanded, setIsExpanded] = useState(false);
    const [showCareList, setShowCareList] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Use total items for badge count
    const activeCount = alertItems.length;

    // Dynamic Styles
    const styles = {
        text: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
        ringTrack: 'rgba(0,0,0,0.3)',
        careColor: progress >= 1 ? '#D09B85' : '#E8B4A0',
        iconFill: 'fill-white',
        glassHover: 'hover:bg-white/40',
    };

    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 2px 0 0 rgba(255, 255, 255, 0.1)'
    };


    // --- OPTIMIZED v2 Render (Satellite Model Box) ---
    return (
        <>
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
                            if (onOpenExchange) onOpenExchange();
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
            {/* Notifications Overlay (From Top) - Kept here but usually empty unless triggered */}
            <AnimatePresence>
                {showNotifications && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-24 left-6 w-[calc(100vw-48px)] max-w-sm mt-3 z-[110]"
                    >
                        <UnifiedCareList
                            alertItems={alertItems}
                            careItems={[]}
                            onOpenPickup={onOpenPickup}
                            onOpenIncident={onOpenIncident || (() => { })}
                            onOpenPhoto={onOpenPhoto || (() => { })}
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


            {/* Backdrop for Care List */}
            <AnimatePresence>
                {
                    (showCareList || showNotifications) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
                            onClick={() => { setShowCareList(false); setShowNotifications(false); }}
                        />
                    )
                }
            </AnimatePresence >

            <div className="fixed right-6 bottom-10 z-[60] flex flex-col items-end gap-4 pointer-events-none">
                {/* Satellite Menu - Only show if NOT unified (Unified uses single button) */}
                <AnimatePresence>
                    {!isUnified && isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, y: 20 }}
                            className="flex flex-col items-end gap-4 mb-4 pointer-events-auto"
                        >
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    if (onOpenNyannlogSheet) {
                                        onOpenNyannlogSheet('requests');
                                    }
                                    setIsExpanded(false);
                                }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-slate-950/20 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all drop-shadow-md">care</span>
                                <div className="w-12 h-12 rounded-full bg-slate-950/15 backdrop-blur-2xl flex items-center justify-center shadow-2xl ring-1 ring-white/30 hover:bg-slate-900/30 transition-colors border border-white/20">
                                    <Heart className="w-5 h-5 text-white drop-shadow-sm" />
                                </div>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    if (onOpenNyannlogSheet) onOpenNyannlogSheet('events');
                                    setIsExpanded(false);
                                }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-slate-950/20 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all drop-shadow-md">plus</span>
                                <div className="w-12 h-12 rounded-full bg-slate-950/15 backdrop-blur-2xl flex items-center justify-center shadow-2xl ring-1 ring-white/30 hover:bg-slate-900/30 transition-colors border border-white/20">
                                    <span className="text-white text-xl font-medium drop-shadow-sm">＋</span>
                                </div>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { onOpenMenu(); setIsExpanded(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-slate-950/20 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all drop-shadow-md">menu</span>
                                <div className="w-12 h-12 rounded-full bg-slate-950/15 backdrop-blur-2xl flex items-center justify-center shadow-2xl ring-1 ring-white/30 hover:bg-slate-900/30 transition-colors border border-white/20">
                                    <LayoutGrid className="w-5 h-5 text-white drop-shadow-sm" />
                                </div>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Trigger */}
                <div className="pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                            triggerFeedback('medium');
                            if (isUnified) {
                                // Unified Mode: Open Nyannlog (Default: events)
                                if (onOpenNyannlogSheet) onOpenNyannlogSheet('events');
                            } else {
                                // Separated Mode: Toggle Satellites
                                setIsExpanded(!isExpanded);
                            }
                        }}
                        className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] overflow-hidden group"
                        style={{
                            background: 'rgba(255, 255, 255, 0.25)',
                            backdropFilter: 'blur(24px) saturate(1.5)',
                            border: '1.5px solid rgba(255, 255, 255, 0.35)',
                            clipPath: 'circle(50% at 50% 50%)'
                        }}
                    >
                        {/* External Ripple Effect (Surge) */}
                        <AnimatePresence>
                            {isSurging && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0.8 }}
                                    animate={{ scale: 2.5, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-full border-4 border-[#E8B4A0]/60 pointer-events-none z-0"
                                />
                            )}
                        </AnimatePresence>

                        {/* Internal Fluid Progress Overlay */}
                        <motion.div
                            className="absolute inset-0 origin-bottom"
                            initial={{ scaleY: 0 }}
                            animate={{
                                scaleY: progress,
                                scaleX: isSurging ? [1, 1.1, 1] : 1,
                                y: isSurging ? [0, -4, 0] : 0
                            }}
                            transition={{
                                scaleY: { duration: 1.5, ease: [0.23, 1, 0.32, 1] },
                                scaleX: { duration: 0.4, repeat: 1 },
                                y: { duration: 0.4, repeat: 1 }
                            }}
                            style={{
                                background: 'linear-gradient(180deg, rgba(232, 180, 160, 0.6) 0%, rgba(208, 155, 133, 0.85) 100%)',
                            }}
                        >
                            {/* Animated Surge Ripple */}
                            <AnimatePresence>
                                {isSurging && (
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: -40, opacity: [0, 1, 0] }}
                                        transition={{ duration: 0.8 }}
                                        className="absolute inset-x-0 h-10 bg-white/30 blur-md"
                                    />
                                )}
                            </AnimatePresence>

                            {/* Simplified wave effect for mobile */}
                            <motion.div
                                className="absolute top-0 left-0 w-[200%] h-6 -translate-y-[50%] opacity-50"
                                animate={{ x: ['-50%', '0%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            >
                                <svg viewBox="0 0 400 30" className="w-full h-full fill-[rgba(255,255,255,0.4)]">
                                    <path d="M 0 15 Q 50 5, 100 15 Q 150 25, 200 15 Q 250 5, 300 15 Q 350 25, 400 15 V 30 H 0 Z" />
                                </svg>
                            </motion.div>
                        </motion.div>

                        {/* High-Fidelity Glass Sphere Effects */}
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_-8px_16px_rgba(0,0,0,0.2),inset_0_4px_8px_rgba(255,255,255,0.5)] pointer-events-none z-10" />

                        {/* Specular Highlights */}
                        <div className="absolute top-2 left-3 w-5 h-3 bg-white/50 rounded-full blur-[2px] rotate-[-20deg] pointer-events-none z-20" />
                        <div className="absolute top-3 left-5 w-1.5 h-1.5 bg-white/70 rounded-full blur-[1px] pointer-events-none z-20" />

                        {/* Rim Lighting (Top edge glow) */}
                        <div className="absolute inset-0 rounded-full border-t-2 border-white/30 pointer-events-none z-30" />

                        {/* Expand Indicator */}
                        <motion.div
                            animate={{
                                scale: isExpanded ? 1.5 : (isSurging ? [1, 2, 1] : 1),
                                opacity: isExpanded ? 0.9 : (isSurging ? [0, 0.8, 0] : 0)
                            }}
                            className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1)] z-40"
                        />
                    </motion.button>
                </div>

                {/* Care List Overlay (v2 Full Screenish Modal) */}
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
                                alertItems={alertItems}
                                careItems={careItems}
                                totalCareTasks={totalCareTasks}
                                completedCareTasks={completedCareTasks}
                                onOpenPickup={onOpenPickup}
                                onOpenIncident={onOpenIncident || (() => { })}
                                onOpenPhoto={onOpenPhoto || (() => { })}
                                onClose={() => setShowCareList(false)}
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
            </div>
        </>
    );
}
