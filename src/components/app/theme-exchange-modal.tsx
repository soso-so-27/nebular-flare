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

const LAYOUT_OPTIONS: { id: LayoutType; name: string; description: string; version: 'v2' }[] = [
    // Optimized (v2 - Neo Components)
    { id: 'v2-classic', name: 'スタンダード', description: '3アクションのシンプル設計。', version: 'v2' },
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
    const { stats, refreshStats } = useFootprintContext();
    const { settings, setSettings } = useAppState();

    const isIsland = settings.layoutType === 'v2-island';

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

    const sheetVariants = {
        hidden: { y: "110%", opacity: 0, scale: 0.95 },
        visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
        exit: { y: "110%", opacity: 0, scale: 0.95, transition: { type: "spring" as const, damping: 25, stiffness: 300 } }
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
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E8B4A0]/20 ring-1 ring-[#E8B4A0]/30 shadow-inner">
                                        <Sparkles className="w-5 h-5 text-[#E8B4A0]" />
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
                                            ? 'text-[#E8B4A0]'
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
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8B4A0]"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [&::-webkit-scrollbar]:hidden">
                                {activeTab === 'theme' ? (
                                    // Theme tab content
                                    loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="w-8 h-8 border-2 border-t-transparent border-[#E8B4A0] rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        themes.map((theme) => (
                                            <motion.button
                                                key={theme.id}
                                                onClick={() => isUnlocked(theme.id) && !isActive(theme.id) && handleApplyTheme(theme)}
                                                className={`w-full relative p-4 rounded-2xl border transition-all text-left ${isActive(theme.id)
                                                    ? 'border-[#B8A6D9] bg-[#B8A6D9]/10'
                                                    : isUnlocked(theme.id)
                                                        ? 'border-white/10 hover:border-white/20 bg-white/5'
                                                        : 'border-white/5 bg-black/20 cursor-not-allowed opacity-50'
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
                                                                    className="w-12 h-12 rounded-xl shadow-inner flex items-center justify-center ring-1 ring-white/10 text-white"
                                                                    style={{
                                                                        background: visuals.gradient
                                                                    }}
                                                                >
                                                                    <Icon className="w-6 h-6 drop-shadow-sm" />
                                                                </div>
                                                            );
                                                        })()}
                                                        <div>
                                                            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
                                                                {theme.name}
                                                                {isActive(theme.id) && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full text-white bg-[#B8A6D9]">
                                                                        使用中
                                                                    </span>
                                                                )}
                                                                {!isUnlocked(theme.id) && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                                                                        ロック
                                                                    </span>
                                                                )}
                                                            </h3>
                                                            <p className="text-xs sm:text-sm text-slate-400 line-clamp-1">{theme.description}</p>
                                                        </div>
                                                    </div>

                                                    {/* Status Indicator */}
                                                    {isUnlocked(theme.id) ? (
                                                        isActive(theme.id) && (
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#B8A6D9]">
                                                                <Check className="w-4 h-4 text-white" />
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5">
                                                            <Lock className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.button>
                                        ))
                                    )
                                ) : activeTab === 'layout' ? (
                                    <div className="space-y-6">
                                        {/* Layout Options */}
                                        <div className="space-y-3">
                                            <div className="text-xs font-bold text-[#E8B4A0] mb-1 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                レイアウト選択
                                            </div>
                                            {LAYOUT_OPTIONS.map((layout) => (
                                                <motion.button
                                                    key={layout.id}
                                                    onClick={() => setSettings(s => ({ ...s, layoutType: layout.id }))}
                                                    className={`w-full p-4 rounded-2xl border transition-all text-left group ${settings.layoutType === layout.id
                                                        ? 'border-[#E8B4A0] bg-[#E8B4A0]/10 shadow-[0_0_15px_rgba(232,180,160,0.1)]'
                                                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                                        }`}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${settings.layoutType === layout.id ? 'bg-[#E8B4A0]/20' : 'bg-white/10'}`}>
                                                                <Smartphone className={`w-5 h-5 ${settings.layoutType === layout.id ? 'text-[#E8B4A0]' : 'text-slate-400'}`} />
                                                            </div>
                                                            <div>
                                                                <h3 className={`font-bold text-sm transition-colors ${settings.layoutType === layout.id ? 'text-[#E8B4A0]' : 'text-white'}`}>
                                                                    {layout.name}
                                                                </h3>
                                                                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{layout.description}</p>
                                                            </div>
                                                        </div>
                                                        {settings.layoutType === layout.id && (
                                                            <motion.div
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                className="w-6 h-6 rounded-full flex items-center justify-center border border-[#E8B4A0] text-[#E8B4A0]"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>

                                        {/* Display Mode Section */}
                                        <div className="pt-6 border-t border-white/10">
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
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${settings.homeViewMode === mode.id
                                                            ? 'border-[#B8A6D9] bg-[#B8A6D9]/10 text-[#B8A6D9]'
                                                            : 'border-white/10 bg-white/5 text-slate-500 hover:border-white/20 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.homeViewMode === mode.id ? 'bg-[#B8A6D9] text-white' : 'bg-white/10 text-slate-400'}`}>
                                                            {mode.icon}
                                                        </div>
                                                        <span className="text-[10px] font-bold">{mode.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-center text-slate-500 mt-2">
                                            レイアウトやスタイルはいつでも変更できます
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
                </>
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

// Helper for theme visuals

