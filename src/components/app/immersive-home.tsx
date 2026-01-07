"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import {
    LayoutGrid,
    Activity,
    Menu,
    Cat,
    Calendar,
    Settings
} from "lucide-react";
import { CheckSection } from "./check-section";
import { ActivityFeed } from "./activity-feed";
import { MagicBubble } from "./immersive/magic-bubble";
import { ZenGestures } from "./immersive/zen-gestures";
import { EditorialCorners } from "./immersive/editorial-corners";
import { BubblePickupList } from "./immersive/bubble-pickup-list";
import { analyzeImageBrightness } from "@/lib/image-analysis";
import { unlockAudio } from "@/lib/sounds";

interface ImmersiveHomeProps {
    onOpenSidebar?: (section?: 'care' | 'activity') => void;
    onNavigate?: (tab: string) => void;
    onOpenCalendar?: () => void;
    onCatClick?: () => void;
}

export function ImmersiveHome({ onOpenSidebar, onNavigate, onOpenCalendar, onCatClick }: ImmersiveHomeProps) {
    const { cats, activeCatId, setActiveCatId, setIsHeroImageLoaded, settings } = useAppState();
    const [showPickup, setShowPickup] = useState(false);
    const [direction, setDirection] = useState(0);
    const [contrastMode, setContrastMode] = useState<'light' | 'dark'>('dark');

    // ... existing auto-hide logic ...

    // Feature: Image Brightness Analysis


    // ... existing setup logic ...

    // ... in render ...

    const [uiVisible, setUiVisible] = useState(true);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Feature 4: Ambient Light (Night Mode)
    const [isNight, setIsNight] = useState(false);

    // iOS Audio Unlock Strategy: Aggressive
    // Listen to multiple events to ensure audio context is resumed as early as possible
    useEffect(() => {
        const attemptUnlock = () => {
            unlockAudio().then(success => {
                if (success) {
                    // Optional: remove listeners if we are 100% sure it's stable
                    // But for iOS, keeping them might be safer to handle re-suspend
                    // document.removeEventListener('touchstart', attemptUnlock);
                    // document.removeEventListener('touchend', attemptUnlock);
                    // document.removeEventListener('click', attemptUnlock);
                }
            });
        };

        const events = ['touchstart', 'touchend', 'click', 'keydown'];
        events.forEach(e => document.addEventListener(e, attemptUnlock, { passive: true }));

        return () => {
            events.forEach(e => document.removeEventListener(e, attemptUnlock));
        };
    }, []);

    // Re-unlock audio when page returns from background (iOS suspends AudioContext)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[App] Page became visible, re-unlocking audio');
                unlockAudio();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Feature: Random Photo on Open (pick a random photo each time app is opened)
    // Note: randomPhotoIndex is now calculated via useMemo below

    const activeCat = cats.find(c => c.id === activeCatId);
    const currentIndex = cats.findIndex(c => c.id === activeCatId);

    // Helper function to get public URL from avatars bucket (same as gallery-screen)
    const getPublicUrl = (path: string, options?: { width: number, quality: number }) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('avatars').getPublicUrl(path, {
            transform: options ? {
                width: options.width,
                quality: options.quality,
                resize: 'cover',
            } : undefined
        });
        return data.publicUrl;
    };

    // Build array of all photos for the active cat (avatar + gallery images)
    const allPhotos = React.useMemo(() => {
        if (!activeCat) return [];
        const photos: string[] = [];
        // Add avatar if exists
        if (activeCat.avatar) {
            photos.push(activeCat.avatar);
        }
        // Add gallery images - use avatars bucket like gallery-screen
        if (activeCat.images && activeCat.images.length > 0) {
            activeCat.images.forEach(img => {
                if (img.storagePath) {
                    // Optimized for fullscreen mobile (width 1200, q=80)
                    const publicUrl = getPublicUrl(img.storagePath, { width: 1200, quality: 80 });
                    // Avoid duplicating avatar
                    if (!photos.includes(publicUrl) && publicUrl !== activeCat.avatar) {
                        photos.push(publicUrl);
                    }
                }
            });
        }
        return photos;
    }, [activeCat]);

    // Select random photo - use useMemo so it's calculated immediately on mount
    // The random selection happens once when allPhotos changes (on catId change or initial load)
    const randomPhotoIndex = React.useMemo(() => {
        if (allPhotos.length > 0) {
            return Math.floor(Math.random() * allPhotos.length);
        }
        return 0;
    }, [activeCatId, allPhotos.length > 0]); // Only recalculate when cat changes or photos become available

    // Use random photo if available, otherwise fallback to avatar
    const currentPhotoUrl = allPhotos.length > 0
        ? allPhotos[randomPhotoIndex % allPhotos.length]
        : activeCat?.avatar || null;

    // Feature: Image Brightness Analysis
    useEffect(() => {
        if (currentPhotoUrl) {
            analyzeImageBrightness(currentPhotoUrl).then(mode => {
                setContrastMode(mode);
            });
        }
    }, [currentPhotoUrl]);

    // Initial Setup (Hero Image & Ambient Light)
    useEffect(() => {
        if (!activeCat?.avatar && allPhotos.length === 0) {
            setIsHeroImageLoaded(true);
        }

        // Simple Night Mode Check (6PM - 6AM)
        const hour = new Date().getHours();
        setIsNight(hour < 6 || hour >= 18);
    }, [activeCat, setIsHeroImageLoaded, allPhotos.length]);

    // Auto-hide Logic
    const resetHideTimer = useCallback(() => {
        setUiVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            // Only hide if no modals are open
            if (!showPickup) {
                setUiVisible(false);
            }
        }, 3000); // Hide after 3 seconds
    }, [showPickup]);

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

    // Preload Images (Aggressive)
    useEffect(() => {
        // 1. Preload Avatars for all cats (Priority High)
        cats.forEach(cat => {
            if (cat.avatar) {
                const img = new Image();
                img.src = cat.avatar;
            }
        });

        // 2. Preload Gallery Images for all cats (Background)
        // We use a timeout to let the main thread breathe / prioritize avatars first
        const timer = setTimeout(() => {
            cats.forEach(cat => {
                if (cat.images && cat.images.length > 0) {
                    cat.images.forEach(imgData => {
                        if (imgData.storagePath) {
                            const url = getPublicUrl(imgData.storagePath, { width: 1200, quality: 80 });
                            const img = new Image();
                            img.src = url;
                        }
                    });
                }
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [cats]);

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

    const handleOpenSidebar = (section?: 'care' | 'activity') => {
        setShowPickup(false);
        if (onOpenSidebar) onOpenSidebar(section);
    };

    const handleCatInteraction = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (showPickup) setShowPickup(false);
        onCatClick?.();
    }, [showPickup, onCatClick]);

    const handleTogglePickup = () => {
        setShowPickup(prev => !prev);
    };

    return (
        <div
            className="fullscreen-bg w-full overflow-hidden z-[9999]"
            style={{ backgroundColor: 'transparent' }}
            onClick={() => {
                resetHideTimer();
                if (showPickup) setShowPickup(false);
            }}
        >
            {/* Mode: Story / Icon (Not Parallax Cards) */}
            {settings.homeViewMode !== 'parallax' && (
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
                        className="absolute inset-0 overflow-hidden"
                    >
                        {/* Breathing Container */}
                        <motion.div
                            className="w-full h-full relative"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        >
                            {currentPhotoUrl ? (
                                <motion.img
                                    src={currentPhotoUrl}
                                    alt={activeCat?.name || 'Cat'}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={handleCatInteraction}
                                    onLoad={() => setIsHeroImageLoaded(true)}
                                />
                            ) : (
                                <motion.div
                                    className="w-full h-full bg-slate-50 flex items-center justify-center cursor-pointer"
                                    onClick={handleCatInteraction}
                                >
                                    <Cat className="w-32 h-32 text-slate-200" />
                                </motion.div>
                            )}

                            {/* Magic Dust Particles */}
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute rounded-full bg-white blur-[1px] pointer-events-none"
                                    style={{
                                        width: Math.random() * 3 + 1 + "px",
                                        height: Math.random() * 3 + 1 + "px",
                                        left: Math.random() * 100 + "%",
                                        top: Math.random() * 100 + "%",
                                        opacity: Math.random() * 0.5 + 0.2,
                                    }}
                                    animate={{
                                        y: [0, -100],
                                        opacity: [0, 0.8, 0],
                                        scale: [0.5, 1.2, 0.5]
                                    }}
                                    transition={{
                                        duration: Math.random() * 5 + 5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: Math.random() * 5
                                    }}
                                />
                            ))}
                        </motion.div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none transition-opacity duration-1000" style={{ opacity: uiVisible ? 1 : 0 }} />

                        {isNight && (
                            <div className="absolute inset-0 bg-orange-900/10 mix-blend-overlay pointer-events-none z-10" />
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Mode: Parallax Cards */}
            {settings.homeViewMode === 'parallax' && (
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
                                onClick={() => onCatClick?.()}
                                className="w-full h-full max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl relative bg-slate-900 cursor-pointer"
                            >
                                {activeCat?.avatar ? (
                                    <motion.img
                                        src={activeCat.avatar}
                                        className="w-full h-full object-cover"
                                        animate={{ scale: [1, 1.1] }}
                                        whileTap={{ scale: 0.95 }}
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
            {settings.homeViewMode === 'story' && (
                <>
                    <div className="absolute inset-y-0 left-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); if (showPickup) setShowPickup(false); goToCat(currentIndex - 1); resetHideTimer(); }} />
                    <div className="absolute inset-y-0 right-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); if (showPickup) setShowPickup(false); goToCat(currentIndex + 1); resetHideTimer(); }} />
                </>
            )}

            {/* Interface Layer - Always MagicBubble (placement varies by mode) */}
            <MagicBubble
                onOpenPickup={handleTogglePickup}
                onOpenCalendar={() => onOpenCalendar?.()}
                onOpenGallery={() => onNavigate?.('gallery')}
                onOpenCare={() => handleOpenSidebar('care')}
                onOpenActivity={() => handleOpenSidebar('activity')}
                contrastMode={contrastMode}
                placement={settings.homeViewMode === 'story' ? 'fixed-bottom-right' : 'bottom-center'}
            />

            {/* Legacy/Classic Mode Removed - All modes now use MagicBubble */}
            {false && (
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
                            onClick={() => handleOpenSidebar('care')}
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

                        </div>
                    </div>
                </motion.div>
            )}

            {/* Always visible: Story Indicators (If Story Mode) - Changed to Dots */}
            {settings.homeViewMode === 'story' && (
                <div className="absolute top-4 left-0 right-0 z-30 flex justify-center gap-2 px-3 pt-3 pointer-events-none">
                    {cats.map((cat, index) => (
                        <motion.div
                            key={cat.id}
                            initial={false}
                            animate={{
                                opacity: index === currentIndex ? 1 : 0.4,
                                scale: index === currentIndex ? 1.2 : 1,
                                backgroundColor: "#FFF"
                            }}
                            className="w-2 h-2 rounded-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.3)] backdrop-blur-sm"
                            transition={{ duration: 0.3 }}
                        />
                    ))}
                </div>
            )}

            {/* Top Right Settings Button - Removed as per user request */}

            {/* Always visible: Floating Avatars (If Icon Mode) */}
            {settings.homeViewMode === 'icon' && (
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
                        className="fixed inset-0 z-50 pointer-events-none"
                    >
                        <BubblePickupList onClose={() => setShowPickup(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
