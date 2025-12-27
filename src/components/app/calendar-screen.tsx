"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, MessageSquare, Plus, Pill, Syringe } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { toast } from "sonner";

export function CalendarScreen() {
    const { events, cats, activeCatId } = useAppState();

    const sortedEvents = useMemo(() => {
        return [...events]
            .filter(e => !e.archived)
            .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    }, [events]);

    const catName = (id: string) => cats.find(c => c.id === id)?.name || "不明";

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-orange-500" />
                    これからの予定
                </h2>
                <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1 border-orange-200 text-orange-700">
                    <Plus className="h-3 w-3" />
                    追加
                </Button>
            </div>

            {sortedEvents.length === 0 ? (
                <Card className="rounded-3xl border-none bg-slate-100/50 p-10 flex flex-col items-center justify-center text-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <CalendarDays className="h-6 w-6 text-slate-300" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500">予定はありません</p>
                        <p className="text-[11px] text-slate-400 mt-1">通院や薬の予定を登録できます</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {sortedEvents.map((e) => (
                        <Card key={e.id} className="rounded-2xl shadow-sm border-none bg-white p-4 border border-border/50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 font-bold border-orange-200 text-orange-700 bg-orange-50">
                                            {e.type === 'vet' ? '通院' : e.type === 'med' ? 'お薬' : 'その他'}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(e.at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                                            {" "}{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900">{e.title}</div>

                                    <div className="mt-3 space-y-1.5">
                                        {e.location && (
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{e.location}</span>
                                            </div>
                                        )}
                                        {e.note && (
                                            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-slate-50 p-2 rounded-lg">
                                                <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                                                <span className="leading-relaxed">{e.note}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                                        {catName(e.catId)[0]}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Quick Add Suggestion */}
            <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50 text-center">
                <p className="text-[11px] text-orange-800 font-medium">
                    お薬の予定はありません。
                </p>
                <div className="flex gap-2 mt-3 justify-center">
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] text-orange-700 hover:bg-orange-100">
                        <Pill className="h-3 w-3 mr-1" /> 次回のお薬を登録
                    </Button>
                </div>
            </div>
        </div>
    );
}
