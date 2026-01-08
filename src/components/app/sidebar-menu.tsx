import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Bell, Settings, ChevronDown, ChevronRight, Check,
    Heart, Cat, ShoppingCart, Plus, Calendar, Activity, Image as ImageIcon
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
                        className="fixed inset-0 z-[10000] cursor-pointer"
                    />

                    {/* Floating Glass Sidebar */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5, scale: 1 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: '100%', opacity: 0, scale: 1 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 bottom-4 top-4 w-80 bg-[#121212]/90 backdrop-blur-2xl border-l border-y border-white/10 z-[10001] shadow-2xl rounded-l-[32px] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 pb-2 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                    <Cat className="w-5 h-5 text-white/80" />
                                </div>
                                <div>
                                    <span className="block text-base font-bold text-white tracking-tight">{userName}</span>
                                    <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">My Home</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 border border-white/5"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        {/* Menu Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 scrollbar-hide">

                            {/* Shortcuts Grid (Gallery & Calendar) */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        onNavigate('gallery');
                                        onClose();
                                    }}
                                    className="aspect-video flex flex-col items-center justify-center p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#E8B4A0]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <ImageIcon className="w-6 h-6 text-[#C08A70] mb-2 drop-shadow-md" />
                                    <span className="font-bold text-xs text-[#8A6A5A]">ギャラリー</span>
                                </button>

                                <button
                                    onClick={() => {
                                        onNavigate('calendar');
                                        onClose();
                                    }}
                                    className="aspect-video flex flex-col items-center justify-center p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#7CAA8E]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Calendar className="w-6 h-6 text-[#7CAA8E] mb-2 drop-shadow-md" />
                                    <span className="font-bold text-xs text-[#5A8A6A]">カレンダー</span>
                                </button>
                            </div>

                            {/* Inventory Section (Collapsible) */}
                            <div className="space-y-3">
                                {/* Header Removed */}
                                <div className="bg-white/5 rounded-[24px] border border-white/5 overflow-hidden transition-colors hover:bg-white/10">
                                    <button
                                        onClick={() => setExpandedSection(prev => prev === 'inventory' ? null : 'inventory')}
                                        className="w-full p-4 flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                                <ShoppingCart className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block text-sm font-bold text-white/90">在庫チェック</span>
                                                {urgentCount > 0 ? (
                                                    <span className="text-[10px] font-bold text-rose-400">{urgentCount}件が残りわずか</span>
                                                ) : (
                                                    <span className="text-[10px] text-white/40">在庫は十分です</span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronDown className={cn("w-4 h-4 text-white/20 group-hover:text-white/60 transition-transform duration-300", expandedSection === 'inventory' ? "rotate-180" : "")} />
                                    </button>

                                    <AnimatePresence>
                                        {expandedSection === 'inventory' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/5 bg-black/20"
                                            >
                                                {inventoryItems.length === 0 ? (
                                                    <div className="p-6 text-center text-xs text-white/30">
                                                        在庫アイテムはまだありません
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-white/5">
                                                        {inventoryItems.slice(0, 5).map(item => (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-2 h-2 rounded-full",
                                                                        item.status === 'danger' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                                                                            item.status === 'warn' ? "bg-[#E8B4A0]" :
                                                                                "bg-emerald-500/30"
                                                                    )} />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-medium text-white/90">{item.label}</span>
                                                                        <span className={cn(
                                                                            "text-[10px]",
                                                                            item.status === 'danger' ? "text-rose-300" : "text-white/40"
                                                                        )}>
                                                                            あと約{item.daysLeft}日
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleInventoryRefill(item.id, item.label)}
                                                                    className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5 transition-colors"
                                                                >
                                                                    購入
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {inventoryItems.length > 5 && (
                                                            <button
                                                                onClick={() => {
                                                                    onNavigate('settings');
                                                                    onClose();
                                                                }}
                                                                className="w-full py-3 text-[10px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                                                            >
                                                                すべて見る
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Logs Section */}
                            <div className="space-y-3">
                                {/* Header Removed */}
                                <button
                                    onClick={() => {
                                        onNavigate('activity');
                                        onClose();
                                    }}
                                    className="w-full p-4 rounded-[24px] bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-[#E8B4A0]/10 text-[#C08A70] border border-[#E8B4A0]/20 group-hover:bg-[#E8B4A0]/20 transition-colors">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold text-white/90">お世話履歴</span>
                                            <span className="text-[10px] text-white/40">過去の履歴を確認</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                                </button>
                            </div>

                        </div>

                        {/* Footer (Settings & Notifications) */}
                        <div className="p-4 shrink-0 grid grid-cols-2 gap-3 border-t border-white/5">
                            <button
                                onClick={() => {
                                    onNavigate('notifications');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white border border-white/5"
                            >
                                <Bell className="w-4 h-4" />
                                <span className="text-[10px] font-bold">通知</span>
                            </button>
                            <button
                                onClick={() => {
                                    onNavigate('settings');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white border border-white/5"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="text-[10px] font-bold">設定</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
