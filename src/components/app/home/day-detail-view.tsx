"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    Camera,
    AlertTriangle,
    Check,
    Undo2,
    Droplet,
    UtensilsCrossed,
    Scissors,
    Trash2,
    Sparkles,
    Pill,
    Heart,
    Stethoscope,
    Wind,
    Moon,
    Activity,
    MessageCircle,
    type LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
    useCareContext,
    useIncidentContext,
    useCatContext,
} from "@/store/app-store";
import { useCareData } from "@/hooks/use-care-logic";
import { getFullImageUrl, cn } from "@/lib/utils";

// アイコン名からLucideコンポーネントへのマッピング
const iconMap: Record<string, LucideIcon> = {
    'Droplet': Droplet,
    'droplet': Droplet,
    'UtensilsCrossed': UtensilsCrossed,
    'UtensilsCros': UtensilsCrossed,
    'utensilscrossed': UtensilsCrossed,
    'Scissors': Scissors,
    'scissors': Scissors,
    'Trash2': Trash2,
    'trash2': Trash2,
    'Sparkles': Sparkles,
    'sparkles': Sparkles,
    'Pill': Pill,
    'pill': Pill,
    'Heart': Heart,
    'heart': Heart,
    'Stethoscope': Stethoscope,
    'stethoscope': Stethoscope,
    'Wind': Wind,
    'wind': Wind,
    'Moon': Moon,
    'moon': Moon,
    'Activity': Activity,
    'activity': Activity,
};

const incidentTypeLabels: Record<string, string> = {
    'vomit': '嘔吐',
    'diarrhea': '下痢',
    'injury': '怪我',
    'no_energy': '元気がない',
    'sneeze': 'くしゃみ',
    'daily': '日常の記録',
    'worried': '気になること',
    'other': 'その他'
};

// アイコン名からコンポーネントを取得
function getIconComponent(iconName?: string): LucideIcon | null {
    if (!iconName) return null;
    return iconMap[iconName] || iconMap[iconName.replace(/\s/g, '')] || null;
}

interface DayDetailViewProps {
    day: Date;
    selectedCatIds: string[];
    onBack: () => void;
    onOpenHistory?: () => void;
    onOpenCamera?: () => void;
}

