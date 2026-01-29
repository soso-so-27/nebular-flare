"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle as ChatIcon, ChevronRight, MessageCircle, Check, Plus, AlertCircle } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { IncidentDetailModal } from "./incident-detail-modal";
import { IncidentModal } from "./incident-modal";

interface IncidentListSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
    'vomit': '嘔吐',
    'diarrhea': '下痢',
    'injury': '怪我',
    'appetite': '食欲不振',
    'energy': '元気がない',
    'toilet': 'トイレ失敗',
    'other': 'その他'
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    'active': { bg: 'bg-brand-peach/20', text: 'text-brand-peach', label: '経過観察中' },
    'monitoring': { bg: 'bg-brand-peach/20', text: 'text-brand-peach', label: '注意中' },
    'resolved': { bg: 'bg-white/10', text: 'text-slate-400', label: '解決済み' }
};

export function IncidentListSheet({ isOpen, onClose }: IncidentListSheetProps) {
    const { cats, incidents, settings } = useAppState();
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const isIsland = settings.layoutType === 'v2-island';

    // Separate active and resolved incidents
    const { activeIncidents, resolvedIncidents } = useMemo(() => {
        const active = incidents.filter(inc => inc.status !== 'resolved');
        const resolved = incidents.filter(inc => inc.status === 'resolved');

        // Sort by date (newest first)
        const sortByDate = (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        return {
            activeIncidents: active.sort(sortByDate),
            resolvedIncidents: resolved.sort(sortByDate).slice(0, 10) // Only show last 10 resolved
        };
    }, [incidents]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getCat = (catId: string) => cats.find(c => c.id === catId);

    const sheetVariants = {
        hidden: { y: "110%", opacity: 0, scale: 0.95 },
        visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
        exit: { y: "110%", opacity: 0, scale: 0.95, transition: { type: "spring" as const, damping: 25, stiffness: 300 } }
    };

    const IncidentItem = ({ incident }: { incident: any }) => {
        const cat = getCat(incident.cat_id);
        const typeLabel = TYPE_LABELS[incident.type] || incident.type;
        const statusStyle = STATUS_STYLES[incident.status] || STATUS_STYLES.active;
        const updateCount = incident.updates?.length || 0;
        const isResolved = incident.status === 'resolved';

        return (
            <motion.button
                onClick={() => setSelectedIncidentId(incident.id)}
                className={`
                    w-full bg-[#1E1E23]/40 hover:bg-[#1E1E23]/60 backdrop-blur-md rounded-[24px] p-4 border border-white/5 
                    flex flex-col gap-3 text-left transition-all group relative overflow-hidden
                    ${isResolved ? 'opacity-70' : ''}
                `}
                whileTap={{ scale: 0.98 }}
            >
                {/* Status Indicator Bar - more subtle */}
                {!isResolved && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-peach/30" />
                )}

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 overflow-hidden border border-white/5 shadow-sm relative">
                            {cat?.avatar ? (
                                <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-base">🐈</div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-200">{cat?.name || '猫ちゃん'}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{formatDate(incident.created_at)}</p>
                        </div>
                    </div>

                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${statusStyle.bg} ${statusStyle.text} border border-white/5`}>
                        {statusStyle.label}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                    <h3 className="text-sm font-black text-slate-200 tracking-tight">
                        {typeLabel}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        {updateCount > 0 && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-brand-peach">
                                <MessageCircle className="w-2.5 h-2.5" />
                                {updateCount}
                            </div>
                        )}
                        <div className="text-[9px] font-black text-slate-600 group-hover:text-slate-400 transition-colors">
                            詳細を見る →
                        </div>
                    </div>
                </div>
            </motion.button>
        );
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
                        className="fixed inset-0 z-overlay bg-black/40 backdrop-blur-sm"
                    />

                    {/* Sheet / Modal */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`fixed inset-x-0 z-modal pointer-events-auto flex justify-center
                            ${isIsland ? 'bottom-0' : 'bottom-24 px-4'}`}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                    >
                        <div className={`
                            bg-[#1E1E23]/85 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col w-full max-w-lg transition-all duration-300
                            ${isIsland
                                ? 'rounded-t-[32px] h-[75vh] max-h-[650px] border-b-0'
                                : 'rounded-[32px] h-[65vh] max-h-[600px] border-b'}
                        `}>
                            {/* Specular */}
                            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 ${isIsland ? 'rounded-t-[32px]' : 'rounded-[32px]'}`} />

                            {/* Drag Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing" onClick={onClose}>
                                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                            </div>

                            {/* Header */}
                            <div className="px-6 py-3 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <h1 className="text-lg font-bold text-white tracking-tight">そうだん</h1>
                                        <p className="text-xs text-brand-peach font-bold animate-pulse">様子をチェックして解決しよう</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-4 pb-6 [&::-webkit-scrollbar]:hidden">
                                {/* Active Incidents */}
                                {activeIncidents.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-3 px-2">
                                            <div className="w-2 h-2 rounded-full bg-brand-peach animate-pulse" />
                                            <span className="text-sm font-bold text-slate-300">経過観察中</span>
                                        </div>
                                        <button
                                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                                            className={cn(
                                                "p-2 rounded-full transition-colors",
                                                isFilterOpen
                                                    ? "bg-brand-sage text-white"
                                                    : "bg-white text-slate-400 hover:bg-slate-100"
                                            )}
                                        >
                                            {/* Placeholder for filter button content */}
                                            <ChevronRight className={cn("w-4 h-4 transition-transform", isFilterOpen && "rotate-90")} />
                                        </button>
                                        <div className="grid gap-3">
                                            {activeIncidents.map(inc => (
                                                <IncidentItem key={inc.id} incident={inc} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Resolved Incidents */}
                                {resolvedIncidents.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3 px-2">
                                            <Check className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-500">解決済み</span>
                                        </div>
                                        <div className="grid gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                            {resolvedIncidents.map(inc => (
                                                <IncidentItem key={inc.id} incident={inc} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {activeIncidents.length === 0 && resolvedIncidents.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 rounded-full bg-brand-peach/10 flex items-center justify-center mb-4 ring-1 ring-brand-peach/20">
                                            <Check className="w-8 h-8 text-brand-peach" />
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-brand-lavender/10 flex items-center justify-center shrink-0">
                                            <AlertCircle className="w-4 h-4 text-brand-lavender" />
                                        </div>
                                        <p className="text-slate-300 font-bold">相談はありません</p>
                                        <p className="text-xs text-slate-500 mt-1">猫ちゃんは元気いっぱい！</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Incident Detail Modal */}
                    {selectedIncidentId && (
                        <IncidentDetailModal
                            isOpen={!!selectedIncidentId}
                            onClose={() => setSelectedIncidentId(null)}
                            incidentId={selectedIncidentId}
                        />
                    )}

                    {/* New Incident Modal */}
                    <IncidentModal
                        isOpen={showNewIncidentModal}
                        onClose={() => setShowNewIncidentModal(false)}
                    />
                </>
            )}
        </AnimatePresence>
    );
}

