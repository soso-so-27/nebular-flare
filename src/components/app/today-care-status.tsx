"use client";

import React, { useMemo } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareItem {
    id: string;
    label: string;
    icon: string;
    done: boolean;
    doneBy?: string;
    doneAt?: string;
}

export function TodayCareStatus() {
    const { tasks, noticeLogs, activeCatId, cats } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    const today = useMemo(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }, []);

    // Get today's care items from tasks
    const careItems: CareItem[] = useMemo(() => {
        const catTasks = tasks.filter(t => t.catId === activeCatId);
        return catTasks.slice(0, 4).map(t => ({
            id: t.id,
            label: t.title,
            icon: t.group === 'CARE' ? '🍽️' : t.group === 'HEALTH' ? '💊' : t.group === 'INVENTORY' ? '📦' : '✅',
            done: !!(t.done && t.doneAt?.startsWith(today)),
            doneBy: t.done ? 'パパ' : undefined, // Mock: In real app, this would come from Supabase
            doneAt: t.doneAt ? new Date(t.doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        }));
    }, [tasks, activeCatId, today]);

    const completedCount = careItems.filter(c => c.done).length;
    const totalCount = careItems.length;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{activeCat?.avatar || '🐈'}</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        今日のお世話
                    </h3>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={cn(
                        "text-xs font-bold",
                        completedCount === totalCount ? "text-emerald-500" : "text-slate-400"
                    )}>
                        {completedCount}/{totalCount}
                    </span>
                    {completedCount === totalCount && (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                </div>
            </div>

            {/* Care Items */}
            <div className="p-2 space-y-1">
                {careItems.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-xl transition-colors",
                            item.done
                                ? "bg-emerald-50 dark:bg-emerald-900/20"
                                : "bg-slate-50 dark:bg-slate-800/50"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-base">{item.icon}</span>
                            <span className={cn(
                                "text-sm font-medium",
                                item.done
                                    ? "text-slate-500 dark:text-slate-400"
                                    : "text-slate-900 dark:text-white"
                            )}>
                                {item.label}
                            </span>
                        </div>

                        {item.done ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <User className="h-3 w-3" />
                                    <span className="text-xs font-bold">{item.doneBy}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                    {item.doneAt}
                                </span>
                                <Check className="h-4 w-4 text-emerald-500" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">未完了</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
