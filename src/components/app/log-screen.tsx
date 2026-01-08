"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Calendar, FileText, Info, Sparkles } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { buildWeeklyDigest, aiVetOnePager } from "@/lib/utils-ai";
import { toast } from "sonner";

export function LogScreen() {
    const { cats, activeCatId, noticeDefs, noticeLogs, tasks, inventory, settings, isPro } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId);

    const digest = useMemo(() => buildWeeklyDigest({
        cats,
        noticeDefs,
        noticeLogs,
        tasks,
        inventory,
        settings
    }), [cats, noticeDefs, noticeLogs, tasks, inventory, settings]);

    const catAbnormal = useMemo(() => {
        const logs = noticeLogs[activeCatId] || {};
        return Object.values(logs).filter(l => l.value !== "いつも通り" && l.value !== "なし");
    }, [noticeLogs, activeCatId]);

    function copyVetSummary() {
        if (!activeCat) return;
        const text = aiVetOnePager({
            catName: activeCat.name,
            abnormal: catAbnormal
        });
        navigator.clipboard.writeText(text);
        toast.success("病院用まとめをコピーしました");
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Weekly Digest Preview */}
            <Card className="rounded-3xl shadow-sm border-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            週1まとめ（日曜 18:00）
                        </span>
                        <Badge variant="secondary" className="bg-[#7CAA8E]/20 text-[10px] text-[#5A8A6A] hover:bg-[#7CAA8E]/30 border-none">
                            プレビュー
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/10 rounded-2xl p-3">
                            <div className="text-[10px] text-[#5A8A6A] uppercase font-bold tracking-wider">気になる変化</div>
                            <div className="text-xl font-black mt-1">{digest.abnormalCount} <span className="text-[10px] font-normal">件</span></div>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-3">
                            <div className="text-[10px] text-[#5A8A6A] uppercase font-bold tracking-wider">在庫注意</div>
                            <div className="text-xl font-black mt-1">{digest.lowStockCount} <span className="text-[10px] font-normal">種類</span></div>
                        </div>
                    </div>

                    <div className="bg-[#7CAA8E]/10 rounded-2xl p-4 space-y-3">
                        <div className="flex items-start gap-2 text-xs leading-relaxed">
                            <Info className="h-3 w-3 mt-1 shrink-0 text-[#7CAA8E]" />
                            <p className="text-[#5A8A6A] italic">
                                今週は {activeCat?.name} の食欲が少し変動したようです。
                                {digest.openTasksCount > 0 ? `また、未完了のケアが ${digest.openTasksCount} 件あります。` : "すべてのケアが完了しました。"}
                            </p>
                        </div>
                        <div className="text-[9px] text-[#5A8A6A] flex items-center gap-1">
                            <Sparkles className="h-2 w-2" />
                            AIにより直近の傾向を要約しています（Pro）
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Vet Support Tool */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold flex items-center gap-2 px-1">
                    <FileText className="h-4 w-4 text-rose-500" />
                    病院サポート
                </h2>

                <Card className="rounded-2xl shadow-sm border-none bg-rose-50/50 p-4 border border-rose-100/50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold text-rose-600">病院用まとめ（Pro）</div>
                        {isPro && <Badge variant="secondary" className="bg-rose-100 text-rose-700 text-[9px]">利用可能</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        「最近どうですか？」に言葉を詰まらせないために。
                        直近の“異常っぽい”記録と共有メモをテキストでまとめます。
                    </p>
                    <Button
                        className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 shadow-sm font-bold h-10"
                        onClick={copyVetSummary}
                        disabled={!isPro}
                    >
                        まとめをコピーする
                    </Button>
                </Card>
            </div>

            <div className="text-center py-4">
                <p className="text-[11px] text-muted-foreground px-6 leading-relaxed">
                    過去の全ログは家全体のライブラリとして保存されています。
                    カレンダー形式での振り返り機能を準備中です。
                </p>
            </div>
        </div>
    );
}
