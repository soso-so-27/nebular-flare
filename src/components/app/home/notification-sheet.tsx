"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Info, Heart, Camera, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface NotificationItem {
    id: string;
    type: 'care' | 'system' | 'photo' | 'alert';
    title: string;
    message: string;
    timestamp: Date;
    isUnread: boolean;
    link?: string;
    incidentId?: string; // New: for direct navigation
    targetDate?: Date;   // New: for jumping to a specific day
}

interface NotificationSheetProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: NotificationItem[];
    onSelectItem?: (item: NotificationItem) => void;
}

export function NotificationSheet({ isOpen, onClose, notifications, onSelectItem }: NotificationSheetProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#4E342E]/10 backdrop-blur-sm z-[100]"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 250 }}
                        className="fixed bottom-0 inset-x-0 bg-[#fefefe] rounded-t-[40px] z-[101] flex flex-col max-h-[90vh] border-t border-black/5 shadow-[0_-8px_40px_rgba(78,52,46,0.1)] overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center pt-4 pb-2">
                            <div className="w-10 h-1.5 rounded-full bg-black/5" />
                        </div>

                        {/* Header */}
                        <div className="px-8 py-6 flex items-center justify-between">
                            <h2 className="text-[22px] font-black text-[#1c1c1e] tracking-tight">
                                通知
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center active:bg-black/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-[#1c1c1e]/40" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 pb-[env(safe-area-inset-bottom,24px)]">
                            {notifications.length === 0 ? (
                                <div className="py-24 flex flex-col items-center gap-4 text-black/5">
                                    <Bell className="w-16 h-16 stroke-[1]" />
                                    <p className="text-[15px] font-bold">新しい通知はありません</p>
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelectItem?.(item)}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-5 rounded-[24px] transition-all border text-left active:scale-[0.98]",
                                            item.isUnread
                                                ? "bg-white border-[#f0f0f0] shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
                                                : "bg-transparent border-transparent grayscale opacity-50"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <div className="flex items-center justify-between gap-3 mb-0.5">
                                                <div className="flex items-center gap-2">
                                                    {item.isUnread && (
                                                        <div className="w-2 h-2 rounded-full bg-[#1c1c1e] shadow-[0_0_8px_rgba(28,28,30,0.2)]" />
                                                    )}
                                                    <h3 className={cn(
                                                        "text-[15px] font-black truncate tracking-tight",
                                                        item.isUnread ? "text-[#1c1c1e]" : "text-[#1c1c1e]/60"
                                                    )}>
                                                        {item.title}
                                                    </h3>
                                                </div>
                                                <span className="text-[11px] text-[#1c1c1e]/30 font-bold tabular-nums">
                                                    {format(item.timestamp, "HH:mm")}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-[13px] leading-[1.6] font-medium line-clamp-2",
                                                item.isUnread ? "text-[#1c1c1e]/50" : "text-[#1c1c1e]/30"
                                            )}>
                                                {item.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center pr-1">
                                            <ChevronRight className="w-5 h-5 text-[#1c1c1e]/10" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Bottom spacing fix for dynamic screen sizes */}
                        <div style={{ height: 'calc(env(safe-area-inset-bottom, 24px) + 12px)' }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
