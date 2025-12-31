"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAppState } from "@/store/app-store";
import {
    LayoutGrid,
    Activity,
    Menu,
    Cat,
    Calendar
} from "lucide-react";
import { CheckSection } from "./check-section";
import { ActivityFeed } from "./activity-feed";
import { MagicBubble } from "./immersive/magic-bubble";
import { ZenGestures } from "./immersive/zen-gestures";
import { EditorialCorners } from "./immersive/editorial-corners";

interface ImmersiveHomeProps {
    onOpenSidebar?: () => void;
    onNavigate?: (tab: string) => void;
    onOpenCalendar?: () => void;
}

export function ImmersiveHome({ onOpenSidebar, onNavigate, onOpenCalendar }: ImmersiveHomeProps) {
    const { cats, activeCatId, setActiveCatId, setIsHeroImageLoaded, settings } = useAppState();
    const [showPickup, setShowPickup] = useState(false);
    const [showActivity, setShowActivity] = useState(false);
    const [direction, setDirection] = useState(0);

    // Feature 1: Auto-hide UI
    const [uiVisible, setUiVisible] = useState(true);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Feature 4: Ambient Light (Night Mode)
    const [isNight, setIsNight] = useState(false);

    const activeCat = cats.find(c => c.id === activeCatId);
    const currentIndex = cats.findIndex(c => c.id === activeCatId);

    // Initial Setup (Hero Image & Ambient Light)
    useEffect(() => {
        if (!activeCat?.avatar) {
            setIsHeroImageLoaded(true);
        }

        // Simple Night Mode Check (6PM - 6AM)
        const hour = new Date().getHours();
        setIsNight(hour < 6 || hour >= 18);
    }, [activeCat, setIsHeroImageLoaded]);

    // Auto-hide Logic
    const resetHideTimer = useCallback(() => {
        setUiVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            // Only hide if no modals are open
            if (!showPickup && !showActivity) {
                setUiVisible(false);
            }
        }, 3000); // Hide after 3 seconds
    }, [showPickup, showActivity]);

    // Setup Interaction Listeners
    useEffect(() => {
        window.addEventListener('mousemove', resetHideTimer);
        window.addEventListener('touchstart', resetHideTimer);
        window.addEventListener('click', resetHideTimer);

        resetHideTimer(); // Start timer on mount

        return () => {
            window.removeEventListener('mousemove', resetHideTimer);
            window.removeEventListener('touchstart', resetHideTimer);
            window.removeEventListener('click', resetHideTimer);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, [resetHideTimer]);

    const handleSwipe = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50;
        if (info.offset.x < -threshold && currentIndex < cats.length - 1) {
            setDirection(1);
            setActiveCatId(cats[currentIndex + 1].id);
        } else if (info.offset.x > threshold && currentIndex > 0) {
            setDirection(-1);
            setActiveCatId(cats[currentIndex - 1].id);
        }
    };

    const goToCat = (index: number) => {
        if (index >= 0 && index < cats.length) {
            setDirection(index > currentIndex ? 1 : -1);
            setActiveCatId(cats[index].id);
        }
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 1
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: "spring" as const, stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
            }
        },
        exit: (direction: number) => ({
            x: direction > 0 ? '-100%' : '100%',
            opacity: 0,
            scale: 1
        })
    };

    return (
        <div className="fixed inset-0 bg-black overflow-hidden" onClick={resetHideTimer}>
            {/* Mode 1 & 3: Standard Carousel / Avatars (Not Parallax) */}
            {settings.homeDisplayMode !== 'parallax' && (
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={activeCatId}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleSwipe}
                        className="absolute inset-0"
                    >
                        {activeCat?.avatar ? (
                            <motion.img
                                src={activeCat.avatar}
                                alt={activeCat.name}
                                className="w-full h-full object-cover"
                                animate={{
                                    scale: [1, 1.15],
                                    x: [0, 20, -20, 0]
                                }}
                                transition={{
                                    duration: 20,
                                    ease: "linear",
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                }}
                                onLoad={() => setIsHeroImageLoaded(true)}
                                onError={() => setIsHeroImageLoaded(true)}
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                <Cat className="w-32 h-32 text-slate-200" />
                            </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none transition-opacity duration-1000" style={{ opacity: uiVisible ? 1 : 0 }} />

                        {isNight && (
                            <div className="absolute inset-0 bg-orange-900/10 mix-blend-overlay pointer-events-none z-10" />
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Mode 2: Parallax Cards */}
            {settings.homeDisplayMode === 'parallax' && (
                <div className="absolute inset-0 overflow-hidden">
                    {/* Background Blur with Cross-fade */}
                    <div className="absolute inset-0">
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={activeCatId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8 }}
                                className="absolute inset-0"
                            >
                                {activeCat?.avatar && (
                                    <img
                                        src={activeCat.avatar}
                                        className="w-full h-full object-cover blur-3xl opacity-50 scale-125"
                                        alt=""
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/40" />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={activeCatId}
                                custom={direction}
                                variants={{
                                    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0, scale: 0.8, rotate: direction > 0 ? 10 : -10 }),
                                    center: { x: 0, opacity: 1, scale: 1, rotate: 0, zIndex: 1 },
                                    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0, scale: 0.8, rotate: direction > 0 ? -10 : 10, zIndex: 0 })
                                }}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={handleSwipe}
                                className="w-full h-full max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl relative bg-slate-900"
                            >
                                {activeCat?.avatar ? (
                                    <motion.img
                                        src={activeCat.avatar}
                                        className="w-full h-full object-cover"
                                        animate={{ scale: [1, 1.1] }}
                                        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                        <Cat className="w-32 h-32 text-slate-200" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-8 left-6">
                                    <h2 className="text-4xl font-bold text-white mb-2">{activeCat?.name}</h2>
                                    <p className="text-white/80">{activeCat?.age} • {activeCat?.sex}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Story Mode Tap Zones (Story Mode Only) */}
            {settings.homeDisplayMode === 'story' && settings.homeInterfaceMode !== 'zen' && (
                <>
                    <div className="absolute inset-y-0 left-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); goToCat(currentIndex - 1); resetHideTimer(); }} />
                    <div className="absolute inset-y-0 right-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); goToCat(currentIndex + 1); resetHideTimer(); }} />
                </>
            )}

            {/* Interface Layer - Swappable Controls */}
            {settings.homeInterfaceMode === 'bubble' && (
                <MagicBubble
                    onOpenPickup={() => setShowPickup(true)}
                    onOpenCalendar={() => onOpenCalendar?.()}
                    onOpenGallery={() => onNavigate?.('gallery')}
                    onOpenSettings={() => onNavigate?.('settings')}
                />
            )}

            {settings.homeInterfaceMode === 'zen' && (
                <ZenGestures
                    onOpenPickup={() => setShowPickup(true)}
                    onOpenCalendar={() => onOpenCalendar?.()}
                    onOpenGallery={() => onNavigate?.('gallery')}
                    onOpenSettings={() => onNavigate?.('settings')}
                />
            )}

            {settings.homeInterfaceMode === 'editorial' && (
                <EditorialCorners
                    onOpenPickup={() => setShowPickup(true)}
                    onOpenCalendar={() => onOpenCalendar?.()}
                    onOpenGallery={() => onNavigate?.('gallery')}
                    onOpenSettings={() => onNavigate?.('settings')}
                />
            )}

            {/* Legacy/Classic Mode (Fallback logic) */}
            {(settings.homeInterfaceMode === 'classic' || !settings.homeInterfaceMode) && (
                <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: uiVisible ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 20 }}
                >
                    {/* Standard Floating Top Bar */}
                    <div
                        className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 pointer-events-auto"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <button
                            onClick={onOpenSidebar}
                            className="p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/90 hover:bg-black/30 transition-all shadow-lg"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="px-4 py-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-lg">
                            <span className="text-white/90 font-medium text-sm text-shadow-sm">{activeCat?.name || 'Cat'}</span>
                        </div>
                        <div className="w-11" />
                    </div>

                    {/* Standard Bottom Dock */}
                    <div
                        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
                    >
                        <div className="flex items-center justify-center gap-8">
                            <button onClick={() => setShowPickup(true)} className="p-4 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-lg hover:bg-white/30 transition-all active:scale-95">
                                <LayoutGrid className="w-6 h-6" />
                            </button>
                            <button onClick={() => onNavigate?.('gallery')} className="p-4 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-lg hover:bg-white/30 transition-all active:scale-95">
                                <Cat className="w-6 h-6" />
                            </button>
                            <button onClick={onOpenCalendar} className="p-4 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-lg hover:bg-white/30 transition-all active:scale-95">
                                <Calendar className="w-6 h-6" />
                            </button>
                            <button onClick={() => setShowActivity(true)} className="p-4 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-lg hover:bg-white/30 transition-all active:scale-95">
                                <Activity className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Always visible: Story Indicators (If Story Mode) */}
            {settings.homeDisplayMode === 'story' && settings.homeInterfaceMode !== 'zen' && (
                <div className="absolute top-0 left-0 right-0 z-30 flex gap-2 px-3 pt-3 pointer-events-none">
                    {cats.map((cat, index) => (
                        <div key={cat.id} className="h-1 flex-1 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
                            <motion.div
                                className="h-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                                initial={false}
                                animate={{ opacity: index === currentIndex ? 1 : (index < currentIndex ? 0.5 : 0) }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Always visible: Floating Avatars (If Avatars Mode and partially visible in other modes) */}
            {settings.homeDisplayMode === 'avatars' && settings.homeInterfaceMode !== 'bubble' && (
                <div
                    className="absolute bottom-24 left-0 right-0 z-30 flex items-center justify-center gap-6 pointer-events-auto px-4 py-8 overflow-x-auto no-scrollbar"
                >
                    {cats.map((cat, index) => (
                        <motion.button
                            key={cat.id}
                            onClick={() => setActiveCatId(cat.id)}
                            animate={{
                                scale: index === currentIndex ? 1.3 : 1,
                                y: index === currentIndex ? -10 : 0
                            }}
                            className={`relative w-14 h-14 flex-shrink-0 rounded-full overflow-hidden border-2 shadow-xl transition-all ${index === currentIndex
                                ? 'border-white ring-4 ring-white/30'
                                : 'border-white/50 opacity-60 hover:opacity-100 hover:scale-110'
                                }`}
                        >
                            <img src={cat.avatar} className="w-full h-full object-cover" alt="" />
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Pickup Modal and Activity Modal */}
            <AnimatePresence>
                {showPickup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setShowPickup(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl max-h-[70vh] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white">ピックアップ</h3>
                                <button
                                    onClick={() => setShowPickup(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    閉じる
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                                <CheckSection />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Activity Modal Overlay */}
            <AnimatePresence>
                {showActivity && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setShowActivity(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl max-h-[70vh] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white">最近のアクティビティ</h3>
                                <button
                                    onClick={() => setShowActivity(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    閉じる
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(70vh-60px)] p-4">
                                <ActivityFeed />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
