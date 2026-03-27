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
    Cat,
    Sparkles
} from "lucide-react";
import { getIcon } from "@/lib/icon-utils";

export interface ActivityItem {
    id: string;
    type: 'care' | 'observation' | 'inventory' | 'incident' | 'nyannlog';
    title: string;
    catName?: string;
    userName?: string;
    userId?: string;
    userAvatar?: string;
    timestamp: string;
    icon?: string;
    notes?: string;
    trendText?: string;
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
            return "bg-[#FFF8EF] text-[#C8A97E] border border-[#F2EFEA]";
        case 'observation':
            return "bg-[#F0F4F2] text-[#6B7A6B] border border-[#E8EAE8]";
        case 'inventory':
            return "bg-[#FDF8F1] text-[#C8A97E] border border-[#F2EFEA]";
        case 'incident':
        case 'nyannlog':
            return "bg-[#F9F0FE] text-[#B8A6D9] border border-[#EBE3F0]";
        default:
            return "bg-[#F2EFEA] text-[#8E8B85]";
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
        case 'nyannlog':
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

export const ActivityLogItem = React.memo(function ActivityLogItem({ item, index = 0 }: ActivityLogItemProps) {
    return (
        <motion.div
            layoutId={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-wrap items-center px-4 py-3.5 rounded-[20px] bg-white border border-[#F2EFEA] mb-2 last:mb-0 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        >
            {/* Icon Column */}
            <div className="flex-shrink-0 mr-3.5">
                <div className={cn(
                    "w-9 h-9 rounded-[12px] flex items-center justify-center",
                    item.type === 'incident' ? "bg-[#F9F0FE] text-[#B8A6D9]" :
                        item.type === 'care' ? "bg-[#FFF8EF] text-[#C8A97E]" :
                            "bg-[#F0F4F2] text-[#6B7A6B]"
                )}>
                    {getActivityIcon(item)}
                </div>
            </div>

            {/* Content Flex Row */}
            <div className="flex-1 flex items-center min-w-0 gap-2 overflow-hidden">
                {/* Title */}
                <span className="text-[14px] font-bold text-[#2F2A26] truncate flex-shrink-0 max-w-[50%]">
                    {item.title}
                </span>

                {/* User Badge (Compact - Minimal) */}
                {item.userId && (
                    <div className="flex items-center gap-1.5 flex-shrink max-w-[30%]">
                        {item.userAvatar && (
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-[#F2EFEA] flex-shrink-0">
                                <Image src={item.userAvatar} alt="" width={16} height={16} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <span className="text-[11px] text-[#A6A29A] font-medium truncate">
                            {item.userName || 'User'}
                        </span>
                    </div>
                )}

                {/* Cat Name */}
                {item.catName && (
                    <span className="text-[11px] text-[#A6A29A] truncate flex-shrink">
                        {item.catName}
                    </span>
                )}
            </div>

            {/* Time Column (Right) */}
            <div className="flex-shrink-0 ml-2">
                <span className="text-[11px] font-mono font-bold text-[#A6A29A]">
                    {item.showTime
                        ? format(new Date(item.timestamp), 'HH:mm')
                        : formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ja })
                    }
                </span>
            </div>

            {/* Notes Section - Renders below if present */}
            {(item.notes || item.trendText) && (
                <div className="w-full mt-2.5 flex flex-col gap-2">
                    {item.notes && (
                        <div className="px-1 pl-12">
                            <p className="text-[12px] text-[#7A726B] line-clamp-2 leading-relaxed">
                                {item.notes}
                            </p>
                        </div>
                    )}
                    {item.trendText && (
                        <div className="bg-[#FFF8EF] border border-[#F2EFEA] ml-11 px-3 py-2 rounded-[12px] flex gap-2 w-[calc(100%-2.75rem)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/40 to-transparent rounded-bl-full pointer-events-none" />
                            <Sparkles className="w-4 h-4 text-[#C8A97E] shrink-0 mt-[2px]" />
                            <p className="text-[12px] font-bold text-[#4E342E] leading-relaxed relative z-10">
                                {item.trendText}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
});
