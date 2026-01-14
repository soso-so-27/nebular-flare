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
    AlertCircle,
    Cat
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
            return "bg-[#E8B4A0]/20 text-[#E8B4A0] ring-1 ring-[#E8B4A0]/30 shadow-[0_0_10px_rgba(232,180,160,0.2)]";
        case 'observation':
            // Grouped with Soudan (Lavender) in Action Menu
            return "bg-[#B8A6D9]/10 text-[#B8A6D9] ring-1 ring-[#B8A6D9]/30";
        case 'inventory':
            // Grouped with Todokeru (Peach)
            return "bg-[#E8B4A0]/10 text-[#E8B4A0] ring-1 ring-[#E8B4A0]/30";
        case 'incident':
            return "bg-[#B8A6D9]/20 text-[#B8A6D9] ring-1 ring-[#B8A6D9]/40 shadow-[0_0_10px_rgba(184,166,217,0.2)]";
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
            return <Cat className="h-3.5 w-3.5" />;
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
            layoutId={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-wrap items-center px-4 py-3 rounded-2xl bg-white/5 border border-white/5 mb-2 last:mb-0 hover:bg-white/10 transition-colors group backdrop-blur-sm"
        >
            {/* Icon Column */}
            <div className="flex-shrink-0 mr-3">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-white/10 shadow-sm",
                    item.type === 'incident' ? "bg-[#B8A6D9]/20 text-[#B8A6D9]" :
                        item.type === 'care' ? "bg-[#E8B4A0]/20 text-[#E8B4A0]" :
                            "bg-slate-700/50 text-slate-400"
                )}>
                    {getActivityIcon(item)}
                </div>
            </div>

            {/* Content Flex Row */}
            <div className="flex-1 flex items-center min-w-0 gap-2 overflow-hidden">
                {/* Title */}
                <span className="text-sm font-bold text-slate-100 truncate flex-shrink-0 max-w-[50%]">
                    {item.title}
                </span>

                {/* User Badge (Compact - Minimal) */}
                {item.userId && (
                    <div className="flex items-center gap-1.5 flex-shrink max-w-[30%]">
                        {item.userAvatar && (
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                                <Image src={item.userAvatar} alt="" width={16} height={16} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium truncate">
                            {item.userName || 'User'}
                        </span>
                    </div>
                )}

                {/* Cat Name */}
                {item.catName && (
                    <span className="text-[10px] text-slate-500 truncate flex-shrink">
                        {item.catName}
                    </span>
                )}
            </div>

            {/* Time Column (Right) */}
            <div className="flex-shrink-0 ml-2">
                <span className="text-xs font-mono font-medium text-slate-500">
                    {item.showTime
                        ? format(new Date(item.timestamp), 'HH:mm')
                        : formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ja })
                    }
                </span>
            </div>

            {/* Notes (Absolute or Overlay? No, if notes exist, maybe break row? 
               User asked for "All one line". 
               If notes exist, they probably have to be below. 
               Let's keep notes below if present, but the main info is one line. 
            */}
            {item.notes && (
                <div className="w-full mt-2 basis-full hidden" /> /* Hidden structure hack or just wrap? */
            )}
        </motion.div>
    );
}
