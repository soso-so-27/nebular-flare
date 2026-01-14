"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronDown, Heart, AlertCircle, Camera, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegratedNotificationPillProps {
    progress: number;
    alertItems: any[];
    isExpanded: boolean;
    onToggle: () => void;
    onFootprintClick?: () => void;
    footprints?: number;
    contrastMode?: 'light' | 'dark';
}

export function IntegratedNotificationPill({
    progress,
    alertItems,
    isExpanded,
    onToggle,
    onFootprintClick,
    footprints = 0,
    contrastMode = 'light'
}: IntegratedNotificationPillProps) {
    const hasAlerts = alertItems.length > 0;
    const hasIncidents = alertItems.some(item => item.type === 'incident');
    const hasPhotos = alertItems.some(item => item.id?.startsWith('photo-'));

    // Get the most important/recent alert text
    const latestAlertText = alertItems[0]?.label || "件の通知があります";

    const glassStyle = {
        background: hasAlerts ? 'rgba(232, 180, 160, 0.98)' : 'rgba(250, 249, 247, 0.75)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4)',
        color: hasAlerts ? 'white' : 'inherit'
    };

    return (
        <motion.div
            className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 cursor-pointer shadow-lg hover:shadow-xl transition-all",
                hasAlerts ? "max-w-[320px] ring-2 ring-white/50" : "max-w-fit"
            )}
            style={glassStyle}
            onClick={onToggle}
            whileTap={{ scale: 0.98 }}
            layout
        >
            {/* Left: Alerts Icons & Text */}
            <div className="flex items-center gap-2 mr-1 overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {hasAlerts ? (
                        <motion.div
                            key="alert-mode"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                        >
                            <div className="relative shrink-0">
                                {hasIncidents ? (
                                    <AlertCircle className="w-4 h-4 text-white" />
                                ) : hasPhotos ? (
                                    <Camera className="w-4 h-4 text-white" />
                                ) : (
                                    <Bell className="w-4 h-4 text-white" />
                                )}
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                            </div>
                            <span className="text-xs font-bold truncate max-w-[140px]">
                                {latestAlertText}
                            </span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="normal-mode"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Heart className="w-4 h-4 text-[#E8B4A0]" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Middle: Progress Bar */}
            <div className={cn(
                "flex items-center gap-2 border-l pl-3 mr-1 transition-colors",
                hasAlerts ? "border-white/30" : "border-slate-200"
            )}>
                <span className={cn(
                    "text-[10px] font-bold tabular-nums",
                    hasAlerts ? "text-white" : "text-slate-600"
                )}>
                    {Math.round(progress * 100)}%
                </span>
                <div className={cn(
                    "h-1.5 w-10 rounded-full overflow-hidden transition-colors",
                    hasAlerts ? "bg-white/20" : "bg-black/5"
                )}>
                    <motion.div
                        className="h-full rounded-full bg-white"
                        style={{ background: hasAlerts ? 'white' : 'var(--peach)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>

                {/* Footprints Point Display */}
                <motion.div
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onFootprintClick?.();
                    }}
                    className={cn(
                        "flex items-center gap-1 border-l pl-3 transition-colors cursor-pointer hover:opacity-70",
                        hasAlerts ? "border-white/30" : "border-slate-200"
                    )}
                >
                    <PawPrint className={cn("w-3 h-3", hasAlerts ? "text-white/70" : "text-[#D97706]")} />
                    <span className={cn(
                        "text-[10px] font-bold tabular-nums",
                        hasAlerts ? "text-white" : "text-slate-700"
                    )}>
                        {footprints.toLocaleString()}
                    </span>
                </motion.div>
            </div>

            {/* Right: Expand Icon */}
            <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-1 shrink-0"
            >
                <ChevronDown className={cn("w-4 h-4", hasAlerts ? "text-white/70" : "text-slate-400")} />
            </motion.div>
        </motion.div>
    );
}
