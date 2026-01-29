"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Clock, ChevronRight, AlertTriangle, Utensils, Droplets, Pill, CheckSquare, Package, Cat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CareListItem {
    id: string;
    type: 'notice' | 'task';
    label: string;
    Icon: LucideIcon;
    done: boolean;
    value?: string;
    doneBy?: string;
    doneAt?: string;
    isAbnormal?: boolean;
}

interface UnifiedCareListProps {
    onItemTap: (item: CareListItem) => void;
    onCatchUpAll: () => void;
}

// Map notice titles to icons
function getIconForNotice(title: string): LucideIcon {
    if (title.includes('食欲')) return Utensils;
    if (title.includes('トイレ')) return Droplets;
    if (title.includes('吐')) return AlertTriangle;
    return Pill;
}

// Map task groups to icons
function getIconForTask(group?: string): LucideIcon {
    if (group === 'CARE') return CheckSquare;
    if (group === 'HEALTH') return Pill;
    if (group === 'INVENTORY') return Package;
    return CheckSquare;
}

export function UnifiedCareList({ onItemTap, onCatchUpAll }: UnifiedCareListProps) {
    const { tasks, noticeDefs, noticeLogs, activeCatId, cats } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    const [today, setToday] = useState<string>("");
    useEffect(() => {
        setToday(new Date().toISOString().split('T')[0]);
    }, []);

    // Combine notices and tasks into a unified list
    const careItems: CareListItem[] = useMemo(() => {
        const items: CareListItem[] = [];

        // Add notice items (health checks)
        const catLogs = noticeLogs[activeCatId] || {};
        noticeDefs.filter(n => n.enabled && n.kind === 'notice').forEach(notice => {
            const log = catLogs[notice.id];
            const isToday = log?.at?.startsWith(today);
            const isDone = isToday && log?.done;
            const isAbnormal = !!(
                (log?.value === 'ちょっと違う') ||
                (typeof log?.value === 'string' && log.value.includes('注意')) ||
                (log?.value && log.value !== "いつも通り" && log.value !== "なし" && log.value !== "記録した")
            );

            items.push({
                id: notice.id,
                type: 'notice',
                label: notice.title,
                Icon: getIconForNotice(notice.title),
                done: isDone,
                value: log?.value,
                isAbnormal: isAbnormal,
            });
        });

        // Add task items (care tasks)
        const catTasks = tasks.filter(t => t.catId === activeCatId);
        catTasks.forEach(task => {
            const isToday = task.doneAt?.startsWith(today);
            items.push({
                id: task.id,
                type: 'task',
                label: task.title,
                Icon: getIconForTask(task.group),
                done: !!(task.done && isToday),
                doneBy: task.done ? 'パパ' : undefined,
                doneAt: task.doneAt ? new Date(task.doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            });
        });

        return items;
    }, [noticeDefs, noticeLogs, tasks, activeCatId, today]);

    const completedCount = careItems.filter(c => c.done).length;
    const totalCount = careItems.length;
    const pendingCount = totalCount - completedCount;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Cat className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        今日のお世話
                    </h3>
                    <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        completedCount === totalCount
                            ? "bg-primary/10 text-primary"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                        {completedCount}/{totalCount}
                    </span>
                </div>
                {pendingCount > 0 && (
                    <button
                        onClick={onCatchUpAll}
                        className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                        まとめて入力
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Care Items */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {careItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => !item.done && onItemTap(item)}
                        disabled={item.done}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 transition-colors text-left",
                            item.done
                                ? "bg-slate-50/50 dark:bg-slate-800/30"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer",
                            item.isAbnormal && "bg-destructive/5"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <item.Icon className={cn(
                                "h-4 w-4",
                                item.done ? "text-muted-foreground" : "text-foreground"
                            )} />
                            <span className={cn(
                                "text-sm font-medium",
                                item.done
                                    ? "text-slate-400 dark:text-slate-500"
                                    : "text-slate-900 dark:text-white"
                            )}>
                                {item.label}
                            </span>
                            {item.isAbnormal && (
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            )}
                        </div>

                        {item.done ? (
                            <div className="flex items-center gap-2">
                                {item.value && (
                                    <span className={cn(
                                        "text-xs font-medium px-2 py-0.5 rounded-full",
                                        item.isAbnormal
                                            ? "bg-destructive/10 text-destructive"
                                            : "bg-primary/10 text-primary"
                                    )}>
                                        {item.value}
                                    </span>
                                )}
                                {item.doneBy && (
                                    <span className="text-xs text-slate-400">{item.doneBy}</span>
                                )}
                                {item.doneAt && (
                                    <span className="text-[10px] text-slate-400">{item.doneAt}</span>
                                )}
                                <Check className="h-4 w-4 text-primary" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                <ChevronRight className="h-4 w-4" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
