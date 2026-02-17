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
    MoreVertical,
    Edit2,
    Plus,
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
import { CareHistoryList } from "@/components/app/immersive/care-history-list";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

    // Get all photos from cats
    const allPhotos = useMemo(() => {
        if (!cats) return [];
        return cats.flatMap((cat: any) =>
            (cat.images || []).map((img: any) => ({ ...img, cat_id: cat.id }))
        );
    }, [cats]);

    // Track active sub-tab for the Requests section
    const [requestTab, setRequestTab] = useState<'pending' | 'completed'>('pending');

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

        // Collect all photo paths
        const shownPhotoPaths = new Set<string>();
        dayIncidents.forEach(inc => (inc.photos || []).forEach((p: string) => shownPhotoPaths.add(p)));
        dayObs.forEach(obs => (obs.images || []).forEach((p: string) => shownPhotoPaths.add(p)));
        dayCares.forEach(care => (care.images || []).forEach((p: string) => shownPhotoPaths.add(p)));

        // Photos
        const dayPhotos = allPhotos
            .filter((img: any) => {
                const imgDate = new Date(img.created_at || img.createdAt);
                const isToday = imgDate >= dayStart && imgDate <= dayEnd;
                if (!isToday) return false;
                const path = img.storage_path || img.url;
                return !shownPhotoPaths.has(path);
            })
            .map((img: any) => ({
                ...img,
                type: 'photo',
                timestamp: new Date(img.created_at || img.createdAt)
            }));

        // Sort life events (Photos, Incidents, Observations, Care Logs - Unified for timeline)
        const life = [...dayIncidents, ...dayObs, ...dayPhotos];
        life.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return {
            careRecords: dayCares,
            lifeEvents: life
        };
    }, [incidents, careLogs, observations, allPhotos, day]);

    const [editingItem, setEditingItem] = useState<{ id: string, type: string, note: string } | null>(null);
    const [editNote, setEditNote] = useState("");

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
        if (requestTab === 'completed') {
            if (task.id) {
                await (requestDeleteLog as any)(task.id);
            }
            return;
        }

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
                className="flex items-center gap-3 px-4 pb-2 shrink-0 border-b border-[#4E342E]/5 bg-[#FDF8F1] relative z-20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + 12px)' }}
            >
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-[#4E342E]/5 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-[#4E342E]/70" />
                </button>
                <h1 className="text-base font-bold text-[#4E342E]">{dayLabel}</h1>
                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={() => onOpenNewRecord?.(day)}
                        className="p-2 rounded-full bg-[#4E342E]/5 text-[#4E342E]/70 hover:bg-[#4E342E]/10 transition-colors"
                        title="記録を追加"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* TOP HALF: Requests Area */}
                <div className="h-1/2 flex flex-col overflow-hidden border-b border-[#4E342E]/5">
                    {/* Sub-Tabs for Requests */}
                    <div className="px-4 py-3 shrink-0">
                        <div className="bg-[#4E342E]/5 p-1 rounded-xl flex items-center relative overflow-hidden border border-[#4E342E]/5">
                            <button
                                onClick={() => setRequestTab('pending')}
                                className={cn(
                                    "flex-1 py-1.5 text-[10px] font-black tracking-wider transition-all duration-300 relative z-10",
                                    requestTab === 'pending' ? "text-[#4E342E]" : "text-[#4E342E]/40"
                                )}
                            >
                                おねがい
                                {pendingTasks.length > 0 && (
                                    <span className="ml-1 opacity-60">({pendingTasks.length})</span>
                                )}
                            </button>
                            <button
                                onClick={() => setRequestTab('completed')}
                                className={cn(
                                    "flex-1 py-1.5 text-[10px] font-black tracking-wider transition-all duration-300 relative z-10",
                                    requestTab === 'completed' ? "text-[#4E342E]" : "text-[#4E342E]/40"
                                )}
                            >
                                おねがいの記録
                                {careRecords.length > 0 && (
                                    <span className="ml-1 opacity-60">({careRecords.length})</span>
                                )}
                            </button>

                            <motion.div
                                className="absolute inset-y-1 bg-white rounded-lg shadow-sm border border-[#4E342E] shadow-sm"
                                initial={false}
                                animate={{
                                    left: requestTab === 'pending' ? '4px' : '50%',
                                    right: requestTab === 'pending' ? '50%' : '4px',
                                }}
                                transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                                style={{
                                    backgroundColor: 'white',
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(78,52,46,0.1)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Sub-Tab Content Area */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <AnimatePresence mode="wait">
                            {requestTab === 'pending' ? (
                                <motion.div
                                    key="pending"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="space-y-2"
                                >
                                    {pendingTasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                                            <Sparkles className="w-5 h-5 text-[#4E342E]/10" />
                                            <p className="text-xs text-[#4E342E]/30 italic">すべてのおねがいをききました</p>
                                        </div>
                                    ) : (
                                        pendingTasks.map((task: any) => {
                                            const IconComponent = getIconComponent(task.icon);
                                            return (
                                                <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#4E342E]/5 shadow-sm">
                                                    <div className="w-9 h-9 rounded-full bg-[#4E342E]/5 flex items-center justify-center">
                                                        {IconComponent ? (
                                                            <IconComponent className="w-4 h-4 text-[#4E342E]/70" />
                                                        ) : (
                                                            <span className="text-sm">{task.emoji || '📋'}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-[#4E342E] truncate">{task.label || task.name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleTask(task)}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-[#4E342E]/5 text-[#4E342E]/40 border border-[#4E342E]/5 active:scale-95 transition-all"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="completed"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="h-full"
                                >
                                    <CareHistoryList logs={careRecords} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* BOTTOM HALF: Life Events Area */}
                <div className="h-1/2 flex flex-col overflow-hidden bg-black/[0.01]">
                    <div className="px-5 py-4 shrink-0 flex items-center justify-between">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4E342E]/30">
                            できごと
                        </h2>
                        {lifeEvents.length > 0 && (
                            <span className="text-[10px] text-[#4E342E]/40 font-bold bg-[#4E342E]/5 px-2 py-0.5 rounded-full">
                                {lifeEvents.length}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-24">
                        <div className="space-y-3">
                            {lifeEvents.length === 0 ? (
                                <div className="py-12 flex flex-col items-center gap-2">
                                    <Wind className="w-5 h-5 text-[#4E342E]/10" />
                                    <p className="text-xs text-[#4E342E]/20 italic">静かな一日です</p>
                                </div>
                            ) : (
                                lifeEvents.map((event: any, idx: number) => (
                                    <motion.div
                                        key={event.id || idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white rounded-2xl border border-[#4E342E]/5 shadow-sm overflow-hidden"
                                        onClick={() => {
                                            if (event.type === 'incident' && onOpenIncidentDetail) {
                                                onOpenIncidentDetail(event.id);
                                            }
                                        }}
                                    >
                                        {event.type === 'incident' && (
                                            <div className="p-4 relative group active:bg-[#4E342E]/5 transition-colors cursor-pointer">
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

                                                <div className="flex items-center justify-between mb-2 pr-20">
                                                    <div className={cn(
                                                        "flex items-center gap-2",
                                                        (event.incident_type === 'daily' || event.incident_type === 'other') ? "text-sky-500" : "text-amber-600"
                                                    )}>
                                                        {(event.incident_type === 'daily' || event.incident_type === 'other') ? (
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                        )}
                                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                                            {incidentTypeLabels[event.incident_type] || 'RECORD'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-[#4E342E]/90 leading-relaxed font-medium">
                                                    {event.note || event.memo || event.description || '内容なし'}
                                                </p>
                                                {event.photos && event.photos.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        {event.photos.map((path: string, i: number) => (
                                                            <img key={i} src={getFullImageUrl(path)} className="w-full aspect-square object-cover rounded-xl border border-[#4E342E]/5" alt="" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {event.type === 'observation' && (
                                            <div className="p-4 relative group">
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

                                                <div className="flex items-center justify-between mb-2 pr-20">
                                                    <div className="flex items-center gap-2 text-sky-500">
                                                        <Activity className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black tracking-widest uppercase">health</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-[#4E342E]/90 font-bold">{event.value}</p>
                                                {(event.notes || event.note) && (
                                                    <p className="text-xs text-[#4E342E]/50 mt-1 italic leading-relaxed">{event.notes || event.note}</p>
                                                )}
                                            </div>
                                        )}

                                        {event.type === 'photo' && (
                                            <div className="relative aspect-[1.4] group">
                                                {(() => {
                                                    const imageUrl = getFullImageUrl(event.storage_path || event.url);
                                                    if (!imageUrl) return (
                                                        <div className="w-full h-full bg-[#4E342E]/5 flex flex-col items-center justify-center gap-2">
                                                            <ImageIcon className="w-6 h-6 text-[#4E342E]/20" />
                                                            <span className="text-[10px] text-[#4E342E]/20">画像がありません</span>
                                                        </div>
                                                    );
                                                    return <img src={imageUrl} alt="" className="w-full h-full object-cover" />;
                                                })()}
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#4E342E]/40 via-transparent to-transparent flex flex-col justify-end p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <p className="text-xs text-white font-bold truncate">{event.caption}</p>
                                                            {(event.memo || event.notes) && (
                                                                <p className="text-[10px] text-white/80 truncate mt-0.5">{event.memo || event.notes}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[10px] text-white/60 font-mono">{format(event.timestamp, 'HH:mm')}</span>
                                                            <button
                                                                onClick={(e) => handleDelete(event, e)}
                                                                className="p-1 rounded-full hover:bg-rose-500/40 text-white/50 hover:text-rose-400 transition-colors"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
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
                    <DialogFooter className="gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setEditingItem(null)}
                            className="text-[#4E342E]/40 hover:text-[#4E342E]"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            className="bg-[#4E342E] hover:bg-[#4E342E]/90 text-white font-bold"
                        >
                            保存する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
