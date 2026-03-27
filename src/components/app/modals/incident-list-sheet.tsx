"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Check, Plus, Cat } from "lucide-react";
import { useCatContext, useIncidentContext, useSettingsContext } from "@/store/app-store";
import { IncidentDetailModal } from "./incident-detail-modal";
import { IncidentModal } from "./incident-modal";

interface IncidentListSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
    worried: "気になること",
    chat: "気になること",
    daily: "日々の記録",
    good: "良かったこと",
    concerned: "気になること",
    troubled: "困りごと",
    vomit: "嘔吐",
    diarrhea: "下痢",
    injury: "けが",
    appetite: "食欲の変化",
    energy: "元気の変化",
    toilet: "トイレの変化",
    other: "その他",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-brand-peach/15", text: "text-brand-peach", label: "対応中" },
    monitoring: { bg: "bg-brand-peach/15", text: "text-brand-peach", label: "経過観察" },
    resolved: { bg: "bg-black/5", text: "text-[#1c1c1e]/40", label: "解決済み" },
};

export function IncidentListSheet({ isOpen, onClose }: IncidentListSheetProps) {
    const { settings } = useSettingsContext();
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);

    void settings;

    const { activeIncidents, resolvedIncidents } = useMemo(() => {
        const active = incidents.filter((inc) => inc.status !== "resolved");
        const resolved = incidents.filter((inc) => inc.status === "resolved");

        const sortByDate = (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        return {
            activeIncidents: active.sort(sortByDate),
            resolvedIncidents: resolved.sort(sortByDate).slice(0, 10),
        };
    }, [incidents]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
        });
    };

    const getCat = (catId: string) => cats.find((c) => c.id === catId);

    const sheetVariants = {
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring" as const, damping: 30, stiffness: 250 } },
        exit: { y: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 250 } },
    };

    const IncidentItem = ({ incident }: { incident: any }) => {
        const cat = getCat(incident.cat_id);
        const typeLabel = TYPE_LABELS[incident.type] || incident.type;
        const statusStyle = STATUS_STYLES[incident.status] || STATUS_STYLES.active;
        const updateCount = incident.updates?.length || 0;
        const isResolved = incident.status === "resolved";

        return (
            <motion.button
                onClick={() => setSelectedIncidentId(incident.id)}
                className={`
                    group relative w-full overflow-hidden rounded-[24px] border border-[#f0f0f0]
                    bg-black/[0.02] p-4 text-left transition-all hover:bg-black/[0.04]
                    ${isResolved ? "opacity-70" : ""}
                `}
                whileTap={{ scale: 0.98 }}
            >
                {!isResolved && <div className="absolute bottom-0 left-0 top-0 w-1 bg-brand-peach/30" />}

                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-black/5 bg-[#f0f0f0] shadow-sm">
                                {cat?.avatar ? (
                                    <img src={cat.avatar} alt={cat.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[#1c1c1e]/20">
                                        <Cat className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-black text-[#1c1c1e]">{cat?.name || "ねこ"}</p>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-[#1c1c1e]/30">
                                    {formatDate(incident.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`inline-flex w-fit rounded-full border border-black/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter ${statusStyle.bg} ${statusStyle.text}`}
                    >
                        {statusStyle.label}
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                        <h3 className="text-sm font-black tracking-tight text-[#1c1c1e]">{typeLabel}</h3>
                        <div className="flex items-center gap-1.5">
                            {updateCount > 0 && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-brand-peach">
                                    <MessageCircle className="h-2.5 w-2.5" />
                                    {updateCount}
                                </div>
                            )}
                            <div className="text-[9px] font-black text-[#1c1c1e]/30 transition-colors group-hover:text-[#1c1c1e]/50">
                                詳細を見る
                            </div>
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
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-overlay bg-[#4E342E]/10 backdrop-blur-sm"
                    />

                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="pointer-events-auto fixed inset-x-0 bottom-0 z-modal"
                    >
                        <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[40px] border-t border-black/5 bg-[#fefefe] shadow-[0_-8px_40px_rgba(78,52,46,0.1)]">
                            <div className="flex w-full justify-center pb-2 pt-4">
                                <div className="h-1.5 w-10 rounded-full bg-black/5" />
                            </div>

                            <div className="flex shrink-0 items-center justify-between px-8 py-6">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <h1 className="text-[22px] font-black tracking-tight text-[#1c1c1e]">気になること</h1>
                                        <p className="animate-pulse text-xs font-bold text-brand-peach">
                                            最近の相談や記録をチェックできます
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowNewIncidentModal(true)}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-peach/15 transition-colors hover:bg-brand-peach/25"
                                    >
                                        <Plus className="h-4 w-4 text-brand-peach" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 transition-colors active:bg-black/10"
                                    >
                                        <X className="h-5 w-5 text-[#1c1c1e]/40" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-[env(safe-area-inset-bottom,24px)]">
                                {activeIncidents.length > 0 && (
                                    <div className="mb-6">
                                        <div className="mb-3 flex items-center gap-2 px-2">
                                            <div className="h-2 w-2 animate-pulse rounded-full bg-brand-peach" />
                                            <span className="text-sm font-bold text-[#1c1c1e]/60">対応中</span>
                                        </div>
                                        <div className="grid gap-3">
                                            {activeIncidents.map((inc) => (
                                                <IncidentItem key={inc.id} incident={inc} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {resolvedIncidents.length > 0 && (
                                    <div>
                                        <div className="mb-3 flex items-center gap-2 px-2">
                                            <Check className="h-4 w-4 text-[#1c1c1e]/30" />
                                            <span className="text-sm font-bold text-[#1c1c1e]/30">解決済み</span>
                                        </div>
                                        <div className="grid gap-3 opacity-60 transition-opacity hover:opacity-100">
                                            {resolvedIncidents.map((inc) => (
                                                <IncidentItem key={inc.id} incident={inc} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeIncidents.length === 0 && resolvedIncidents.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-peach/10 ring-1 ring-brand-peach/20">
                                            <Check className="h-8 w-8 text-brand-peach" />
                                        </div>
                                        <p className="font-bold text-[#1c1c1e]/40">気になることはまだありません</p>
                                        <p className="mt-1 text-xs text-[#1c1c1e]/20">必要になったらここから記録できます</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {selectedIncidentId && (
                        <IncidentDetailModal
                            isOpen={!!selectedIncidentId}
                            onClose={() => setSelectedIncidentId(null)}
                            incidentId={selectedIncidentId}
                        />
                    )}

                    <IncidentModal isOpen={showNewIncidentModal} onClose={() => setShowNewIncidentModal(false)} />
                </>
            )}
        </AnimatePresence>
    );
}
