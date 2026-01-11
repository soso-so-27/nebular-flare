"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useFootprintContext } from "@/providers/footprint-provider";
import { toast } from "sonner";

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
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const { stats, refreshStats } = useFootprintContext();

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
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8B4A0] to-[#C08A70] flex items-center justify-center">
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

                        {/* Theme List */}
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(85vh-80px)]">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-[#E8B4A0] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                themes.map((theme) => (
                                    <motion.div
                                        key={theme.id}
                                        className={`relative p-4 rounded-2xl border-2 transition-all ${isActive(theme.id)
                                            ? 'border-[#7CAA8E] bg-[#7CAA8E]/5'
                                            : isUnlocked(theme.id)
                                                ? 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                                            }`}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Color Preview */}
                                                <div
                                                    className="w-12 h-12 rounded-xl shadow-inner flex items-center justify-center ring-1 ring-black/5"
                                                    style={{
                                                        background: theme.css_variables?.['--theme-bg'] || '#FAF9F7'
                                                    }}
                                                >
                                                    <div
                                                        className="w-6 h-6 rounded-full"
                                                        style={{
                                                            background: theme.css_variables?.['--theme-primary'] || '#7CAA8E'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                        {theme.name}
                                                        {isActive(theme.id) && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#7CAA8E] text-white">
                                                                使用中
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">{theme.description}</p>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            {isUnlocked(theme.id) ? (
                                                isActive(theme.id) ? (
                                                    <div className="w-10 h-10 rounded-full bg-[#7CAA8E] flex items-center justify-center">
                                                        <Check className="w-5 h-5 text-white" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleApplyTheme(theme)}
                                                        className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        適用
                                                    </button>
                                                )
                                            ) : (
                                                <button
                                                    onClick={() => handlePurchase(theme)}
                                                    disabled={purchasing === theme.id || stats.householdTotal < theme.cost}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${stats.householdTotal >= theme.cost
                                                        ? 'bg-[#E8B4A0] text-white hover:bg-[#D09B85]'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {purchasing === theme.id ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Lock className="w-4 h-4" />
                                                            {theme.cost} pt
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
