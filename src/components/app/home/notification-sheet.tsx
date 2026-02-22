"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Info, Heart, Camera, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
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
    icon?: string | React.ReactNode; // New: for custom icons in the layout
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
                        className="fixed inset-0 bg-[#4E342E]/10 backdrop-blur-sm z-[10000]"
                    />

                    {/* Screen */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        className="fixed inset-0 bg-[#FAF9F7] z-[10004] flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-4 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight">通知</h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium">猫ちゃんに関するお知らせ</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)] space-y-3">
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
                                                ? "bg-white border-brand-peach/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                                                : "bg-[#fcfcfc] border-transparent"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <div className="flex items-center justify-between gap-3 mb-0.5">
                                                <div className="flex items-center gap-2">
                                                    {item.isUnread && (
                                                        <div className="w-2 h-2 rounded-full bg-brand-peach shadow-[0_0_8px_rgba(232,180,160,0.6)] shrink-0" />
                                                    )}
                                                    <div className={cn(
                                                        "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[18px]",
                                                        item.isUnread ? "bg-brand-peach/10" : "bg-[#1c1c1e]/5"
                                                    )}>
                                                        {item.icon || (item.type === 'care' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : item.type === 'photo' ? <Camera className="w-5 h-5 text-brand-sea" /> : item.type === 'alert' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <Bell className="w-5 h-5 text-slate-500" />)}
                                                    </div>
                                                    <h3 className={cn(
                                                        "text-[15px] font-black truncate tracking-tight ml-1",
                                                        item.isUnread ? "text-[#1c1c1e]" : "text-[#1c1c1e]/70"
                                                    )}>
                                                        {item.title}
                                                    </h3>
                                                </div>
                                                <span className={cn(
                                                    "text-[11px] font-bold tabular-nums shrink-0",
                                                    item.isUnread ? "text-[#1c1c1e]/40" : "text-[#1c1c1e]/30"
                                                )}>
                                                    {format(item.timestamp, "HH:mm")}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-[13px] leading-[1.6] font-medium line-clamp-2 pl-[56px]",
                                                item.isUnread ? "text-[#1c1c1e]/60" : "text-[#1c1c1e]/40"
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
