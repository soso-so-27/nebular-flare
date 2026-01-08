"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Heart, ShoppingCart, X, ChevronLeft, Sparkles } from "lucide-react";
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
    isOpen: boolean;
    onClose: () => void;
}

export function BubblePickupList({ isOpen, onClose }: BubblePickupListProps) {
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
                colorClass = isUrgent ? "bg-[#B8A6D9]" : "bg-[#7CAA8E]"; // Lavender (urgent) or Sage (normal)
                icon = <Check className="w-5 h-5 text-white" />;
            } else if (item.type === 'notice' || item.type === 'unrecorded') {
                colorClass = "bg-[#E8B4A0]";
                icon = <Heart className="w-5 h-5 text-white" />;
            } else if (item.type === 'inventory') {
                colorClass = "bg-[#B8A6D9]";
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
            <div className="bg-[#B8A6D9]/10 border border-[#B8A6D9]/20 rounded-lg overflow-hidden mb-2">
                <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#B8A6D9]/20 transition-colors"
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
                            <div className="absolute -bottom-1 -right-1 bg-[#B8A6D9] text-white text-[10px] px-1.5 py-0.5 rounded-full border border-white">
                                !
                            </div>
                        </div>
                        <div>
                            <div className="font-bold text-[#8B7AAF] text-sm">{typeLabel}</div>
                            <div className="text-xs text-[#B8A6D9]/80">{new Date(incident.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div className="text-xs text-[#B8A6D9]">
                        タップして詳細
                    </div>
                </div>
            </div>
        );
    };

    // Animation Variants (Shared with SidebarMenu)
    const sheetVariants = {
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring" as const, damping: 30, stiffness: 300 } },
        exit: { y: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 300 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Bottom Sheet Container */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-x-0 bottom-0 z-[10001]"
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                    >
                        {/* Sheet Visuals */}
                        <div className="bg-[#FAF9F7]/85 backdrop-blur-3xl rounded-t-[32px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border-t border-white/60 h-[85vh] max-h-[600px] flex flex-col w-full max-w-lg mx-auto relative group">
                            {/* Specular Elements */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-90 z-20" />
                            <div className="absolute inset-0 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.5)] pointer-events-none rounded-t-[32px] z-20" />

                            {/* Gradient Overlay for extra glass depth */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

                            {/* Drag Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 relative z-10" onClick={onClose}>
                                <div className="w-12 h-1.5 rounded-full bg-slate-400/30" />
                            </div>

                            {/* Navigation Header */}
                            <div className="px-6 py-2 flex items-center justify-between shrink-0 h-14 relative z-10">
                                <h1 className="text-lg font-bold text-slate-800">今日のタスク</h1>

                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 pt-2 pb-10 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                {activeIncidents.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                            <span className="text-xs font-bold text-slate-500">対応が必要な気付き</span>
                                        </div>
                                        {activeIncidents.map(inc => (
                                            <IncidentItem key={inc.id} incident={inc} />
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Check className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-700">今日のやること</span>
                                </div>

                                {allItems.length === 0 ? (
                                    <div className="text-center py-12 rounded-3xl bg-white/30 border border-white/40 border-dashed mx-1 flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                                            <Sparkles className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <p className="font-bold text-slate-600">すべて完了！</p>
                                        <p className="text-xs text-slate-400 mt-1">今日も一日お疲れ様でした ✨</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {allItems.map(item => (
                                            <div
                                                key={item.id}
                                                className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60 flex items-center justify-between group transition-all hover:bg-white/80"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-inner", item.colorClass)}>
                                                        {item.icon}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-700 leading-tight">{item.label}</div>
                                                        {item.subLabel && <div className="text-[10px] text-slate-500 mt-0.5">{item.subLabel}</div>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={item.onAction}
                                                    className="px-5 py-2 bg-[#7CAA8E] text-white text-xs font-bold rounded-full shadow-md hover:bg-[#6B997D] hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    完了
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Modals */}
                            <IncidentModal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)} />
                            {selectedIncidentId && (
                                <IncidentDetailModal
                                    isOpen={!!selectedIncidentId}
                                    onClose={() => setSelectedIncidentId(null)}
                                    incidentId={selectedIncidentId}
                                />
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
