import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Activity,
    Heart,
    Eye,
    ShoppingCart,
    AlertCircle
} from "lucide-react";
import { getIcon } from "@/lib/icon-utils";

export interface ActivityItem {
    id: string;
    type: 'care' | 'observation' | 'inventory' | 'incident';
    title: string;
    catName?: string;
    userName?: string;
    userId?: string;
    userAvatar?: string;
    timestamp: string;
    icon?: string;
    notes?: string;
    // For Calendar view where we might show time
    showTime?: boolean;
}

interface ActivityLogItemProps {
    item: ActivityItem;
    index?: number;
}

export const getActivityColor = (type: string) => {
    switch (type) {
        case 'care':
            return "bg-rose-100 dark:bg-rose-900/30 text-rose-500";
        case 'observation':
            return "bg-[#7CAA8E]/10 dark:bg-[#7CAA8E]/20 text-[#5A8A6A]";
        case 'inventory':
            return "bg-[#E8B4A0]/10 dark:bg-[#E8B4A0]/20 text-[#C08A70]";
        case 'incident':
            return "bg-amber-100 dark:bg-amber-900/30 text-amber-600";
        default:
            return "bg-slate-100 dark:bg-slate-800 text-slate-500";
    }
};

export const getActivityIcon = (item: ActivityItem) => {
    if (item.icon) {
        // Check if it's a lucide icon name or a component
        const IconComponent = getIcon(item.icon);
        if (IconComponent) return <IconComponent className="h-3.5 w-3.5" />;
        // Fallback or specific string handling
        if (item.icon === 'alert-circle') return <AlertCircle className="h-3.5 w-3.5" />;
    }

    switch (item.type) {
        case 'care':
            return <Heart className="h-3.5 w-3.5" />;
        case 'observation':
            return <Eye className="h-3.5 w-3.5" />;
        case 'inventory':
            return <ShoppingCart className="h-3.5 w-3.5" />;
        case 'incident':
            return <AlertCircle className="h-3.5 w-3.5" />;
        default:
            return <Activity className="h-3.5 w-3.5" />;
    }
};

export const getUserInitials = (item: ActivityItem) => {
    if (item.userName) return item.userName.slice(0, 1);
    if (item.userId) return item.userId.slice(0, 2).toUpperCase();
    return '?';
};

export function ActivityLogItem({ item, index = 0 }: ActivityLogItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group"
        >
            {/* Icon Column */}
            <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm",
                getActivityColor(item.type)
            )}>
                {getActivityIcon(item)}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2 font-mono">
                        {item.showTime
                            ? format(new Date(item.timestamp), 'HH:mm')
                            : formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ja })
                        }
                    </span>
                </div>

                {item.catName && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item.catName}
                    </p>
                )}

                {item.notes && (
                    <div className="mt-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 max-w-[90%]">
                        <p className="text-xs text-slate-600 dark:text-slate-300 break-words whitespace-pre-wrap flex gap-1.5 items-start leading-relaxed">
                            <span className="opacity-70 text-[10px] mt-0.5 scale-90">📝</span>
                            <span>{item.notes}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* User Avatar Column (Right pinned) */}
            {item.userId && (
                <div className="flex-shrink-0 mt-0.5">
                    <div
                        className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-sm"
                        title={item.userName || item.userId}
                    >
                        {item.userAvatar ? (
                            <Image src={item.userAvatar} alt={item.userName || ''} width={24} height={24} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[10px] text-slate-500 font-bold">
                                {getUserInitials(item)}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
