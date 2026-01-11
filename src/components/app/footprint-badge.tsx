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
                animate={showPulse ? { scale: 1.1 } : { scale: 1 }}
                transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 10 }}
                onClick={onClick}
                whileTap={{ scale: 0.95 }}
            >
                <span className="text-2xl">🐾</span>
                <div className="flex flex-col">
                    <motion.span
                        className="text-xl font-bold"
                        style={{ color: 'var(--sage)' }}
                        key={stats.householdTotal}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {stats.householdTotal.toLocaleString()}
                    </motion.span>
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
            animate={showPulse ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 10 }}
            onClick={onClick}
            whileTap={{ scale: 0.95 }}
        >
            {/* Paw emoji */}
            <span className="text-base drop-shadow-sm">🐾</span>

            {/* Point count badge */}
            <motion.div
                className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E8B4A0] flex items-center justify-center shadow-md ring-2 ring-white"
                key={stats.householdTotal}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <span className="text-[10px] font-bold text-white tabular-nums">
                    {stats.householdTotal > 999 ? '999+' : stats.householdTotal}
                </span>
            </motion.div>

            {/* Pulse ring on point gain */}
            <AnimatePresence>
                {showPulse && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-[#E8B4A0]"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    />
                )}
            </AnimatePresence>
        </motion.button>
    );
}

