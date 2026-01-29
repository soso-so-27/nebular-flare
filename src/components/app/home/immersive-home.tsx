"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import {
    LayoutGrid,
    Activity,
    Menu,
    Cat,
    Calendar,
    Settings,
    Heart,
    X
} from "lucide-react";
import { CheckSection } from "../shared/check-section";
import { ActivityFeed } from "../shared/activity-feed";
import { ZenGestures } from "../immersive/zen-gestures";
import { EditorialCorners } from "../immersive/editorial-corners";
import { BubblePickupList } from "../immersive/bubble-pickup-list";
import { unlockAudio } from "@/lib/sounds";
import { LayoutIslandNeo } from "../immersive/layout-island-neo";
import { BackgroundVideo } from "../shared/background-video";
import { BrandLoader } from "../../ui/brand-loader";
import { HomeBackground } from "./home-background";
import { useCareData } from "@/hooks/use-care-logic";
import { ActionPlusMenu } from "../immersive/action-plus-menu";
import { ImmersivePhotoView } from "../immersive/ImmersivePhotoView";
import { useCatMedia } from "@/hooks/use-cat-media";
import { useHomeGestures } from "@/hooks/use-home-gestures";

// Lazy load heavy modals and sheets to reduce initial bundle size
const ThemeExchangeModal = React.lazy(() => import("../modals/theme-exchange-modal").then(m => ({ default: m.ThemeExchangeModal })));
const PhotoModal = React.lazy(() => import("../modals/photo-modal").then(m => ({ default: m.PhotoModal })));
const IncidentModal = React.lazy(() => import("../modals/incident-modal").then(m => ({ default: m.IncidentModal })));
const IncidentDetailModal = React.lazy(() => import("../modals/incident-detail-modal").then(m => ({ default: m.IncidentDetailModal })));
const PhotoListSheet = React.lazy(() => import("../modals/photo-list-sheet").then(m => ({ default: m.PhotoListSheet })));
const IncidentListSheet = React.lazy(() => import("../modals/incident-list-sheet").then(m => ({ default: m.IncidentListSheet })));
const NyannlogSheet = React.lazy(() => import("../modals/nyannlog-sheet").then(m => ({ default: m.NyannlogSheet })));

interface ImmersiveHomeProps {
    onOpenSidebar?: (section?: 'care' | 'activity') => void;
    onNavigate?: (tab: string) => void;
    onOpenCalendar?: () => void;
    onCatClick?: () => void;
}


