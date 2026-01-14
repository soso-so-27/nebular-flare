"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, MessageSquare, AlertCircle, Syringe, Pill, Stethoscope, Trash2, Check } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useUserProfile, useDateLogs } from "@/hooks/use-supabase-data";
import { ActivityLogItem, ActivityItem } from "./activity-log-item";

export function CalendarScreen() {
    const { events, careTaskDefs, noticeDefs, deleteCareLog, deleteObservation, cats, incidents, deleteIncident, householdUsers } = useAppState();
    const { profile } = useUserProfile();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const { data: monthData, loading } = useCalendarData(profile?.householdId || null, currentMonth);
    const { careLogs: dayCareLogs, observations: dayObservations, refetch: refetchDayLogs } = useDateLogs(profile?.householdId || null, selectedDate);

    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        // Ensure grid starts on Sunday
        const startDate = new Date(start);
        startDate.setDate(start.getDate() - start.getDay());
        const endDate = new Date(end);
        endDate.setDate(end.getDate() + (6 - end.getDay()));

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const selectedDayData = monthData[format(selectedDate, 'yyyy-MM-dd')];

    // Combine logs for list
    const dayRecords: ActivityItem[] = useMemo(() => {
        const records: ActivityItem[] = [];

        dayCareLogs.forEach((l: any) => {
            const def = careTaskDefs.find(t => t.id === l.type) || careTaskDefs.find(t => l.type?.startsWith(t.id));
            const cat = cats.find(c => c.id === l.cat_id);
            const user = l.done_by ? householdUsers.find((u: any) => u.id === l.done_by) : undefined;

            records.push({
                id: l.id,
                type: 'care',
                title: def?.title || 'お世話',
                catName: cat?.name,
                timestamp: l.done_at,
                userId: l.done_by,
                userName: user?.display_name,
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

            records.push({
                id: o.id,
                type: 'observation',
                title: def?.title || o.type === 'appetite' ? '食欲' : '様子',
                catName: cat?.name,
                timestamp: o.recorded_at,
                userId: o.recorded_by,
                userName: user?.display_name,
                userAvatar: user?.avatar_url,
                notes: o.value && o.value !== (def?.title) ? `${o.value}\n${o.notes || ''}` : o.notes,
                showTime: true
            });
        });

        // Add Incidents
        incidents.filter(inc => isSameDay(new Date(inc.created_at), selectedDate)).forEach(inc => {
            const cat = cats.find(c => c.id === inc.cat_id);
            const user = inc.created_by ? householdUsers.find((u: any) => u.id === inc.created_by) : undefined;
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
                userName: user?.display_name,
                userAvatar: user?.avatar_url,
                notes: inc.note,
                showTime: true,
                icon: 'alert-circle'
            });
        });

        return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [dayCareLogs, dayObservations, incidents, careTaskDefs, noticeDefs, cats, selectedDate, householdUsers]);

    const handleDelete = async (id: string, type: 'care' | 'observation' | 'incident') => {
        if (!confirm("削除しますか？")) return;
        if (type === 'care') await deleteCareLog(id);
        else if (type === 'observation') await deleteObservation(id);
        else if (type === 'incident') await deleteIncident(id);
        refetchDayLogs();
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                </h2>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-full">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-full">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="rounded-3xl border-none shadow-sm bg-white p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-2 text-center text-xs text-slate-400 font-medium">
                    <div className="text-red-400">日</div>
                    <div>月</div>
                    <div>火</div>
                    <div>水</div>
                    <div>木</div>
                    <div>金</div>
                    <div className="text-slate-400">土</div>
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
                                    relative flex flex-col items-center justify-start pt-2 h-14 rounded-xl transition-all
                                    ${!isCurrentMonth ? 'opacity-30' : ''}
                                    ${isSelected ? 'bg-[#7CAA8E]/10 ring-2 ring-[#7CAA8E]/30' : 'hover:bg-slate-50'}
                                `}
                            >
                                <span className={`
                                    text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                                    ${isTodayDate ? 'bg-[#7CAA8E] text-white shadow-md shadow-[#7CAA8E]/30' : 'text-slate-700'}
                                `}>
                                    {format(day, 'd')}
                                </span>

                                {/* Indicators */}
                                <div className="flex items-center gap-0.5 mt-1">
                                    {(dayData?.hasCare) && <div className="w-1.5 h-1.5 rounded-full bg-[#7CAA8E]" />}
                                    {(dayData?.hasEvent) && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                                    {(hasIncident || dayData?.hasCrisis) && <div className="w-1.5 h-1.5 rounded-full bg-[#B8A6D9] animate-pulse" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Selected Day Detail */}
            <div className="space-y-3 px-1">
                <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                    {format(selectedDate, 'M月d日 (EB)', { locale: ja })} の記録
                </h3>

                {/* Events & Records List */}
                <div className="space-y-2">
                    {/* Future Events */}
                    {events
                        .filter(e => isSameDay(new Date(e.at), selectedDate))
                        .map(e => (
                            <div key={e.id} className="rounded-xl shadow-none border border-slate-100 bg-white px-3 py-2 flex flex-row items-center gap-2 mb-1 last:mb-0">
                                <Badge variant="outline" className="text-[10px] h-4 px-1 font-bold border-orange-200 text-orange-700 bg-orange-50 shrink-0">
                                    {e.type === 'vet' ? '通院' : e.type === 'med' ? '薬' : 'その他'}
                                </Badge>
                                <div className="min-w-0 flex-1 flex flex-row items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                        {format(new Date(e.at), 'HH:mm')}
                                    </span>
                                    <p className="text-xs font-bold text-slate-700 truncate">{e.title}</p>
                                </div>
                            </div>
                        ))
                    }

                    {/* Past Records */}
                    {/* Past Records */}
                    <div className="mt-4 space-y-4 border-t border-dashed border-slate-100 dark:border-slate-800 pt-4">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 px-1">
                            <span className="text-xl">{format(selectedDate, 'M/d')}</span>
                            <span className="text-sm font-normal text-slate-500">の記録</span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">
                                {dayRecords.length}
                            </span>
                        </h3>

                        <div className="space-y-1">
                            {dayRecords.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-sm">この日の記録はありません</p>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                                    {dayRecords.map((record, i) => (
                                        <ActivityLogItem key={record.id} item={record} index={i} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
