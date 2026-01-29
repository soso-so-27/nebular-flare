"use client";

import React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { BackgroundVideo } from "../shared/background-video";
import { BrandLoader } from "../../ui/brand-loader";
import { Cat, AppSettings } from "@/types";

interface HomeBackgroundProps {
    cats: Cat[];
    activeCat?: Cat;
    activeCatId: string;
    currentIndex: number;
    displayMedia: string | null;
    isVideo: boolean;
    direction: number;
    handleSwipe: (event: any, info: PanInfo) => void;
    handleCatInteraction: (e?: React.MouseEvent) => void;
    setIsHeroImageLoaded: (loaded: boolean) => void;
    settings: AppSettings;
    particles: any[];
    uiVisible: boolean;
    isNight: boolean;
}

export const HomeBackground = React.memo(function HomeBackground({
    cats,
    activeCat,
    activeCatId,
    currentIndex,
    displayMedia,
    isVideo,
    direction,
    handleSwipe,
    handleCatInteraction,
    setIsHeroImageLoaded,
    settings,
    particles,
    uiVisible,
    isNight
}: HomeBackgroundProps) {
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

    return (
        <>
            {/* Mode: Story / Icon / Default */}
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
                        dragElastic={1}
                        onDragEnd={handleSwipe}
                        className="absolute inset-0 overflow-hidden shadow-2xl"
                    >
                        <motion.div
                            className="w-full h-full relative"
                            animate={{ scale: [1, 1.02, 1] }}
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
                                    className="w-full h-full bg-background flex items-center justify-center cursor-pointer"
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

                        <div
                            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none transition-opacity duration-1000"
                            style={{ opacity: uiVisible ? 1 : 0 }}
                        />

                        {isNight && (
                            <div className="absolute inset-0 bg-orange-900/10 mix-blend-overlay pointer-events-none z-10" />
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Mode: Parallax Card */}
            {settings.homeViewMode === 'parallax' && (
                <div className="absolute inset-0 overflow-hidden bg-background dark:bg-background">
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

                    <div
                        className="absolute left-4 right-4 flex items-center justify-center"
                        style={{ top: '110px', bottom: '110px' }}
                    >
                        {/* Stack cards */}
                        {cats.length > 1 && (
                            <>
                                {cats.length > 2 && (
                                    <div
                                        className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg border border-white/10"
                                        style={{
                                            transform: 'rotate(6deg) translateX(18px)',
                                            transformOrigin: 'center bottom',
                                            opacity: 0.6,
                                            zIndex: 0,
                                            background: 'rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        {cats[(currentIndex + 2) % cats.length]?.avatar && (
                                            <div className="w-full h-full relative">
                                                <img
                                                    src={cats[(currentIndex + 2) % cats.length].avatar || ''}
                                                    className="w-full h-full object-cover blur-[4px] opacity-80"
                                                    alt=""
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div
                                    className="absolute inset-0 rounded-3xl overflow-hidden shadow-md border border-white/10"
                                    style={{
                                        transform: 'rotate(3deg) translateX(9px)',
                                        transformOrigin: 'center bottom',
                                        opacity: 0.8,
                                        zIndex: 5,
                                        background: 'rgba(255,255,255,0.1)'
                                    }}
                                >
                                    {cats[(currentIndex + 1) % cats.length]?.avatar && (
                                        <div className="w-full h-full relative">
                                            <img
                                                src={cats[(currentIndex + 1) % cats.length].avatar || ''}
                                                className="w-full h-full object-cover blur-[2px] opacity-90"
                                                alt=""
                                            />
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
                                        x: d > 0 ? 500 : -500,
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
                                        y: [0, -8, 0],
                                        transition: {
                                            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                                            default: { type: "spring", stiffness: 300, damping: 20 }
                                        }
                                    },
                                    exit: (d: number) => ({
                                        x: d > 0 ? -500 : 500,
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
                                dragElastic={0.7}
                                onDragEnd={handleSwipe}
                                onClick={() => handleCatInteraction()}
                                className="absolute inset-0 rounded-3xl overflow-hidden bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-2xl border border-white/20 cursor-pointer"
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
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
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
            )}
        </>
    );
});
