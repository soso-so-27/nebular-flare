"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
    useCatContext,
    useIncidentContext,
    useSettingsContext,
    useCoreContext
} from "@/store/app-store";
import {
    LayoutGrid,
    Activity,
    Menu,
    Cat,
    Calendar,
    Archive,
    PawPrint,
    Library
} from "lucide-react";
import { CheckSection } from "../shared/check-section";
import { ActivityFeed } from "../shared/activity-feed";
import { ZenGestures } from "../immersive/zen-gestures";
import { EditorialCorners } from "../immersive/editorial-corners";

import { unlockAudio } from "@/lib/sounds";
import { triggerFeedback } from "@/lib/haptics";
import { BackgroundVideo } from "../shared/background-video";
import { BrandLoader } from "../../ui/brand-loader";
import { HomeViewToggle } from "@/components/app/shared/home-view-toggle"; // Keeping for safety/history or remove? 
// Actually I replaced the usage, so I can remove imports.
// But wait, `task_boundary` said I am refactoring.
// I'll remove `LayoutIslandNeo`.
import { HomeBackground } from "./home-background";
import { useCareData } from "@/hooks/use-care-logic";

import { ImmersivePhotoView } from "../immersive/ImmersivePhotoView";
import { useHouseholdMedia } from "@/hooks/use-household-media";
import { useHomeGestures } from "@/hooks/use-home-gestures";


// Lazy load heavy modals and sheets to reduce initial bundle size
// Modals are now handled in page.tsx for global access
// const ThemeExchangeModal = React.lazy(() => import("../modals/theme-exchange-modal").then(m => ({ default: m.ThemeExchangeModal })));
// const PhotoModal = React.lazy(() => import("../modals/photo-modal").then(m => ({ default: m.PhotoModal })));
// const IncidentModal = React.lazy(() => import("../modals/incident-modal").then(m => ({ default: m.IncidentModal })));
// const IncidentDetailModal = React.lazy(() => import("../modals/incident-detail-modal").then(m => ({ default: m.IncidentDetailModal })));
// const PhotoListSheet = React.lazy(() => import("../modals/photo-list-sheet").then(m => ({ default: m.PhotoListSheet })));
// const IncidentListSheet = React.lazy(() => import("../modals/incident-list-sheet").then(m => ({ default: m.IncidentListSheet })));
// const NyannlogSheet = React.lazy(() => import("../modals/nyannlog-sheet").then(m => ({ default: m.NyannlogSheet })));

interface ImmersiveHomeProps {
    onOpenSidebar?: (section?: 'care' | 'activity') => void;
    onNavigate?: (tab: string) => void;
    onOpenCalendar?: () => void;
    onCatClick?: () => void;
    onSelectItem?: (id: string, type: string, photos?: string[]) => void;
    // New Props
    onOpenExchange: () => void;
    onOpenPhoto: () => void;
    onOpenIncident: () => void;
    onOpenNyannlogSheet: (tab?: 'events' | 'requests' | 'input', date?: Date) => void;
    onOpenIncidentDetail: (id: string) => void;
    isNyannlogOpen?: boolean;
    onToggleView?: () => void; // Toggle to Weekly Home
    onOpenGallery: () => void;
}


