"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle as ChatIcon, ChevronRight, MessageCircle, Check, Plus } from "lucide-react";
import { useAppState } from "@/store/app-store";
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
    'active': { bg: 'bg-[#E8B4A0]/20', text: 'text-[#E8B4A0]', label: '経過観察中' },
    'monitoring': { bg: 'bg-[#B8A6D9]/20', text: 'text-[#B8A6D9]', label: '注意中' },
    'resolved': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '解決済み' }
};

export function IncidentListSheet({ isOpen, onClose }: IncidentListSheetProps) {
    const { cats, incidents, settings } = useAppState();
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);

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

        return (
            <motion.button
                onClick={() => setSelectedIncidentId(incident.id)}
                className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3 text-left transition-all group"
                whileTap={{ scale: 0.98 }}
            >
                {/* Cat Avatar */}
                <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-white/20 shadow-md">
                        {cat?.avatar ? (
                            <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🐈</div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#B8A6D9] rounded-full flex items-center justify-center border-2 border-[#2C2C35]">
                        <ChatIcon className="w-3 h-3 text-white" />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-200">{cat?.name || '猫ちゃん'}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                        </span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium">{typeLabel}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{formatDate(incident.created_at)}</span>
                        {updateCount > 0 && (
                            <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {updateCount}件の更新
                            </span>
                        )}
                    </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
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
                        className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm"
                    />

                    {/* Sheet / Modal */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`fixed inset-x-0 z-[10001] pointer-events-auto flex justify-center
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
                                    <div className="w-10 h-10 rounded-full bg-[#B8A6D9]/20 flex items-center justify-center ring-1 ring-[#B8A6D9]/30">
                                        <ChatIcon className="w-5 h-5 text-[#B8A6D9]" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-white tracking-tight">そうだん</h1>
                                        <p className="text-xs text-slate-400">チャットで解決しましょう</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowNewIncidentModal(true)}
                                        className="w-9 h-9 rounded-full bg-[#B8A6D9] flex items-center justify-center hover:bg-[#A090C5] transition-colors shadow-lg shadow-[#B8A6D9]/20"
                                    >
                                        <Plus className="w-5 h-5 text-white" />
                                    </button>
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
                                            <div className="w-2 h-2 rounded-full bg-[#E8B4A0] animate-pulse" />
                                            <span className="text-sm font-bold text-slate-300">経過観察中</span>
                                        </div>
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
                                            <Check className="w-4 h-4 text-emerald-500" />
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
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 ring-1 ring-emerald-500/20">
                                            <Check className="w-8 h-8 text-emerald-500" />
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

