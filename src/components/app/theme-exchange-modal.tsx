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
    { id: 'layout', label: 'レイアウト', icon: <Layout className="w-4 h-4" />, ready: true },
    { id: 'theme', label: 'テーマ', icon: <Palette className="w-4 h-4" />, ready: false },
    { id: 'goods', label: '猫グッズ', icon: <Gift className="w-4 h-4" />, ready: false },
    { id: 'supplies', label: '猫用品', icon: <ShoppingBag className="w-4 h-4" />, ready: false },
    { id: 'donation', label: '寄付', icon: <Heart className="w-4 h-4" />, ready: false },
];

const LAYOUT_OPTIONS: { id: LayoutType; name: string; description: string }[] = [
    { id: 'classic', name: 'スタンダード', description: '左上にお世話進捗、右上に足あとバッジ、右下にボタン' },
    { id: 'island', name: 'スマート', description: '上部中央にステータス表示、下部にボタン' },
    { id: 'bottom-nav', name: 'ボトム', description: '左上にお世話進捗、下部にナビゲーションバー' },
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
                        <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--peach)' }}>
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">足あと交換所</h2>
                                    <p className="text-sm text-slate-500">🐾 {stats.householdTotal} pt</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
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
                                    {tab.label}
                                    {!tab.ready && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 ml-1">
                                            準備中
                                        </span>
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
                                // Layout tab content
                                <div className="space-y-3">
                                    {LAYOUT_OPTIONS.map((layout) => (
                                        <motion.button
                                            key={layout.id}
                                            onClick={() => setSettings(s => ({ ...s, layoutType: layout.id }))}
                                            className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${settings.layoutType === layout.id
                                                ? 'border-[color:var(--sage)] bg-[color:var(--sage)]/5'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                        <Layout className="w-6 h-6 text-slate-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                            {layout.name}
                                                            {settings.layoutType === layout.id && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--sage)' }}>
                                                                    使用中
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <p className="text-sm text-slate-500">{layout.description}</p>
                                                    </div>
                                                </div>
                                                {settings.layoutType === layout.id && (
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--sage)' }}>
                                                        <Check className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.button>
                                    ))}
                                    <p className="text-xs text-center text-slate-400 mt-4">
                                        レイアウトはいつでも変更できます
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
                </motion.div>
            )}
        </AnimatePresence>
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
