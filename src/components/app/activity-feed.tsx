"use client";

import React, { useMemo, useState } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Activity,
    Heart,
    Eye,
    ShoppingCart,
    User,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { getIcon } from "@/lib/icon-utils";

interface ActivityItem {
    id: string;
    type: 'care' | 'observation' | 'inventory';
    title: string;
    catName?: string;
    userName?: string;
    userId?: string;
    userAvatar?: string;
    timestamp: string;
    icon?: string;
}

export function ActivityFeed() {
    const {
        careLogs,
        observations,
        cats,
        careTaskDefs,
        noticeDefs,
        householdUsers
    } = useAppState();

    // Default collapsed
    const [isExpanded, setIsExpanded] = useState(false);

    // Combine and sort all activities
    const activities: ActivityItem[] = useMemo(() => {
        const items: ActivityItem[] = [];

        // Helper: Check if string looks like a UUID
        const isUUID = (str: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        // Helper: Get user info
        const getUserInfo = (userId?: string | null) => {
            if (!userId) return { name: undefined, avatar: undefined };
            const user = householdUsers.find((u: any) => u.id === userId);
            return {
                name: user?.display_name || undefined,
                avatar: user?.avatar_url || undefined
            };
        };

        // Add care logs
        careLogs.forEach((log: any) => {
            const cat = cats.find(c => c.id === log.cat_id);

            // Extract base type ID (handle "uuid:timeOfDay" format)
            const logType = log.type || '';
            const baseTypeId = logType.includes(':') ? logType.split(':')[0] : logType;

            const taskDef = careTaskDefs.find(t => t.id === baseTypeId);

            // Build title - NEVER show UUIDs
            let displayTitle: string;
            if (!isUUID(baseTypeId) && taskDef?.title) {
                displayTitle = taskDef.title;
            } else if (isUUID(baseTypeId)) {
                // Try to find in noticeDefs instead
                const noticeDef = noticeDefs.find(n => n.id === baseTypeId);
                displayTitle = noticeDef?.title?.replace(/？$/, '') || '様子確認';
            } else {
                displayTitle = 'お世話';
            }

            const userInfo = getUserInfo(log.done_by);

            items.push({
                id: `care-${log.id}`,
                type: 'care',
                title: displayTitle,
                catName: cat?.name,
                userId: log.done_by,
                userName: userInfo.name,
                userAvatar: userInfo.avatar,
                timestamp: log.done_at || new Date().toISOString(),
                icon: taskDef?.icon
            });
        });

        // Add observations
        observations.forEach((obs: any) => {
            const cat = cats.find(c => c.id === obs.cat_id);

            // Extract base type ID from composite type
            const obsType = obs.type || '';
            const baseTypeId = obsType.includes(':') ? obsType.split(':')[0] : obsType;

            // Try to find matching noticeDef
            // 1. Direct ID match
            let noticeDef = noticeDefs.find(n => n.id === baseTypeId);

            // 2. Fallback: try mapping category or legacy types
            if (!noticeDef) {
                // Try category match
                noticeDef = noticeDefs.find(n => n.category === baseTypeId);

                // Try legacy keyword match
                if (!noticeDef) {
                    if (baseTypeId === 'appetite') noticeDef = noticeDefs.find(n => n.title.includes('食欲'));
                    else if (baseTypeId === 'water') noticeDef = noticeDefs.find(n => n.title.includes('水'));
                    else if (baseTypeId === 'toilet') noticeDef = noticeDefs.find(n => n.title.includes('トイレ'));
                    else if (baseTypeId === 'vomit') noticeDef = noticeDefs.find(n => n.title.includes('吐'));
                }
            }

            // Build display title - NEVER show UUIDs
            let displayTitle: string;
            if (noticeDef?.title) {
                displayTitle = noticeDef.title.replace(/？$/, '');
            } else {
                // Fallback for completely unknown
                displayTitle = baseTypeId === 'appetite' ? '食欲' :
                    baseTypeId === 'water' ? 'お水' :
                        baseTypeId === 'toilet' ? 'トイレ' :
                            baseTypeId === 'vomit' ? '嘔吐' : '様子確認';
            }

            // Append value if present
            if (obs.value && obs.value !== displayTitle) {
                displayTitle = `${displayTitle}: ${obs.value}`;
            }

            const userInfo = getUserInfo(obs.recorded_by);

            items.push({
                id: `obs-${obs.id}`,
                type: 'observation',
                title: displayTitle,
                catName: cat?.name,
                userId: obs.recorded_by,
                userName: userInfo.name,
                userAvatar: userInfo.avatar,
                timestamp: obs.recorded_at || obs.created_at || new Date().toISOString()
            });
        });

        // Sort by timestamp (newest first)
        items.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Return only latest 10 items
        return items.slice(0, 10);
    }, [careLogs, observations, cats, careTaskDefs, noticeDefs, householdUsers]);

    if (activities.length === 0) {
        return null;
    }

    const getActivityIcon = (item: ActivityItem) => {
        if (item.icon) {
            const IconComponent = getIcon(item.icon);
            return <IconComponent className="h-4 w-4" />;
        }

        switch (item.type) {
            case 'care':
                return <Heart className="h-4 w-4" />;
            case 'observation':
                return <Eye className="h-4 w-4" />;
            case 'inventory':
                return <ShoppingCart className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'care':
                return "bg-rose-100 dark:bg-rose-900/30 text-rose-500";
            case 'observation':
                return "bg-blue-100 dark:bg-blue-900/30 text-blue-500";
            case 'inventory':
                return "bg-amber-100 dark:bg-amber-900/30 text-amber-500";
            default:
                return "bg-slate-100 dark:bg-slate-800 text-slate-500";
        }
    };

    // Get initials from user name or ID
    const getUserInitials = (item: ActivityItem) => {
        if (item.userName) return item.userName.slice(0, 1);
        if (item.userId) return item.userId.slice(0, 2).toUpperCase();
        return '?';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden"
        >
            {/* Header - clickable to toggle expand */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        最近のアクティビティ
                    </h3>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {activities.length}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
            </button>

            {/* Activity List - collapsible */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-2 px-4 pb-4">
                            {activities.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="flex items-center gap-3"
                                >
                                    {/* Icon */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                        getActivityColor(item.type)
                                    )}>
                                        {getActivityIcon(item)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                                            <span className="font-medium">{item.title}</span>
                                            {item.catName && (
                                                <span className="text-slate-400"> • {item.catName}</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {formatDistanceToNow(new Date(item.timestamp), {
                                                addSuffix: true,
                                                locale: ja
                                            })}
                                        </p>
                                    </div>

                                    {/* User indicator */}
                                    {item.userId && (
                                        <div
                                            className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden"
                                            title={item.userName || item.userId}
                                        >
                                            {item.userAvatar ? (
                                                <img src={item.userAvatar} alt={item.userName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] text-slate-500 font-bold">
                                                    {getUserInitials(item)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
