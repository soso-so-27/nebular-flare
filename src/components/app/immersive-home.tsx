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
    Settings,
    Heart,
    X
} from "lucide-react";
import { CheckSection } from "./check-section";
import { ActivityFeed } from "./activity-feed";
import { ZenGestures } from "./immersive/zen-gestures";
import { EditorialCorners } from "./immersive/editorial-corners";
import { BubblePickupList } from "./immersive/bubble-pickup-list";
import { analyzeImageBrightness } from "@/lib/image-analysis";
import { unlockAudio } from "@/lib/sounds";
import { BrandLoader } from "@/components/ui/brand-loader";
import { ThemeExchangeModal } from "./theme-exchange-modal";
import { MagicBubble } from "./immersive/magic-bubble";
import { LayoutIsland } from "./immersive/layout-island";
import { LayoutBottomNav } from "./immersive/layout-bottom-nav";
import { MagicBubbleNeo } from "./immersive/magic-bubble-neo";
import { LayoutIslandNeo } from "./immersive/layout-island-neo";
import { LayoutBottomNavNeo } from "./immersive/layout-bottom-nav-neo";
import { useCareData } from "./immersive/unified-care-list";
import { PhotoModal } from "./photo-modal";
import { IncidentModal } from "./incident-modal";
import { IncidentDetailModal } from "./incident-detail-modal";
import { ActionPlusMenu } from "./immersive/action-plus-menu";

interface ImmersiveHomeProps {
    onOpenSidebar?: (section?: 'care' | 'activity') => void;
    onNavigate?: (tab: string) => void;
    onOpenCalendar?: () => void;
    onCatClick?: () => void;
}

