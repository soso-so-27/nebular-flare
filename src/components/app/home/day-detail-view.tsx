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
            <header className="flex items-center gap-3 px-4 py-3">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-white/70" />
                </button>
                <h1 className="text-base font-semibold text-white">{dayLabel}</h1>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Today's Requests Section */}
                <section className="p-4 pt-0">
                    <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                        今日のおねがい
                    </h2>

                    <div className="space-y-2">
                        {dayTasks.length === 0 ? (
                            <p className="text-sm text-white/40 py-4 text-center">
                                タスクはありません
                            </p>
                        ) : (
                            dayTasks.map((task: any) => {
                                const isCompleted = completedTaskIds.has(task.id);
                                const IconComponent = getIconComponent(task.icon);

                                return (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        className={`
                                            flex items-center gap-3 p-3 rounded-xl
                                            ${isCompleted ? 'bg-white/5' : 'bg-white/10'}
                                            transition-colors
                                        `}
                                    >
                                        <div className={`
                                            w-9 h-9 rounded-full flex items-center justify-center
                                            ${isCompleted ? 'bg-white/10' : 'bg-white/15'}
                                        `}>
                                            {IconComponent ? (
                                                <IconComponent className={`w-4 h-4 ${isCompleted ? 'text-white/30' : 'text-white/70'}`} />
                                            ) : (
                                                <span className="text-sm">{task.emoji || '📋'}</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`
                                                text-sm font-medium truncate
                                                ${isCompleted ? 'text-white/30 line-through' : 'text-white/90'}
                                            `}>
                                                {task.label || task.name}
                                            </p>
                                            {task.deadline && !isCompleted && (
                                                <p className="text-xs text-white/40">
                                                    残り {task.deadline}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleToggleTask(task.id)}
                                            className={`
                                                w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                                transition-all
                                                ${isCompleted
                                                    ? 'bg-white/10 text-white/40'
                                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                }
                                            `}
                                        >
                                            {isCompleted ? (
                                                <Undo2 className="w-4 h-4" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </button>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* History Link */}
                    {onOpenHistory && (
                        <button
                            onClick={onOpenHistory}
                            className="mt-4 text-xs text-white/40 hover:text-white/60 transition-colors"
                        >
                            履歴を見る →
                        </button>
                    )}
                </section>

                {/* Events Section */}
                <section className="px-4 pb-4">
                    <div className="flex items-center justify-between mb-3 pt-3 border-t border-white/5">
                        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                            できごと
                        </h2>
                        {dayEvents.length > 0 && (
                            <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                                {dayEvents.length}件
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        {dayEvents.length === 0 ? (
                            <p className="text-sm text-white/40 py-4 text-center">
                                イベントはありません
                            </p>
                        ) : (
                            dayEvents.map((event: any, idx: number) => (
                                <motion.div
                                    key={event.id || idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="bg-white/5 rounded-xl overflow-hidden"
                                >
                                    {event.type === 'incident' && (
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={cn(
                                                    "flex items-center gap-2",
                                                    (event.incident_type === 'daily' || event.incident_type === 'other') ? "text-sky-400" : "text-amber-400"
                                                )}>
                                                    {(event.incident_type === 'daily' || event.incident_type === 'other') ? (
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                    )}
                                                    <span className="text-[10px] font-bold uppercase tracking-wide">
                                                        {incidentTypeLabels[event.incident_type] || 'できごと'}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-white/30">
                                                    {format(event.timestamp, 'HH:mm', { locale: ja })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-white/90 whitespace-pre-wrap">
                                                {event.note || event.memo || event.description || '内容なし'}
                                            </p>
                                            {/* Images for incidents */}
                                            {event.photos && event.photos.length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    {event.photos.map((path: string, i: number) => (
                                                        <img
                                                            key={i}
                                                            src={getFullImageUrl(path)}
                                                            className="w-full aspect-[4/3] object-cover rounded-lg border border-white/5"
                                                            alt=""
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {event.type === 'care' && (
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-white/90 truncate">
                                                        {event.type_name || event.task_name || event.careType || 'お世話完了'}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] text-white/40">
                                                    {format(event.timestamp, 'HH:mm', { locale: ja })}
                                                </span>
                                            </div>
                                            {(event.notes || event.note) && (
                                                <p className="text-sm text-white/60 ml-11 mt-1 whitespace-pre-wrap">
                                                    {event.notes || event.note}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {event.type === 'observation' && (
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sky-400">
                                                    <Activity className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wide">
                                                        {event.type || '記録'}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-white/30">
                                                    {format(event.timestamp, 'HH:mm', { locale: ja })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-white/90">
                                                {event.value}
                                            </p>
                                            {(event.notes || event.note) && (
                                                <p className="text-xs text-white/60 mt-1 whitespace-pre-wrap">
                                                    {event.notes || event.note}
                                                </p>
                                            )}
                                            {/* Images for observations */}
                                            {event.images && event.images.length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    {event.images.map((path: string, i: number) => (
                                                        <img
                                                            key={i}
                                                            src={getFullImageUrl(path)}
                                                            className="w-full aspect-[4/3] object-cover rounded-lg border border-white/5"
                                                            alt=""
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {event.type === 'photo' && (
                                        <div>
                                            <img
                                                src={getFullImageUrl(event.storage_path || event.url)}
                                                alt=""
                                                className="w-full aspect-[16/9] object-cover"
                                            />
                                            {event.caption && (
                                                <p className="p-3 text-sm text-white/70">
                                                    {event.caption}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Fallback for unknown types */}
                                    {!['incident', 'care', 'photo'].includes(event.type) && (
                                        <div className="p-3">
                                            <p className="text-xs text-white/40 mb-1">type: {event.type}</p>
                                            <p className="text-sm text-white/80">
                                                {event.title || event.description || event.name || JSON.stringify(event).slice(0, 100)}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* Camera FAB */}
            {onOpenCamera && (
                <button
                    onClick={onOpenCamera}
                    className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                    <Camera className="w-5 h-5 text-white/80" />
                </button>
            )}
        </div>
    );
}
