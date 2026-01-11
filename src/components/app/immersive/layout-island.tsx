"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Camera, Grid3X3, ChevronDown } from "lucide-react";
import { useFootprintContext } from "@/providers/footprint-provider";

interface LayoutIslandProps {
    progress: number;
    onOpenPickup: () => void;
    onOpenGallery: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
    onOpenCareList: () => void; // Opens expandable care list like MagicBubble
}

/**
 * ダイナミックアイランド型レイアウト
 * - 上部中央: 統合ステータスピル
 *   - 進捗部分タップ → 下に展開するお世話一覧
 *   - 足あと部分タップ → 交換所
 * - 下部中央: フローティングDock
 */
export function LayoutIsland({
    progress,
    onOpenPickup,
    onOpenGallery,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenCareList,
}: LayoutIslandProps) {
    const { stats } = useFootprintContext();
    const [showCareList, setShowCareList] = useState(false);

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };

    const handleProgressClick = () => {
        onOpenCareList();
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
                <div
                    className="flex items-center gap-0 rounded-full overflow-hidden"
                    style={glassStyle}
                >
                    {/* Footprint Points - Tap to open exchange */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenExchange}
                        className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-white/30 transition-colors"
                    >
                        <span className="text-lg">🐾</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--peach)' }}>
                            {stats.householdTotal}
                        </span>
                    </motion.button>

                    {/* Separator */}
                    <div className="w-px h-6 bg-slate-300/50" />

                    {/* Progress - Tap to open care list (expands down) */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleProgressClick}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/30 transition-colors"
                    >
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
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.button>
                </div>
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
                    {/* Pickup Button (Heart icon for care) */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenPickup}
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--peach)' }}
                    >
                        <Heart className="w-6 h-6 text-white fill-white/30" />
                    </motion.button>

                    {/* Today's Photo Button (Opens photo modal) */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenPhoto}
                        className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center shadow-sm"
                    >
                        <Camera className="w-5 h-5 text-slate-600" />
                    </motion.button>

                    {/* Menu Button (Opens gallery/menu) */}
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
