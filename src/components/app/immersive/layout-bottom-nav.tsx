"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, Camera, Grid3X3 } from "lucide-react";
import { useFootprintContext } from "@/providers/footprint-provider";

interface LayoutBottomNavProps {
    progress: number;
    onOpenPickup: () => void;
    onOpenPhoto: () => void;
    onOpenMenu: () => void;
    onOpenExchange: () => void;
    onOpenCareList: () => void; // Opens top-left care list
}

/**
 * ボトムナビゲーション型レイアウト
 * - 左上: お世話進捗ボタン（展開するケアリスト）
 * - 下部: ナビゲーションバー（ピックアップ、📷、メニュー、🐾）
 */
export function LayoutBottomNav({
    progress,
    onOpenPickup,
    onOpenPhoto,
    onOpenMenu,
    onOpenExchange,
    onOpenCareList,
}: LayoutBottomNavProps) {
    const { stats } = useFootprintContext();

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.85)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        boxShadow: '0 -4px 32px -4px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)'
    };

    const pillStyle = {
        background: 'rgba(250, 249, 247, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 2px 0 0 rgba(255, 255, 255, 0.5)'
    };

    return (
        <>
            {/* Top Left: Care Progress Button */}
            <motion.div
                className="absolute top-[2.5rem] left-6 z-40 pointer-events-auto"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onOpenCareList}
                    className="flex items-center gap-2 px-3 py-2 rounded-full"
                    style={pillStyle}
                >
                    <Heart className="w-5 h-5" style={{ color: 'var(--peach)' }} />
                    <span className="text-sm font-bold text-slate-600 tabular-nums">
                        {Math.round(progress * 100)}%
                    </span>
                    <div className="h-2 w-16 bg-black/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'var(--peach)' }}
                            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                        />
                    </div>
                </motion.button>
            </motion.div>

            {/* Bottom Navigation Bar */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto pb-safe"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div
                    className="mx-4 mb-4 rounded-2xl px-4 py-3"
                    style={glassStyle}
                >
                    <div className="flex items-center justify-around">
                        {/* Pickup (Heart) */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPickup}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <Heart className="w-6 h-6" style={{ color: 'var(--peach)' }} />
                            <span className="text-[10px] text-slate-500">ピックアップ</span>
                        </motion.button>

                        {/* Center: Photo Button (Camera) */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPhoto}
                            className="relative -mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: 'var(--peach)' }}
                        >
                            <Camera className="w-7 h-7 text-white" />
                        </motion.button>

                        {/* Menu */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenMenu}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <Grid3X3 className="w-6 h-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">メニュー</span>
                        </motion.button>

                        {/* Footprints / Exchange */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenExchange}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
                        >
                            <div className="relative">
                                <span className="text-xl">🐾</span>
                                <div className="absolute -top-1 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--peach)' }}>
                                    {stats.householdTotal}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-500">交換</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
