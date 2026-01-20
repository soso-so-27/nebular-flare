"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, PawPrint, Cat } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerFeedback } from "@/lib/haptics";

interface IntegratedNotificationPillProps {
    progress: number;
    alertItems: any[];
    footprints?: number;

    onOpenCalendar?: () => void;
    onOpenExchange?: () => void;
    onOpenNyannlog?: () => void;
}

export function IntegratedNotificationPill({
    progress,
    alertItems,
    footprints = 0,
    onOpenCalendar,
    onOpenExchange,
    onOpenNyannlog
}: IntegratedNotificationPillProps) {
    // Count alerts (photos + incidents)
    const alertCount = alertItems.length;
    const hasAnyAlerts = alertCount > 0;

    const glassStyle = {
        background: hasAnyAlerts
            ? 'rgba(232, 180, 160, 0.5)'
            : 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(64px) saturate(3)',
        boxShadow: hasAnyAlerts
            ? '0 16px 64px -12px rgba(232, 180, 160, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 4px 8px 0 rgba(255, 255, 255, 0.2)'
            : '0 12px 48px -8px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
    };

    const segmentBase = "flex items-center gap-1.5 px-4 py-2 cursor-pointer hover:bg-white/10 rounded-full transition-colors";
    const textColor = "text-white";
    const iconColor = "text-white";

    return (
        <motion.div
            className="flex items-center rounded-full shadow-xl border border-white/20"
            style={glassStyle}
            layout
        >
            {/* ❤️ ケア (Care Progress) */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    triggerFeedback('medium');
                    onOpenCalendar?.();
                }}
                className={segmentBase}
            >
                <Cat className={cn("w-5 h-5", iconColor)} />
                <span className={cn("text-xs font-black tabular-nums", textColor)}>
                    {Math.round(progress * 100)}%
                </span>
            </motion.button>

            {/* 🐾 足あと (Footprints) */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    triggerFeedback('medium');
                    onOpenExchange?.();
                }}
                className={segmentBase}
            >
                <PawPrint className={cn("w-5 h-5", iconColor)} />
                <span className={cn("text-xs font-black tabular-nums", textColor)}>
                    {footprints}
                </span>
            </motion.button>
        </motion.div>
    );
}
