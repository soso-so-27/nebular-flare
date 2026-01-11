"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFootprintContext } from '@/providers/footprint-provider';

interface FootprintBadgeProps {
    className?: string;
    variant?: 'compact' | 'full';
}

export function FootprintBadge({ className = '', variant = 'compact' }: FootprintBadgeProps) {
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
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md ${className}`}>
                <span className="text-lg">🐾</span>
                <span className="text-sm font-bold text-white/60">---</span>
            </div>
        );
    }

    if (variant === 'full') {
        return (
            <motion.div
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl shadow-lg border border-white/60 ${className}`}
                animate={showPulse ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
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

    // Compact variant (default)
    return (
        <motion.div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 ${className}`}
            animate={showPulse ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.3, type: 'spring' }}
        >
            <span className="text-sm">🐾</span>
            <motion.span
                className="text-sm font-bold text-white drop-shadow-sm"
                key={stats.householdTotal}
                initial={{ opacity: 0.5, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                {stats.householdTotal.toLocaleString()}
            </motion.span>

            {/* Pulse ring on point gain */}
            <AnimatePresence>
                {showPulse && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-white/60"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
