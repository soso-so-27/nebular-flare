"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, MessageSquare, AlertCircle, Syringe, Pill, Stethoscope, Trash2, Check, Heart, Cat } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { useAuth } from '@/providers/auth-provider';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ja } from "date-fns/locale";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useUserProfile, useDateLogs } from "@/hooks/use-supabase-data";
import { ActivityLogItem, ActivityItem } from "./activity-log-item";

export function CalendarScreen() {
    const { events, careTaskDefs, noticeDefs, deleteCareLog, deleteObservation, cats, incidents, deleteIncident, householdUsers } = useAppState();
    const { user: currentUser } = useAuth();
    const { profile } = useUserProfile();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

    const { data: monthData, loading } = useCalendarData(profile?.householdId || null, currentMonth);
    const { careLogs: dayCareLogs, observations: dayObservations, refetch: refetchDayLogs } = useDateLogs(profile?.householdId || null, selectedDate);

    const calendarDays = useMemo(() => {
        if (viewMode === 'week') {
            // Week view: Show week containing selectedDate (or currentMonth if selectedDate is far?)
            // Actually, we usually want to navigate the "view window". 
            // Let's use currentMonth as the "anchor" for navigation, but for week view, we might want a separate anchor?
            // "currentMonth" acts as the View Anchor. 
            // In Week Mode, "currentMonth" might strictly be just a date in that week.
            const anchor = currentMonth;
            const start = startOfWeek(anchor, { weekStartsOn: 0 }); // Sunday start
            const end = endOfWeek(anchor, { weekStartsOn: 0 });
            return eachDayOfInterval({ start, end });
        } else {
            // Month view
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);
            // Ensure grid starts on Sunday
            const startDate = new Date(start);
            startDate.setDate(start.getDate() - start.getDay());
            const endDate = new Date(end);
            endDate.setDate(end.getDate() + (6 - end.getDay()));

            return eachDayOfInterval({ start: startDate, end: endDate });
        }
    }, [currentMonth, viewMode]);

    const handlePrev = () => {
        if (viewMode === 'week') {
            setCurrentMonth(prev => subWeeks(prev, 1));
        } else {
            setCurrentMonth(prev => subMonths(prev, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'week') {
            setCurrentMonth(prev => addWeeks(prev, 1));
        } else {
            setCurrentMonth(prev => addMonths(prev, 1));
        }
    };

    // Sync currentMonth to selectedDate when switching to week if selectedDate is far? 
    // Or just let user navigate? Let's keep it simple. If user selects a date, maybe we shouldn't auto-move the view?
    // But if they switch view modes, it might be nice to center on selected date.
    // For now, simpler is better.

    const selectedDayData = monthData[format(selectedDate, 'yyyy-MM-dd')];

    // Sync Auth Name to DB if mismatched (Fix for "nakanishisoya" issue)
    React.useEffect(() => {
        if (currentUser?.user_metadata?.full_name && profile && profile.displayName !== currentUser.user_metadata.full_name) {
            console.log("Syncing user name to DB:", currentUser.user_metadata.full_name);
            // We can't update DB directly from here easily without a dedicated update function exposed in app-store or hook.
            // But we can fallback to the visual override for now, which is safe.
            // Actually, let's rely on the visual override we added, it works if currentUser is present.
            // The issue might be that currentUser IS present but mismatching?
            // I will keep the visual override.
        }
    }, [currentUser, profile]);

    // Combine logs for list
    const dayRecords: ActivityItem[] = useMemo(() => {
        const records: ActivityItem[] = [];

        dayCareLogs.forEach((l: any) => {
            const def = careTaskDefs.find(t => t.id === l.type) || careTaskDefs.find(t => l.type?.startsWith(t.id));
            const cat = cats.find(c => c.id === l.cat_id);
            const user = l.done_by ? householdUsers.find((u: any) => u.id === l.done_by) : undefined;

            // Name Override for current user (DB sync lag workaround)
            let displayUserName = user?.display_name;
            const isMe = l.done_by && currentUser?.id && String(l.done_by) === String(currentUser.id);

            if (isMe) {
                // Try multiple metadata fields to find the correct name (SOYA)
                displayUserName = currentUser?.user_metadata?.full_name ||
                    currentUser?.user_metadata?.name ||
                    currentUser?.user_metadata?.display_name ||
                    displayUserName;
            }

            let title = def?.title || 'お世話';

            // Append time slot label if type has suffix (supports both underscore and colon)
            // Example: care_food:morning or care_food_morning
            if (def && l.type?.startsWith(def.id) && l.type !== def.id) {
                // Remove base ID and separator
                let suffix = l.type.replace(def.id, '');
                if (suffix.startsWith(':') || suffix.startsWith('_')) {
                    suffix = suffix.substring(1);
                }

                if (suffix === 'morning') title += ' (朝)';
                else if (suffix === 'evening') title += ' (夜)';
                else if (suffix === 'noon') title += ' (昼)';
                else if (suffix === 'night') title += ' (夜)';
            }

            records.push({
                id: l.id,
                type: 'care',
                title: title,
                catName: cat?.name,
                timestamp: l.done_at,
                userId: l.done_by,
                userName: displayUserName,
                userAvatar: user?.avatar_url,
                icon: def?.icon,
                notes: l.notes,
                showTime: true
            });
        });

        dayObservations.forEach((o: any) => {
            const def = noticeDefs.find(n => n.id === o.type);
            const cat = cats.find(c => c.id === o.cat_id);
            const user = o.recorded_by ? householdUsers.find((u: any) => u.id === o.recorded_by) : undefined;

            // Name Override
            let displayUserName = user?.display_name;
            const isMe = o.recorded_by && currentUser?.id && String(o.recorded_by) === String(currentUser.id);

            if (isMe) {
                displayUserName = currentUser?.user_metadata?.full_name ||
                    currentUser?.user_metadata?.name ||
                    currentUser?.user_metadata?.display_name ||
                    displayUserName;
            }

            records.push({
                id: o.id,
                type: 'observation',
                title: def?.title || o.type === 'appetite' ? '食欲' : '様子',
                catName: cat?.name,
                timestamp: o.recorded_at,
                userId: o.recorded_by,
                userName: displayUserName,
                userAvatar: user?.avatar_url,
                notes: o.value && o.value !== (def?.title) ? `${o.value}\n${o.notes || ''}` : o.notes,
                showTime: true
            });
        });

        // Add Incidents
        incidents.filter(inc => isSameDay(new Date(inc.created_at), selectedDate)).forEach(inc => {
            const cat = cats.find(c => c.id === inc.cat_id);
            const user = inc.created_by ? householdUsers.find((u: any) => u.id === inc.created_by) : undefined;

            // Name Override
            let displayUserName = user?.display_name;
            const isMe = inc.created_by && currentUser?.id && String(inc.created_by) === String(currentUser.id);

            if (isMe) {
                displayUserName = currentUser?.user_metadata?.full_name ||
                    currentUser?.user_metadata?.name ||
                    currentUser?.user_metadata?.display_name ||
                    displayUserName;
            }

            const typeLabel = {
                'vomit': '嘔吐',
                'diarrhea': '下痢',
                'injury': '怪我',
                'appetite': '食欲不振',
                'energy': '元気がない',
                'toilet': 'トイレ失敗',
                'other': 'その他'
            }[inc.type as string] || inc.type;

            records.push({
                id: inc.id,
                type: 'incident',
                title: `⚠️ ${typeLabel}`,
                catName: cat?.name,
                timestamp: inc.created_at,
                userId: inc.created_by,
                userName: displayUserName,
                userAvatar: user?.avatar_url,
                notes: inc.note,
                showTime: true,
                icon: 'alert-circle'
            });
        });

        return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [dayCareLogs, dayObservations, incidents, careTaskDefs, noticeDefs, cats, selectedDate, householdUsers, currentUser]);

    const handleDelete = async (id: string, type: 'care' | 'observation' | 'incident') => {
        if (!confirm("削除しますか？")) return;
        if (type === 'care') await deleteCareLog(id);
        else if (type === 'observation') await deleteObservation(id);
        else if (type === 'incident') await deleteIncident(id);
        refetchDayLogs();
    };

    return (
        <div className="space-y-6 pb-20 pt-2">
            {/* Header */}
            <div className="flex items-center justify-between px-4">
                <h2 className="text-xl font-bold flex items-center gap-2 tabular-nums text-white">
                    {viewMode === 'week'
                        ? `${format(calendarDays[0], 'M/d')} - ${format(calendarDays[6], 'M/d')}`
                        : format(currentMonth, 'yyyy年 M月', { locale: ja })
                    }
                </h2>

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/20 p-1 rounded-full border border-white/5">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${viewMode === 'week'
                                ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            週
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${viewMode === 'month'
                                ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            月
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 rounded-full text-white hover:bg-white/10 hover:text-white">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-full text-white hover:bg-white/10 hover:text-white">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="px-2">
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium">
                    <div className="text-red-300/80">日</div>
                    <div className="text-white/40">月</div>
                    <div className="text-white/40">火</div>
                    <div className="text-white/40">水</div>
                    <div className="text-white/40">木</div>
                    <div className="text-white/40">金</div>
                    <div className="text-blue-300/80">土</div>
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                    {calendarDays.map((day, idx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayData = monthData[dateStr];
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isTodayDate = isToday(day);

                        // Check for incidents on this day
                        const hasIncident = incidents.some(inc => isSameDay(new Date(inc.created_at), day));

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative flex flex-col items-center justify-start pt-2 h-14 rounded-2xl transition-all duration-300
                                    ${!isCurrentMonth ? 'opacity-30' : ''}
                                    ${isSelected
                                        ? 'bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                                        : 'hover:bg-white/5'}
                                `}
                            >
                                <span className={`
                                    text-xs font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full transition-all
                                    ${isTodayDate
                                        ? 'bg-[#E8B4A0] text-slate-900 font-bold shadow-[0_0_10px_rgba(232,180,160,0.6)]'
                                        : isSelected ? 'text-white font-bold' : 'text-slate-300'}
                                `}>
                                    {format(day, 'd')}
                                </span>

                                {/* Indicators - Glass Style */}
                                <div className="flex items-center gap-1 mt-1">
                                    {(dayData?.hasCare) && <div className="w-1.5 h-1.5 rounded-full bg-[#E8B4A0] shadow-[0_0_5px_rgba(232,180,160,0.8)]" />}
                                    {(dayData?.hasEvent) && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                                    {(hasIncident || dayData?.hasCrisis) && <div className="w-1.5 h-1.5 rounded-full bg-[#B8A6D9] shadow-[0_0_5px_rgba(184,166,217,0.8)] animate-pulse" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Detail */}
            <div className="space-y-4 px-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{format(selectedDate, 'M月d日 (E)', { locale: ja })}</span>
                        <span className="text-xs font-normal text-slate-400">のリクエスト履歴</span>
                    </h3>

                    <div className="flex items-center gap-2">
                        {/* Completion Rate Badge */}
                        <div className="flex items-center gap-1.5 bg-[#E8B4A0]/20 text-[#E8B4A0] text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#E8B4A0]/20 shadow-[0_0_10px_rgba(232,180,160,0.1)]">
                            <Cat className="w-3 h-3 fill-current" />
                            <span>
                                {(() => {
                                    // Calculate completion based on ENABLED definitions and their slots
                                    // Logic mirrors UnifiedCareList
                                    let total = 0;
                                    let completed = 0;

                                    careTaskDefs.filter(def => def.enabled).forEach(def => {
                                        const slots = def.mealSlots || [];

                                        // If no slots (frequency based), just count 1
                                        if (slots.length === 0) {
                                            total += 1;
                                            if (dayCareLogs.some((l: any) => l.type === def.id)) completed += 1;
                                        } else {
                                            // Count each slot
                                            slots.forEach(slot => {
                                                total += 1;
                                                const targetType = `${def.id}:${slot}`;
                                                const legacyType = `${def.id}_${slot}`; // Fallback check
                                                if (dayCareLogs.some((l: any) => l.type === targetType || l.type === legacyType)) {
                                                    completed += 1;
                                                }
                                            });
                                        }
                                    });

                                    // Fallback if no tasks defined/enabled to avoid 0/0
                                    if (total === 0) return '';

                                    return `${completed}/${total}`;
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Events & Records List */}
                <div className="space-y-3">
                    {/* Future Events */}
                    {events
                        .filter(e => isSameDay(new Date(e.at), selectedDate))
                        .map(e => (
                            <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex flex-row items-center gap-2 mb-1 last:mb-0 backdrop-blur-md">
                                <Badge variant="outline" className="text-[10px] h-4 px-1 font-bold border-orange-500/50 text-orange-200 bg-orange-500/10 shrink-0">
                                    {e.type === 'vet' ? '通院' : e.type === 'med' ? '薬' : 'その他'}
                                </Badge>
                                <div className="min-w-0 flex-1 flex flex-row items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                        {format(new Date(e.at), 'HH:mm')}
                                    </span>
                                    <p className="text-xs font-bold text-slate-200 truncate">{e.title}</p>
                                </div>
                            </div>
                        ))
                    }

                    {/* Past Records */}
                    <div className="space-y-1">
                        {dayRecords.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-sm">この日の記録はありません</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dayRecords.map((record, i) => (
                                    <ActivityLogItem key={record.id} item={record} index={i} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