export function ImmersiveHome({ onOpenSidebar, onNavigate, onOpenCalendar, onCatClick }: ImmersiveHomeProps) {
    const { cats, activeCatId, setActiveCatId, setIsHeroImageLoaded, settings, incidents } = useAppState();
    const [showThemeExchange, setShowThemeExchange] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showPickup, setShowPickup] = useState(false);
    const [showPhotoListSheet, setShowPhotoListSheet] = useState(false);
    const [showIncidentListSheet, setShowIncidentListSheet] = useState(false);
    const [showNyannlogSheet, setShowNyannlogSheet] = useState(false);
    const [nyannlogTab, setNyannlogTab] = useState<'events' | 'requests'>('events');
    const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
    const { progress } = useCareData();

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

    const {
        displayMedia,
        isVideo,
        allPhotos
    } = useCatMedia(activeCat);

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

    const handleOpenNyannlog = useCallback((tab: 'events' | 'requests' = 'events') => {
        setNyannlogTab(tab);
        setShowNyannlogSheet(true);
    }, []);

    const handleCloseNyannlog = useCallback(() => {
        setShowNyannlogSheet(false);
    }, []);

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

    const handleTogglePickup = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setShowPickup(prev => !prev);
    }, []);

    const handleSelectItem = useCallback((id: string, type: string, photos?: string[]) => {
        // If has photos, open photo viewer
        if (photos && photos.length > 0) {
            const cat = cats.find(c => {
                // Find cat with this incident or standalone photo
                const hasIncident = incidents?.some(inc => inc.id === id && inc.cat_id === c.id);
                const hasImage = c.images?.some(img => img.id === id);
                return hasIncident || hasImage;
            });
            setSelectedPhoto({
                id,
                url: photos[0].startsWith('http')
                    ? photos[0]
                    : `https://zfuuzgazbdzyclwnqkqm.supabase.co/storage/v1/object/public/avatars/${photos[0]}`,
                storagePath: photos[0],
                catName: cat?.name || '',
                catAvatar: cat?.avatar || '',
                allPhotos: photos
            });
        } else if (type === 'photo_standalone') {
            // Legacy photo_standalone handling
            let foundImg = null;
            for (const cat of cats) {
                const img = cat.images?.find(i => i.id === id);
                if (img) {
                    foundImg = {
                        ...img,
                        url: `https://zfuuzgazbdzyclwnqkqm.supabase.co/storage/v1/object/public/avatars/${img.storagePath}`,
                        catName: cat.name,
                        catAvatar: cat.avatar
                    };
                    break;
                }
            }
            if (foundImg) {
                setSelectedPhoto(foundImg);
            }
        } else {
            // No photos - open incident detail
            setSelectedIncidentId(id);
        }
    }, [cats, incidents]);


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

            {/* Story Mode Tap Zones (Story Mode Only) */}
            {
                settings.homeViewMode === 'story' && (
                    <>
                        <div className="absolute inset-y-0 left-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); goToCat(currentIndex - 1); resetHideTimer(); }} />
                        <div className="absolute inset-y-0 right-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); goToCat(currentIndex + 1); resetHideTimer(); }} />
                    </>
                )
            }

            {/* Story Mode Tap Zones (Story Mode Only) */}
            {
                settings.homeViewMode === 'story' && (
                    <>
                        <div className="absolute inset-y-0 left-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); goToCat(currentIndex - 1); resetHideTimer(); }} />
                        <div className="absolute inset-y-0 right-0 w-[30%] z-10" onClick={(e) => { e.stopPropagation(); goToCat(currentIndex + 1); resetHideTimer(); }} />
                    </>
                )
            }



            {/* Layout Layer - Based on layoutType setting */}
            <div className="fixed inset-0 pointer-events-none z-40">

                {/* 2. Responsive Layout Components */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* --- NEO LAYOUT (Island only) --- */}
                    <LayoutIslandNeo
                        onOpenPickup={() => { }}
                        onOpenGallery={() => onNavigate?.('gallery')}
                        onOpenPhoto={() => setShowPhotoListSheet(true)}
                        onOpenMenu={() => handleOpenSidebar('care')}
                        onOpenExchange={() => setShowThemeExchange(true)}
                        onOpenIncident={() => setShowIncidentListSheet(true)}
                        onOpenIncidentDetail={setSelectedIncidentId}

                        onOpenCalendar={() => onOpenCalendar?.()}
                        onOpenNyannlogSheet={handleOpenNyannlog}
                    />
                </div>
            </div>

            {/* Note: Story mode cat switching is handled by swipe gestures */}

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


            {/* Theme Exchange Modal (lazy) */}
            {showThemeExchange && (
                <Suspense fallback={null}>
                    <ThemeExchangeModal
                        isOpen={showThemeExchange}
                        onClose={() => setShowThemeExchange(false)}
                    />
                </Suspense>
            )}

            {/* Photo Modal (lazy) */}
            {showPhotoModal && (
                <Suspense fallback={null}>
                    <PhotoModal
                        isOpen={showPhotoModal}
                        onClose={() => setShowPhotoModal(false)}
                    />
                </Suspense>
            )}

            {/* Incident Creation Modal (lazy) */}
            {showIncidentModal && (
                <Suspense fallback={null}>
                    <IncidentModal
                        isOpen={showIncidentModal}
                        onClose={() => setShowIncidentModal(false)}
                        defaultCatId={activeCatId}
                    />
                </Suspense>
            )}

            {/* Incident Detail Modal (lazy) */}
            {selectedIncidentId && (
                <Suspense fallback={null}>
                    <IncidentDetailModal
                        isOpen={!!selectedIncidentId}
                        onClose={() => setSelectedIncidentId(null)}
                        incidentId={selectedIncidentId}
                    />
                </Suspense>
            )}

            {/* Action Plus Menu */}
            <ActionPlusMenu
                isOpen={showActionMenu}
                onClose={() => setShowActionMenu(false)}
                onOpenPhoto={() => setShowPhotoModal(true)}
                onOpenIncident={() => setShowIncidentModal(true)}
                onOpenNyannlog={handleOpenNyannlog}
                variant="dock"
            />


            {/* --- Pickups Overlay (Legacy Mode) --- */}
            <BubblePickupList
                isOpen={showPickup}
                onClose={() => setShowPickup(false)}
            />

            {/* Photo List Sheet (lazy) */}
            {showPhotoListSheet && (
                <Suspense fallback={null}>
                    <PhotoListSheet
                        isOpen={showPhotoListSheet}
                        onClose={() => setShowPhotoListSheet(false)}
                    />
                </Suspense>
            )}

            {/* Incident List Sheet (lazy) */}
            {showIncidentListSheet && (
                <Suspense fallback={null}>
                    <IncidentListSheet
                        isOpen={showIncidentListSheet}
                        onClose={() => setShowIncidentListSheet(false)}
                    />
                </Suspense>
            )}

            {/* Theme Exchange Modal (duplicate removed - using first instance) */}

            {/* Nyannlog Sheet (lazy) */}
            {showNyannlogSheet && (
                <Suspense fallback={null}>
                    <NyannlogSheet
                        isOpen={showNyannlogSheet}
                        initialTab={nyannlogTab}
                        onClose={handleCloseNyannlog}
                        onOpenCalendar={handleOpenCalendarWrapper}
                        onOpenNew={handleOpenNewWrapper}
                        onSelectItem={handleSelectItem}
                    />
                </Suspense>
            )}



            {/* Photo Viewer (from Nyannlog) */}
            <ImmersivePhotoView
                isOpen={!!selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
                image={selectedPhoto}
            />

        </div >
    );
}
