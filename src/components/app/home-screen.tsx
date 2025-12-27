"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "./notification-settings";
import { Textarea } from "@/components/ui/textarea";
import {
    Users,
    Send,
    Home,
    Cat,
    ShoppingCart,
    Heart,
    X,
    Check,
    ChevronRight,
    Settings,
    Plus,
    Trash2,
    Pencil
} from "lucide-react";
import { useAppState } from "@/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnomalyAlertBanner } from "./anomaly-alert-banner";
import { CheckSection } from "./check-section";
import { CollapsibleCard } from "./collapsible-card";
import { motion, AnimatePresence } from "framer-motion";

import { getIcon } from "@/lib/icon-utils";
import { CareSettingsModal } from "./care-settings-modal";
import { NoticeSettingsModal } from "./notice-settings-modal";
import { InventorySettingsModal } from "./inventory-settings-modal";

export function HomeScreen() {
    const {
        cats,
        activeCatId,
        setActiveCatId,
        tasks,
        setTasks,
        noticeDefs,
        noticeLogs,
        setNoticeLogs,
        inventory,
        setInventory,
        settings,
        memos,
        setMemos,
        careLogs,
        addCareLog,
        observations,
        addObservation,
        isDemo,
        // CRUD functions
        careTaskDefs,
        addCareTask,
        updateCareTask,
        deleteCareTask,
        addNoticeDef,
        updateNoticeDef,
        deleteNoticeDef,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        updateInvThreshold
    } = useAppState();

    const [memoDraft, setMemoDraft] = useState("");
    const [openSection, setOpenSection] = useState<'care' | 'cat' | 'inventory' | null>(null);
    const [settingsMode, setSettingsMode] = useState(false);
    const [newItemInput, setNewItemInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [newInvMin, setNewInvMin] = useState(3);
    const [newInvMax, setNewInvMax] = useState(7);
    const [isCareSettingsOpen, setIsCareSettingsOpen] = useState(false);
    const [isNoticeSettingsOpen, setIsNoticeSettingsOpen] = useState(false);
    const [isInventorySettingsOpen, setIsInventorySettingsOpen] = useState(false);
    const activeCat = cats.find(c => c.id === activeCatId);
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

    // ========== Household Care Logic ==========
    const careItems = useMemo(() => {
        return careTaskDefs
            // Only show enabled tasks
            .filter(def => def.enabled !== false)
            .flatMap(def => {
                // Determine if we should split by slots
                const shouldSplit = def.mealSlots && def.mealSlots.length > 0 &&
                    (def.frequency === 'twice-daily' || def.frequency === 'three-times-daily' || def.frequency === 'four-times-daily');

                const slots = shouldSplit ? (def.mealSlots || []) : [null];

                return slots.map(slot => {
                    const type = slot ? `${def.id}:${slot}` : def.id;
                    const label = slot ? `${def.title}（${getSlotLabel(slot)}）` : def.title;

                    let isDone = false;
                    let doneBy: string | undefined;
                    let doneAt: string | undefined;

                    // Filter logs specific to this type (exact match includes slot)
                    // If task is per-cat, also filter by activeCatId
                    const taskLogs = careLogs.filter(log => {
                        const typeMatch = log.type === type;
                        if (!typeMatch) return false;
                        if (def.perCat) return log.cat_id === activeCatId;
                        return true;
                    });

                    if (taskLogs.length > 0) {
                        if (isDemo) {
                            // Demo mode
                            isDone = true;
                            doneBy = '家族';
                            doneAt = new Date(taskLogs[0].done_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } else {
                            // Supabase mode
                            const sortedLogs = [...taskLogs].sort((a, b) => new Date(b.done_at).getTime() - new Date(a.done_at).getTime());
                            const lastLog = sortedLogs[0];
                            const lastLogDate = new Date(lastLog.done_at);

                            const adjustedLogDate = new Date(lastLogDate);
                            adjustedLogDate.setHours(adjustedLogDate.getHours() - dayStartHour);
                            const logDateStr = adjustedLogDate.toISOString().split('T')[0];

                            if (def.frequency === 'weekly') {
                                const now = new Date();
                                now.setHours(now.getHours() - dayStartHour);
                                const dayOfWeek = now.getDay();
                                const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                                const monday = new Date(now);
                                monday.setDate(now.getDate() + diffToMon);
                                monday.setHours(0, 0, 0, 0);
                                isDone = adjustedLogDate >= monday;
                            } else if (def.frequency === 'monthly') {
                                const now = new Date();
                                now.setHours(now.getHours() - dayStartHour);
                                const currentMonth = now.toISOString().slice(0, 7);
                                const logMonth = adjustedLogDate.toISOString().slice(0, 7);
                                isDone = currentMonth === logMonth;
                            } else {
                                isDone = logDateStr === today;
                            }

                            if (isDone) {
                                doneBy = '家族';
                                doneAt = lastLogDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                        }
                    }

                    return {
                        id: type, // Unique ID per slot
                        label,
                        Icon: getIcon(def.icon),
                        type,
                        done: isDone,
                        doneBy,
                        doneAt,
                        frequency: def.frequency,
                        mealSlots: def.mealSlots,
                        perCat: def.perCat
                    };
                });
            });
    }, [careTaskDefs, careLogs, today, isDemo, dayStartHour, tasks, activeCatId]);

    const careCompleted = careItems.filter(c => c.done).length;

    async function handleCareToggle(item: typeof careItems[0]) {
        // Use addCareLog for both demo and Supabase modes (demo mode updates demoCareLogsDone)
        // If perCat, pass activeCatId
        const result = await addCareLog(item.type, item.perCat ? activeCatId : undefined);
        if (result?.error) {
            toast.error("記録に失敗しました");
        } else {
            toast.success(`${item.label} 完了！`);
        }
    }

    // ========== Cat Observation Logic ==========
    const observationItems = useMemo(() => {
        const catLogs = noticeLogs[activeCatId] || {};

        return noticeDefs
            .filter(n => n.enabled !== false && n.kind === 'notice')
            .map(notice => {
                const type = notice.title.includes('食欲') ? 'appetite' :
                    notice.title.includes('トイレ') ? 'toilet' :
                        notice.title.includes('吐') ? 'vomit' : 'other';

                let isDone = false;
                let value: string | undefined;
                let isAbnormal = false;

                if (isDemo) {
                    const log = catLogs[notice.id];
                    const isToday = log?.at?.startsWith(today);
                    isDone = !!(isToday && log?.done);
                    value = log?.value;
                    isAbnormal = !!(log?.value && log.value !== "いつも通り" && log.value !== "なし" && log.value !== "記録した");
                } else {
                    const matchingObs = observations.find(o => o.type === type);
                    isDone = !!matchingObs;
                    value = matchingObs?.value;
                    isAbnormal = !!(matchingObs?.value && matchingObs.value !== "いつも通り");
                }

                return {
                    id: notice.id,
                    label: notice.title,
                    type,
                    done: isDone,
                    value,
                    isAbnormal
                };
            });
    }, [noticeDefs, noticeLogs, activeCatId, today, isDemo, observations]);

    const obsCompleted = observationItems.filter(o => o.done).length;

    async function handleObservation(obsId: string, type: string, label: string, value: string) {
        if (isDemo) {
            setNoticeLogs(prev => ({
                ...prev,
                [activeCatId]: {
                    ...prev[activeCatId],
                    [obsId]: {
                        id: `${activeCatId}_${obsId}_${Date.now()}`,
                        catId: activeCatId,
                        noticeId: obsId,
                        value,
                        at: new Date().toISOString(),
                        done: true,
                        later: false
                    }
                }
            }));
            toast.success(`${label}: ${value}`);
        } else {
            const result = await addObservation(type, value);
            if (result?.error) {
                toast.error("記録に失敗しました");
            } else {
                toast.success(`${label}: ${value}`);
            }
        }
    }

    // ========== Inventory Logic ==========
    // Now uses stockLevel for alerts (user-friendly approach)
    const getStockUrgency = (level: string) => {
        if (level === 'empty') return 'danger';
        if (level === 'low') return 'warn';
        return 'ok';
    };

    const urgentInventory = inventory.filter(it =>
        it.enabled !== false &&
        it.alertEnabled !== false &&
        (it.stockLevel === 'low' || it.stockLevel === 'empty')
    );

    function handleInventoryAction(itemId: string) {
        setInventory(prev => prev.map(it => {
            if (it.id === itemId) {
                return {
                    ...it,
                    stockLevel: 'full',
                    lastRefillDate: new Date().toISOString()
                };
            }
            return it;
        }));
        toast.success("補充完了！在庫を「たっぷり」にリセットしました");
    }

    // ========== Memo Logic ==========
    function saveSharedMemo() {
        if (!memoDraft.trim()) return;
        setMemos(prev => ({
            ...prev,
            items: [{ text: memoDraft, at: new Date().toISOString() }, ...prev.items]
        }));
        setMemoDraft("");
        toast.success("メモを共有しました");
    }

    return (
        <div className="relative min-h-screen">
            <div className="space-y-4 pb-20">
                {/* Anomaly Alert Banner */}
                <AnomalyAlertBanner />

                {/* Check Section - Priority Items */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <CheckSection />
                </motion.div>

                {/* Section Boxes - Clickable */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-3 gap-3"
                >
                    {/* Care Box with Progress Ring */}
                    <button
                        onClick={() => setOpenSection('care')}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <div className="relative w-12 h-12">
                            {/* Progress Ring */}
                            <svg className="w-12 h-12 -rotate-90">
                                <circle
                                    cx="24" cy="24" r="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-slate-100"
                                />
                                <circle
                                    cx="24" cy="24" r="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className={careCompleted === careItems.length ? "text-primary" : "text-primary/60"}
                                    strokeDasharray={`${(careCompleted / Math.max(careItems.length, 1)) * 125.6} 125.6`}
                                />
                            </svg>
                            {/* Icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Heart className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">お世話</span>
                        <span className="text-xs text-slate-400">
                            {careCompleted}/{careItems.length}
                        </span>
                    </button>

                    {/* Cat Box with Progress Ring */}
                    <button
                        onClick={() => setOpenSection('cat')}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <div className="relative w-12 h-12">
                            {/* Progress Ring */}
                            <svg className="w-12 h-12 -rotate-90">
                                <circle
                                    cx="24" cy="24" r="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-slate-100"
                                />
                                <circle
                                    cx="24" cy="24" r="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className={obsCompleted === observationItems.length ? "text-primary" : "text-primary/60"}
                                    strokeDasharray={`${(obsCompleted / Math.max(observationItems.length, 1)) * 125.6} 125.6`}
                                />
                            </svg>
                            {/* Icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Cat className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">猫の様子</span>
                        <span className="text-xs text-slate-400">
                            {obsCompleted}/{observationItems.length}
                        </span>
                    </button>

                    {/* Inventory Box - Alert count with indicator */}
                    <button
                        onClick={() => setOpenSection('inventory')}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <div className="relative w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-slate-500" />
                            {/* Alert badge */}
                            {urgentInventory.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-400 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {urgentInventory.length}
                                </span>
                            )}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">在庫</span>
                        <span className="text-xs text-slate-400">
                            {urgentInventory.length > 0 ? `${urgentInventory.length}件アラート` : "OK"}
                        </span>
                    </button>
                </motion.div>

                {/* Section Overlays */}
                <AnimatePresence>
                    {openSection && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-50"
                            onClick={() => setOpenSection(null)}
                        >
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="absolute bottom-16 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl max-h-[70vh] overflow-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="sticky top-0 bg-white dark:bg-slate-900 px-5 py-4 border-b flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {openSection === 'care' && 'お世話'}
                                        {openSection === 'cat' && '猫の様子'}
                                        {openSection === 'inventory' && '在庫'}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (openSection === 'care') {
                                                    setIsCareSettingsOpen(true);
                                                } else if (openSection === 'cat') {
                                                    setIsNoticeSettingsOpen(true);
                                                } else if (openSection === 'inventory') {
                                                    setIsInventorySettingsOpen(true);
                                                }
                                            }}
                                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-slate-100 text-slate-500 hover:bg-primary hover:text-white"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setOpenSection(null);
                                                setSettingsMode(false);
                                                setNewItemInput('');
                                                setEditingId(null);
                                            }}
                                            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                                        >
                                            <X className="h-4 w-4 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5 space-y-3">
                                    {/* Care Content */}
                                    {openSection === 'care' && (
                                        settingsMode ? (
                                            <>
                                                {/* Settings: Enhanced task list */}
                                                <div className="space-y-4 max-h-[50vh] overflow-auto">
                                                    {careTaskDefs.map(task => (
                                                        <div key={task.id} className="p-4 rounded-xl bg-slate-50 space-y-3">
                                                            {/* Row 1: Icon + Title + Actions */}
                                                            <div className="flex items-center gap-3">
                                                                {(() => { const Icon = getIcon(task.icon); return <Icon className="h-5 w-5 text-slate-600" />; })()}
                                                                {editingId === task.id ? (
                                                                    <input
                                                                        type="text"
                                                                        value={editingValue}
                                                                        onChange={e => setEditingValue(e.target.value)}
                                                                        onBlur={() => {
                                                                            if (editingValue.trim()) updateCareTask(task.id, { title: editingValue.trim() });
                                                                            setEditingId(null);
                                                                        }}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') {
                                                                                if (editingValue.trim()) updateCareTask(task.id, { title: editingValue.trim() });
                                                                                setEditingId(null);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        className="flex-1 text-sm bg-white border rounded-lg px-2 py-1"
                                                                    />
                                                                ) : (
                                                                    <span className="flex-1 text-sm font-medium text-slate-700">{task.title}</span>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(task.id);
                                                                        setEditingValue(task.title);
                                                                    }}
                                                                    className="p-1.5 rounded-lg hover:bg-slate-200"
                                                                >
                                                                    <Pencil className="h-4 w-4 text-slate-400" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm('削除しますか？')) deleteCareTask(task.id);
                                                                    }}
                                                                    className="p-1.5 rounded-lg hover:bg-red-100"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-red-400" />
                                                                </button>
                                                            </div>
                                                            {/* Row 2: Frequency Pills */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(['once-daily', 'twice-daily', 'three-times-daily', 'four-times-daily', 'as-needed', 'weekly', 'monthly'] as const).map(freq => (
                                                                    <button
                                                                        key={freq}
                                                                        onClick={() => updateCareTask(task.id, { frequency: freq })}
                                                                        className={cn(
                                                                            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                                                            task.frequency === freq
                                                                                ? "bg-primary text-white"
                                                                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                        )}
                                                                    >
                                                                        {freq === 'once-daily' ? '1日1回' :
                                                                            freq === 'twice-daily' ? '1日2回' :
                                                                                freq === 'three-times-daily' ? '1日3回' :
                                                                                    freq === 'four-times-daily' ? '1日4回' :
                                                                                        freq === 'as-needed' ? '必要時' :
                                                                                            freq === 'weekly' ? '週1回' : '月1回'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {/* Row 3: Time of Day */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(['morning', 'noon', 'evening', 'anytime'] as const).map(time => (
                                                                    <button
                                                                        key={time}
                                                                        onClick={() => updateCareTask(task.id, { timeOfDay: time })}
                                                                        className={cn(
                                                                            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                                                            task.timeOfDay === time
                                                                                ? "bg-primary text-white"
                                                                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                        )}
                                                                    >
                                                                        {time === 'morning' ? '朝' : time === 'noon' ? '昼' : time === 'evening' ? '夜' : 'いつでも'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {/* Row 4: Per-cat toggle */}
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => updateCareTask(task.id, { perCat: !task.perCat })}
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                                                        task.perCat
                                                                            ? "bg-primary text-white"
                                                                            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                    )}
                                                                >
                                                                    {task.perCat ? '猫ごと' : '共通'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Add new task */}
                                                <div className="flex gap-2 pt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="新しいタスク名..."
                                                        value={newItemInput}
                                                        onChange={e => setNewItemInput(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && newItemInput.trim()) {
                                                                addCareTask(newItemInput.trim());
                                                                setNewItemInput('');
                                                                toast.success('追加しました');
                                                            }
                                                        }}
                                                        className="flex-1 rounded-full px-4 py-2 text-sm bg-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (newItemInput.trim()) {
                                                                addCareTask(newItemInput.trim());
                                                                setNewItemInput('');
                                                                toast.success('追加しました');
                                                            }
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"
                                                    >
                                                        <Plus className="h-4 w-4 text-white" />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            careItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => !item.done && handleCareToggle(item)}
                                                    disabled={item.done}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left",
                                                        item.done
                                                            ? "bg-slate-50 dark:bg-slate-800/50"
                                                            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.Icon className={cn("h-5 w-5", item.done ? "text-slate-400" : "text-slate-600")} />
                                                        <span className={cn("text-sm font-medium", item.done ? "text-slate-400 line-through" : "text-slate-700")}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                    {item.done ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400">{item.doneBy} • {item.doneAt}</span>
                                                            <Check className="h-5 w-5 text-emerald-500" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="text-xs font-bold px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 active:scale-95 transition-all"
                                                        >
                                                            完了
                                                        </button>
                                                    )}
                                                </button>
                                            ))
                                        )
                                    )}

                                    {/* Cat Content */}
                                    {openSection === 'cat' && (
                                        settingsMode ? (
                                            <>
                                                {/* Settings: Enhanced observation list */}
                                                <div className="space-y-4 max-h-[50vh] overflow-auto">
                                                    {noticeDefs.filter(n => n.kind === 'notice').map(notice => (
                                                        <div key={notice.id} className="p-4 rounded-xl bg-slate-50 space-y-3">
                                                            {/* Row 1: Enable + Title + Actions */}
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => updateNoticeDef(notice.id, { enabled: !notice.enabled })}
                                                                    className={cn(
                                                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                                                                        notice.enabled ? "bg-primary border-primary" : "border-slate-300"
                                                                    )}
                                                                >
                                                                    {notice.enabled && <Check className="h-3 w-3 text-white" />}
                                                                </button>
                                                                {editingId === notice.id ? (
                                                                    <input
                                                                        type="text"
                                                                        value={editingValue}
                                                                        onChange={e => setEditingValue(e.target.value)}
                                                                        onBlur={() => {
                                                                            if (editingValue.trim()) updateNoticeDef(notice.id, { title: editingValue.trim() });
                                                                            setEditingId(null);
                                                                        }}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') {
                                                                                if (editingValue.trim()) updateNoticeDef(notice.id, { title: editingValue.trim() });
                                                                                setEditingId(null);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        className="flex-1 text-sm bg-white border rounded-lg px-2 py-1"
                                                                    />
                                                                ) : (
                                                                    <span className={cn("flex-1 text-sm font-medium", notice.enabled ? "text-slate-700" : "text-slate-400")}>{notice.title}</span>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(notice.id);
                                                                        setEditingValue(notice.title);
                                                                    }}
                                                                    className="p-1.5 rounded-lg hover:bg-slate-200"
                                                                >
                                                                    <Pencil className="h-4 w-4 text-slate-400" />
                                                                </button>
                                                                {notice.id.startsWith('custom_') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm('削除しますか？')) deleteNoticeDef(notice.id);
                                                                        }}
                                                                        className="p-1.5 rounded-lg hover:bg-red-100"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-red-400" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {/* Row 2: Category selector */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(['eating', 'toilet', 'behavior', 'health'] as const).map(cat => (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={() => {
                                                                            // Auto-select smart defaults when category changes
                                                                            let defaultInput: 'ok-notice' | 'count' | 'choice' = 'ok-notice';
                                                                            if (cat === 'eating' || cat === 'toilet') defaultInput = 'choice';

                                                                            updateNoticeDef(notice.id, {
                                                                                category: cat,
                                                                                inputType: defaultInput
                                                                            });
                                                                        }}
                                                                        className={cn(
                                                                            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                                                                            notice.category === cat
                                                                                ? "bg-primary text-white border-primary"
                                                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                                        )}
                                                                    >
                                                                        {cat === 'eating' ? '🍽️ 食事' : cat === 'toilet' ? '💧 排泄' : cat === 'behavior' ? '🐈 行動' : '💊 体調'}
                                                                    </button>
                                                                ))}
                                                                <p className="w-full text-[10px] text-slate-400 mt-1">
                                                                    ※カテゴリを選ぶと記録タイプが自動設定されます
                                                                </p>
                                                            </div>
                                                            {/* Row 3: Input type selector */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(['ok-notice', 'count', 'choice'] as const).map(type => (
                                                                    <button
                                                                        key={type}
                                                                        onClick={() => updateNoticeDef(notice.id, { inputType: type })}
                                                                        className={cn(
                                                                            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                                                            notice.inputType === type
                                                                                ? "bg-primary text-white"
                                                                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                        )}
                                                                    >
                                                                        {type === 'ok-notice' ? 'OK/注意' : type === 'count' ? '数値' : '選択肢'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Add new observation */}
                                                <div className="flex gap-2 pt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="新しい観察項目..."
                                                        value={newItemInput}
                                                        onChange={e => setNewItemInput(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && newItemInput.trim()) {
                                                                addNoticeDef(newItemInput.trim());
                                                                setNewItemInput('');
                                                                toast.success('追加しました');
                                                            }
                                                        }}
                                                        className="flex-1 rounded-full px-4 py-2 text-sm bg-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (newItemInput.trim()) {
                                                                addNoticeDef(newItemInput.trim());
                                                                setNewItemInput('');
                                                                toast.success('追加しました');
                                                            }
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"
                                                    >
                                                        <Plus className="h-4 w-4 text-white" />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {cats.length > 1 && (
                                                    <div className="flex gap-2 mb-4">
                                                        {cats.map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={() => setActiveCatId(cat.id)}
                                                                className={cn(
                                                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                                                                    cat.id === activeCatId
                                                                        ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                                                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                )}
                                                            >
                                                                <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100">
                                                                    {(cat.avatar && (cat.avatar.startsWith('http') || cat.avatar.startsWith('/'))) ? (
                                                                        <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Cat className="w-3 h-3 text-slate-400" />
                                                                    )}
                                                                </div>
                                                                {cat.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {observationItems.map(obs => (
                                                    <div
                                                        key={obs.id}
                                                        className={cn(
                                                            "flex items-center justify-between px-4 py-3 rounded-xl",
                                                            obs.isAbnormal ? "bg-amber-50" : obs.done ? "bg-slate-50" : "bg-slate-100"
                                                        )}
                                                    >
                                                        <span className={cn("text-sm font-medium", obs.done ? "text-slate-400" : "text-slate-700")}>
                                                            {obs.label}
                                                        </span>
                                                        {obs.done ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "text-xs font-medium px-2 py-0.5 rounded-full",
                                                                    obs.isAbnormal ? "bg-amber-200 text-amber-700" : "bg-emerald-100 text-emerald-600"
                                                                )}>{obs.value}</span>
                                                                <Check className={cn("h-5 w-5", obs.isAbnormal ? "text-amber-500" : "text-emerald-500")} />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleObservation(obs.id, obs.type, obs.label, 'いつも通り')}
                                                                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                >OK</button>
                                                                <button
                                                                    onClick={() => handleObservation(obs.id, obs.type, obs.label, 'ちょっと違う')}
                                                                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                                                                >注意</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </>
                                        )
                                    )}

                                    {/* Inventory Content */}
                                    {openSection === 'inventory' && (
                                        settingsMode ? (
                                            <>
                                                {/* Settings: Enhanced inventory list */}
                                                <div className="space-y-4 max-h-[50vh] overflow-auto">
                                                    {inventory.map(item => (
                                                        <div key={item.id} className={cn(
                                                            "p-4 rounded-xl bg-slate-50 space-y-3",
                                                            item.enabled === false && "opacity-50"
                                                        )}>
                                                            {/* Row 1: Label + Actions */}
                                                            <div className="flex items-center gap-3">
                                                                {editingId === item.id ? (
                                                                    <input
                                                                        type="text"
                                                                        value={editingValue}
                                                                        onChange={e => setEditingValue(e.target.value)}
                                                                        onBlur={() => {
                                                                            if (editingValue.trim()) updateInventoryItem(item.id, { label: editingValue.trim() });
                                                                            setEditingId(null);
                                                                        }}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') {
                                                                                if (editingValue.trim()) updateInventoryItem(item.id, { label: editingValue.trim() });
                                                                                setEditingId(null);
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                        className="flex-1 text-sm bg-white border rounded-lg px-2 py-1"
                                                                    />
                                                                ) : (
                                                                    <span className="flex-1 text-sm font-medium text-slate-700 flex items-center gap-2">
                                                                        {item.label}
                                                                        {item.enabled === false && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded">無効</span>
                                                                        )}
                                                                    </span>
                                                                )}
                                                                {/* Enabled Toggle */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateInventoryItem(item.id, { enabled: item.enabled === false ? true : false })}
                                                                    className={cn(
                                                                        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                                                                        item.enabled !== false ? "bg-primary" : "bg-slate-200"
                                                                    )}
                                                                    role="switch"
                                                                    aria-checked={item.enabled !== false}
                                                                >
                                                                    <span
                                                                        className={cn(
                                                                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                                            item.enabled !== false ? "translate-x-4" : "translate-x-0"
                                                                        )}
                                                                    />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(item.id);
                                                                        setEditingValue(item.label);
                                                                    }}
                                                                    className="p-1.5 rounded-lg hover:bg-slate-200"
                                                                >
                                                                    <Pencil className="h-4 w-4 text-slate-400" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm('削除しますか？')) deleteInventoryItem(item.id);
                                                                    }}
                                                                    className="p-1.5 rounded-lg hover:bg-red-100"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-red-400" />
                                                                </button>
                                                            </div>
                                                            {/* Row 2: Stock Level Selector */}
                                                            <div className="flex gap-1">
                                                                {(['full', 'half', 'low', 'empty'] as const).map(level => (
                                                                    <button
                                                                        key={level}
                                                                        onClick={() => updateInventoryItem(item.id, {
                                                                            stockLevel: level,
                                                                            lastRefillDate: level === 'full' ? new Date().toISOString() : item.lastRefillDate
                                                                        })}
                                                                        className={cn(
                                                                            "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
                                                                            item.stockLevel === level
                                                                                ? "bg-primary text-white"
                                                                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                        )}
                                                                    >
                                                                        {level === 'full' ? 'たっぷり' : level === 'half' ? '半分' : level === 'low' ? '少ない' : 'なし'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {/* Row 3: Last refill info */}
                                                            {item.lastRefillDate && (
                                                                <div className="text-xs text-slate-400">
                                                                    最終補充: {new Date(item.lastRefillDate).toLocaleDateString('ja-JP')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Alert threshold */}
                                                <div className="pt-4 border-t">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-slate-700">アラート表示</span>
                                                        <span className="text-sm text-primary font-bold">{settings.invThresholds.urgent}日前</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="7"
                                                        value={settings.invThresholds.urgent}
                                                        onChange={e => updateInvThreshold('urgent', parseInt(e.target.value))}
                                                        className="w-full accent-primary"
                                                    />
                                                </div>
                                                {/* Add new inventory */}
                                                <div className="flex gap-2 pt-4">
                                                    <input
                                                        type="text"
                                                        placeholder="新しい在庫アイテム..."
                                                        value={newItemInput}
                                                        onChange={e => setNewItemInput(e.target.value)}
                                                        className="flex-1 rounded-full px-4 py-2 text-sm bg-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (newItemInput.trim()) {
                                                                addInventoryItem(newItemInput.trim(), newInvMin, newInvMax);
                                                                setNewItemInput('');
                                                                toast.success('追加しました');
                                                            }
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"
                                                    >
                                                        <Plus className="h-4 w-4 text-white" />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            urgentInventory.length > 0 ? urgentInventory.map(it => (
                                                <div key={it.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-slate-500">{it.range[0]}日</span>
                                                        <span className="text-sm font-medium text-slate-700">{it.label}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleInventoryAction(it.id)}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                                                    >補充済み</button>
                                                </div>
                                            )) : (
                                                <div className="text-center py-8 text-slate-400">
                                                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">在庫アラートはありません</p>
                                                </div>
                                            )
                                        )
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Shared Memos - Compact */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4"
                >
                    {/* Memo input - horizontal layout */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">メモ</span>
                        </div>
                        <input
                            type="text"
                            placeholder="家族に共有..."
                            className="flex-1 rounded-full px-4 py-2 text-sm bg-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={memoDraft}
                            onChange={(e) => setMemoDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveSharedMemo()}
                        />
                        <button
                            onClick={saveSharedMemo}
                            className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center hover:bg-slate-400 shrink-0"
                        >
                            <Send className="h-4 w-4 text-slate-600" />
                        </button>
                    </div>

                    {/* Memo chips */}
                    {memos.items.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {memos.items.slice(0, 3).map((m, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 group">
                                    <span className="max-w-[120px] truncate">{m.text}</span>
                                    <button
                                        onClick={() => {
                                            setMemos(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
                                            toast.info("削除しました");
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                    </button>
                                </div>
                            ))}
                            {memos.items.length > 3 && (
                                <span className="text-xs text-slate-400 py-1.5">+{memos.items.length - 3}</span>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Settings Modals */}
            <CareSettingsModal isOpen={isCareSettingsOpen} onClose={() => setIsCareSettingsOpen(false)} />
            <NoticeSettingsModal isOpen={isNoticeSettingsOpen} onClose={() => setIsNoticeSettingsOpen(false)} />
            <InventorySettingsModal isOpen={isInventorySettingsOpen} onClose={() => setIsInventorySettingsOpen(false)} />
        </div>
    );
}
