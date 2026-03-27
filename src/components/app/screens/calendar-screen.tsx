"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, MessageSquare, AlertCircle, Syringe, Pill, Stethoscope, Trash2, Check, Heart, Cat, Sparkles } from "lucide-react";
import { useCareContext, useCatContext, useIncidentContext, useCoreContext, useMedicationContext } from "@/store/app-store";
import { useAuth } from '@/providers/auth-provider';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ja } from "date-fns/locale";
import { useUserProfile, useDateLogs, useCalendarData } from "@/hooks/use-supabase-data";
import { ActivityLogItem, ActivityItem } from "../shared/activity-log-item";

interface CalendarScreenProps {
    selectedDate?: Date;
    onDateChange?: (date: Date) => void;
}

export function CalendarScreen({ selectedDate: propSelectedDate, onDateChange }: CalendarScreenProps) {
    const { careTaskDefs, noticeDefs, deleteCareLog, deleteObservation } = useCareContext();
    const { cats } = useCatContext();
    const { incidents, deleteIncident } = useIncidentContext();
    const { householdUsers, events } = useCoreContext();
    const { medicationLogs } = useMedicationContext();
    const { user: currentUser } = useAuth();
    const { profile } = useUserProfile();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [localSelectedDate, setLocalSelectedDate] = useState(new Date());
    const selectedDate = propSelectedDate || localSelectedDate;
    const setSelectedDate = onDateChange || setLocalSelectedDate;
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

    const { data: monthData, loading } = useCalendarData(profile?.householdId || null, currentMonth);
    const { careLogs: dayCareLogs, observations: dayObservations, refetch: refetchDayLogs } = useDateLogs(profile?.householdId || null, selectedDate);

    const pickObservationTrend = (id: string, type: string) => {
        if (type !== 'appetite' && type !== 'condition') return undefined;

        const mockTrendTexts = [
            '水をよく飲むようになりました。',
            'いつもより甘えん坊です。',
            'おもちゃへの反応が良いです。',
            undefined,
            undefined,
            undefined,
        ];
        const seed = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return mockTrendTexts[seed % mockTrendTexts.length];
    };

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

    // Name Override: visual override applied inline in dayRecords below (DB sync handled elsewhere)

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

            // Medication Log Override
            if (l.type && l.type.startsWith('medication:')) {
                // Format: medication:{med_id}:{slot}
                const parts = l.type.split(':');
                if (parts.length >= 2) {
                    const medId = parts[1];
                    const slot = parts[2];
                    const med = medicationLogs?.find((m: any) => m.id === medId);
                    if (med) {
                        title = med.product_name;
                        if (slot === 'morning') title += ' (朝)';
                        else if (slot === 'evening') title += ' (夜)';
                    } else {
                        title = 'お薬';
                    }
                }
            }

            // Explicit icon override for medication
            const icon = (l.type && l.type.startsWith('medication:')) ? 'Pill' : def?.icon;

            records.push({
                id: l.id,
                type: 'care',
                title: title,
                catName: cat?.name,
                timestamp: l.done_at,
                userId: l.done_by,
                userName: displayUserName,
                userAvatar: user?.avatar_url,
                icon: icon,
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

            const randomTrend = pickObservationTrend(o.id, o.type);

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
                trendText: randomTrend,
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
                title: typeLabel,
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
    }, [dayCareLogs, dayObservations, incidents, careTaskDefs, noticeDefs, cats, selectedDate, householdUsers, currentUser, medicationLogs]);

    const handleDelete = async (id: string, type: 'care' | 'observation' | 'incident') => {
        if (!confirm("削除しますか？")) return;
        if (type === 'care') await deleteCareLog(id);
        else if (type === 'observation') await deleteObservation(id);
        else if (type === 'incident') await deleteIncident(id);
        refetchDayLogs();
    };

    return (
        <div className="space-y-6 pb-20 pt-2 bg-[#F2F1EF] min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-xl font-bold flex items-center gap-2 tabular-nums text-[#1E2840]">
                    {viewMode === 'week'
                        ? `${format(calendarDays[0], 'M/d')} - ${format(calendarDays[6], 'M/d')}`
                        : format(currentMonth, 'yyyy年 M月', { locale: ja })
                    }
                </h2>

                <div className="flex items-center gap-3">
                    <div className="flex bg-[#E7E6E3] p-1 rounded-full border border-[#DDDCD8]">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${viewMode === 'week'
                                ? 'bg-white text-[#1E2840] shadow-sm'
                                : 'text-[#8A8988] hover:text-[#1E2840] hover:bg-black/5'
                                }`}
                        >
                            週
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${viewMode === 'month'
                                ? 'bg-white text-[#1E2840] shadow-sm'
                                : 'text-[#8A8988] hover:text-[#1E2840] hover:bg-black/5'
                                }`}
                        >
                            月
                        </button>
                    </div>

                    <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-full text-[#8A8988] hover:bg-black/5 hover:text-[#1E2840]">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-full text-[#8A8988] hover:bg-black/5 hover:text-[#1E2840]">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="px-2">
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-bold">
                    <div className="text-[#8A8988]">日</div>
                    <div className="text-[#8A8988]">月</div>
                    <div className="text-[#8A8988]">火</div>
                    <div className="text-[#8A8988]">水</div>
                    <div className="text-[#8A8988]">木</div>
                    <div className="text-[#8A8988]">金</div>
                    <div className="text-[#8A8988]">土</div>
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
                                    relative flex flex-col items-center justify-start pt-2 h-[60px] rounded-[16px] transition-all duration-300
                                    ${!isCurrentMonth ? 'opacity-30' : ''}
                                    ${isSelected
                                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[#DDDCD8]'
                                        : 'hover:bg-white/50'}
                                `}
                            >
                                <span className={`
                                    text-[12px] font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full transition-all
                                    ${isTodayDate
                                        ? 'bg-[#3D5A80] text-white shadow-sm'
                                        : isSelected ? 'text-[#3D5A80]' : 'text-[#1E2840]'}
                                `}>
                                    {format(day, 'd')}
                                </span>

                                {/* Indicators */}
                                <div className="flex items-center gap-1 mt-0.5">
                                    {(dayData?.hasCare) && <div className="w-1.5 h-1.5 rounded-full bg-[#3D5A80]" />}
                                    {(dayData?.hasMedication) && <div className="w-1.5 h-1.5 rounded-full bg-[#3D5A80]" />}
                                    {(dayData?.hasEvent) && <div className="w-1.5 h-1.5 rounded-full bg-[#3D5A80]" />}
                                    {(hasIncident || dayData?.hasCrisis) && <div className="w-1.5 h-1.5 rounded-full bg-[#1E2840] animate-pulse" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 月の傾向・季節のまとめ */}
            <div className="px-4 space-y-4">
                {/* 1. Monthly Trend / AI Summary */}
                <div className="bg-white rounded-[20px] p-4 border border-[#DDDCD8] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-[#3D5A80]" />
                        <h3 className="text-[13px] font-bold text-[#1E2840]">今月にゃるほど</h3>
                    </div>
                    <p className="text-[13px] text-[#5A5958] leading-relaxed">
                        日中の窓辺で過ごす時間が先月より増えています。また、夜は早めに寝かしつける時間帯が増え、落ち着いて過ごせているようです。
                    </p>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <div className="shrink-0 bg-[#E7E6E3] rounded-[10px] px-3 py-2 flex items-center gap-2">
                            <Cat className="w-3.5 h-3.5 text-[#3D5A80]" />
                            <span className="text-[11px] font-bold text-[#1E2840]">活動量: 安定</span>
                        </div>
                        <div className="shrink-0 bg-[#E7E6E3] rounded-[10px] px-3 py-2 flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5 text-[#3D5A80]" />
                            <span className="text-[11px] font-bold text-[#1E2840]">食欲: 良好</span>
                        </div>
                    </div>
                </div>

                {/* 2. Seasonal Summary (Preview) */}
                <div className="bg-gradient-to-br from-[#3D5A80]/10 to-[#3D5A80]/5 rounded-[20px] p-4 border border-[#3D5A80]/15 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Cat className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 flex cursor-pointer items-center justify-between">
                        <div>
                            <div className="text-[10px] font-bold text-[#3D5A80] mb-1">Coming Soon</div>
                            <h3 className="text-[14px] font-bold text-[#1E2840]">春の振り返りレポート</h3>
                            <p className="text-[11px] text-[#5A5958] mt-1">去年の春と比べた暮らしの変化を見てみましょう</p>
                        </div>
                        <div className="bg-white rounded-full p-2 text-[#3D5A80] shadow-sm">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Day Detail */}
            <div className="space-y-4 px-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#DDDCD8]">
                    <h3 className="text-[14px] font-bold text-[#1E2840] flex items-center gap-2">
                        <span>{format(selectedDate, 'M月d日 (E)', { locale: ja })}</span>
                        <span className="text-[11px] font-normal text-[#8A8988]">の記録</span>
                    </h3>

                    <div className="flex items-center gap-2">
                        {/* Completion Rate Badge */}
                        <div className="flex items-center gap-1.5 bg-[#3D5A80]/10 text-[#3D5A80] text-[11px] px-2.5 py-1 rounded-full font-bold border border-[#DDDCD8]">
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
                                <div key={e.id} className="rounded-[16px] border border-[#DDDCD8] bg-white px-3 py-2.5 flex flex-row items-center gap-3 mb-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold border-[#DDDCD8] text-[#8A8988] bg-[#E7E6E3] shrink-0">
                                    {e.type === 'vet' ? '通院' : e.type === 'med' ? '薬' : 'その他'}
                                </Badge>
                                <div className="min-w-0 flex-1 flex flex-row items-center gap-2">
                                    <span className="text-[11px] font-mono font-bold text-[#8A8988] shrink-0">
                                        {format(new Date(e.at), 'HH:mm')}
                                    </span>
                                    <p className="text-[13px] font-bold text-[#1E2840] truncate">{e.title}</p>
                                </div>
                            </div>
                        ))
                    }

                    {/* Past Records */}
                    <div className="space-y-1">
                        {dayRecords.length === 0 ? (
                            <div className="text-center py-10 text-[#8A8988] bg-transparent rounded-[20px] border border-dashed border-[#DDDCD8]">
                                <p className="text-[13px] font-bold">この日の記録はありません</p>
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
