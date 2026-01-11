import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Heart } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { IncidentModal } from "../incident-modal";
import { PhotoModal } from "../photo-modal";
import { useFootprintContext } from "@/providers/footprint-provider";
import { UnifiedCareList, useCareData } from "./unified-care-list";

interface MagicBubbleProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenCare: () => void;
    onOpenActivity: () => void;
    contrastMode: 'light' | 'dark';
    placement?: 'fixed-bottom-right' | 'bottom-center';
}

export function MagicBubble({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenCare, onOpenActivity, contrastMode, placement = 'fixed-bottom-right' }: MagicBubbleProps) {
    const [expandedSection, setExpandedSection] = useState<'care' | 'observation' | null>(null);
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    // Use Centralized Data Hook
    const {
        progress,
        careItems,
        alertItems,
        addCareLog,
        activeCatId,
        awardForCare
    } = useCareData();

    const { cats, settings } = useAppState();
    const isLight = contrastMode === 'light';

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

    return (
        <>
            {/* Backdrop for Expanded HUD */}
            <AnimatePresence>
                {expandedSection && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 pointer-events-auto"
                        onClick={() => {
                            triggerFeedback('light');
                            setExpandedSection(null);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* FLOATING HUD SATELLITES */}
            {placement === 'bottom-center' ? (
                /* === CARD MODE: Consolidated Icon with Expandable List === */
                <div className="absolute top-8 left-6 z-40 pointer-events-auto flex flex-col items-start gap-2">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerFeedback('medium');
                            setExpandedSection(expandedSection === 'care' ? null : 'care');
                        }}
                        className={`relative flex items-center px-2 py-2 rounded-full group transition-all hover:bg-white/40`}
                        style={cardStyle}
                    >

                        {/* Horizontal Bar Design */}
                        <div className="flex items-center gap-3 pr-2">
                            {/* Icon Circle */}
                            <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center shadow-sm backdrop-blur-md ring-1 ring-white/60">
                                <Heart className="w-5 h-5 text-[#E8B4A0] drop-shadow-sm fill-white/20" />
                            </div>

                            {/* Percentage */}
                            <span className="text-lg font-bold text-slate-600 drop-shadow-sm tabular-nums tracking-tight">
                                {Math.round(progress * 100)}%
                            </span>

                            {/* Progress Bar */}
                            <div className="h-2.5 w-20 bg-black/5 rounded-full overflow-hidden shadow-inner border border-black/5">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-[#FFD6C0] to-[#E8B4A0] shadow-[0_0_8px_rgba(232,180,160,0.4)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </div>
                        </div>

                    </motion.button>
                    {/* Expandable Consolidated List for Card Mode */}
                    <AnimatePresence>
                        {expandedSection === 'care' && (
                            <UnifiedCareList
                                alertItems={alertItems}
                                careItems={careItems}
                                onOpenPickup={onOpenPickup}
                                onOpenIncident={() => setShowIncidentModal(true)}
                                onOpenPhoto={() => setShowPhotoModal(true)}
                                addCareLog={addCareLog}
                                activeCatId={activeCatId}
                                awardForCare={awardForCare}
                                style={{ marginLeft: '8px' }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                /* === OTHER MODES: Vertical Stack with Expandable Rings === */
                <div className="absolute top-8 left-6 z-40 flex flex-col gap-6 items-start pointer-events-auto max-h-[85vh] overflow-y-auto no-scrollbar pb-20 pr-4">

                    {/* CARE RING */}
                    <div className="flex flex-col gap-2">
                        <motion.div
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerFeedback('medium');
                                setExpandedSection(expandedSection === 'care' ? null : 'care');
                            }}
                        >
                            {/* Ring Container */}
                            <div className="relative w-10 h-10 transition-transform group-active:scale-95">
                                <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible" viewBox="0 0 60 60">
                                    <circle cx="30" cy="30" r={26} fill="none" stroke={styles.ringTrack} strokeWidth="4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                                    <motion.circle
                                        cx="30" cy="30" r={26} fill="none" stroke={styles.careColor} strokeWidth="5" strokeLinecap="round"
                                        initial={{ strokeDasharray: 2 * Math.PI * 26, strokeDashoffset: 2 * Math.PI * 26 }}
                                        animate={{ strokeDashoffset: (2 * Math.PI * 26) - (progress * (2 * Math.PI * 26)) }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        style={{ filter: "drop-shadow(0 0 2px rgba(124, 170, 142, 0.5))" }}
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
                        </motion.div>
                        {/* Expanded Care List */}
                        <AnimatePresence>
                            {expandedSection === 'care' && (
                                <UnifiedCareList
                                    alertItems={alertItems}
                                    careItems={careItems}
                                    onOpenPickup={onOpenPickup}
                                    onOpenIncident={() => setShowIncidentModal(true)}
                                    onOpenPhoto={() => setShowPhotoModal(true)}
                                    addCareLog={addCareLog}
                                    activeCatId={activeCatId}
                                    awardForCare={awardForCare}
                                    style={{ marginLeft: '12px' }}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}


            {/* === SOCIAL RIGHT STACK (Right-Edge Actions) === */}
            <div className={`fixed right-4 bottom-10 z-50 flex items-center pointer-events-none ${placement === 'bottom-center' ? 'flex-row gap-4' : 'flex-col gap-5'}`}>

                {/* Pickup Widget */}
                <div className="pointer-events-auto">
                    <AnimatePresence>
                        {activeCount > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5, x: 20 }}
                                whileTap={{ scale: 0.85 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                onClick={() => {
                                    triggerFeedback('medium');
                                    onOpenPickup();
                                }}
                                className="relative group"
                            >
                                <div className={`glass-icon w-14 h-14 flex items-center justify-center ${styles.glassHover}`}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8B4A0] to-[#C08A70] flex items-center justify-center shadow-inner ring-2 ring-white/20">
                                        <span className="text-white font-bold text-sm font-sans drop-shadow-md">{activeCount}</span>
                                    </div>
                                </div>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Menu Trigger */}
                <div className="pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 12 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerFeedback('medium');
                            onOpenCare();
                        }}
                        className={`group relative glass-icon w-14 h-14 flex items-center justify-center ${styles.glassHover}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ring-2 ring-white/60 bg-gradient-to-br from-[#E8B4A0] to-[#C08A70] group-hover:from-[#D69E8A] group-hover:to-[#B07A60]`}>
                            <LayoutGrid className={`w-5 h-5 drop-shadow-sm text-white`} />
                        </div>
                    </motion.button>
                </div>

            </div>

            <IncidentModal
                isOpen={showIncidentModal}
                onClose={() => setShowIncidentModal(false)}
                defaultCatId={activeCatId}
            />

            <PhotoModal
                isOpen={showPhotoModal}
                onClose={() => setShowPhotoModal(false)}
                preselectedCatId={activeCatId}
            />
        </>
    );
}

