"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Sparkles, Palette, Gift, ShoppingBag, Heart, Layout, Sun, Moon, TreePine, Flower2, Smartphone, Layers, FileText, ArrowLeftRight, LayoutGrid, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useFootprintContext } from "@/providers/footprint-provider";
import { useAppState } from "@/store/app-store";
import { toast } from "sonner";
import type { LayoutType, Cat, ReportConfigData } from "@/types";
import { ReportConfigModal } from "./report-config-modal";
import { MedicalReportView } from "../shared/medical-report-view";
import { WeeklyPageClient } from "../shared/weekly-page-client";

type TabType = 'layout' | 'report' | 'goods' | 'donation';

const TABS: { id: TabType; label: string; icon: React.ReactNode; ready: boolean }[] = [
    { id: 'layout', label: 'きせかえ', icon: <Layout className="w-3.5 h-3.5" />, ready: true },
    { id: 'report', label: 'レポート', icon: <FileText className="w-3.5 h-3.5" />, ready: true },
    { id: 'goods', label: 'プリント', icon: <Gift className="w-3.5 h-3.5" />, ready: false },
    { id: 'donation', label: '寄付', icon: <Heart className="w-3.5 h-3.5" />, ready: false },
];

const LAYOUT_OPTIONS: { id: LayoutType; name: string; description: string; version: 'v2' }[] = [
    // Optimized (v2 - Neo Components)
    { id: 'v2-island', name: 'アイランド', description: '3アクションのシンプル設計。', version: 'v2' },
];

interface ThemeItem {
    id: string;
    name: string;
    description: string;
    type: string;
    cost: number;
    css_variables: Record<string, string>;
    is_default: boolean;
    sort_order: number;
}

interface ThemeExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ThemeExchangeModal({ isOpen, onClose }: ThemeExchangeModalProps) {
    const [themes, setThemes] = useState<ThemeItem[]>([]);
    const [unlockedThemeIds, setUnlockedThemeIds] = useState<Set<string>>(new Set());
    const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('layout');
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [confirmChange, setConfirmChange] = useState<string | null>(null);
    const { stats, refreshStats, consumeFootprints } = useFootprintContext();
    const { settings, setSettings, cats, medicationLogs } = useAppState();

    const isIsland = settings.layoutType === 'v2-island';
    const { incidents } = useAppState();

