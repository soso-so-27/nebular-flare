"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Check, Plus, Cat } from "lucide-react";
import { useCatContext, useIncidentContext, useSettingsContext } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { IncidentDetailModal } from "./incident-detail-modal";
import { IncidentModal } from "./incident-modal";

interface IncidentListSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
    'worried': '相談',
    'chat': '相談',
    'daily': '記録',
    'good': '記録',
    'concerned': '相談',
    'troubled': '相談',
    'vomit': '嘔吐',
    'diarrhea': '下痢',
    'injury': '怪我',
    'appetite': '食欲不振',
    'energy': '元気がない',
    'toilet': 'トイレ失敗',
    'other': 'その他'
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    'active': { bg: 'bg-brand-peach/15', text: 'text-brand-peach', label: '経過観察中' },
    'monitoring': { bg: 'bg-brand-peach/15', text: 'text-brand-peach', label: '注意中' },
    'resolved': { bg: 'bg-black/5', text: 'text-[#1c1c1e]/40', label: '解決済み' }
};

export function IncidentListSheet({ isOpen, onClose }: IncidentListSheetProps) {
    const { settings } = useSettingsContext();
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();
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
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring" as const, damping: 30, stiffness: 250 } },
        exit: { y: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 250 } }
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
                    w-full bg-black/[0.02] hover:bg-black/[0.04] rounded-[24px] p-4 border border-[#f0f0f0] 
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
                        <div className="w-8 h-8 rounded-xl bg-[#f0f0f0] overflow-hidden border border-black/5 shadow-sm relative">
                            {cat?.avatar ? (
                                <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#1c1c1e]/20">
                                    <Cat className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-black text-[#1c1c1e]">{cat?.name || '猫ちゃん'}</p>
                            <p className="text-[9px] text-[#1c1c1e]/30 font-bold uppercase tracking-wider">{formatDate(incident.created_at)}</p>
                        </div>
                    </div>
                </div>

                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${statusStyle.bg} ${statusStyle.text} border border-black/5`}>
                    {statusStyle.label}
                </div>

                <div className="flex items-center justify-between mt-1">
                    <h3 className="text-sm font-black text-[#1c1c1e] tracking-tight">
                        {typeLabel}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        {updateCount > 0 && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-brand-peach">
                                <MessageCircle className="w-2.5 h-2.5" />
                                {updateCount}
                            </div>
                        )}
                        <div className="text-[9px] font-black text-[#1c1c1e]/30 group-hover:text-[#1c1c1e]/50 transition-colors">
                            詳細を見る →
                        </div>
                    </div>
                </div>
            </motion.button >
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
                        className="fixed inset-0 z-overlay bg-[#4E342E]/10 backdrop-blur-sm"
                    />

                    {/* Sheet / Modal */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed bottom-0 inset-x-0 z-modal pointer-events-auto"
                    >
                        <div className="bg-[#fefefe] rounded-t-[40px] flex flex-col w-full max-h-[90vh] border-t border-black/5 shadow-[0_-8px_40px_rgba(78,52,46,0.1)] overflow-hidden">
                            {/* Handle */}
                            <div className="w-full flex justify-center pt-4 pb-2">
                                <div className="w-10 h-1.5 rounded-full bg-black/5" />
                            </div>

                            {/* Header */}
                            <div className="px-8 py-6 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <h1 className="text-[22px] font-black text-[#1c1c1e] tracking-tight">そうだん</h1>
                                        <p className="text-xs text-brand-peach font-bold animate-pulse">様子をチェックして解決しよう</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowNewIncidentModal(true)}
                                        className="w-9 h-9 rounded-full bg-brand-peach/15 flex items-center justify-center hover:bg-brand-peach/25 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 text-brand-peach" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center active:bg-black/10 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-[#1c1c1e]/40" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 pb-[env(safe-area-inset-bottom,24px)]">
                                {/* Active Incidents */}
                                {activeIncidents.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-3 px-2">
                                            <div className="w-2 h-2 rounded-full bg-brand-peach animate-pulse" />
                                            <span className="text-sm font-bold text-[#1c1c1e]/60">経過観察中</span>
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
                                            <Check className="w-4 h-4 text-[#1c1c1e]/30" />
                                            <span className="text-sm font-bold text-[#1c1c1e]/30">解決済み</span>
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
                                        <p className="text-[#1c1c1e]/40 font-bold">相談はありません</p>
                                        <p className="text-xs text-[#1c1c1e]/20 mt-1">猫ちゃんは元気いっぱい！</p>
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

