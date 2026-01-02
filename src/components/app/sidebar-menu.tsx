import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Bell, Settings, ChevronDown, ChevronRight, Check,
    Heart, Cat, ShoppingCart, Plus, Calendar, Activity
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useAppState } from "@/store/app-store";
import { getIcon } from "@/lib/icon-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from '@/lib/supabase';
import { ActivityFeed } from "./activity-feed";

interface SidebarMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (section: string, item?: string) => void;
    defaultSection?: 'care' | 'observation' | 'inventory' | 'activity';
}

export function SidebarMenu({ isOpen, onClose, onNavigate, defaultSection }: SidebarMenuProps) {
    const { user } = useAuth();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ユーザー';

    const [expandedSection, setExpandedSection] = useState<'care' | 'observation' | 'inventory' | 'activity' | null>(null);

    useEffect(() => {
        if (isOpen && defaultSection) {
            setExpandedSection(defaultSection);
        }
    }, [isOpen, defaultSection]);

    const {
        cats,
        activeCatId,
        careTaskDefs,
        careLogs,
        noticeDefs,
        noticeLogs,
        inventory,
        setInventory,
        addCareLog,
        addObservation,
        settings,
        isDemo
    } = useAppState();

    const { dayStartHour } = settings;

    // Calculate "today" based on custom day start time
    const today = useMemo(() => {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < dayStartHour) {
            now.setDate(now.getDate() - 1);
        }
        return now.toISOString().split('T')[0];
    }, [dayStartHour]);

    // Helper for slot labels
    const getSlotLabel = (slot: string) => {
        switch (slot) {
            case 'morning': return '朝';
            case 'noon': return '昼';
            case 'evening': return '夕';
            case 'night': return '夜';
            default: return '';
        }
    };

    // ========== Care Items ==========
    const careItems = useMemo(() => {
        if (!careTaskDefs) return [];
        return careTaskDefs
            .filter(def => def.enabled !== false)
            .flatMap(def => {
                const shouldSplit = def.mealSlots && def.mealSlots.length > 0 &&
                    (def.frequency === 'twice-daily' || def.frequency === 'three-times-daily' || def.frequency === 'four-times-daily');
                const slots = shouldSplit ? (def.mealSlots || []) : [null];

                return slots.map(slot => {
                    const type = slot ? `${def.id}:${slot}` : def.id;
                    const label = slot ? `${def.title}（${getSlotLabel(slot)}）` : def.title;

                    const taskLogs = careLogs.filter(log => log.type === type);
                    let isDone = false;

                    if (taskLogs.length > 0) {
                        const sortedLogs = [...taskLogs].sort((a, b) =>
                            new Date(b.done_at).getTime() - new Date(a.done_at).getTime()
                        );
                        const lastLog = sortedLogs[0];
                        const adjustedLogDate = new Date(lastLog.done_at);
                        adjustedLogDate.setHours(adjustedLogDate.getHours() - dayStartHour);
                        const logDateStr = adjustedLogDate.toISOString().split('T')[0];
                        isDone = logDateStr === today;
                    }

                    return {
                        id: type,
                        label,
                        icon: def.icon,
                        type,
                        done: isDone
                    };
                });
            });
    }, [careTaskDefs, careLogs, today, dayStartHour]);

    const careCompleted = careItems.filter(c => c.done).length;

    // ========== Observation Items ==========
    const observationItems = useMemo(() => {
        if (!noticeDefs) return [];
        const catLogs = noticeLogs[activeCatId] || {};

        return noticeDefs
            .filter(n => n.enabled !== false && n.kind === 'notice')
            .map(notice => {
                const log = catLogs[notice.id];
                const isToday = log?.at?.startsWith(today);
                const isDone = !!(isToday && log?.done);

                return {
                    id: notice.id,
                    label: notice.title,
                    done: isDone,
                    value: log?.value
                };
            });
    }, [noticeDefs, noticeLogs, activeCatId, today]);

    const obsCompleted = observationItems.filter(o => o.done).length;

    // ========== Inventory Items ==========
    const inventoryItems = useMemo(() => {
        if (!inventory) return [];
        return inventory
            .filter(it => it.enabled !== false && it.deleted_at === null)
            .map(it => {
                const rangeMax = it.range_max || 30;
                let daysLeft = rangeMax;
                if (it.last_bought) {
                    const lastDate = new Date(it.last_bought);
                    const todayDate = new Date();
                    const diffTime = todayDate.getTime() - lastDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    daysLeft = Math.max(0, rangeMax - diffDays);
                }
                let status: 'ok' | 'warn' | 'danger' = 'ok';
                if (daysLeft <= 3) status = 'danger';
                else if (daysLeft <= 7) status = 'warn';

                return { ...it, daysLeft, status };
            })
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [inventory]);

    const urgentCount = inventoryItems.filter(it => it.status !== 'ok').length;

    // ========== Handlers ==========
    async function handleCareComplete(type: string, label: string) {
        const result = await addCareLog(type);
        if (!result?.error) {
            toast.success(`${label} 完了！`);
        } else {
            toast.error("記録に失敗しました");
        }
    }

    async function handleObservationComplete(obsId: string, label: string) {
        const result = await addObservation(activeCatId, obsId, 'いつも通り');
        if (!result?.error) {
            toast.success(`${label}: いつも通り`);
        } else {
            toast.error("記録に失敗しました");
        }
    }

    async function handleInventoryRefill(itemId: string, label: string) {
        const now = new Date().toISOString();
        setInventory(prev => prev.map(it => {
            if (it.id === itemId) {
                return { ...it, last_bought: now };
            }
            return it;
        }));

        if (!isDemo) {
            const supabase = createClient() as any;
            await supabase.from('inventory').update({ last_bought: now }).eq('id', itemId);
        }
        toast.success(`${label} 補充しました！`);
    }

    const toggleSection = (section: 'care' | 'observation' | 'inventory' | 'activity') => {
        setExpandedSection(prev => prev === section ? null : section);
    };

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
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100]"
                    />

                    {/* Floating Sidebar -> Right Drawer */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-[360px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-white/40 dark:border-slate-800 z-[101] shadow-2xl shadow-black/20 flex flex-col overflow-hidden rounded-l-[32px]"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                    <Cat className="w-6 h-6 text-slate-400" />
                                </div>
                                <div>
                                    <span className="block text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">{userName}</span>
                                    <span className="text-xs text-slate-400 font-medium">ねこと暮らす</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {/* Menu Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">

                            {/* Care Section */}
                            <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden group hover:border-slate-200 transition-colors">
                                <button
                                    onClick={() => toggleSection('care')}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400">
                                            <Heart className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">お世話を記録</span>
                                            <span className="text-xs text-slate-400">{careCompleted}/{careItems.length} 完了</span>
                                        </div>
                                    </div>
                                    {expandedSection === 'care' ? (
                                        <ChevronDown className="w-5 h-5 text-slate-300" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'care' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/20 box-border border-t border-slate-50 dark:border-slate-800"
                                        >
                                            <div className="p-2 space-y-1">
                                                {careItems.map(item => {
                                                    const Icon = getIcon(item.icon);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Icon className={cn("w-4 h-4", item.done ? "text-slate-300" : "text-slate-400")} />
                                                                <span className={cn("text-sm font-medium", item.done ? "text-slate-300 line-through" : "text-slate-600 dark:text-slate-300")}>
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                            {item.done ? (
                                                                <div className="bg-slate-100 text-slate-400 p-1 rounded-full">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleCareComplete(item.type, item.label)}
                                                                    className="text-xs font-bold px-4 py-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-100 transition-all active:scale-95"
                                                                >
                                                                    完了
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Observation Section */}
                            <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden group hover:border-slate-200 transition-colors">
                                <button
                                    onClick={() => toggleSection('observation')}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400">
                                            <Cat className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                {cats.find(c => c.id === activeCatId)?.name || '猫'}の様子
                                            </span>
                                            <span className="text-xs text-slate-400">{obsCompleted}/{observationItems.length} 確認済</span>
                                        </div>
                                    </div>
                                    {expandedSection === 'observation' ? (
                                        <ChevronDown className="w-5 h-5 text-slate-300" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'observation' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/20 box-border border-t border-slate-50 dark:border-slate-800"
                                        >
                                            <div className="p-2 space-y-1">
                                                {observationItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                    >
                                                        <span className={cn("text-sm font-medium", item.done ? "text-slate-300" : "text-slate-600 dark:text-slate-300")}>
                                                            {item.label}
                                                        </span>
                                                        {item.done ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{item.value}</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleObservationComplete(item.id, item.label)}
                                                                className="text-xs font-bold px-4 py-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 shadow-sm shadow-slate-200 transition-all active:scale-95"
                                                            >
                                                                OK
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Inventory Section */}
                            <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden group hover:border-slate-200 transition-colors">
                                <button
                                    onClick={() => toggleSection('inventory')}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400">
                                            <ShoppingCart className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">在庫管理</span>
                                            {urgentCount > 0 ? (
                                                <span className="text-xs font-bold text-rose-500">あと{urgentCount}件が在庫薄</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">すべて充足</span>
                                            )}
                                        </div>
                                    </div>
                                    {expandedSection === 'inventory' ? (
                                        <ChevronDown className="w-5 h-5 text-slate-300" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'inventory' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/20 box-border border-t border-slate-50 dark:border-slate-800"
                                        >
                                            <div className="p-2 space-y-1">
                                                {inventoryItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                "text-[10px] font-bold px-2 py-0.5 rounded-full tracking-tight",
                                                                item.status === 'danger' ? "bg-rose-50 text-rose-500 border border-rose-100" :
                                                                    item.status === 'warn' ? "bg-amber-50 text-amber-500 border border-amber-100" :
                                                                        "bg-slate-100 text-slate-400"
                                                            )}>
                                                                残{item.daysLeft}日
                                                            </span>
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleInventoryRefill(item.id, item.label)}
                                                            className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 bg-white shadow-sm"
                                                        >
                                                            購入
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Activity Section */}
                            <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden group hover:border-slate-200 transition-colors">
                                <button
                                    onClick={() => toggleSection('activity')}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">アクティビティ</span>
                                            <span className="text-xs text-slate-400">活動ログを確認</span>
                                        </div>
                                    </div>
                                    {expandedSection === 'activity' ? (
                                        <ChevronDown className="w-5 h-5 text-slate-300" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'activity' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/20 box-border border-t border-slate-50 dark:border-slate-800"
                                        >
                                            <div className="p-2">
                                                <ActivityFeed embedded />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 flex gap-2">
                            <button
                                onClick={() => {
                                    onNavigate('notifications');
                                    onClose();
                                }}
                                className="flex-1 flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 group"
                            >
                                <Bell className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold">通知</span>
                            </button>
                            <button
                                onClick={() => {
                                    onNavigate('settings');
                                    onClose();
                                }}
                                className="flex-1 flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 group"
                            >
                                <Settings className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold">設定</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
