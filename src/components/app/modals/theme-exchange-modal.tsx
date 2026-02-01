"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Sparkles, Palette, Gift, ShoppingBag, Heart, Layout, Sun, Moon, TreePine, Flower2, Smartphone, Layers, FileText, ArrowLeftRight, LayoutGrid, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useFootprintContext } from "@/providers/footprint-provider";
import { useIncidentContext } from "@/store/app-store";
import { toast } from "sonner";
import type { LayoutType, Cat, ReportConfigData } from "@/types";
import { ReportConfigModal } from "./report-config-modal";
import { MedicalReportView } from "../shared/medical-report-view";
import { WeeklyPageClient } from "../shared/weekly-page-client";

import { useThemeExchange, ThemeItem } from "@/hooks/use-theme-exchange";
import { ThemeTabLayout } from "./theme-tab-layout";
import { ThemeTabReport } from "./theme-tab-report";
import { ThemeTabDonation } from "./theme-tab-donation";

type TabType = 'layout' | 'report' | 'goods' | 'donation';

interface ThemeExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TABS: { id: TabType; label: string; icon: React.ReactNode; ready: boolean }[] = [
    { id: 'report', label: 'レポート', icon: <FileText className="w-3.5 h-3.5" />, ready: true },
    { id: 'layout', label: 'きせかえ', icon: <Layout className="w-3.5 h-3.5" />, ready: false },
    { id: 'goods', label: 'プリント', icon: <Gift className="w-3.5 h-3.5" />, ready: false },
    { id: 'donation', label: '寄付', icon: <Heart className="w-3.5 h-3.5" />, ready: false },
];

export function ThemeExchangeModal({ isOpen, onClose }: ThemeExchangeModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('report');
    const { incidents } = useIncidentContext();
    const {
        stats, settings, cats, medicationLogs,
        purchasing, confirmChange, setConfirmChange,
        changeLayout, changeViewMode
    } = useThemeExchange(isOpen);

    const isIsland = settings.layoutType === 'v2-island';

    // Report state
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [showReportConfig, setShowReportConfig] = useState(false);
    const [showCatSelector, setShowCatSelector] = useState(false);
    const [reportData, setReportData] = useState<ReportConfigData | null>(null);
    const [showReportView, setShowReportView] = useState(false);
    const [showWeeklyReport, setShowWeeklyReport] = useState(false);

    // Auto-select cat if available
    useEffect(() => {
        if (isOpen && cats.length > 0 && !selectedCatId) {
            setSelectedCatId(cats[0].id);
        }
    }, [isOpen, cats, selectedCatId]);

    const handleReportAction = (action: () => void) => {
        if (!selectedCatId) {
            toast.info('猫ちゃんを選択してください');
            setShowCatSelector(true);
            return;
        }
        action();
    };

    const sheetVariants = {
        hidden: { y: "110%", opacity: 0, scale: 0.95 },
        visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
        exit: { y: "110%", opacity: 0, scale: 0.95, transition: { type: "spring" as const, damping: 25, stiffness: 300 } }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm"
                        />

                        <motion.div
                            variants={sheetVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`fixed inset-x-0 z-[10001] pointer-events-auto flex justify-center
                            ${isIsland ? 'bottom-0' : 'bottom-24 px-4 py-8'}`}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100) onClose();
                            }}
                        >
                            <div className={`
                            bg-[#1E1E23]/90 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col w-full max-w-lg transition-all duration-300
                            ${isIsland
                                    ? 'rounded-t-[32px] h-[85vh] max-h-[800px] border-b-0'
                                    : 'rounded-[32px] h-[75vh] max-h-[700px] border-b'}
                        `}>
                                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 ${isIsland ? 'rounded-t-[32px]' : 'rounded-[32px]'}`} />

                                <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing" onClick={onClose}>
                                    <div className="w-12 h-1.5 rounded-full bg-white/20" />
                                </div>

                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-peach/20 ring-1 ring-brand-peach/30 shadow-inner">
                                            <ArrowLeftRight className="w-5 h-5 text-brand-peach" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">足あと交換所</h2>
                                            <p className="text-sm font-medium text-slate-400">🐾 {stats.householdTotal} pt</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === tab.id
                                                ? 'text-brand-peach'
                                                : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {tab.icon}
                                            <span className={!tab.ready ? 'opacity-50' : ''}>{tab.label}</span>
                                            {!tab.ready && (
                                                <Lock className="w-2.5 h-2.5 opacity-30 ml-1" />
                                            )}
                                            {activeTab === tab.id && (
                                                <motion.div
                                                    layoutId="activeTabIndicator"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-peach"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [&::-webkit-scrollbar]:hidden">
                                    {activeTab === 'layout' ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Lock className="w-8 h-8 opacity-20" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-slate-400">きせかえ機能は準備中です</p>
                                                <p className="text-xs opacity-50 mt-1">近日公開予定！お楽しみに</p>
                                            </div>
                                        </div>
                                    ) : activeTab === 'report' ? (
                                        <ThemeTabReport
                                            onIssueReport={() => setShowReportConfig(true)}
                                            onOpenWeekly={() => setShowWeeklyReport(true)}
                                        />
                                    ) : (
                                        <ThemeTabDonation />
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        <ReportConfigModal
                            isOpen={showReportConfig}
                            onClose={() => setShowReportConfig(false)}
                            cats={cats}
                            onComplete={(data) => {
                                setReportData(data);
                                setSelectedCatId(data.cat_id); // Sync cat selection from modal
                                setShowReportConfig(false);
                                setShowReportView(true);
                            }}
                        />

                        {showReportView && reportData && (
                            <div className="fixed inset-0 z-[12000] bg-white dark:bg-slate-950 overflow-y-auto">
                                <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b pt-[env(safe-area-inset-top)]">
                                    <h2 className="font-bold">受診レポート</h2>
                                    <button
                                        onClick={() => setShowReportView(false)}
                                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-4 pb-20">
                                    <MedicalReportView
                                        cat={cats.find((c: any) => c.id === selectedCatId)!}
                                        config={reportData}
                                        incidents={incidents || []}
                                        medicationLogs={medicationLogs?.filter((l: any) => l.cat_id === selectedCatId)}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </AnimatePresence>

            {showWeeklyReport && (
                <WeeklyPageClient
                    onClose={() => setShowWeeklyReport(false)}
                />
            )}
        </>
    );
}

// Helper for theme visuals
function getThemeVisuals(theme: ThemeItem) {
    if (theme.name.includes('夕暮れ')) {
        return {
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            icon: Sun
        };
    }
    if (theme.name.includes('森')) {
        return {
            gradient: 'linear-gradient(135deg, #22C55E 0%, #166534 100%)',
            icon: TreePine
        };
    }
    if (theme.name.includes('夜空')) {
        return {
            gradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
            icon: Moon
        };
    }
    if (theme.name.includes('桜')) {
        return {
            gradient: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
            icon: Flower2
        };
    }
    if (theme.name.includes('ラベンダー')) {
        return {
            gradient: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
            icon: Sparkles
        };
    }
    // Default
    return {
        gradient: 'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)',
        icon: Smartphone
    };
}