export function ImmersiveHome({
    onOpenSidebar,
    onNavigate,
    onOpenCalendar,
    onCatClick,
    onSelectItem,
    onOpenExchange,
    onOpenPhoto,
    onOpenIncident,
    onOpenNyannlogSheet,
    onOpenIncidentDetail,
    isNyannlogOpen,
    onToggleView,
    onOpenGallery
}: ImmersiveHomeProps) {
    const { cats, activeCatId, setActiveCatId, setIsHeroImageLoaded } = useCatContext();
    const { settings } = useSettingsContext();
    const { incidents } = useIncidentContext();
    // Local state for modals removed - lifted to page.tsx
    const { progress } = useCareData();

    // Use passed prop for detail opening
    const handleOpenIncidentDetail = useCallback((id: string) => {
        if (onOpenIncidentDetail) {
            onOpenIncidentDetail(id);
        } else {
            onSelectItem?.(id, 'incident');
        }
    }, [onOpenIncidentDetail, onSelectItem]);

    // Feature 4: Ambient Light (Night Mode)
    const [isNight, setIsNight] = useState(false);

    const activeCat = cats.find(c => c.id === activeCatId);
    const currentIndex = cats.findIndex(c => c.id === activeCatId);

    // Initial Setup (Hero Image & Ambient Light)
    useEffect(() => {
        if (!activeCat?.avatar) {
            setIsHeroImageLoaded(true);
        }

        const hour = new Date().getHours();
        setIsNight(hour < 6 || hour >= 18);
    }, [activeCat, setIsHeroImageLoaded]);

    // Feature: Household Random Media
    const { selectedItem } = useHouseholdMedia(cats);

    // Sync active cat with selected random media on initial load
    const initializedRef = useRef(false);
    useEffect(() => {
        if (!initializedRef.current && selectedItem && cats.length > 0) {
            setActiveCatId(selectedItem.catId);
            initializedRef.current = true;
        }
    }, [selectedItem, cats.length, setActiveCatId]);

    const displayMedia = selectedItem?.url || activeCat?.avatar || null;
    const isVideo = selectedItem?.isVideo || false;

    const {
        uiVisible,
        direction,
        setDirection,
        handleSwipe,
        goToCat,
        resetHideTimer
    } = useHomeGestures(cats, activeCatId, setActiveCatId);

    // iOS Audio Unlock Strategy: Aggressive
    useEffect(() => {
        const attemptUnlock = () => {
            unlockAudio();
        };

        const events = ['touchstart', 'touchend', 'click', 'keydown'];
        events.forEach(e => document.addEventListener(e, attemptUnlock, { passive: true }));

        return () => {
            events.forEach(e => document.removeEventListener(e, attemptUnlock));
        };
    }, []);

    // Re-unlock audio when page returns from background
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                unlockAudio();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const handleOpenNyannlog = useCallback((tab: 'events' | 'requests' | 'input' = 'events') => {
        if (tab === 'events') {
            onNavigate?.('dekigoto');
        } else {
            if (onOpenNyannlogSheet) onOpenNyannlogSheet(tab);
        }
    }, [onNavigate, onOpenNyannlogSheet]);

    const handleOpenCalendarWrapper = useCallback(() => {
        onOpenCalendar?.();
    }, [onOpenCalendar]);

    const handleOpenNewWrapper = useCallback(() => {
        // NyannlogEntryModal has been removed in cleanup
    }, []);

    // Preload Images (Aggressive)
    useEffect(() => {
        if (!cats.length) return;
        cats.forEach(cat => {
            if (cat.avatar) {
                const img = new Image();
                img.src = cat.avatar;
                img.decoding = 'async';
            }
        });
    }, [cats]);

    const slideVariants = {
        enter: (d: number) => ({
            x: d > 0 ? '105%' : '-105%',
            scale: 0.9,
            opacity: 0,
            zIndex: 0
        }),
        center: {
            x: 0,
            scale: 1,
            opacity: 1,
            zIndex: 1,
            transition: {
                x: { type: "spring" as const, stiffness: 260, damping: 25 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
            }
        },
        exit: (d: number) => ({
            x: d > 0 ? '-30%' : '30%',
            scale: 0.9,
            opacity: 0,
            zIndex: 0,
            transition: {
                x: { type: "spring" as const, stiffness: 260, damping: 25 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
            }
        })
    };

    const handleCatInteraction = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        onCatClick?.();
    }, [onCatClick]);

    const handleOpenSidebar = useCallback((section?: 'care' | 'activity') => {
        if (onOpenSidebar) onOpenSidebar(section);
    }, [onOpenSidebar]);

    const handleSelectItem = useCallback((id: string, type: string, photos?: string[]) => {
        onSelectItem?.(id, type, photos);
    }, [onSelectItem]);


    // Magic Dust Particles State
    const [particles, setParticles] = useState<Array<{
        style: React.CSSProperties,
        animate: any,
        transition: any
    }>>([]);

    useEffect(() => {
        setParticles([...Array(8)].map(() => ({
            style: {
                width: Math.random() * 3 + 1 + "px",
                height: Math.random() * 3 + 1 + "px",
                left: Math.random() * 100 + "%",
                top: Math.random() * 100 + "%",
                opacity: Math.random() * 0.5 + 0.2,
            },
            animate: {
                y: [0, -100],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.2, 0.5]
            },
            transition: {
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5
            }
        })));
    }, []);

    return (
        <div
            className="fullscreen-bg w-full overflow-hidden z-0"
            style={{ backgroundColor: 'transparent' }}
            onClick={() => {
                resetHideTimer();
            }}
        >
            <motion.div
                animate={{
                    // Simplified animation relying on external state if needed, but for now fixed or use prop?
                    // If onOpenNyannlogSheet is passed, we don't know the exact tab state here unless passed too.
                    // Assuming 'y' animation was for sheet open effect. We can disable it or pass tab state.
                    // For now, let's keep it static 0% as sheet is overlay.
                    y: '0%'
                }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-0"
            >
                <HomeBackground
                    cats={cats}
                    activeCat={activeCat}
                    activeCatId={activeCatId}
                    currentIndex={currentIndex}
                    displayMedia={displayMedia}
                    isVideo={isVideo}
                    direction={direction}
                    handleSwipe={handleSwipe}
                    handleCatInteraction={handleCatInteraction}
                    setIsHeroImageLoaded={setIsHeroImageLoaded}
                    settings={settings}
                    particles={particles}
                    uiVisible={uiVisible}
                    isNight={isNight}
                />
            </motion.div>

            {/* Manual switching tap zones removed per design change */}



            {/* UI Toggle & Overlay View (Pure UI Layer) */}
            <motion.div
                className="fixed inset-0 z-[100] pointer-events-none"
                animate={{ opacity: isNyannlogOpen ? 0 : 1, pointerEvents: isNyannlogOpen ? 'none' : 'auto' }}
                transition={{ duration: 0.3 }}
            >
                {/* 1. Top Area: Minimal Controls */}
                <div
                    className="absolute right-4 pointer-events-auto flex items-center gap-2"
                    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
                >
                    {onToggleView && (
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                                triggerFeedback('light');
                                onToggleView();
                            }}
                            className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg active:bg-black/40 transition-colors"
                            title="Week Bentoに切替"
                        >
                            <Calendar className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
                        </motion.button>
                    )}
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                            triggerFeedback('light');
                            onOpenSidebar?.('care');
                        }}
                        className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg active:bg-black/40 transition-colors"
                    >
                        <Menu className="w-6 h-6 text-white" strokeWidth={1.5} />
                    </motion.button>
                </div>

                {/* Legend or Cat Badge could go here if needed */}
            </motion.div>

            {/* Note: Story mode cat switching is handled by swipe gestures */}



            {/* Note: Story mode cat switching is handled by swipe gestures */}

            {/* All modals lifted to page.tsx */}


        </div >
    );
}
