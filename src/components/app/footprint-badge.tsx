"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFootprintContext } from '@/providers/footprint-provider';

interface FootprintBadgeProps {
    className?: string;
    variant?: 'compact' | 'full';
    onClick?: () => void;
}

export function FootprintBadge({ className = '', variant = 'compact', onClick }: FootprintBadgeProps) {
    const { stats, loading } = useFootprintContext();

    // Animate when points change
    const [prevPoints, setPrevPoints] = React.useState(stats.householdTotal);
    const [showPulse, setShowPulse] = React.useState(false);

    React.useEffect(() => {
        if (stats.householdTotal > prevPoints) {
            setShowPulse(true);
            const timer = setTimeout(() => setShowPulse(false), 600);
            return () => clearTimeout(timer);
        }
        setPrevPoints(stats.householdTotal);
    }, [stats.householdTotal, prevPoints]);

    // Digits counter animation component
    const Digit = ({ value }: { value: string }) => (
        <motion.span
            key={value}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
        >
            {value}
        </motion.span>
    );

    // Paw Particles Component
    const PawParticles = ({ active }: { active: boolean }) => {
        if (!active) return null;
        return (
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <motion.span
                        key={i}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                        animate={{
                            x: (Math.random() - 0.5) * 80,
                            y: (Math.random() - 0.5) * 80,
                            opacity: 0,
                            scale: 1.2,
                            rotate: Math.random() * 360
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm"
                    >
                        🐾
                    </motion.span>
                ))}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 rounded-full bg-[color:var(--sage)]/20"
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md ${className}`}>
                <span className="text-base">🐾</span>
            </div>
        );
    }

    if (variant === 'full') {
        return (
            <motion.div
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl shadow-lg border border-white/60 cursor-pointer ${className}`}
                animate={showPulse ? { scale: 1.05, y: -2 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 10 }}
                onClick={onClick}
                whileTap={{ scale: 0.95 }}
            >
                <div className="relative">
                    <span className="text-2xl">🐾</span>
                    <PawParticles active={showPulse} />
                </div>
                <div className="flex flex-col">
                    <div className="flex text-xl font-bold" style={{ color: 'var(--sage)' }}>
                        {stats.householdTotal.toLocaleString().split('').map((char, i) => (
                            <Digit key={`${i}-${char}`} value={char} />
                        ))}
                    </div>
                    <span className="text-xs text-slate-500 -mt-0.5">猫たちからの足あと</span>
                </div>
            </motion.div>
        );
    }

    // Compact variant (default) - Matches other UI icons (w-10 h-10)
    return (
        <motion.button
            className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer group ${className}`}
            style={{
                background: 'rgba(250, 249, 247, 0.45)',
                backdropFilter: 'blur(16px) saturate(1.8)',
                boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.4)'
            }}
            animate={showPulse ? { scale: 1.15 } : { scale: 1 }}
            transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 10 }}
            onClick={onClick}
            whileTap={{ scale: 0.95 }}
        >
            {/* Paw emoji */}
            <div className="relative">
                <span className="text-base drop-shadow-sm">🐾</span>
                <PawParticles active={showPulse} />
            </div>

            {/* Point count badge */}
            <motion.div
                className="absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-[#E8B4A0] flex items-center justify-center shadow-md ring-2 ring-white"
                key={stats.householdTotal}
                initial={{ scale: 0.8, y: 5 }}
                animate={{ scale: 1, y: 0 }}
            >
                <div className="flex text-[10px] font-bold text-white tabular-nums">
                    {stats.householdTotal > 999
                        ? '999+'
                        : stats.householdTotal.toString().split('').map((char, i) => (
                            <Digit key={`${i}-${char}`} value={char} />
                        ))
                    }
                </div>
            </motion.div>
        </motion.button>
    );
}

