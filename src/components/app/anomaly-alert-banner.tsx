"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { AlertTriangle, X, CheckCircle, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AnomalyAlertBanner() {
    const { noticeLogs, cats, activeCatId } = useAppState();

    // Find any abnormal notices from today
    const [today, setToday] = useState<string>("");
    useEffect(() => {
        setToday(new Date().toISOString().split('T')[0]);
    }, []);

    const anomalies = useMemo(() => {
        if (!today) return [];
        const results: { catName: string; value: string; at: string; catId: string }[] = [];

        Object.entries(noticeLogs).forEach(([catId, catLogs]) => {
            const cat = cats.find(c => c.id === catId);
            Object.values(catLogs).forEach(log => {
                const isToday = log.at.startsWith(today);
                const isAbnormal = log.value &&
                    log.value !== "いつも通り" &&
                    log.value !== "なし" &&
                    log.value !== "記録した" &&
                    !log.later;

                if (isToday && isAbnormal) {
                    results.push({
                        catName: cat?.name || '猫',
                        value: log.value,
                        at: new Date(log.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        catId,
                    });
                }
            });
        });

        return results;
    }, [noticeLogs, cats, today]);

    const [dismissed, setDismissed] = React.useState<string[]>([]);

    const visibleAnomalies = anomalies.filter(a => !dismissed.includes(`${a.catId}_${a.value}`));

    if (visibleAnomalies.length === 0) return null;

    return (
        <div className="space-y-2">
            {visibleAnomalies.map((anomaly, idx) => (
                <div
                    key={`${anomaly.catId}_${anomaly.value}_${idx}`}
                    className="bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl p-4 shadow-lg"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold">
                                {anomaly.catName}に気になる変化があります
                            </h4>
                            <p className="text-xs text-white/80 mt-0.5">
                                「{anomaly.value}」・{anomaly.at}
                            </p>
                        </div>
                        <button
                            onClick={() => setDismissed(prev => [...prev, `${anomaly.catId}_${anomaly.value}`])}
                            className="p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold"
                            onClick={() => setDismissed(prev => [...prev, `${anomaly.catId}_${anomaly.value}`])}
                        >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            確認した
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-bold"
                        >
                            <Stethoscope className="h-3 w-3 mr-1" />
                            獣医に相談中
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
