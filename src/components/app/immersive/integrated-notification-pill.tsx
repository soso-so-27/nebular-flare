"use client";

import React from "react";
import { motion } from "framer-motion";
import { Camera, MessageCircle, Heart, PawPrint, Cat } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerFeedback } from "@/lib/haptics";

interface IntegratedNotificationPillProps {
    progress: number;
    alertItems: any[];
    footprints?: number;
    onOpenPhoto?: () => void;
    onOpenIncident?: () => void;
    onOpenCalendar?: () => void;
    onOpenExchange?: () => void;
}

export function IntegratedNotificationPill({
    progress,
    alertItems,
    footprints = 0,
    onOpenPhoto,
    onOpenIncident,
    onOpenCalendar,
    onOpenExchange
}: IntegratedNotificationPillProps) {
    // Count by type
    const photoCount = alertItems.filter(item => item.id?.startsWith('photo-')).length;
    const incidentCount = alertItems.filter(item => item.type === 'incident').length;

    const hasAnyAlerts = photoCount > 0 || incidentCount > 0;

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
    const textColor = hasAnyAlerts ? "text-white" : "text-white";
    const iconColor = hasAnyAlerts ? "text-white" : "text-white";

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

            {/* Divider */}
            <div className="w-px h-5 bg-white/20" />

            {/* 📷 とどける (Photo) */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    triggerFeedback('medium');
                    onOpenPhoto?.();
                }}
                className={cn(segmentBase, photoCount > 0 && "bg-white/10")}
            >
                <Camera className={cn("w-5 h-5", iconColor)} />
                <span className={cn("text-xs font-black tabular-nums", textColor)}>
                    {photoCount}
                </span>
            </motion.button>

            {/* Divider */}
            <div className="w-px h-5 bg-white/20" />

            {/* 💬 そうだん (Incident) */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    triggerFeedback('medium');
                    onOpenIncident?.();
                }}
                className={cn(segmentBase, incidentCount > 0 && "bg-white/10")}
            >
                <MessageCircle className={cn("w-5 h-5", iconColor)} />
                <span className={cn("text-xs font-black tabular-nums", textColor)}>
                    {incidentCount}
                </span>
            </motion.button>

            {/* Divider */}
            <div className="w-px h-5 bg-white/20" />

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
