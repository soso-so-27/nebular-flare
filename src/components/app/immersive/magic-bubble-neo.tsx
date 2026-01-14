import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Heart, Calendar, Image as ImageIcon, Activity, Menu, Settings, ChevronDown } from "lucide-react";
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
    contrastMode
}: MagicBubbleNeoProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showCareList, setShowCareList] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Use Centralized Data Hook
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

    const { cats, settings } = useAppState();
    const isLight = contrastMode === 'light';
    const isV2 = settings.layoutType.startsWith('v2-');

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
        background: 'rgba(250, 249, 247, 0.45)', // Tactile Glass: Milky
        backdropFilter: 'blur(16px) saturate(1.8)',
        boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };


    // --- OPTIMIZED v2 Render (Satellite Model Box) ---
    return (
        <>
            {/* Top Center: Notification Pill (Neo Standard) */}
            <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[70] pointer-events-auto flex flex-col items-center">
                <IntegratedNotificationPill
                    progress={progress}
                    alertItems={alertItems}
                    isExpanded={showNotifications}
                    footprints={stats.householdTotal}
                    onToggle={() => {
                        triggerFeedback('medium');
                        setShowNotifications(!showNotifications);
                        if (showCareList) setShowCareList(false);
                        setIsExpanded(false);
                    }}
                    onFootprintClick={onOpenExchange}
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
            </div>


            {/* Backdrop for Care List */}
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

            <div className="fixed right-6 bottom-10 z-[60] flex flex-col items-end gap-4 pointer-events-none">
                {/* Satellite Menu */}
                <AnimatePresence>
                    {isExpanded && (
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
                                    setShowCareList(!showCareList);
                                    if (showNotifications) setShowNotifications(false);
                                    setIsExpanded(false);
                                }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">care</span>
                                <div className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-lg ring-1 ring-white/60">
                                    <Heart className="w-5 h-5 text-[#E8B4A0]" />
                                </div>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { onOpenActionMenu(); setIsExpanded(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">plus</span>
                                <div className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-lg ring-1 ring-white/60">
                                    <span className="text-white text-xl font-bold">＋</span>
                                </div>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { onOpenMenu(); setIsExpanded(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">menu</span>
                                <div className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-lg ring-1 ring-white/60">
                                    <LayoutGrid className="w-5 h-5 text-slate-100" />
                                </div>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Trigger */}
                <div className="pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                            triggerFeedback('medium');
                            setIsExpanded(!isExpanded);
                        }}
                        className="relative w-16 h-16 rounded-full flex items-center justify-center ring-2 ring-white/50 shadow-2xl overflow-hidden group"
                        style={{ background: 'var(--peach)' }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-white/20 origin-bottom"
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: progress }}
                            transition={{ duration: 1 }}
                        />
                        <div className="relative z-10">
                            <Heart className={`w-7 h-7 text-white fill-white/20 transition-transform ${isExpanded ? 'scale-110' : ''}`} />
                        </div>
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
                                alertItems={[]}
                                careItems={careItems}
                                onOpenPickup={onOpenPickup}
                                onOpenIncident={onOpenIncident || (() => { })}
                                onOpenPhoto={onOpenPhoto || (() => { })}
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
