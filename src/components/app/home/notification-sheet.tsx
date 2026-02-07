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
}

interface NotificationSheetProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: NotificationItem[];
}

export function NotificationSheet({ isOpen, onClose, notifications }: NotificationSheetProps) {
    const getIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'care': return <Heart className="w-4 h-4 text-emerald-400" />;
            case 'photo': return <Camera className="w-4 h-4 text-sky-400" />;
            case 'system': return <Info className="w-4 h-4 text-slate-400" />;
            case 'alert': return <Bell className="w-4 h-4 text-rose-400" />;
        }
    };

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 inset-x-0 bg-[#121214] rounded-t-[32px] z-[101] flex flex-col max-h-[85vh] border-t border-white/5 shadow-2xl overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="w-12 h-1.5 rounded-full bg-white/10" />
                        </div>

                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Bell className="w-5 h-5 text-white/40" />
                                通知
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                            {notifications.length === 0 ? (
                                <div className="py-20 flex flex-col items-center gap-3 text-white/20">
                                    <Bell className="w-12 h-12 stroke-[1]" />
                                    <p className="text-sm italic">新しい通知はありません</p>
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <button
                                        key={item.id}
                                        className={cn(
                                            "w-full flex gap-4 p-4 rounded-2xl transition-all border text-left",
                                            item.isUnread
                                                ? "bg-white/[0.04] border-white/10"
                                                : "bg-transparent border-transparent hover:bg-white/[0.02]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                            item.isUnread ? "bg-white/10 border-white/5" : "bg-white/5 border-transparent"
                                        )}>
                                            {getIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className={cn(
                                                    "text-sm font-bold truncate",
                                                    item.isUnread ? "text-white" : "text-white/60"
                                                )}>
                                                    {item.title}
                                                </h3>
                                                <span className="text-[10px] text-white/30 font-medium whitespace-nowrap">
                                                    {format(item.timestamp, "HH:mm")}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-[12px] leading-relaxed line-clamp-2",
                                                item.isUnread ? "text-white/70" : "text-white/40"
                                            )}>
                                                {item.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <ChevronRight className="w-4 h-4 text-white/10" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Top spacing fix for dynamic screen sizes */}
                        <div style={{ height: 'calc(env(safe-area-inset-bottom, 24px) + 12px)' }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
