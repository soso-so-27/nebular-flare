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
    FileText,
    CheckCircle2,
    MoreVertical,
    Edit2,
    ListPlus,
    ImageIcon,
    type LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
    useCareContext,
    useIncidentContext,
    useCatContext,
    useCoreContext,
} from "@/store/app-store";
import { useCareData } from "@/hooks/use-care-logic";
import { getFullImageUrl, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CareSettingsModal } from "../modals/care-settings-modal";

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
    onOpenNewRecord?: (day: Date) => void;
    onOpenIncidentDetail?: (id: string) => void;
}

export function DayDetailView({
    day,
    selectedCatIds,
    onBack,
    onOpenHistory,
    onOpenCamera,
    onOpenNewRecord,
    onOpenIncidentDetail
}: DayDetailViewProps) {
    const { cats } = useCatContext();
    const { careLogs, observations, careTaskDefs } = useCareContext();
    const { incidents } = useIncidentContext();
    const { careItems, addCareLog, deleteCareLog: requestDeleteLog } = useCareData();
    const { householdUsers, currentUserId } = useCoreContext();

    // Get all photos from cats
    const allPhotos = useMemo(() => {
        if (!cats) return [];
        return cats.flatMap((cat: any) =>
            (cat.images || []).map((img: any) => ({ ...img, cat_id: cat.id }))
        );
    }, [cats]);

    const dayLabel = format(day, "M月d日（E）", { locale: ja });

    const { careRecords, lifeEvents } = useMemo(() => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        // Incidents
        const dayIncidents = (incidents || [])
            .filter((inc: any) => {
                const incDate = new Date(inc.onset_at || inc.created_at || inc.occurredAt);
                return incDate >= dayStart && incDate <= dayEnd;
            })
            .map((inc: any) => ({
                ...inc,
                incident_type: inc.type,
                type: 'incident',
                timestamp: new Date(inc.onset_at || inc.created_at || inc.occurredAt)
            }));

        // Care logs (These are the "Records")
        const dayCares = (careLogs || [])
            .filter((log: any) => {
                const logDate = new Date(log.done_at || log.completed_at || log.created_at);
                return logDate >= dayStart && logDate <= dayEnd;
            })
            .map((log: any) => ({
                ...log,
                care_task_id: log.type, // もともとの type カラムに保持されているタスクIDを退避
                type: 'care_log',
                timestamp: new Date(log.done_at || log.completed_at || log.created_at)
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

        // Collect all photo paths using specific filenames to avoid robust mismatch
        const shownPhotoPaths = new Set<string>();
        const extractFilename = (p: string) => p.split('/').pop() || p;

        dayIncidents.forEach(inc => (inc.photos || []).forEach((p: string) => shownPhotoPaths.add(extractFilename(p))));
        dayObs.forEach(obs => (obs.images || []).forEach((p: string) => shownPhotoPaths.add(extractFilename(p))));
        dayCares.forEach(care => (care.images || []).forEach((p: string) => shownPhotoPaths.add(extractFilename(p))));

        // Photos
        const dayPhotos = allPhotos
            .filter((img: any) => {
                const imgDate = new Date(img.created_at || img.createdAt);
                const isToday = imgDate >= dayStart && imgDate <= dayEnd;
                if (!isToday) return false;
                const path = img.storage_path || img.url;
                if (!path) return false; // MUST have a path
                return !shownPhotoPaths.has(extractFilename(path));
            })
            .map((img: any) => ({
                ...img,
                type: 'photo',
                timestamp: new Date(img.created_at || img.createdAt)
            }));

        // Sort life events (Photos, Incidents, Observations, Care Logs - Unified for timeline)
        const life = [...dayIncidents, ...dayObs, ...dayPhotos, ...dayCares];
        life.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return {
            careRecords: dayCares,
            lifeEvents: life
        };
    }, [incidents, careLogs, observations, allPhotos, day]);

    const [editingItem, setEditingItem] = useState<{ id: string, type: string, note: string } | null>(null);
    const [editNote, setEditNote] = useState("");
    const [isCareModalOpen, setIsCareModalOpen] = useState(false);

    const { updateIncidentNote, deleteIncident } = useIncidentContext();
    const { updateCareLogNote, deleteCareLog: contextDeleteLog, updateObservationNote, deleteObservation } = useCareContext();
    const { deleteCatImage } = useCatContext();

    const handleEdit = (item: any) => {
        setEditingItem({
            id: item.id,
            type: item.type,
            note: item.note || item.notes || item.memo || item.value || ""
        });
        setEditNote(item.note || item.notes || item.memo || item.value || "");
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            if (editingItem.type === 'incident') await updateIncidentNote(editingItem.id, editNote);
            else if (editingItem.type === 'care_log') await updateCareLogNote(editingItem.id, editNote);
            else if (editingItem.type === 'observation') await updateObservationNote(editingItem.id, editNote);

            toast.success("メモを更新しました");
            setEditingItem(null);
        } catch (e) {
            toast.error("更新に失敗しました");
        }
    };

    const handleDelete = async (item: any, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't trigger navigation
        if (!confirm("本当に削除しますか？")) return;
        try {
            if (item.type === 'incident') await deleteIncident(item.id);
            else if (item.type === 'care_log') await (contextDeleteLog as any)(item.id);
            else if (item.type === 'observation') await deleteObservation(item.id);
            else if (item.type === 'photo') await deleteCatImage(item.id, item.storage_path || item.url);

            toast.success("削除しました");
        } catch (e) {
            toast.error("削除に失敗しました");
        }
    };

    // Active (pending) tasks for the day
    const pendingTasks = useMemo(() => {
        return careItems || [];
    }, [careItems]);

    const handleToggleTask = async (task: any) => {
        try {
            await addCareLog(
                task.actionId || task.id,
                task.catId
            );
        } catch (e) {
            console.error("Failed to add care log", e);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#FDF8F1]">
            {/* Header */}
            <header
                className="flex items-center gap-3 px-5 pb-3 shrink-0 bg-[#FDF8F1] relative z-20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + 16px)' }}
            >
                <button
                    onClick={onBack}
                    className="p-2.5 -ml-2.5 rounded-full hover:bg-[#4E342E]/5 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-[#4E342E]/70" />
                </button>
                <h1 className="text-[17px] font-black text-[#4E342E] tracking-tight">{dayLabel}</h1>
                <div className="ml-auto w-10 h-10" />
            </header>

            {/* Main content area */}
            <div className="flex-1 w-full flex flex-col overflow-hidden">
                {/* 1. Pending Tasks Carousel (Fixed at top) */}
                <div className="pt-4 pb-2 shrink-0">
                    <div className="px-6 mb-3 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-[#4E342E]/50">今日のおねがい</h2>
                        <button
                            onClick={() => setIsCareModalOpen(true)}
                            className="py-1.5 px-3 rounded-[12px] bg-white border border-[#4E342E]/5 text-[#4E342E]/60 hover:bg-[#4E342E]/5 hover:text-[#4E342E]/80 transition-colors flex items-center gap-1.5 shadow-[0_2px_8px_-2px_rgba(78,52,46,0.05)]"
                            title="おねがいを追加・編集"
                        >
                            <ListPlus className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">追加・編集</span>
                        </button>
                    </div>

                    {pendingTasks.length === 0 ? (
                        <div className="px-5 py-6 flex items-center justify-center bg-white/40 mx-4 rounded-[24px] border border-[#4E342E]/5 mb-2">
                            <Sparkles className="w-5 h-5 text-[#4E342E]/20" />
                            <p className="text-[11px] text-[#4E342E]/40 font-bold ml-2">すべてのおねがいを完了しました</p>
                        </div>
                    ) : (
                        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-6 px-4">
                            {/* Inner wrapper to safely pad without cutting off shadows */}
                            <div className="flex gap-4 px-2 w-max">
                                {pendingTasks.map((task: any) => {
                                    const IconComponent = getIconComponent(task.icon);
                                    return (
                                        <motion.button
                                            key={task.id}
                                            onClick={() => handleToggleTask(task)}
                                            whileTap={{ scale: 0.98 }}
                                            className="snap-start shrink-0 flex items-center p-3 pr-4 rounded-[24px] bg-white/80 backdrop-blur-md border border-[#4E342E]/5 shadow-[0_2px_16px_-4px_rgba(78,52,46,0.04)] w-[260px] max-w-[85vw] h-[68px] group hover:border-[#4E342E]/10 hover:shadow-[0_4px_20px_-4px_rgba(78,52,46,0.06)] transition-all text-left"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#EAE5DC] dark:group-hover:bg-white/10 transition-colors">
                                                {IconComponent ? (
                                                    <IconComponent className="w-5 h-5 text-[#4E342E]/60 dark:text-white/70" />
                                                ) : (
                                                    <span className="text-xl">{task.emoji || '📋'}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 px-3.5 flex flex-col justify-center">
                                                <p className="text-[13px] font-bold text-[#4E342E] dark:text-white leading-snug truncate">{task.title || task.name || task.label}</p>
                                            </div>
                                            <div className="w-6 h-6 rounded-full border-[1.5px] border-[#4E342E]/15 dark:border-white/20 flex items-center justify-center shrink-0 group-hover:border-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 transition-colors">
                                                <Check className="w-3.5 h-3.5 text-transparent group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Timeline (Scrollable) */}
                <div className="bg-white rounded-t-[32px] flex-1 overflow-y-auto shadow-[0_-8px_24px_-8px_rgba(78,52,46,0.04)] pt-2 pb-[calc(100px+env(safe-area-inset-bottom))] relative z-10 w-full min-h-0">
                    <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-[#4E342E]/50">
                            タイムライン
                        </h2>
                        {lifeEvents.length > 0 && (
                            <span className="text-[10px] text-[#4E342E]/60 font-black bg-slate-50 border border-[#4E342E]/5 px-2.5 py-1 rounded-full shadow-[0_2px_8px_-2px_rgba(78,52,46,0.05)]">
                                {lifeEvents.length}件
                            </span>
                        )}
                    </div>

                    <div className="px-5 space-y-3.5">
                        {lifeEvents.length === 0 ? (
                            <div className="py-16 flex flex-col items-center gap-3">
                                <Wind className="w-8 h-8 text-[#4E342E]/10" />
                                <p className="text-[12px] text-[#4E342E]/30 font-black">まだ記録がありません</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {lifeEvents.map((event: any, idx: number) => {
                                    // 完了したおねがい (Care Log) - ミニマル表示
                                    if (event.type === 'care_log') {
                                        // 実際のタスクID ('c1_water' のような catId_taskDefId 形式、または 'uuid:morning' のようなスロット指定)
                                        const taskDefIdStr = String(event.care_task_id || event.task_id || '');
                                        const taskDef = careTaskDefs?.find(d =>
                                            taskDefIdStr === d.id ||
                                            taskDefIdStr.startsWith(`${d.id}:`) || // スロット指定 ("uuid:morning")
                                            taskDefIdStr.endsWith(`_${d.id}`) ||   // 旧型式プレフィックス ("c1_water")
                                            taskDefIdStr.includes(d.id)            // その他
                                        );

                                        // タスク名の導出（マスターになければお薬などの特殊プレフィックスかフォールバック）
                                        let taskTitle = taskDef?.title;
                                        if (!taskTitle) {
                                            if (taskDefIdStr.startsWith('medication:')) {
                                                taskTitle = 'お薬';
                                            } else if (taskDefIdStr.startsWith('adhoc:')) {
                                                taskTitle = taskDefIdStr.replace('adhoc:', '');
                                            } else {
                                                taskTitle = event.title || event.care_type || 'お世話';
                                            }
                                        }

                                        const IconComponent = getIconComponent(taskDef?.icon || event.icon);

                                        // 誰がお世話をしたか
                                        const doneByUserId = event.done_by || event.user_id;
                                        const doneByUser = doneByUserId ? householdUsers?.find(u => u.id === doneByUserId) : null;
                                        const isMe = currentUserId === doneByUserId;
                                        const userDisplayName = doneByUser?.display_name || (isMe ? 'あなた' : 'だれか');

                                        return (
                                            <motion.div
                                                layout
                                                key={`care-${event.id}`}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white/60 border border-[#4E342E]/5 shadow-[0_2px_12px_-4px_rgba(78,52,46,0.03)] rounded-[20px] p-3 pr-4 flex gap-3.5 items-center group relative overflow-hidden"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center shrink-0 transition-colors">
                                                    {IconComponent ? (
                                                        <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                                    ) : (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2 flex items-center gap-3">
                                                    <p className="text-[13px] font-black text-[#4E342E]/80 truncate max-w-[140px]">{taskTitle}</p>
                                                    <span className="text-[10px] text-[#4E342E]/30 font-bold font-mono shrink-0">{format(event.timestamp, 'HH:mm')}</span>
                                                </div>

                                                {/* 担当者表示とUndoボタン */}
                                                <div className="flex items-center gap-2.5 shrink-0 pl-3 border-l border-[#4E342E]/10">
                                                    <div className="flex items-center gap-1.5">
                                                        {doneByUser?.avatar_url ? (
                                                            <img src={getFullImageUrl(doneByUser.avatar_url)} alt={userDisplayName} className="w-5 h-5 rounded-full object-cover shadow-sm bg-white border border-[#4E342E]/5 shrink-0" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-[#4E342E]/5 flex items-center justify-center text-[9px] font-bold text-[#4E342E]/40 shadow-sm border border-[#4E342E]/5 shrink-0">
                                                                {userDisplayName.slice(0, 1)}
                                                            </div>
                                                        )}
                                                        <span className="text-[11px] font-bold text-[#4E342E]/50 truncate max-w-[50px]">{userDisplayName}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleDelete(event, e)}
                                                        className="p-1.5 rounded-full hover:bg-rose-500/10 text-[#4E342E]/20 hover:text-rose-500 transition-colors bg-white shadow-[0_2px_8px_-2px_rgba(78,52,46,0.05)] border border-[#4E342E]/5 shrink-0"
                                                        title="未完了に戻す"
                                                    >
                                                        <Undo2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    }

                                    // 異常記録やメモ (Incident)
                                    if (event.type === 'incident') {
                                        return (
                                            <motion.div
                                                key={`incident-${event.id}`}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="bg-white rounded-[28px] border border-[#4E342E]/5 shadow-[0_8px_24px_-8px_rgba(78,52,46,0.05)] overflow-hidden"
                                                onClick={() => onOpenIncidentDetail?.(event.id)}
                                            >
                                                <div className="p-5 relative group active:bg-[#4E342E]/5 transition-colors cursor-pointer">
                                                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                                        <span className="text-[10px] text-[#4E342E]/20 font-mono mr-1">
                                                            {format(event.timestamp, 'HH:mm')}
                                                        </span>
                                                        <button
                                                            onClick={(e) => handleDelete(event, e)}
                                                            className="p-1.5 rounded-full hover:bg-rose-500/10 text-[#4E342E]/20 hover:text-rose-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(event); }}
                                                            className="p-1.5 rounded-full hover:bg-[#4E342E]/5 text-[#4E342E]/20 hover:text-[#4E342E] transition-colors"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-start gap-3.5 pr-20">
                                                        <div className="w-10 h-10 rounded-full bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center shrink-0 transition-colors">
                                                            {['worried', 'troubled'].includes(event.incident_type) ? (
                                                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                            ) : ['hospital', 'medicine'].includes(event.incident_type) ? (
                                                                <Stethoscope className="w-5 h-5 text-rose-500" />
                                                            ) : (
                                                                <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 mt-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/50 mb-1 block">
                                                                {incidentTypeLabels[event.incident_type] || 'RECORD'}
                                                            </span>
                                                            <p className="text-[14px] text-[#4E342E] leading-relaxed font-bold">
                                                                {event.note || event.memo || event.description || '内容なし'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {event.photos && event.photos.length > 0 && (
                                                        <div className="mt-4 -mx-5 -mb-5 border-t border-[#4E342E]/5">
                                                            <div className={`grid gap-0.5 ${event.photos.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                                {event.photos.map((path: string, i: number) => (
                                                                    <img key={i} src={getFullImageUrl(path)} className="w-full aspect-[4/3] object-cover bg-[#4E342E]/5" alt="" />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    }

                                    // 観察記録 (Observation - Toilet etc)
                                    if (event.type === 'observation') {
                                        return (
                                            <motion.div
                                                key={`obs-${event.id}`}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="bg-white rounded-[28px] border border-[#4E342E]/5 shadow-[0_8px_24px_-8px_rgba(78,52,46,0.05)] p-5 relative group"
                                            >
                                                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                                    <span className="text-[10px] text-[#4E342E]/20 font-mono mr-1">
                                                        {format(event.timestamp, 'HH:mm')}
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleDelete(event, e)}
                                                        className="p-1.5 rounded-full hover:bg-rose-500/10 text-[#4E342E]/20 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="flex items-start gap-3.5 pr-20">
                                                    <div className="w-10 h-10 rounded-full bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center shrink-0 transition-colors">
                                                        <Activity className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                                                    </div>
                                                    <div className="flex-1 mt-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/50 mb-1 block">HEALTH</span>
                                                        <p className="text-[14px] text-[#4E342E] font-bold">{event.value}</p>
                                                        {(event.notes || event.note) && (
                                                            <p className="text-[11px] text-[#4E342E]/60 mt-1 leading-relaxed">{event.notes || event.note}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    }

                                    // 写真 (Photo)
                                    if (event.type === 'photo') {
                                        return (
                                            <motion.div
                                                key={`photo-${event.id}`}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="relative aspect-[1.4] group rounded-[24px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]"
                                            >
                                                {(() => {
                                                    const imageUrl = getFullImageUrl(event.storage_path || event.url);
                                                    if (!imageUrl) return (
                                                        <div className="w-full h-full bg-[#4E342E]/5 flex flex-col items-center justify-center gap-3">
                                                            <ImageIcon className="w-8 h-8 text-[#4E342E]/20" />
                                                            <span className="text-[11px] font-bold text-[#4E342E]/30">画像がありません</span>
                                                        </div>
                                                    );
                                                    return <img src={imageUrl} alt="" className="w-full h-full object-cover" />;
                                                })()}
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#4E342E]/80 via-[#4E342E]/20 to-transparent flex flex-col justify-end p-5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <p className="text-[14px] text-white font-bold truncate drop-shadow-md">{event.caption || '写真'}</p>
                                                            {(event.memo || event.notes) && (
                                                                <p className="text-[12px] text-white/90 truncate mt-1 drop-shadow-md">{event.memo || event.notes}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[11px] text-white/90 font-mono font-bold drop-shadow-md">{format(event.timestamp, 'HH:mm')}</span>
                                                            <button
                                                                onClick={(e) => handleDelete(event, e)}
                                                                className="p-2 rounded-full hover:bg-rose-500/40 text-white/60 hover:text-white transition-colors backdrop-blur-sm bg-black/20"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    }

                                    return null;
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Memo Modal */}
            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
                <DialogContent className="sm:max-w-[425px] bg-white border-[#4E342E]/10 text-[#4E342E]">
                    <DialogHeader>
                        <DialogTitle className="text-[#4E342E] font-bold">メモを編集</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="メモを入力..."
                            className="min-h-[120px] bg-[#4E342E]/5 border-[#4E342E]/10 focus:border-[#4E342E]/30 text-[#4E342E]"
                        />
                    </div>
                    <DialogFooter className="border-t border-[#4E342E]/5 pt-4">
                        <Button variant="ghost" onClick={() => setEditingItem(null)} className="text-[#4E342E]/60">
                            キャンセル
                        </Button>
                        <Button onClick={handleSaveEdit} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-bold">
                            保存する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CareSettingsModal isOpen={isCareModalOpen} onClose={() => setIsCareModalOpen(false)} />
        </div>
    );
}
