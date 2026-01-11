"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, Camera, Grid3X3, Plus, Home, Calendar } from "lucide-react";
import { useFootprintContext } from "@/providers/footprint-provider";

interface LayoutBottomNavProps {
    progress: number;
    onOpenPickup: () => void;
    onOpenGallery: () => void;
    onOpenMenu: () => void;
    onOpenCalendar: () => void;
    onOpenExchange: () => void;
    activeCount?: number;
}

/**
 * ボトムナビゲーション型レイアウト
 * - 上部: なし（猫写真を最大化）
 * - 下部: フルワイドナビゲーションバー
 */
export function LayoutBottomNav({
    progress,
    onOpenPickup,
    onOpenGallery,
    onOpenMenu,
    onOpenCalendar,
    onOpenExchange,
    activeCount = 0,
}: LayoutBottomNavProps) {
    const { stats } = useFootprintContext();

    const glassStyle = {
        background: 'rgba(250, 249, 247, 0.85)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        boxShadow: '0 -4px 32px -4px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)'
    };

    return (
        <>
            {/* Bottom Navigation Bar */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto pb-safe"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div
                    className="mx-4 mb-4 rounded-2xl px-2 py-2"
                    style={glassStyle}
                >
                    <div className="flex items-center justify-around">
                        {/* Progress */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPickup}
                            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
                        >
                            <div className="relative">
                                <Heart className="w-6 h-6" style={{ color: 'var(--peach)' }} />
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[10px] font-bold flex items-center justify-center shadow-sm" style={{ color: 'var(--sage)' }}>
                                    {Math.round(progress * 100)}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-500">お世話</span>
                        </motion.button>

                        {/* Gallery */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenGallery}
                            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
                        >
                            <Camera className="w-6 h-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">写真</span>
                        </motion.button>

                        {/* Center: Add Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenPickup}
                            className="relative -mt-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: 'var(--peach)' }}
                        >
                            <Plus className="w-7 h-7 text-white" />
                            {activeCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {activeCount}
                                </div>
                            )}
                        </motion.button>

                        {/* Calendar */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenCalendar}
                            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
                        >
                            <Calendar className="w-6 h-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">予定</span>
                        </motion.button>

                        {/* Footprints / Exchange */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenExchange}
                            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
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
