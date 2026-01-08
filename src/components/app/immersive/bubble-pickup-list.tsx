"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { Check, Heart, ShoppingCart, X, ChevronLeft, Sparkles, ChevronRight, Eye } from "lucide-react";
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
            // Visual Style: Glassy Tint for Labels
            if (item.type === 'task') {
                const isUrgent = item.severity >= 80;
                colorClass = isUrgent
                    ? "bg-[#B8A6D9]/15 border-[#B8A6D9]/30 text-[#8B7AAF]"
                    : "bg-[#7CAA8E]/15 border-[#7CAA8E]/30 text-[#5A8C6E]";
                icon = <Check className="w-5 h-5" />;
            } else if (item.type === 'notice' || item.type === 'unrecorded') {
                colorClass = "bg-[#E8B4A0]/15 border-[#E8B4A0]/30 text-[#CF8E76]";
                icon = <Heart className="w-5 h-5" />;
            } else if (item.type === 'inventory') {
                colorClass = "bg-[#B8A6D9]/15 border-[#B8A6D9]/30 text-[#8B7AAF]";
                icon = <ShoppingCart className="w-5 h-5" />;
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
            <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-sm rounded-2xl overflow-hidden mb-3 group hover:bg-white/80 transition-all">
                <div
                    className="p-3 pl-4 flex items-center justify-between cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncidentId(incident.id);
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-white shadow-inner flex items-center justify-center">
                                {cat ? <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" /> : '🐈'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[#B8A6D9] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                !
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">{cat?.name || '猫ちゃん'} : {typeLabel}</span>
                            <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {new Date(incident.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div className="pr-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
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
                        <div className="bg-[#FAF9F7]/60 backdrop-blur-3xl rounded-t-[32px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border-t border-white/60 h-[85vh] max-h-[600px] flex flex-col w-full max-w-lg mx-auto relative group">
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
                                <h1 className="text-lg font-bold text-slate-800">今日のピックアップ</h1>

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
                                            <Eye className="w-4 h-4 text-rose-400" />
                                            <span className="text-sm font-bold text-slate-700">気になっていること</span>
                                        </div>
                                        {activeIncidents.map(inc => (
                                            <IncidentItem key={inc.id} incident={inc} />
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Check className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-700">今日のお世話</span>
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
                                                className="relative overflow-hidden bg-gradient-to-r from-white/80 to-white/40 backdrop-blur-xl rounded-[20px] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_10px_30px_-4px_rgba(0,0,0,0.1)] border border-white flex items-center gap-3 group transition-all hover:scale-[1.01] hover:shadow-xl"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                                                    <div className={cn("w-11 h-11 shrink-0 rounded-full flex items-center justify-center border shadow-sm backdrop-blur-sm", item.colorClass)}>
                                                        {item.icon}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-slate-800 text-sm leading-tight tracking-tight break-words">{item.label}</div>
                                                        {item.subLabel && <div className="text-[11px] font-medium text-slate-500 mt-0.5 break-words">{item.subLabel}</div>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={item.onAction}
                                                    className="px-4 py-2 bg-gradient-to-b from-[#7CAA8E] to-[#609075] text-white text-xs font-bold rounded-full shadow-[0_4px_10px_-2px_rgba(124,170,142,0.4)] border-t border-white/30 hover:brightness-110 active:scale-95 transition-all shrink-0 whitespace-nowrap relative z-10"
                                                >
                                                    完了
                                                </button>

                                                {/* Subtle Shine Effect on Card */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-50 pointer-events-none" />
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
