"use client";

import React, { useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Activity,
    Heart,
    Eye,
    ShoppingCart,
    User
} from "lucide-react";
import { getIcon } from "@/lib/icon-utils";

interface ActivityItem {
    id: string;
    type: 'care' | 'observation' | 'inventory';
    title: string;
    catName?: string;
    userName?: string;
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
        noticeDefs
    } = useAppState();

    // Combine and sort all activities
    const activities: ActivityItem[] = useMemo(() => {
        const items: ActivityItem[] = [];

        // Add care logs
        careLogs.forEach(log => {
            const cat = cats.find(c => c.id === log.cat_id);
            const taskDef = careTaskDefs.find(t => t.id === log.type);

            items.push({
                id: `care-${log.id}`,
                type: 'care',
                title: taskDef?.title || log.type,
                catName: cat?.name,
                timestamp: log.done_at || new Date().toISOString(),
                icon: taskDef?.icon
            });
        });

        // Add observations
        observations.forEach(obs => {
            const cat = cats.find(c => c.id === obs.catId);
            const noticeDef = noticeDefs.find(n => n.id === obs.type);

            items.push({
                id: `obs-${obs.id}`,
                type: 'observation',
                title: `${noticeDef?.title || obs.type}: ${obs.value}`,
                catName: cat?.name,
                timestamp: obs.createdAt
            });
        });

        // Sort by timestamp (newest first)
        items.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Return only latest 10 items
        return items.slice(0, 10);
    }, [careLogs, observations, cats, careTaskDefs, noticeDefs]);

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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    最近のアクティビティ
                </h3>
            </div>

            {/* Activity List */}
            <div className="space-y-2">
                {activities.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
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

                        {/* User Avatar (placeholder for future) */}
                        {item.userName && (
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <User className="h-3 w-3 text-slate-400" />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
