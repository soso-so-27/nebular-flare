"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================
// FootprintPopup - Duolingo-style reward animation
// =====================================================

interface FootprintPopupProps {
    points: number;
    isVisible: boolean;
    onComplete?: () => void;
}

export function FootprintPopup({ points, isVisible, onComplete }: FootprintPopupProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);

            // Haptic feedback (if supported)
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }

            // Auto-hide after animation
            const timer = setTimeout(() => {
                setShow(false);
                onComplete?.();
            }, 2200);

            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    const isPositive = points > 0;
    const absPoints = Math.abs(points);

    return (
        <AnimatePresence mode="wait">
            {show && (
                <motion.div
                    className="fixed inset-0 pointer-events-none flex items-center justify-center z-[9999]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Radial glow background */}
                    <motion.div
                        className={cn(
                            "absolute w-60 h-60 rounded-full",
                            isPositive
                                ? "bg-[radial-gradient(circle,oklch(from_var(--sage)_l_c_h_/_0.4)_0%,transparent_70%)]"
                                : "bg-[radial-gradient(circle,rgba(232,180,160,0.4)_0%,transparent_70%)]" // Peach is HEX so keep RGBA for now or use relative syntax if valid
                        )}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0.5, 2, 2.5], opacity: [0, 0.8, 0] }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />

                    {/* Main Content Group */}
                    <motion.div
                        className="relative flex flex-col items-center"
                        initial={{ scale: 0, y: 40, opacity: 0, rotate: -15 }}
                        animate={{
                            scale: 1,
                            y: 0,
                            opacity: 1,
                            rotate: 0
                        }}
                        exit={{
                            scale: 0.6,
                            y: -120,
                            opacity: 0,
                            rotate: 15
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 20,
                            mass: 0.6,
                        }}
                    >
                        {/* Paw Icon with pop effect */}
                        <motion.div
                            animate={{
                                scale: [1, 1.3, 1],
                                rotate: [0, -10, 10, 0]
                            }}
                            transition={{
                                duration: 0.6,
                                delay: 0.1,
                                ease: "backOut"
                            }}
                        >
                            <span className="text-8xl drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)] block">
                                🐾
                            </span>
                        </motion.div>

                        {/* Points Badge - Elegant Duo-tone Pill */}
                        <motion.div
                            className={cn(
                                "mt-6 px-8 py-2.5 rounded-full font-black text-3xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] flex items-center gap-2 text-white border-2 border-white/20",
                                isPositive
                                    ? "bg-gradient-to-br from-brand-sage to-emerald-700"
                                    : "bg-gradient-to-br from-brand-peach to-orange-600"
                            )}
                            initial={{ scale: 0, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 600,
                                damping: 22,
                                delay: 0.2,
                            }}
                        >
                            <span className="opacity-70 text-2xl font-black">{isPositive ? '+' : '-'}</span>
                            <span className="tabular-nums">{absPoints}</span>
                        </motion.div>
                    </motion.div>

                    {/* Premium Sparkle Particles */}
                    {[...Array(16)].map((_, i) => {
                        const angle = (i * 22.5) * Math.PI / 180;
                        const distance = 120 + Math.random() * 60;
                        const size = Math.random() * 8 + 4;
                        return (
                            <motion.div
                                key={`pop-${i}`}
                                className="absolute rounded-full"
                                style={{
                                    width: size,
                                    height: size,
                                    background: i % 4 === 0
                                        ? (isPositive ? '#D4EAC8' : '#FFEBE0')
                                        : (isPositive ? 'var(--sage)' : 'var(--peach)'),
                                    boxShadow: '0 0 12px rgba(255,255,255,0.4)',
                                    zIndex: 10
                                }}
                                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                animate={{
                                    x: Math.cos(angle) * distance,
                                    y: Math.sin(angle) * distance,
                                    scale: [0, 1.5, 0],
                                    opacity: [1, 1, 0],
                                    rotate: Math.random() * 360
                                }}
                                transition={{
                                    duration: 0.8 + Math.random() * 0.4,
                                    delay: 0.15 + (i * 0.01),
                                    ease: [0.16, 1, 0.3, 1], // easeOutQuart
                                }}
                            />
                        );
                    })}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// =====================================================
// useFootprintReward - Hook to trigger the animation
// =====================================================

interface FootprintRewardState {
    isVisible: boolean;
    points: number;
    key: number;
}

export function useFootprintReward() {
    const [state, setState] = useState<FootprintRewardState>({
        isVisible: false,
        points: 0,
        key: 0,
    });

    const showReward = useCallback((points: number = 1) => {
        setState(prev => ({
            isVisible: true,
            points,
            key: prev.key + 1,
        }));
    }, []);

    const hideReward = useCallback(() => {
        setState(prev => ({ ...prev, isVisible: false }));
    }, []);

    return {
        showReward,
        hideReward,
        FootprintRewardElement: (
            <FootprintPopup
                key={state.key}
                points={state.points}
                isVisible={state.isVisible}
                onComplete={hideReward}
            />
        ),
    };
}

// =====================================================
// FootprintToast - Minimal toast variant
// =====================================================

interface FootprintToastProps {
    points: number;
    isVisible: boolean;
    onComplete?: () => void;
}

export function FootprintToast({ points, isVisible, onComplete }: FootprintToastProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            if (navigator.vibrate) navigator.vibrate(40);
            const timer = setTimeout(() => {
                setShow(false);
                onComplete?.();
            }, 1800);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    const isPositive = points > 0;
    const absPoints = Math.abs(points);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
                    initial={{ y: 30, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.9 }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 25,
                    }}
                >
                    <div
                        className={cn(
                            "flex items-center gap-3 px-5 py-2.5 rounded-full shadow-xl backdrop-blur-md border",
                            isPositive
                                ? "bg-brand-sage/90 border-brand-sage"
                                : "bg-brand-peach/90 border-brand-peach"
                        )}
                    >
                        <motion.span
                            className="text-2xl"
                            animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.4 }}
                        >
                            🐾
                        </motion.span>
                        <span className="font-black text-lg text-white tabular-nums">
                            {isPositive ? '+' : '-'}{absPoints}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