// Helper Component for Mobile-Friendly Video
const BackgroundVideo = ({ src, poster, className, onClick, onLoadedData }: { src: string, poster?: string, className?: string, onClick?: (e: any) => void, onLoadedData?: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const attemptPlay = async () => {
            if (videoRef.current && videoRef.current.paused) {
                videoRef.current.defaultMuted = true;
                videoRef.current.muted = true;
                try {
                    await videoRef.current.play();
                } catch (e) {
                    console.log("Play failed", e);
                }
            }
        };

        // Try playing immediately
        attemptPlay();

        // Also resume when returning to the app (visibility change)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                attemptPlay();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [src]);

    return (
        <motion.video
            ref={videoRef}
            key={src} // Re-mount on src change to ensure reliable autoplay
            src={src}
            className={className}
            onClick={onClick}
            autoPlay
            muted
            loop
            playsInline
            poster={poster}
            onLoadedData={onLoadedData}
            onError={(e) => console.error("Video error:", e.currentTarget.error)}
        />
    );
};

export function ImmersiveHome({ onOpenSidebar, onNavigate, onOpenCalendar, onCatClick }: ImmersiveHomeProps) {
    const { cats, activeCatId, setActiveCatId, setIsHeroImageLoaded, settings, incidents } = useAppState();
    const [showThemeExchange, setShowThemeExchange] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showPickup, setShowPickup] = useState(false);
    const { progress } = useCareData();
    const [direction, setDirection] = useState(0);

    const activeIncidents = React.useMemo(() => {
        return (incidents || []).filter(inc => inc.status !== 'resolved');
    }, [incidents]);
    const [contrastMode, setContrastMode] = useState<'light' | 'dark'>('dark');

    const [uiVisible, setUiVisible] = useState(true);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Feature 4: Ambient Light (Night Mode)
    const [isNight, setIsNight] = useState(false);

    // iOS Audio Unlock Strategy: Aggressive
    useEffect(() => {
        const attemptUnlock = () => {
            unlockAudio().then(success => {
                if (success) {
                    // Unlocked
                }
            });
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
                console.log('[App] Page became visible, re-unlocking audio');
                unlockAudio();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const activeCat = cats.find(c => c.id === activeCatId);
    const currentIndex = cats.findIndex(c => c.id === activeCatId);

    // Helper function to get public URL from avatars bucket
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

    // Build array of all photos for the active cat
    const allPhotos = React.useMemo(() => {
        if (!activeCat) return [];
        const photos: string[] = [];
        if (activeCat.avatar) {
            photos.push(activeCat.avatar);
        }
        if (activeCat.images && activeCat.images.length > 0) {
            activeCat.images.forEach(img => {
                if (img.storagePath) {
                    const publicUrl = getPublicUrl(img.storagePath, { width: 1200, quality: 80 });
                    if (!photos.includes(publicUrl) && publicUrl !== activeCat.avatar) {
                        photos.push(publicUrl);
                    }
                }
            });
        }
        return photos;
    }, [activeCat]);

    // Select random photo - user useEffect to avoid hydration mismatch
    // Select random photo - user useEffect to avoid hydration mismatch
    const [randomPhotoIndex, setRandomPhotoIndex] = useState(0);

    // Use ref to track if we've already set a random index for this cat/photo-set to prevent loops
    const lastPhotoSetRef = useRef<string>('');

    useEffect(() => {
        if (allPhotos.length > 0) {
            const photoSetKey = `${activeCatId}-${allPhotos.length}`;
            if (lastPhotoSetRef.current !== photoSetKey) {
                setRandomPhotoIndex(Math.floor(Math.random() * allPhotos.length));
                lastPhotoSetRef.current = photoSetKey;
            }
        }
    }, [activeCatId, allPhotos.length]);

    const randomPhotoUrl = allPhotos.length > 0
        ? allPhotos[randomPhotoIndex % allPhotos.length]
        : activeCat?.avatar || null;

    // Determine Display Media based on background_mode
    const bgMediaInfo = React.useMemo(() => {
        const mode = activeCat?.background_mode || 'random';

        if (mode === 'media' && activeCat && activeCat.background_media) {
            const isVid = /\.(mp4|webm|mov)$/i.test(activeCat.background_media);
            return { displayMedia: activeCat.background_media, isVideo: isVid };
        }

        if (mode === 'avatar') {
            return { displayMedia: activeCat?.avatar || null, isVideo: false };
        }

        return { displayMedia: randomPhotoUrl, isVideo: false };
    }, [activeCat, randomPhotoUrl]);

    const { displayMedia, isVideo } = bgMediaInfo;

    const currentPhotoUrl = isVideo ? (activeCat?.avatar || null) : displayMedia;

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

        const hour = new Date().getHours();
        setIsNight(hour < 6 || hour >= 18);
    }, [activeCat, setIsHeroImageLoaded, allPhotos.length]);

    // Auto-hide Logic
    const resetHideTimer = useCallback(() => {
        setUiVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            setUiVisible(false);
        }, 3000);
    }, []);

    // Preload images
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

    // Setup Interaction Listeners
    useEffect(() => {
        window.addEventListener('mousemove', resetHideTimer);
        window.addEventListener('touchstart', resetHideTimer);
        window.addEventListener('click', resetHideTimer);

        resetHideTimer();

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
        cats.forEach(cat => {
            if (cat.avatar) {
                const img = new Image();
                img.src = cat.avatar;
            }
        });

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
            x: direction > 0 ? '105%' : '-105%',
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
        exit: (direction: number) => ({
            x: direction > 0 ? '-30%' : '30%',
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

    const handleOpenSidebar = (section?: 'care' | 'activity') => {
        if (onOpenSidebar) onOpenSidebar(section);
    };

    const handleTogglePickup = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setShowPickup(!showPickup);
    };


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
            className="fullscreen-bg w-full overflow-hidden z-[9999]"
            style={{ backgroundColor: 'transparent' }}
            onClick={() => {
                resetHideTimer();
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
                        dragElastic={1} // Full mobile responsiveness (follows finger exactly)
                        onDragEnd={handleSwipe}
                        className="absolute inset-0 overflow-hidden shadow-2xl" // Added shadow
                    >
                        {/* Breathing Container */}
                        <motion.div
                            className="w-full h-full relative"
                            animate={{ scale: [1, 1.02, 1] }} // Subtle breathing
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        >
                            {displayMedia ? (
                                isVideo ? (
                                    <BackgroundVideo
                                        src={displayMedia}
                                        poster={activeCat?.avatar}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={handleCatInteraction}
                                        onLoadedData={() => setIsHeroImageLoaded(true)}
                                    />
                                ) : (
                                    <motion.img
                                        src={displayMedia}
                                        alt={activeCat?.name || 'Cat'}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={handleCatInteraction}
                                        onLoad={() => setIsHeroImageLoaded(true)}
                                    />
                                )
                            ) : (
                                <motion.div
                                    className="w-full h-full bg-[#FAF9F7] flex items-center justify-center cursor-pointer"
                                    onClick={handleCatInteraction}
                                >
                                    <BrandLoader onClick={handleCatInteraction} />
                                </motion.div>
                            )}

                            {/* Magic Dust Particles */}
                            {particles.map((p, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute rounded-full bg-white blur-[1px] pointer-events-none"
                                    style={p.style}
                                    animate={p.animate}
                                    transition={p.transition}
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

            {/* Mode: Card (Tinder-style swipe, tilted stack, NO icons) */}
            {
                settings.homeViewMode === 'parallax' && (
                    <div className="absolute inset-0 overflow-hidden bg-[#FAF9F7] dark:bg-slate-950">
                        {/* Background Blur */}
                        <div className="absolute inset-0">
                            <AnimatePresence mode="popLayout">
                                <motion.div
                                    key={activeCatId}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.6 }}
                                    className="absolute inset-0"
                                >
                                    {displayMedia && (
                                        isVideo ? (
                                            <BackgroundVideo
                                                src={displayMedia}
                                                className="w-full h-full object-cover blur-3xl opacity-30 scale-125"
                                            />
                                        ) : (
                                            <img
                                                src={displayMedia}
                                                className="w-full h-full object-cover blur-3xl opacity-30 scale-125"
                                                alt=""
                                                loading="eager"
                                                decoding="async"
                                            />
                                        )
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Card Stack - positioned higher since bottom icons are now horizontal */}
                        <div
                            className="absolute left-4 right-4 flex items-center justify-center"
                            style={{
                                top: '100px',  /* Reduced from 140px - more card space */
                                bottom: '90px' /* Reduced from 100px - horizontal icons take less space */
                            }}
                        >
                            {/* Stack cards - positioned OUTSIDE and BEHIND with rotation */}
                            {cats.length > 1 && (
                                <>
                                    {/* Back card (Furthest) - rotated right */}
                                    {cats.length > 2 && (
                                        <div
                                            className="absolute inset-0 rounded-3xl glass-panel overflow-hidden"
                                            style={{
                                                transform: 'rotate(6deg) translateX(18px)',
                                                transformOrigin: 'center bottom',
                                                opacity: 0.6,
                                                zIndex: 0
                                            }}
                                        >
                                            {/* Show next-next cat if available */}
                                            {cats[(currentIndex + 2) % cats.length]?.avatar && (
                                                <div className="w-full h-full relative">
                                                    <img
                                                        src={cats[(currentIndex + 2) % cats.length].avatar || ''}
                                                        className="w-full h-full object-cover blur-[4px] opacity-80"
                                                        alt=""
                                                    />
                                                    <div className="absolute inset-0 bg-white/10 dark:bg-black/20" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Middle card (Closest to back) - slightly rotated */}
                                    <div
                                        className="absolute inset-0 rounded-3xl glass-panel overflow-hidden"
                                        style={{
                                            transform: 'rotate(3deg) translateX(9px)',
                                            transformOrigin: 'center bottom',
                                            opacity: 0.8,
                                            zIndex: 5
                                        }}
                                    >
                                        {/* Show next cat */}
                                        {cats[(currentIndex + 1) % cats.length]?.avatar && (
                                            <div className="w-full h-full relative">
                                                <img
                                                    src={cats[(currentIndex + 1) % cats.length].avatar || ''}
                                                    className="w-full h-full object-cover blur-[2px] opacity-90"
                                                    alt=""
                                                />
                                                <div className="absolute inset-0 bg-white/5 dark:bg-black/10" />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Main Card */}
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.div
                                    key={activeCatId}
                                    custom={direction}
                                    variants={{
                                        enter: (d: number) => ({
                                            x: d > 0 ? 500 : -500, // Cards fly in from further away
                                            opacity: 0,
                                            scale: 0.8,
                                            rotate: d > 0 ? 20 : -20,
                                            y: 0
                                        }),
                                        center: {
                                            x: 0,
                                            opacity: 1,
                                            scale: 1,
                                            rotate: 0,
                                            y: [0, -8, 0], // Breathing Floating Animation
                                            transition: {
                                                y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                                                default: { type: "spring", stiffness: 300, damping: 20 }
                                            }
                                        },
                                        exit: (d: number) => ({
                                            x: d > 0 ? -500 : 500, // Cards fly out further
                                            opacity: 0,
                                            scale: 0.8,
                                            rotate: d > 0 ? -20 : 20,
                                            transition: { duration: 0.2 }
                                        })
                                    }}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.7} // High elasticity for "throwing" feel
                                    onDragEnd={handleSwipe}
                                    onClick={() => onCatClick?.()}
                                    className="absolute inset-0 rounded-3xl overflow-hidden glass-panel cursor-pointer"
                                    style={{ zIndex: 10 }}
                                >
                                    {displayMedia ? (
                                        isVideo ? (
                                            <BackgroundVideo
                                                src={displayMedia}
                                                poster={activeCat?.avatar}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <img
                                                src={displayMedia}
                                                className="w-full h-full object-cover"
                                                alt={activeCat?.name || 'Cat'}
                                                loading="eager"
                                                decoding="sync"
                                            />
                                        )
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <BrandLoader className="scale-75 opacity-70" />
                                        </div>
                                    )}
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                                    {/* Cat name + swipe hint */}
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <h2 className="text-3xl font-black text-white drop-shadow-md mb-1">{activeCat?.name}</h2>
                                        {cats.length > 1 && (
                                            <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                                                <span>←</span>
                                                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">Swipe</span>
                                                <span>→</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
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
                    {/* --- NEO LAYOUTS (Standard/Optimized) --- */}

                    {/* --- LEGACY LAYOUTS --- */}
                    {settings.layoutType === 'classic' && (
                        <MagicBubble
                            onOpenPickup={() => setShowPickup(true)}
                            onOpenCalendar={() => onOpenCalendar?.()}
                            onOpenGallery={() => onNavigate?.('gallery')}
                            onOpenCare={() => handleOpenSidebar('care')}
                            onOpenActivity={() => handleOpenSidebar('activity')}
                            onOpenExchange={() => setShowThemeExchange(true)}
                            contrastMode={contrastMode}
                        />
                    )}

                    {settings.layoutType === 'island' && (
                        <LayoutIsland
                            progress={progress}
                            onOpenPickup={() => setShowPickup(true)}
                            onOpenGallery={() => onNavigate?.('gallery')}
                            onOpenMenu={() => handleOpenSidebar('care')}
                            onOpenExchange={() => setShowThemeExchange(true)}
                        />
                    )}

                    {settings.layoutType === 'bottom-nav' && (
                        <LayoutBottomNav
                            progress={progress}
                            onOpenPickup={() => setShowPickup(true)}
                            onOpenGallery={() => onNavigate?.('gallery')}
                            onOpenMenu={() => handleOpenSidebar('care')}
                            onOpenCalendar={() => onOpenCalendar?.()}
                            onOpenExchange={() => setShowThemeExchange(true)}
                        />
                    )}

                    {/* --- NEO LAYOUTS (Optimized v2) --- */}
                    {settings.layoutType.startsWith('v2-') && settings.layoutType.includes('classic') && (
                        <MagicBubbleNeo
                            onOpenPickup={() => { }}
                            onOpenCalendar={() => onOpenCalendar?.()}
                            onOpenGallery={() => onNavigate?.('gallery')}
                            onOpenCare={() => handleOpenSidebar('care')}
                            onOpenActivity={() => handleOpenSidebar('activity')}
                            onOpenPhoto={() => setShowPhotoModal(true)}
                            onOpenIncident={() => setShowIncidentModal(true)}
                            onOpenMenu={() => handleOpenSidebar('care')}
                            onOpenActionMenu={() => setShowActionMenu(true)}
                            onOpenExchange={() => setShowThemeExchange(true)}
                            contrastMode={contrastMode}
                        />
                    )}

                    {settings.layoutType.startsWith('v2-') && settings.layoutType.includes('island') && (
                        <LayoutIslandNeo
                            onOpenPickup={() => { }}
                            onOpenGallery={() => onNavigate?.('gallery')}
                            onOpenPhoto={() => setShowPhotoModal(true)}
                            onOpenMenu={() => handleOpenSidebar('care')}
                            onOpenExchange={() => setShowThemeExchange(true)}
                            onOpenIncident={() => setShowIncidentModal(true)}
                            onOpenIncidentDetail={setSelectedIncidentId}
                            onOpenActionMenu={() => setShowActionMenu(true)}
                        />
                    )}

                    {settings.layoutType.startsWith('v2-') && settings.layoutType.includes('bottom') && (
                        <LayoutBottomNavNeo
                            onOpenPickup={() => { }}
                            onOpenPhoto={() => setShowPhotoModal(true)}
                            onOpenMenu={() => handleOpenSidebar('care')}
                            onOpenExchange={() => setShowThemeExchange(true)}
                            onOpenIncident={() => setShowIncidentModal(true)}
                            onOpenIncidentDetail={setSelectedIncidentId}
                            onOpenActionMenu={() => setShowActionMenu(true)}
                        />
                    )}
                </div>
            </div>

            {/* Note: Story mode cat switching is handled by swipe gestures */}

            {/* Always visible: Floating Avatars (If Icon Mode) */}
            {
                settings.homeViewMode === 'icon' && (
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
                )
            }


            {/* Theme Exchange Modal */}
            <ThemeExchangeModal
                isOpen={showThemeExchange}
                onClose={() => setShowThemeExchange(false)}
            />

            {/* Photo Modal */}
            <PhotoModal
                isOpen={showPhotoModal}
                onClose={() => setShowPhotoModal(false)}
            />

            {/* Incident Creation Modal */}
            <IncidentModal
                isOpen={showIncidentModal}
                onClose={() => setShowIncidentModal(false)}
                defaultCatId={activeCatId}
            />

            {/* Incident Detail Modal */}
            {selectedIncidentId && (
                <IncidentDetailModal
                    isOpen={!!selectedIncidentId}
                    onClose={() => setSelectedIncidentId(null)}
                    incidentId={selectedIncidentId}
                />
            )}

            {/* Action Plus Menu */}
            <ActionPlusMenu
                isOpen={showActionMenu}
                onClose={() => setShowActionMenu(false)}
                onOpenPhoto={() => setShowPhotoModal(true)}
                onOpenIncident={() => setShowIncidentModal(true)}
                variant={settings.layoutType.includes('bottom') ? 'sheet' : 'dock'}
            />

            {/* --- Pickups Overlay (Legacy Mode) --- */}
            <BubblePickupList
                isOpen={showPickup}
                onClose={() => setShowPickup(false)}
            />

        </div >
    );
}
