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
                navigator.vibrate([50, 30, 50]); // Short double tap pattern
            }

            // Auto-hide after animation
            const timer = setTimeout(() => {
                setShow(false);
                onComplete?.();
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 pointer-events-none flex items-center justify-center z-[9999]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Radial glow background */}
                    <motion.div
                        className="absolute w-40 h-40 rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(232, 180, 160, 0.3) 0%, transparent 70%)',
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 2, opacity: 1 }}
                        exit={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />

                    {/* Main paw icon with spring animation */}
                    <motion.div
                        className="relative flex flex-col items-center"
                        initial={{ scale: 0, y: 20, opacity: 0 }}
                        animate={{
                            scale: 1,
                            y: 0,
                            opacity: 1,
                        }}
                        exit={{
                            scale: 0.8,
                            y: -30,
                            opacity: 0
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 15,
                            mass: 0.8,
                        }}
                    >
                        {/* Paw emoji with subtle bounce */}
                        <motion.span
                            className="text-6xl drop-shadow-lg"
                            animate={{
                                scale: [1, 1.15, 1],
                                rotate: [0, -5, 5, 0],
                            }}
                            transition={{
                                duration: 0.5,
                                delay: 0.2,
                                ease: 'easeInOut',
                            }}
                        >
                            🐾
                        </motion.span>

                        {/* Points badge with delayed entrance */}
                        <motion.div
                            className="mt-2 px-4 py-1.5 rounded-full font-bold text-lg shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, var(--sage) 0%, oklch(0.60 0.12 150) 100%)',
                                color: '#fff',
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                type: 'spring',
                                stiffness: 500,
                                damping: 20,
                                delay: 0.15,
                            }}
                        >
                            +{points}
                        </motion.div>
                    </motion.div>

                    {/* Sparkle particles */}
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                                background: i % 2 === 0 ? 'var(--peach)' : 'var(--sage)',
                            }}
                            initial={{
                                x: 0,
                                y: 0,
                                scale: 0,
                                opacity: 1
                            }}
                            animate={{
                                x: Math.cos((i * 60) * Math.PI / 180) * 80,
                                y: Math.sin((i * 60) * Math.PI / 180) * 80,
                                scale: [0, 1.5, 0],
                                opacity: [1, 1, 0],
                            }}
                            transition={{
                                duration: 0.8,
                                delay: 0.1 + i * 0.05,
                                ease: 'easeOut',
                            }}
                        />
                    ))}
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
// FootprintToast - Minimal toast variant (bottom of screen)
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

            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(40);
            }

            const timer = setTimeout(() => {
                setShow(false);
                onComplete?.();
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
                    initial={{ y: 20, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -10, opacity: 0, scale: 0.95 }}
                    transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                    }}
                >
                    <div
                        className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm"
                        style={{
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid var(--sage)',
                        }}
                    >
                        <motion.span
                            className="text-2xl"
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.3 }}
                        >
                            🐾
                        </motion.span>
                        <span
                            className="font-bold text-base"
                            style={{ color: 'var(--sage)' }}
                        >
                            +{points}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