export function DayDetailView({
    day,
    selectedCatIds,
    onBack,
    onOpenHistory,
    onOpenCamera
}: DayDetailViewProps) {
    const { cats } = useCatContext();
    const { careLogs, observations, careTaskDefs } = useCareContext();
    const { incidents } = useIncidentContext();
    const { careItems } = useCareData();

    // Get all photos from cats
    const allPhotos = useMemo(() => {
        if (!cats) return [];
        return cats.flatMap((cat: any) =>
            (cat.images || []).map((img: any) => ({ ...img, cat_id: cat.id }))
        );
    }, [cats]);

    // Track completed tasks (for strikethrough + undo)
    const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

    // Track active tab
    const [activeTab, setActiveTab] = useState<'requests' | 'events'>('requests');

    const dayLabel = format(day, "M月d日（E）", { locale: ja });

    // Get tasks for this day
    const dayTasks = useMemo(() => {
        return careItems || [];
    }, [careItems]);

    // Get events for this day
    const dayEvents = useMemo(() => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        // Incidents
        const dayIncidents = (incidents || [])
            .filter((inc: any) => {
                const incDate = new Date(inc.created_at || inc.occurredAt);
                return incDate >= dayStart && incDate <= dayEnd;
            })
            .map((inc: any) => ({
                ...inc,
                incident_type: inc.type, // Preserve original type (e.g. vomit)
                type: 'incident',
                timestamp: new Date(inc.created_at || inc.occurredAt)
            }));

        // Care logs
        const dayCares = (careLogs || [])
            .filter((log: any) => {
                const logDate = new Date(log.completed_at || log.created_at || log.done_at);
                return logDate >= dayStart && logDate <= dayEnd;
            })
            .map((log: any) => ({
                ...log,
                type: 'care',
                timestamp: new Date(log.completed_at || log.created_at || log.done_at)
            }));

        // Observations
        const dayObs = (observations || [])
            .filter((obs: any) => {
                const obsDate = new Date(obs.recorded_at || obs.created_at);
                return obsDate >= dayStart && obsDate <= dayEnd;
            })
            .map((obs: any) => ({
                ...obs,
                type: 'observation',
                timestamp: new Date(obs.recorded_at || obs.created_at)
            }));

        // Collect all photo paths already shown in incidents/obs/cares
        const shownPhotoPaths = new Set<string>();
        dayIncidents.forEach(inc => (inc.photos || []).forEach((p: string) => shownPhotoPaths.add(p)));
        dayObs.forEach(obs => (obs.images || []).forEach((p: string) => shownPhotoPaths.add(p)));
        dayCares.forEach(care => (care.images || []).forEach((p: string) => shownPhotoPaths.add(p)));

        // Photos (De-duplicated)
        const dayPhotos = allPhotos
            .filter((img: any) => {
                const imgDate = new Date(img.created_at || img.createdAt);
                const isToday = imgDate >= dayStart && imgDate <= dayEnd;
                if (!isToday) return false;

                // Skip if already shown in an incident/care log
                const path = img.storage_path || img.url;
                return !shownPhotoPaths.has(path);
            })
            .map((img: any) => ({
                ...img,
                type: 'photo',
                timestamp: new Date(img.created_at || img.createdAt)
            }));

        // Combine and sort
        const allEvents = [...dayIncidents, ...dayCares, ...dayObs, ...dayPhotos];
        allEvents.sort((a, b) => {
            if (a.type === 'incident' && b.type !== 'incident') return -1;
            if (b.type === 'incident' && a.type !== 'incident') return 1;
            return b.timestamp.getTime() - a.timestamp.getTime();
        });

        return allEvents;
    }, [incidents, careLogs, allPhotos, day]);

    const handleToggleTask = (taskId: string) => {
        setCompletedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0B]">
            {/* Header */}
            <header className="flex items-center gap-3 px-4 pt-3 pb-1 shrink-0">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-white/70" />
                </button>
                <h1 className="text-base font-semibold text-white">{dayLabel}</h1>
            </header>

            {/* Tabbed Navigation (Segmented Control) */}
            <div className="px-4 py-3 shrink-0">
                <div className="bg-white/5 p-1 rounded-xl flex items-center relative overflow-hidden backdrop-blur-sm border border-white/5">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={cn(
                            "flex-1 py-2 text-xs font-bold transition-all duration-300 relative z-10",
                            activeTab === 'requests' ? "text-white" : "text-white/40"
                        )}
                    >
                        おねがい
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={cn(
                            "flex-1 py-2 text-xs font-bold transition-all duration-300 relative z-10",
                            activeTab === 'events' ? "text-white" : "text-white/40"
                        )}
                    >
                        できごと
                        {dayEvents.length > 0 && (
                            <span className="ml-1.5 opacity-40 font-normal">({dayEvents.length})</span>
                        )}
                    </button>

                    {/* Sliding Background Indicator */}
                    <motion.div
                        className="absolute inset-y-1 bg-white/10 rounded-lg shadow-sm border border-white/10"
                        initial={false}
                        animate={{
                            left: activeTab === 'requests' ? '4px' : '50%',
                            right: activeTab === 'requests' ? '50%' : '4px',
                        }}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'requests' ? (
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 overflow-y-auto px-4 pb-20"
                        >
                            <div className="space-y-2 pt-2">
                                {dayTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                            <Sparkles className="w-5 h-5 text-white/20" />
                                        </div>
                                        <p className="text-sm text-white/30">
                                            タスクはありません
                                        </p>
                                    </div>
                                ) : (
                                    dayTasks.map((task: any) => {
                                        const isCompleted = completedTaskIds.has(task.id);
                                        const IconComponent = getIconComponent(task.icon);

                                        return (
                                            <motion.div
                                                key={task.id}
                                                layout
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300",
                                                    isCompleted
                                                        ? "bg-white/[0.02] border-transparent"
                                                        : "bg-white/[0.08] border-white/5 shadow-lg"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                    isCompleted ? "bg-white/5" : "bg-white/10"
                                                )}>
                                                    {IconComponent ? (
                                                        <IconComponent className={cn("w-4.5 h-4.5", isCompleted ? "text-white/20" : "text-white/70")} />
                                                    ) : (
                                                        <span className="text-base">{task.emoji || '📋'}</span>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-semibold truncate transition-colors",
                                                        isCompleted ? "text-white/20 line-through" : "text-white/90"
                                                    )}>
                                                        {task.label || task.name}
                                                    </p>
                                                    {task.deadline && !isCompleted && (
                                                        <p className="text-[10px] text-white/40 mt-0.5">
                                                            残り {task.deadline}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleToggleTask(task.id)}
                                                    className={cn(
                                                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                                                        isCompleted
                                                            ? "bg-white/5 text-white/20"
                                                            : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20"
                                                    )}
                                                >
                                                    {isCompleted ? (
                                                        <Undo2 className="w-4.5 h-4.5" />
                                                    ) : (
                                                        <Check className="w-4.5 h-4.5" />
                                                    )}
                                                </button>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>

                            {/* History Link */}
                            {onOpenHistory && dayTasks.length > 0 && (
                                <button
                                    onClick={onOpenHistory}
                                    className="mt-6 w-full py-4 text-xs text-white/30 hover:text-white/50 transition-colors border-t border-white/5"
                                >
                                    履歴を見る →
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="events"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 overflow-y-auto px-4 pb-24"
                        >
                            <div className="space-y-3 pt-2">
                                {dayEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                            <Wind className="w-5 h-5 text-white/20" />
                                        </div>
                                        <p className="text-sm text-white/30">
                                            できごとはまだありません
                                        </p>
                                    </div>
                                ) : (
                                    dayEvents.map((event: any, idx: number) => (
                                        <motion.div
                                            key={event.id || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm"
                                        >
                                            {event.type === 'incident' && (
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className={cn(
                                                            "flex items-center gap-2",
                                                            (event.incident_type === 'daily' || event.incident_type === 'other') ? "text-sky-400" : "text-amber-400"
                                                        )}>
                                                            <div className="w-6 h-6 rounded-lg bg-current/10 flex items-center justify-center">
                                                                {(event.incident_type === 'daily' || event.incident_type === 'other') ? (
                                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                                {incidentTypeLabels[event.incident_type] || 'できごと'}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-white/30 font-medium bg-white/5 px-2 py-1 rounded-md">
                                                            {format(event.timestamp, 'HH:mm', { locale: ja })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                                                        {event.note || event.memo || event.description || '内容なし'}
                                                    </p>
                                                    {/* Images for incidents */}
                                                    {event.photos && event.photos.length > 0 && (
                                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                                            {event.photos.map((path: string, i: number) => (
                                                                <img
                                                                    key={i}
                                                                    src={getFullImageUrl(path)}
                                                                    className="w-full aspect-square object-cover rounded-xl border border-white/10"
                                                                    alt=""
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {event.type === 'care' && (
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/10">
                                                                <Check className="w-4.5 h-4.5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-white/90">
                                                                    {event.type_name || event.task_name || event.careType || 'お世話完了'}
                                                                </p>
                                                                <span className="text-[10px] text-white/30">
                                                                    {format(event.timestamp, 'HH:mm', { locale: ja })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {(event.notes || event.note) && (
                                                        <div className="mt-3 ml-11 pl-2 border-l-2 border-white/5">
                                                            <p className="text-xs text-white/50 italic leading-relaxed whitespace-pre-wrap">
                                                                {event.notes || event.note}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {event.type === 'observation' && (
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2 text-sky-400">
                                                            <div className="w-6 h-6 rounded-lg bg-sky-400/10 flex items-center justify-center">
                                                                <Activity className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                                {event.type || '記録'}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-white/30 font-medium bg-white/5 px-2 py-1 rounded-md">
                                                            {format(event.timestamp, 'HH:mm', { locale: ja })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-white/90 font-medium">
                                                        {event.value}
                                                    </p>
                                                    {(event.notes || event.note) && (
                                                        <p className="text-xs text-white/60 mt-2 bg-white/5 p-2 rounded-lg italic">
                                                            {event.notes || event.note}
                                                        </p>
                                                    )}
                                                    {/* Images for observations */}
                                                    {event.images && event.images.length > 0 && (
                                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                                            {event.images.map((path: string, i: number) => (
                                                                <img
                                                                    key={i}
                                                                    src={getFullImageUrl(path)}
                                                                    className="w-full aspect-square object-cover rounded-xl border border-white/10"
                                                                    alt=""
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {event.type === 'photo' && (
                                                <div className="relative group">
                                                    <img
                                                        src={getFullImageUrl(event.storage_path || event.url)}
                                                        alt=""
                                                        className="w-full aspect-[4/3] object-cover"
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] text-white/60 bg-white/10 px-2 py-1 rounded backdrop-blur-md">
                                                                {format(event.timestamp, 'HH:mm', { locale: ja })}
                                                            </span>
                                                        </div>
                                                        {event.caption && (
                                                            <p className="mt-2 text-sm text-white/90 font-medium leading-relaxed">
                                                                {event.caption}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
