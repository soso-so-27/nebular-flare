"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Sparkles, Palette, Gift, ShoppingBag, Heart, Layout, Sun, Moon, TreePine, Flower2, Smartphone, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useFootprintContext } from "@/providers/footprint-provider";
import { useAppState } from "@/store/app-store";
import { toast } from "sonner";
import type { LayoutType } from "@/types";

type TabType = 'layout' | 'theme' | 'goods' | 'supplies' | 'donation';

const TABS: { id: TabType; label: string; icon: React.ReactNode; ready: boolean }[] = [
    { id: 'layout', label: 'レイアウト', icon: <Layout className="w-3.5 h-3.5" />, ready: true },
    { id: 'theme', label: 'テーマ', icon: <Palette className="w-3.5 h-3.5" />, ready: false },
    { id: 'goods', label: '猫グッズ', icon: <Gift className="w-3.5 h-3.5" />, ready: false },
    { id: 'supplies', label: '猫用品', icon: <ShoppingBag className="w-3.5 h-3.5" />, ready: false },
    { id: 'donation', label: '寄付', icon: <Heart className="w-3.5 h-3.5" />, ready: false },
];

const LAYOUT_OPTIONS: { id: LayoutType; name: string; description: string; version: 'legacy' | 'v1' | 'v2' }[] = [
    // Legacy Layouts (Original)
    { id: 'classic', name: 'スタンダード (Legacy)', description: '拡張されたリングメニュー。', version: 'legacy' },
    { id: 'island', name: 'アイランド (Legacy)', description: '5アクションのドック。', version: 'legacy' },
    { id: 'bottom-nav', name: 'ボトム・ナビ (Legacy)', description: '5アクションのボトムバー。', version: 'legacy' },
    // Optimized (v2 - Neo Components)
    { id: 'v2-classic', name: 'スタンダード (v2)', description: '3アクションのシンプル設計。', version: 'v2' },
    { id: 'v2-island', name: 'アイランド (v2)', description: '3アクションのシンプル設計。', version: 'v2' },
    { id: 'v2-bottom', name: 'ボトム・ナビ (v2)', description: '3アクションのシンプル設計。', version: 'v2' },
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
    const { stats, refreshStats } = useFootprintContext();
    const { settings, setSettings } = useAppState();

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            loadThemes();
        }
    }, [isOpen]);

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

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="w-full max-w-lg bg-[#FAF9F7]/85 dark:bg-[#1E1E23]/85 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-t-3xl shadow-2xl min-h-[50vh] max-h-[85vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10 dark:border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 dark:bg-white/5 shadow-inner">
                                    <Sparkles className="w-5 h-5 text-[color:var(--peach)]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">足あと交換所</h2>
                                    <p className="text-sm font-medium text-slate-400">🐾 {stats.householdTotal} pt</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Tab Bar */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === tab.id
                                        ? 'text-[color:var(--peach)]'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
                                            className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--peach)' }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(85vh-140px)]">
                            {activeTab === 'theme' ? (
                                // Theme tab content
                                loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--peach)', borderTopColor: 'transparent' }} />
                                    </div>
                                ) : (
                                    themes.map((theme) => (
                                        <motion.button
                                            key={theme.id}
                                            onClick={() => isUnlocked(theme.id) && !isActive(theme.id) && handleApplyTheme(theme)}
                                            className={`w-full relative p-4 rounded-2xl border-2 transition-all text-left ${isActive(theme.id)
                                                ? 'border-[color:var(--sage)] bg-[color:var(--sage)]/5'
                                                : isUnlocked(theme.id)
                                                    ? 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-70'
                                                }`}
                                            whileTap={isUnlocked(theme.id) ? { scale: 0.98 } : {}}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {/* Color Preview */}
                                                    {(() => {
                                                        const visuals = getThemeVisuals(theme);
                                                        const Icon = visuals.icon;
                                                        return (
                                                            <div
                                                                className="w-12 h-12 rounded-xl shadow-inner flex items-center justify-center ring-1 ring-black/5 text-white"
                                                                style={{
                                                                    background: visuals.gradient
                                                                }}
                                                            >
                                                                <Icon className="w-6 h-6 drop-shadow-sm" />
                                                            </div>
                                                        );
                                                    })()}
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                                                            {theme.name}
                                                            {isActive(theme.id) && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--sage)' }}>
                                                                    使用中
                                                                </span>
                                                            )}
                                                            {!isUnlocked(theme.id) && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500">
                                                                    ロック
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <p className="text-xs sm:text-sm text-slate-500 line-clamp-1">{theme.description}</p>
                                                    </div>
                                                </div>

                                                {/* Status Indicator */}
                                                {isUnlocked(theme.id) ? (
                                                    isActive(theme.id) && (
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--sage)' }}>
                                                            <Check className="w-5 h-5 text-white" />
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                                                        <Lock className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.button>
                                    ))
                                )
                            ) : activeTab === 'layout' ? (
                                <div className="space-y-6">
                                    {/* Layout Options */}
                                    {/* Layout Options */}
                                    <div className="space-y-8">

                                        {/* v1 Section */}
                                        <div className="space-y-3">
                                            <div className="text-xs font-bold text-[color:var(--sage)] mb-1 flex items-center gap-2">
                                                <Layout className="w-4 h-4" />
                                                標準 (Standard v1)
                                            </div>
                                            {LAYOUT_OPTIONS.filter(l => l.version === 'legacy').map((layout) => (
                                                <motion.button
                                                    key={layout.id}
                                                    onClick={() => setSettings(s => ({ ...s, layoutType: layout.id }))}
                                                    className={`w-full p-4 rounded-2xl border transition-all text-left ${settings.layoutType === layout.id
                                                        ? 'border-[color:var(--sage)] bg-[color:var(--sage)]/10 shadow-[0_0_15px_rgba(124,170,142,0.15)]'
                                                        : 'border-white/40 dark:border-white/5 bg-white/20 dark:bg-white/5 hover:border-white/60'
                                                        }`}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${settings.layoutType === layout.id ? 'bg-[color:var(--sage)]/20' : 'bg-white/40 dark:bg-white/5'}`}>
                                                                {layout.id.includes('bottom') ? <Layers className="w-5 h-5 text-slate-400" /> : <Smartphone className="w-5 h-5 text-slate-400" />}
                                                            </div>
                                                            <div>
                                                                <h3 className={`font-bold text-sm transition-colors ${settings.layoutType === layout.id ? 'text-[color:var(--sage)]' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                    {layout.name}
                                                                </h3>
                                                                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{layout.description}</p>
                                                            </div>
                                                        </div>
                                                        {settings.layoutType === layout.id && (
                                                            <motion.div
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                className="w-6 h-6 rounded-full flex items-center justify-center border border-[color:var(--sage)] text-[color:var(--sage)]"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>

                                        {/* v2 Section */}
                                        <div className="space-y-3">
                                            <div className="text-xs font-bold text-[color:var(--peach)] mb-1 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                最適化 (Optimized v2)
                                            </div>
                                            {LAYOUT_OPTIONS.filter(l => l.version === 'v2').map((layout) => (
                                                <motion.button
                                                    key={layout.id}
                                                    onClick={() => setSettings(s => ({ ...s, layoutType: layout.id }))}
                                                    className={`w-full p-4 rounded-2xl border transition-all text-left ${settings.layoutType === layout.id
                                                        ? 'border-[color:var(--peach)] bg-[color:var(--peach)]/10 shadow-[0_0_15px_rgba(232,180,160,0.15)]'
                                                        : 'border-white/40 dark:border-white/5 bg-white/20 dark:bg-white/5 hover:border-white/60'
                                                        }`}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${settings.layoutType === layout.id ? 'bg-[color:var(--peach)]/20' : 'bg-white/40 dark:bg-white/5'}`}>
                                                                {layout.id.includes('bottom') ? <Layers className="w-5 h-5 text-slate-400" /> : <Smartphone className="w-5 h-5 text-slate-400" />}
                                                            </div>
                                                            <div>
                                                                <h3 className={`font-bold text-sm transition-colors ${settings.layoutType === layout.id ? 'text-[color:var(--peach)]' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                    {layout.name}
                                                                </h3>
                                                                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{layout.description}</p>
                                                            </div>
                                                        </div>
                                                        {settings.layoutType === layout.id && (
                                                            <motion.div
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                className="w-6 h-6 rounded-full flex items-center justify-center border border-[color:var(--peach)] text-[color:var(--peach)]"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Display Mode Section */}
                                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                                            <Layers className="w-4 h-4" />
                                            ホーム画面のスタイル
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'story', name: 'ストーリー', icon: <Smartphone className="w-4 h-4" /> },
                                                { id: 'parallax', name: 'カード', icon: <Layers className="w-4 h-4" /> },
                                                { id: 'icon', name: 'アイコン', icon: <Sun className="w-4 h-4" /> },
                                            ].map((mode) => (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => setSettings(s => ({ ...s, homeViewMode: mode.id as any }))}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${settings.homeViewMode === mode.id
                                                        ? 'border-[color:var(--sage)] bg-[color:var(--sage)]/5 text-[color:var(--sage)]'
                                                        : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.homeViewMode === mode.id ? 'bg-[color:var(--sage)] text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                        {mode.icon}
                                                    </div>
                                                    <span className="text-[10px] font-bold">{mode.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-center text-slate-400 mt-2">
                                        レイアウトやスタイルはいつでも変更できます
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <Sparkles className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
                                        準備中
                                    </h3>
                                    <p className="text-sm text-slate-500 max-w-[200px]">
                                        このカテゴリは現在準備中です。お楽しみに！
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div >
            )
            }
        </AnimatePresence >
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
