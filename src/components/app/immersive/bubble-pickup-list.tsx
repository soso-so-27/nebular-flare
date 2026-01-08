"use client";

import React, { useMemo, useState } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Heart, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getToday } from "@/lib/date-utils";
import { motion, AnimatePresence } from "framer-motion";
import { getCatchUpItems } from "@/lib/utils-catchup";
import { IncidentModal } from "../incident-modal";
import { IncidentDetailModal } from "../incident-detail-modal";

interface BubbleItem {
    id: string;
    label: string;
    subLabel?: string | null;
    icon: React.ReactNode;
    colorClass: string;
    onAction: () => void | Promise<void>;
}

interface BubblePickupListProps {
    onClose: () => void;
}

export function BubblePickupList({ onClose }: BubblePickupListProps) {
    const {
        careLogs, addCareLog,
        careTaskDefs,
        noticeDefs, noticeLogs,
        observations, addObservation, acknowledgeObservation,
        inventory, updateInventoryItem,
        activeCatId, cats,
        settings,
        incidents, resolveIncident
    } = useAppState();

    const today = useMemo(() => getToday(settings.dayStartHour), [settings.dayStartHour]);

    // --- Unified Logic using getCatchUpItems ---
    const catchUpData = useMemo(() => {
        const now = new Date();
        const businessDate = new Date(now);
        if (now.getHours() < settings.dayStartHour) {
            businessDate.setDate(businessDate.getDate() - 1);
        }
        const todayStr = businessDate.toISOString().split('T')[0];

        return getCatchUpItems({
            tasks: [],
            noticeLogs: noticeLogs || {},
            inventory: inventory || [],
            lastSeenAt: "1970-01-01",
            settings,
            cats,
            careTaskDefs,
            careLogs,
            noticeDefs,
            today: todayStr,
            observations
        });
    }, [noticeLogs, inventory, settings, cats, careTaskDefs, careLogs, noticeDefs, observations, settings.dayStartHour]);

    // Map catchUpItems to BubbleItems
    const allItems: BubbleItem[] = useMemo(() => {
        return catchUpData.allItems.map(item => {
            let colorClass = "bg-slate-500";
            let icon = <Check className="w-5 h-5" />;

            const onAction = async () => {
                if (item.type === 'task') {
                    if (item.payload) {
                        const defId = item.payload.id;
                        const slot = item.payload.slot;
                        const logType = slot ? `${defId}:${slot}` : defId;
                        const targetCatId = item.catId || (item.payload.perCat ? activeCatId : undefined);

                        await addCareLog(logType, targetCatId);
                        toast.success(`${item.title} 完了`);
                    }
                } else if (item.type === 'unrecorded' || item.type === 'notice') {
                    if (item.payload) {
                        const nId = item.payload.noticeId || item.payload.type || item.payload.id;

                        if (item.type === 'notice') {
                            await acknowledgeObservation(nId);
                            toast.success("確認しました");
                        } else {
                            await addObservation(item.catId || activeCatId, nId, "OK");
                            toast.success("記録しました");
                        }
                    }
                } else if (item.type === 'inventory') {
                    if (item.payload) {
                        // update last_bought to today (string)
                        await updateInventoryItem(item.id, { last_bought: today, stockLevel: 'full' } as any);
                        toast.success("購入を記録しました");
                    }
                }
            };

            // Determine color/icon
            if (item.type === 'task') {
                const isUrgent = item.severity >= 80;
                colorClass = isUrgent ? "bg-red-500" : "bg-blue-500";
                icon = <Check className="w-5 h-5 text-white" />;
            } else if (item.type === 'notice' || item.type === 'unrecorded') {
                colorClass = "bg-orange-400";
                icon = <Heart className="w-5 h-5 text-white" />;
            } else if (item.type === 'inventory') {
                colorClass = "bg-emerald-500";
                icon = <ShoppingCart className="w-5 h-5 text-white" />;
            }

            return {
                id: item.id,
                label: item.title,
                subLabel: item.body, // Use item.body as subtitle
                icon,
                colorClass,
                onAction
            };
        });
    }, [catchUpData, activeCatId, addCareLog, addObservation, acknowledgeObservation, updateInventoryItem, today]);

    // --- Incident Logic ---
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

    const activeIncidents = useMemo(() => {
        return incidents.filter(inc => inc.status !== 'resolved');
    }, [incidents]);

    const IncidentItem = ({ incident }: { incident: any }) => {
        const cat = cats.find(c => c.id === incident.cat_id);

        const typeLabel = {
            'vomit': '嘔吐',
            'diarrhea': '下痢',
            'injury': '怪我',
            'appetite': '食欲不振',
            'energy': '元気がない',
            'toilet': 'トイレ失敗',
            'other': 'その他'
        }[incident.type as string] || incident.type;

        return (
            <div className="bg-red-50 border border-red-100 rounded-lg overflow-hidden mb-2">
                <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-red-100/50 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncidentId(incident.id);
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden text-xl flex items-center justify-center">
                                {cat ? <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" /> : '🐈'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-white">
                                !
                            </div>
                        </div>
                        <div>
                            <div className="font-bold text-red-700 text-sm">{typeLabel}</div>
                            <div className="text-xs text-red-600/80">{new Date(incident.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div className="text-xs text-red-400">
                        タップして詳細
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/95 backdrop-blur-sm rounded-t-3xl overflow-hidden">
            <div className="p-4 bg-white/50 border-b flex items-center justify-between sticky top-0 z-10">
                <h2 className="font-bold text-lg text-slate-800">今日のタスク</h2>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="p-1 rounded-full hover:bg-slate-200 transition-colors"
                >
                    <X className="w-6 h-6 text-slate-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeIncidents.length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs font-bold text-slate-400 mb-2 px-1">対応が必要なインシデント</div>
                        {activeIncidents.map(inc => (
                            <IncidentItem key={inc.id} incident={inc} />
                        ))}
                    </div>
                )}

                <div className="text-xs font-bold text-slate-400 mb-2 px-1">本日のタスク・記録</div>
                {allItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <p>現在提案できるアクションはありません</p>
                        <p className="text-xs mt-1">記録はすべて完了しています！</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {allItems.map(item => (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm", item.colorClass)}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-700">{item.label}</div>
                                        {item.subLabel && <div className="text-xs text-slate-400">{item.subLabel}</div>}
                                    </div>
                                </div>
                                <button
                                    onClick={item.onAction}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-full hover:bg-slate-200 transition-colors"
                                >
                                    完了
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <IncidentModal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)} />
            {selectedIncidentId && (
                <IncidentDetailModal
                    isOpen={!!selectedIncidentId}
                    onClose={() => setSelectedIncidentId(null)}
                    incidentId={selectedIncidentId}
                />
            )}
        </div>
    );
}
