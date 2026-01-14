"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, Camera, Grid3X3, Plus } from "lucide-react";
import { useFootprintContext } from "@/providers/footprint-provider";

interface LayoutIslandProps {
    progress: number;
    onOpenPickup: () => void;
    onOpenGallery: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
}

/**
 * 繝繧､繝翫Α繝・け繧｢繧､繝ｩ繝ｳ繝牙梛繝ｬ繧､繧｢繧ｦ繝・ * - 荳企Κ荳ｭ螟ｮ: 邨ｱ蜷医せ繝・・繧ｿ繧ｹ繝斐Ν・郁ｶｳ縺ゅ→ + 騾ｲ謐暦ｼ・ * - 荳矩Κ荳ｭ螟ｮ: 繝輔Ο繝ｼ繝・ぅ繝ｳ繧ｰDock
 */
export function LayoutIsland({
    progress,
    onOpenPickup,
    onOpenGallery,
    onOpenMenu,
    onOpenExchange,
}: LayoutIslandProps) {
    const { stats } = useFootprintContext();

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };

    return (
        <>
            {/* Top Center: Status Pill */}
            <motion.div
                className="absolute top-[2.5rem] left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onOpenExchange}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-full"
                    style={glassStyle}
                >
                    {/* Footprint Points */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-lg">誓</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--peach)' }}>
                            {stats.householdTotal}
                        </span>
                    </div>

                    {/* Separator */}
                    <div className="w-px h-4 bg-slate-300/50" />

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" style={{ color: 'var(--peach)' }} />
                        <span className="text-sm font-bold text-slate-600 tabular-nums">
                            {Math.round(progress * 100)}%
                        </span>
                        <div className="h-2 w-12 bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'var(--peach)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </motion.button>
            </motion.div>

            {/* Bottom Center: Floating Dock */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                <div
                    className="flex items-center gap-4 px-5 py-3 rounded-full"
                    style={glassStyle}
                >
                    {/* Add Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenPickup}
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--peach)' }}
                    >
                        <Plus className="w-6 h-6 text-white" />
                    </motion.button>

                    {/* Camera Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenGallery}
                        className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                    >
                        <Camera className="w-5 h-5 text-slate-600" />
                    </motion.button>

                    {/* Menu Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenMenu}
                        className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                    >
                        <Grid3X3 className="w-5 h-5 text-slate-600" />
                    </motion.button>
                </div>
            </motion.div>
        </>
    );
}
