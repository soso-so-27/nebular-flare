"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Clock, User, Utensils, Trash2, Home, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import type { LucideIcon } from "lucide-react";

interface HouseholdCareItem {
    id: string;
    label: string;
    Icon: LucideIcon;
    type: string; // for Supabase care_log type
    done: boolean;
    doneBy?: string;
    doneAt?: string;
}

// Household-level care items (applies to all cats at once)
const HOUSEHOLD_CARE_ITEMS = [
    { id: 'breakfast', label: '朝ごはん', Icon: Utensils, type: 'breakfast' },
    { id: 'dinner', label: '夜ごはん', Icon: Utensils, type: 'dinner' },
    { id: 'toilet_clean', label: 'トイレ掃除', Icon: Trash2, type: 'toilet_clean' },
];

export function HouseholdCareList() {
    const { careLogs, addCareLog, isDemo, tasks, setTasks } = useAppState();

    const [today, setToday] = useState<string>("");
    useEffect(() => {
        setToday(new Date().toISOString().split('T')[0]);
    }, []);

    // File input for photos
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadingItemId, setUploadingItemId] = React.useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && uploadingItemId) {
            const file = e.target.files[0];
            const item = careItems.find(i => i.id === uploadingItemId);
            if (item) {
                toast.info("写真をアップロード中...");
                const result = await addCareLog(item.type, undefined, undefined, [file]);
                if (result?.error) {
                    toast.error("完了しましたが写真のアップロードに失敗しました");
                } else {
                    toast.success("写真付きで完了しました！");
                    // Force refresh or local update? addCareLog should trigger subscription updates.
                }
            }
            setUploadingItemId(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Get household care status from Supabase care_logs or local tasks
    const careItems: HouseholdCareItem[] = useMemo(() => {
        return HOUSEHOLD_CARE_ITEMS.map(item => {
            let isDone = false;
            let doneBy: string | undefined;
            let doneAt: string | undefined;

            if (isDemo) {
                // Demo mode: check local tasks
                const matchingTask = tasks.find(t =>
                    t.title?.includes(item.label.replace('ごはん', '')) &&
                    t.done &&
                    t.doneAt?.startsWith(today)
                );
                isDone = !!matchingTask;
                doneBy = matchingTask ? 'パパ' : undefined;
                doneAt = matchingTask?.doneAt
                    ? new Date(matchingTask.doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : undefined;
            } else {
                // Supabase mode: check care_logs
                const matchingLog = careLogs.find(log => log.type === item.type);
                isDone = !!matchingLog;
                doneBy = matchingLog ? '家族' : undefined;
                doneAt = matchingLog?.done_at
                    ? new Date(matchingLog.done_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : undefined;
            }

            return {
                id: item.id,
                label: item.label,
                Icon: item.Icon,
                type: item.type,
                done: isDone,
                doneBy,
                doneAt,
            };
        });
    }, [careLogs, tasks, today, isDemo]);

    const completedCount = careItems.filter(c => c.done).length;
    const totalCount = careItems.length;

    async function handleToggle(item: HouseholdCareItem) {
        haptics.success();
        if (isDemo) {
            // Demo mode: update local tasks
            const now = new Date().toISOString();
            setTasks(prev => prev.map(t => {
                if (t.title?.includes(item.label.replace('ごはん', ''))) {
                    return { ...t, done: true, doneAt: now };
                }
                return t;
            }));
            toast.success(`${item.label} 完了！`);
        } else {
            // Supabase mode: add care log
            const result = await addCareLog(item.type);
            if (result?.error) {
                toast.error("記録に失敗しました");
            } else {
                toast.success(`${item.label} 完了！`);
            }
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm overflow-hidden">
            {/* Header Row */}
            <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Home className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        今日のお世話
                    </h3>
                </div>
                <span className="text-slate-400">›</span>
            </div>

            {/* Stats Row */}
            <div className="px-5 pb-4 flex items-end gap-6">
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">{completedCount}</span>
                        <span className="text-sm text-slate-400">/{totalCount}</span>
                    </div>
                    <span className="text-xs text-slate-400">完了済み</span>
                </div>

                {/* Mini Progress Bars */}
                <div className="flex-1 flex items-end gap-1 h-10">
                    {careItems.map((item, i) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex-1 rounded-sm transition-all",
                                item.done
                                    ? "bg-emerald-400 dark:bg-emerald-500"
                                    : "bg-slate-200 dark:bg-slate-700"
                            )}
                            style={{ height: item.done ? '100%' : '40%' }}
                        />
                    ))}
                </div>
            </div>

            {/* Care Items - Compact */}
            <div className="px-5 pb-4 space-y-2">
                {careItems.map((item) => (
                    <div key={item.id} className="flex gap-2">
                        <button
                            onClick={() => !item.done && handleToggle(item)}
                            disabled={item.done}
                            className={cn(
                                "flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left",
                                item.done
                                    ? "bg-slate-50 dark:bg-slate-800/50"
                                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <item.Icon className={cn(
                                    "h-4 w-4",
                                    item.done ? "text-slate-400" : "text-slate-600 dark:text-slate-300"
                                )} />
                                <span className={cn(
                                    "text-sm font-medium",
                                    item.done
                                        ? "text-slate-400 line-through"
                                        : "text-slate-700 dark:text-slate-200"
                                )}>
                                    {item.label}
                                </span>
                            </div>

                            {item.done ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">{item.doneBy} • {item.doneAt}</span>
                                    <Check className="h-4 w-4 text-emerald-500" />
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400">タップで完了</span>
                            )}
                        </button>
                        {!item.done && (
                            <button
                                onClick={() => {
                                    setUploadingItemId(item.id);
                                    fileInputRef.current?.click();
                                }}
                                className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors flex items-center justify-center"
                            >
                                {uploadingItemId === item.id ? (
                                    <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                ) : (
                                    <Camera className="w-5 h-5" />
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />
        </div>
    );
}
