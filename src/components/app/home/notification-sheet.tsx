"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Info, Heart, Camera, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
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
    // Group notifications by date: today, yesterday, earlier
    const groupedNotifications = React.useMemo(() => {
        const groups: { label: string; items: NotificationItem[] }[] = [];
        const today: NotificationItem[] = [];
        const yesterday: NotificationItem[] = [];
        const earlier: NotificationItem[] = [];

        const sorted = [...notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        sorted.forEach(n => {
            if (isToday(n.timestamp)) today.push(n);
            else if (isYesterday(n.timestamp)) yesterday.push(n);
            else earlier.push(n);
        });

        if (today.length > 0) groups.push({ label: "今日", items: today });
        if (yesterday.length > 0) groups.push({ label: "昨日", items: yesterday });
        if (earlier.length > 0) groups.push({ label: "それ以前", items: earlier });
        return groups;
    }, [notifications]);

    const renderNotificationItem = (item: NotificationItem) => (
        <button
            key={item.id}
            onClick={() => onSelectItem?.(item)}
            className={cn(
                "w-full flex items-center gap-4 p-5 rounded-[24px] transition-all border text-left active:scale-[0.98]",
                item.isUnread
                    ? "bg-white dark:bg-[#1c1c1e] border-[#F2EFEA] dark:border-white/10 shadow-sm"
                    : "bg-white/50 dark:bg-[#1c1c1e]/50 border-transparent"
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
                            item.isUnread ? "bg-brand-peach/10" : "bg-[#F2EFEA] dark:bg-white/5"
                        )}>
                            {item.icon || (item.type === 'care' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : item.type === 'photo' ? <Camera className="w-5 h-5 text-brand-sea" /> : item.type === 'alert' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <Bell className="w-5 h-5 text-[#8E8B85]" />)}
                        </div>
                        <h3 className={cn(
                            "text-[15px] font-bold truncate tracking-tight ml-1",
                            item.isUnread ? "text-[#4E342E] dark:text-[#E8E6E1]" : "text-[#4E342E]/70 dark:text-[#E8E6E1]/70"
                        )}>
                            {item.title}
                        </h3>
                    </div>
                    <span className={cn(
                        "text-[11px] font-bold tabular-nums shrink-0",
                        item.isUnread ? "text-[#787570]" : "text-[#787570]/60"
                    )}>
                        {format(item.timestamp, "HH:mm")}
                    </span>
                </div>
                <p className={cn(
                    "text-[13px] leading-[1.6] font-medium line-clamp-2 pl-[56px]",
                    item.isUnread ? "text-[#787570] dark:text-[#A6A29A]" : "text-[#787570]/60 dark:text-[#A6A29A]/60"
                )}>
                    {item.message}
                </p>
            </div>
            <div className="flex items-center pr-1">
                <ChevronRight className="w-5 h-5 text-[#D4CFC9]" />
            </div>
        </button>
    );

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
                        className="fixed inset-0 bg-[#FDF8F1] dark:bg-[#121214] z-[10004] flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-[20px] font-bold text-[#4E342E] dark:text-[#E8E6E1] tracking-tight">通知</h1>
                                    {(() => {
                                        const unreadCount = notifications.filter(n => n.isUnread).length;
                                        return unreadCount > 0 ? (
                                            <span className="px-2 py-0.5 rounded-full bg-brand-peach/15 text-brand-peach text-[11px] font-bold">
                                                {unreadCount}件の未読
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                                <p className="text-[11px] text-[#787570] dark:text-[#A6A29A] mt-1 font-medium">猫ちゃんに関するお知らせ</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
                            {notifications.length === 0 ? (
                                <div className="py-24 flex flex-col items-center gap-4 text-[#D4CFC9]">
                                    <Bell className="w-16 h-16 stroke-[1]" />
                                    <p className="text-[15px] font-bold">新しい通知はありません</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {groupedNotifications.map(group => (
                                        <div key={group.label}>
                                            <h2 className="text-[12px] font-bold text-[#787570] dark:text-[#A6A29A] tracking-wide uppercase mb-3 ml-2">
                                                {group.label}
                                            </h2>
                                            <div className="space-y-3.5">
                                                {group.items.map(renderNotificationItem)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
