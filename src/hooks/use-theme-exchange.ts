"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useFootprintContext } from "@/providers/footprint-provider";
import { useCatContext, useSettingsContext, useMedicationContext } from "@/store/app-store";
import { toast } from "sonner";
import { LayoutType } from "@/types";

export interface ThemeItem {
    id: string;
    name: string;
    description: string;
    type: string;
    cost: number;
    css_variables: Record<string, string>;
    is_default: boolean;
    sort_order: number;
}

export function useThemeExchange(isOpen: boolean) {
    const [themes, setThemes] = useState<ThemeItem[]>([]);
    const [unlockedThemeIds, setUnlockedThemeIds] = useState<Set<string>>(new Set());
    const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [confirmChange, setConfirmChange] = useState<string | null>(null);

    const { stats, refreshStats, consumeFootprints } = useFootprintContext();
    const { settings, setSettings } = useSettingsContext();
    const { cats } = useCatContext();
    const { medicationLogs } = useMedicationContext();
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            loadThemes();
            refreshStats();
        }
    }, [isOpen]);

    const loadThemes = async () => {
        setLoading(true);
        try {
            const { data: themesData, error: themesError } = await (supabase
                .from('theme_items' as any)
                .select('*')
                .order('sort_order', { ascending: true }) as any);

            if (themesError) throw themesError;
            setThemes(themesData || []);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: unlockedData } = await (supabase
                    .from('user_unlocked_themes' as any)
                    .select('theme_id')
                    .eq('user_id', user.id) as any);

                const unlockedIds = new Set<string>((unlockedData || []).map((u: any) => u.theme_id as string));
                themesData?.forEach((t: ThemeItem) => {
                    if (t.is_default) unlockedIds.add(t.id);
                });
                setUnlockedThemeIds(unlockedIds);

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

    const changeLayout = async (layoutId: LayoutType) => {
        if (stats.householdTotal < 1) {
            toast.error('ポイントが足りません (🐾 1 pt 必要です)');
            return;
        }

        setPurchasing(layoutId);
        setConfirmChange(null);
        try {
            const success = await consumeFootprints('layout_change', 1);
            if (success) {
                const tiedButtonMode = layoutId === 'v2-classic' ? 'unified' : 'separated';
                setSettings((s: any) => ({
                    ...s,
                    layoutType: layoutId,
                    homeButtonMode: tiedButtonMode
                }));
                toast.success('レイアウトを変更しました');
            } else {
                toast.error('ポイントの消費に失敗しました');
            }
        } catch (err) {
            console.error(err);
            toast.error('システムエラーが発生しました');
        } finally {
            setPurchasing(null);
        }
    };

    const changeViewMode = async (modeId: string) => {
        if (stats.householdTotal < 1) {
            toast.error('ポイントが足りません (🐾 1 pt 必要です)');
            return;
        }

        setPurchasing(modeId);
        setConfirmChange(null);
        try {
            const success = await consumeFootprints('style_change', 1);
            if (success) {
                setSettings((s: any) => ({ ...s, homeViewMode: modeId as any }));
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
    };

    return {
        themes, unlockedThemeIds, activeThemeId, loading, purchasing, confirmChange, setConfirmChange,
        stats, refreshStats, consumeFootprints,
        settings, cats, medicationLogs,
        handlePurchase, handleApplyTheme, changeLayout, changeViewMode
    };
}
