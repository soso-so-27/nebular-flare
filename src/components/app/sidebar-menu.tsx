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
                        className="fixed inset-0 bg-black/50 z-[100]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-0 right-0 bottom-0 w-[320px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-white/20 z-[101] shadow-2xl flex flex-col"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Cat className="w-5 h-5 text-amber-600" />
                                </div>
                                <span className="font-medium text-gray-800">{userName}</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Menu Content */}
                        <div className="flex-1 overflow-y-auto">


                            {/* Care Section */}
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => toggleSection('care')}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Heart className="w-5 h-5 text-amber-500" />
                                        <span className="font-medium text-gray-800">お世話を記録</span>
                                        <span className="text-xs text-gray-400">{careCompleted}/{careItems.length}</span>
                                    </div>
                                    {expandedSection === 'care' ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'care' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-black/5 dark:bg-white/5"
                                        >
                                            <div className="py-2">
                                                {careItems.map(item => {
                                                    const Icon = getIcon(item.icon);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between px-6 py-2.5"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Icon className={cn("w-4 h-4", item.done ? "text-gray-300" : "text-gray-500")} />
                                                                <span className={cn("text-sm", item.done ? "text-gray-400 line-through" : "text-gray-700")}>
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                            {item.done ? (
                                                                <Check className="w-5 h-5 text-emerald-500" />
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleCareComplete(item.type, item.label)}
                                                                    className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600"
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
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => toggleSection('observation')}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Cat className="w-5 h-5 text-amber-500" />
                                        <span className="font-medium text-gray-800">猫の様子</span>
                                        <span className="text-xs text-gray-400">{obsCompleted}/{observationItems.length}</span>
                                    </div>
                                    {expandedSection === 'observation' ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'observation' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-black/5 dark:bg-white/5"
                                        >
                                            <div className="py-2">
                                                {observationItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between px-6 py-2.5"
                                                    >
                                                        <span className={cn("text-sm", item.done ? "text-gray-400 line-through" : "text-gray-700")}>
                                                            {item.label}
                                                        </span>
                                                        {item.done ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-emerald-600">{item.value}</span>
                                                                <Check className="w-5 h-5 text-emerald-500" />
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleObservationComplete(item.id, item.label)}
                                                                className="text-xs font-bold px-3 py-1 rounded-full bg-primary text-white hover:bg-primary/90"
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
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => toggleSection('inventory')}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart className="w-5 h-5 text-amber-500" />
                                        <span className="font-medium text-gray-800">在庫管理</span>
                                        {urgentCount > 0 && (
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                                {urgentCount}件
                                            </span>
                                        )}
                                    </div>
                                    {expandedSection === 'inventory' ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'inventory' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-black/5 dark:bg-white/5"
                                        >
                                            <div className="py-2">
                                                {inventoryItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between px-6 py-2.5"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                                item.status === 'danger' ? "bg-red-100 text-red-600" :
                                                                    item.status === 'warn' ? "bg-amber-100 text-amber-600" :
                                                                        "bg-gray-100 text-gray-500"
                                                            )}>
                                                                あと{item.daysLeft}日
                                                            </span>
                                                            <span className="text-sm text-gray-700">{item.label}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleInventoryRefill(item.id, item.label)}
                                                            className="text-xs font-bold px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
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
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => toggleSection('activity')}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-5 h-5 text-amber-500" />
                                        <span className="font-medium text-gray-800">アクティビティ</span>
                                    </div>
                                    {expandedSection === 'activity' ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'activity' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-black/5 dark:bg-white/5"
                                        >
                                            <div className="py-2">
                                                <ActivityFeed embedded />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 p-2">
                            {/* ... Keep Footer ... */}

                            <button
                                onClick={() => {
                                    onNavigate('notifications');
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50 transition-colors rounded-lg"
                            >
                                <Bell className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-700">通知設定</span>
                            </button>
                            <button
                                onClick={() => {
                                    onNavigate('settings');
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50 transition-colors rounded-lg"
                            >
                                <Settings className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-700">設定</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
