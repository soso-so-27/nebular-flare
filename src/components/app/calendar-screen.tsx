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
import { ActivityFeed } from "./activity-feed";

export function CalendarScreen() {
    const { events, careTaskDefs, noticeDefs, deleteCareLog, deleteObservation, cats } = useAppState();
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
    const dayRecords = useMemo(() => {
        const records: any[] = [];

        dayCareLogs.forEach(l => {
            const def = careTaskDefs.find(t => t.id === l.type) || careTaskDefs.find(t => l.type?.startsWith(t.id));
            const cat = cats.find(c => c.id === l.cat_id);
            records.push({
                id: l.id,
                sourceType: 'care',
                title: def?.title || 'お世話',
                subtitle: cat?.name || '不明な猫',
                time: l.done_at,
                catId: l.cat_id
            });
        });

        dayObservations.forEach(o => {
            const def = noticeDefs.find(n => n.id === o.type);
            const cat = cats.find(c => c.id === o.cat_id);
            records.push({
                id: o.id,
                sourceType: 'observation',
                title: def?.title || '様子',
                subtitle: `${cat?.name || ''} ${o.value}`,
                time: o.recorded_at,
                catId: o.cat_id,
                isAcknowledged: !!(o as any).acknowledged_at
            });
        });

        return records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }, [dayCareLogs, dayObservations, careTaskDefs, noticeDefs, cats]);

    const handleDelete = async (id: string, type: 'care' | 'observation') => {
        if (!confirm("削除しますか？")) return;
        if (type === 'care') await deleteCareLog(id);
        else await deleteObservation(id);
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
                    <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1 border-orange-200 text-orange-700 ml-2">
                        <Plus className="h-3 w-3" />
                        予定を追加
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
                    <div className="text-blue-400">土</div>
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                    {calendarDays.map((day, idx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayData = monthData[dateStr];
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isTodayDate = isToday(day);

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative flex flex-col items-center justify-start pt-2 h-14 rounded-xl transition-all
                                    ${!isCurrentMonth ? 'opacity-30' : ''}
                                    ${isSelected ? 'bg-orange-50 ring-2 ring-orange-200' : 'hover:bg-slate-50'}
                                `}
                            >
                                <span className={`
                                    text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                                    ${isTodayDate ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-700'}
                                `}>
                                    {format(day, 'd')}
                                </span>

                                {/* Indicators */}
                                <div className="flex items-center gap-0.5 mt-1">
                                    {dayData?.hasCare && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                    {dayData?.hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                                    {dayData?.hasCrisis && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
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
                    {dayRecords.map(r => (
                        <div key={r.id} className="rounded-xl shadow-none border border-slate-100 bg-white px-3 py-2 flex flex-row items-center gap-2 mb-1 last:mb-0 hover:bg-slate-50 transition-colors group">
                            <div className={`
                                w-5 h-5 rounded-full flex items-center justify-center shrink-0
                                ${r.sourceType === 'care' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}
                            `}>
                                {r.sourceType === 'care' ? <Check className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0 flex-1 flex flex-row items-center gap-2 overflow-hidden">
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    {format(new Date(r.time), 'HH:mm')}
                                </span>
                                <p className="text-xs font-bold text-slate-700 truncate">{r.title}</p>
                                <span className="text-[10px] text-slate-400 truncate flex-1 text-right">
                                    {r.subtitle}
                                </span>
                                {r.isAcknowledged && <span className="text-emerald-500 text-[10px]">✓</span>}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(r.id, r.sourceType)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}

                    {/* Empty State */}
                    {events.filter(e => isSameDay(new Date(e.at), selectedDate)).length === 0 && dayRecords.length === 0 && (
                        <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-400">記録はありません</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