    // Report state
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [showReportConfig, setShowReportConfig] = useState(false);
    const [showCatSelector, setShowCatSelector] = useState(false);
    const [reportData, setReportData] = useState<ReportConfigData | null>(null);
    const [showReportView, setShowReportView] = useState(false);
    const [showWeeklyReport, setShowWeeklyReport] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            loadThemes();
            refreshStats(); // ポイントが 0 に見えないよう最新化
        }
    }, [isOpen]);

    // Auto-select cat if available
    useEffect(() => {
        if (isOpen && cats.length > 0 && !selectedCatId) {
            // Default to the first cat
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

    const loadThemes = async () => {
        setLoading(true);
        try {
            // Fetch all themes
            const { data: themesData, error: themesError } = await (supabase
                .from('theme_items' as any)
                .select('*')
                .order('sort_order', { ascending: true }) as any);

            if (themesError) throw themesError;
            setThemes(themesData || []);

            // Fetch user's unlocked themes
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: unlockedData } = await (supabase
                    .from('user_unlocked_themes' as any)
                    .select('theme_id')
                    .eq('user_id', user.id) as any);

                const unlockedIds = new Set<string>((unlockedData || []).map((u: any) => u.theme_id as string));
                // Default theme is always unlocked
                themesData?.forEach((t: ThemeItem) => {
                    if (t.is_default) unlockedIds.add(t.id);
                });
                setUnlockedThemeIds(unlockedIds);

                // Get active theme
                const { data: userData } = await (supabase
                    .from('users' as any)
                    .select('active_theme_id')
                    .eq('id', user.id)
                    .single() as any);
                setActiveThemeId(userData?.active_theme_id || null);
            }
        } catch (error) {
            console.error('Failed to load themes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (theme: ThemeItem) => {
        if (purchasing) return;

        if (stats.householdTotal < theme.cost) {
            toast.error(`ポイントが足りません（必要: ${theme.cost}pt）`);
            return;
        }

        setPurchasing(theme.id);
        try {
            const { data, error } = await (supabase.rpc as any)('purchase_theme', {
                p_theme_id: theme.id
            });

            if (error) throw error;
            if (!data.success) {
                toast.error(data.error || '購入に失敗しました');
                return;
            }

            toast.success(`「${theme.name}」をアンロックしました！`);
            setUnlockedThemeIds(prev => new Set([...prev, theme.id]));
            setActiveThemeId(theme.id);
            applyTheme(theme);
            refreshStats();
        } catch (error) {
            console.error('Purchase failed:', error);
            toast.error('購入に失敗しました');
        } finally {
            setPurchasing(null);
        }
    };

    const handleApplyTheme = async (theme: ThemeItem) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await ((supabase.from as any)('users'))
                .update({ active_theme_id: theme.id })
                .eq('id', user.id);

            setActiveThemeId(theme.id);
            applyTheme(theme);
            toast.success(`「${theme.name}」を適用しました`);
        } catch (error) {
            console.error('Failed to apply theme:', error);
        }
    };

    const applyTheme = (theme: ThemeItem) => {
        if (!theme.css_variables) return;

        const root = document.documentElement;
        Object.entries(theme.css_variables).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    };

    const isUnlocked = (themeId: string) => unlockedThemeIds.has(themeId);
    const isActive = (themeId: string) => activeThemeId === themeId;

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
                                {/* Specular */}
                                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 ${isIsland ? 'rounded-t-[32px]' : 'rounded-[32px]'}`} />

                                {/* Drag Handle */}
                                <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing" onClick={onClose}>
                                    <div className="w-12 h-1.5 rounded-full bg-white/20" />
                                </div>

                                {/* Header */}
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

                                {/* Tab Bar */}
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

                                {/* Content Area */}
                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [&::-webkit-scrollbar]:hidden">
                                    {activeTab === 'layout' ? (
                                        <div className="space-y-6">
                                            {/* Layout Options */}
                                            <div className="space-y-3">
                                                <div className="text-xs font-bold text-brand-peach mb-1 flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    レイアウト変更（🐾 1 pt）
                                                </div>
                                                {LAYOUT_OPTIONS.map((layout) => {
                                                    const isCurrent = settings.layoutType === layout.id;
                                                    const isConfirming = confirmChange === layout.id;

                                                    return (
                                                        <motion.button
                                                            key={layout.id}
                                                            disabled={isCurrent || (purchasing !== null && purchasing !== layout.id)}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (isCurrent || purchasing !== null) return;

                                                                // First tap: Enter confirmation mode
                                                                if (!isConfirming) {
                                                                    setConfirmChange(layout.id);
                                                                    // Reset after 3 seconds if not confirmed
                                                                    setTimeout(() => setConfirmChange(prev => prev === layout.id ? null : prev), 3000);
                                                                    return;
                                                                }

                                                                // Second tap: Execute
                                                                if (stats.householdTotal < 1) {
                                                                    toast.error('ポイントが足りません (🐾 1 pt 必要です)');
                                                                    return;
                                                                }

                                                                setPurchasing(layout.id);
                                                                setConfirmChange(null);
                                                                try {
                                                                    const success = await consumeFootprints('layout_change', 1);
                                                                    if (success) {
                                                                        // Enforce coupled settings: settings.layoutType => settings.homeButtonMode
                                                                        // Standard (v2-classic) -> Unified (Concentrated)
                                                                        // Island (v2-island) -> Separated (Distributed)
                                                                        const tiedButtonMode = layout.id === 'v2-classic' ? 'unified' : 'separated';

                                                                        setSettings(s => ({
                                                                            ...s,
                                                                            layoutType: layout.id,
                                                                            homeButtonMode: tiedButtonMode
                                                                        }));
                                                                        toast.success('レイアウトを変更しました');
                                                                    } else {
                                                                        toast.error('ポイントの消費に失敗しました。残高や通信状況を確認してください。');
                                                                    }
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toast.error('システムエラーが発生しました');
                                                                } finally {
                                                                    setPurchasing(null);
                                                                }
                                                            }}
                                                            className={`w-full p-4 rounded-2xl border transition-all text-left relative group ${isCurrent
                                                                ? 'border-brand-peach bg-brand-peach/10 shadow-[0_0_15px_rgba(var(--brand-peach-rgb),0.1)]'
                                                                : isConfirming
                                                                    ? 'border-orange-400 bg-orange-400/20'
                                                                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                                                } ${purchasing === layout.id ? 'opacity-70' : ''}`}
                                                            whileTap={!isCurrent ? { scale: 0.98 } : {}}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isCurrent ? 'bg-brand-peach/20' : 'bg-white/10'}`}>
                                                                        <Smartphone className={`w-5 h-5 ${isCurrent ? 'text-brand-peach' : 'text-slate-400'}`} />
                                                                    </div>
                                                                    <div>
                                                                        <h3 className={`font-bold text-sm transition-colors ${isCurrent ? 'text-brand-peach' : (isConfirming ? 'text-orange-400' : 'text-white')}`}>
                                                                            {isConfirming ? '消費して変更しますか？' : layout.name}
                                                                        </h3>
                                                                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{isConfirming ? 'もう一度タップして確定' : layout.description}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {isCurrent ? (
                                                                        <motion.div
                                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                                            animate={{ scale: 1, opacity: 1 }}
                                                                            className="w-6 h-6 rounded-full flex items-center justify-center border border-brand-peach text-brand-peach"
                                                                        >
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </motion.div>
                                                                    ) : (
                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${isConfirming ? 'bg-orange-400 text-white animate-pulse' : 'text-slate-500 bg-white/5'}`}>
                                                                            🐾 1 pt
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {purchasing === layout.id && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl">
                                                                    <div className="w-5 h-5 border-2 border-brand-peach border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>

                                            {/* Display Mode Section */}
                                            <div className="pt-6 border-t border-white/10">
                                                <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                                                    <Layers className="w-4 h-4" />
                                                    ホーム画面のスタイル
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {[
                                                        { id: 'story', name: 'ストーリー', description: 'シンプルな縦スクロール' },
                                                        { id: 'parallax', name: 'カード', description: '写真を大きく表示' },
                                                    ].map((mode) => {
                                                        const isCurrentMode = settings.homeViewMode === mode.id;
                                                        const isConfirmingMode = confirmChange === mode.id;

                                                        return (
                                                            <motion.button
                                                                key={mode.id}
                                                                disabled={isCurrentMode || (purchasing !== null && purchasing !== mode.id)}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (isCurrentMode || purchasing !== null) return;

                                                                    if (!isConfirmingMode) {
                                                                        setConfirmChange(mode.id);
                                                                        setTimeout(() => setConfirmChange(prev => prev === mode.id ? null : prev), 3000);
                                                                        return;
                                                                    }

                                                                    if (stats.householdTotal < 1) {
                                                                        toast.error('ポイントが足りません (🐾 1 pt 必要です)');
                                                                        return;
                                                                    }

                                                                    setPurchasing(mode.id);
                                                                    setConfirmChange(null);
                                                                    try {
                                                                        const success = await consumeFootprints('style_change', 1);
                                                                        if (success) {
                                                                            setSettings(s => ({ ...s, homeViewMode: mode.id as any }));
                                                                            toast.success('スタイルを変更しました');
                                                                        } else {
                                                                            toast.error('ポイントの消費に失敗しました');
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        toast.error('システムエラーが発生しました');
                                                                    } finally {
                                                                        setPurchasing(null);
                                                                    }
                                                                }}
                                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left relative ${isCurrentMode
                                                                    ? 'border-brand-peach bg-brand-peach/10'
                                                                    : isConfirmingMode
                                                                        ? 'border-orange-400 bg-orange-400/20'
                                                                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                                                    } ${purchasing === mode.id ? 'opacity-70' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div>
                                                                        <span className={`block text-sm font-bold ${isCurrentMode ? 'text-brand-peach' : (isConfirmingMode ? 'text-orange-400' : 'text-white')}`}>
                                                                            {isConfirmingMode ? '消費して変更しますか？' : mode.name}
                                                                        </span>
                                                                        <span className="block text-xs text-slate-400 mt-0.5">{isConfirmingMode ? 'もう一度タップして確定' : mode.description}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {isCurrentMode ? (
                                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center border border-brand-peach text-brand-peach">
                                                                            <Check className="w-3 h-3" />
                                                                        </div>
                                                                    ) : (
                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${isConfirmingMode ? 'bg-orange-400 text-white animate-pulse' : 'text-slate-500 bg-white/5'}`}>
                                                                            🐾 1 pt
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {purchasing === mode.id && (
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                                                                        <div className="w-4 h-4 border-2 border-brand-peach border-t-transparent rounded-full animate-spin" />
                                                                    </div>
                                                                )}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-center text-slate-500 mt-2">
                                                レイアウトやスタイルはいつでも変更できます
                                            </p>
                                        </div>
                                    ) : activeTab === 'report' ? (
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-brand-peach mb-2 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                レポート機能
                                            </div>
                                            <div className="space-y-2">
                                                {/* 猫選択 */}
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => setShowCatSelector(!showCatSelector)}
                                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-sm"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {selectedCatId ? (
                                                                <>
                                                                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                                                        {cats.find(c => c.id === selectedCatId)?.avatar?.startsWith('http') ? (
                                                                            <img src={cats.find(c => c.id === selectedCatId)?.avatar} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="flex items-center justify-center h-full text-lg">
                                                                                {cats.find(c => c.id === selectedCatId)?.avatar || '🐈'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-white font-medium">{cats.find(c => c.id === selectedCatId)?.name}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400">猫を選択してください</span>
                                                            )}
                                                        </div>
                                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCatSelector ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {showCatSelector && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="pt-2 space-y-1">
                                                                    {cats.map(cat => (
                                                                        <button
                                                                            key={cat.id}
                                                                            onClick={() => {
                                                                                setSelectedCatId(cat.id);
                                                                                setShowCatSelector(false);
                                                                            }}
                                                                            className={`w-full p-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${selectedCatId === cat.id
                                                                                ? 'bg-brand-peach/20 text-brand-peach'
                                                                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                                                                }`}
                                                                        >
                                                                            <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
                                                                                {cat.avatar?.startsWith('http') ? (
                                                                                    <img src={cat.avatar} alt="" className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="flex items-center justify-center h-full text-sm">
                                                                                        {cat.avatar || '🐈'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span>{cat.name}</span>
                                                                            {selectedCatId === cat.id && <Check className="w-4 h-4 ml-auto" />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* 受診用レポート - Active */}
                                                <div className="p-4 rounded-xl bg-white/5 border border-brand-peach/30 shadow-[0_0_10px_rgba(var(--brand-peach-rgb),0.1)]">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-bold text-white text-sm">受診用レポート</h3>
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                                                                    精度向上版
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-0.5">獣医さんに見せる健康レポート</p>
                                                        </div>
                                                        <button
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-brand-peach text-slate-900 hover:bg-brand-peach/90"
                                                            onClick={() => handleReportAction(() => setShowReportConfig(true))}
                                                        >
                                                            発行
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 一週間レポート - Active */}
                                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-white text-sm">一週間レポート</h3>
                                                            <p className="text-xs text-slate-400 mt-0.5">1週間のお世話記録をまとめて共有</p>
                                                        </div>
                                                        <button
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-white/10 text-slate-300 hover:bg-white/20"
                                                            onClick={() => setShowWeeklyReport(true)}
                                                        >
                                                            開く
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 迷子・災害レポート */}
                                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-70">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-white text-sm">迷子・災害レポート</h3>
                                                            <p className="text-xs text-slate-400 mt-0.5">緊急時の捜索用プロフィール</p>
                                                        </div>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-500">
                                                            近日公開
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 預け先レポート */}
                                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-70">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-white text-sm">預け先レポート</h3>
                                                            <p className="text-xs text-slate-400 mt-0.5">ペットホテル・シッター向け情報</p>
                                                        </div>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-500">
                                                            近日公開
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-center text-slate-500 mt-4">
                                                受診レポートは飼い主記録として獣医師に提示できます
                                            </p>
                                        </div>
                                    ) : activeTab === 'goods' ? (
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-brand-peach mb-2 flex items-center gap-2">
                                                <Gift className="w-4 h-4" />
                                                プリント（準備中）
                                            </div>
                                            <div className="space-y-2">
                                                {[
                                                    { name: '写真プリント便', description: 'お気に入りの写真を高品質プリント' },
                                                    { name: 'フォトブック / カレンダー', description: '思い出をカタチに残す' },
                                                ].map((item) => (
                                                    <div
                                                        key={item.name}
                                                        className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-60"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h3 className="font-bold text-white text-sm">{item.name}</h3>
                                                                <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                                                            </div>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-500">
                                                                準備中
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-center text-slate-500 mt-4">
                                                これらの機能は今後のアップデートで追加予定です
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                                                <Sparkles className="w-8 h-8 text-slate-500" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-300 mb-2">
                                                準備中
                                            </h3>
                                            <p className="text-sm text-slate-500 max-w-[200px]">
                                                このカテゴリは現在準備中です。お楽しみに！
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* Report Config Modal */}
                        <ReportConfigModal
                            isOpen={showReportConfig}
                            onClose={() => setShowReportConfig(false)}
                            catName={cats.find(c => c.id === selectedCatId)?.name || ''}
                            onComplete={(data) => {
                                setReportData(data);
                                setShowReportConfig(false);
                                setShowReportView(true);
                            }}
                        />

                        {/* Medical Report View */}
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
                                        cat={cats.find(c => c.id === selectedCatId)!}
                                        config={reportData}
                                        incidents={incidents || []}
                                        medicationLogs={medicationLogs?.filter(l => l.cat_id === selectedCatId)}
                                    />
                                </div>
                            </div>
                        )}

                    </>
                )}
            </AnimatePresence>

            {
                showWeeklyReport && (
                    <WeeklyPageClient
                        onClose={() => setShowWeeklyReport(false)}
                    />
                )
            }
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
