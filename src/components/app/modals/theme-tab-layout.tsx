"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Smartphone, Layers } from "lucide-react";
import { toast } from "sonner";
import { LayoutType } from "@/types";

const LAYOUT_OPTIONS: { id: LayoutType; name: string; description: string; version: 'v2' }[] = [
    { id: 'v2-island', name: 'アイランド', description: '3アクションのシンプル設計。', version: 'v2' },
];

interface ThemeTabLayoutProps {
    settings: any;
    stats: any;
    purchasing: string | null;
    confirmChange: string | null;
    setConfirmChange: (id: string | null) => void;
    changeLayout: (id: LayoutType) => Promise<void>;
    changeViewMode: (id: string) => Promise<void>;
}

export const ThemeTabLayout = ({
    settings,
    stats,
    purchasing,
    confirmChange,
    setConfirmChange,
    changeLayout,
    changeViewMode
}: ThemeTabLayoutProps) => {
    return (
        <div className="space-y-6">
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

                                if (!isConfirming) {
                                    setConfirmChange(layout.id);
                                    setTimeout(() => setConfirmChange(null), 3000);
                                    return;
                                }

                                await changeLayout(layout.id);
                            }}
                            className={`w-full p-4 rounded-2xl border transition-all text-left relative group ${isCurrent
                                ? 'border-brand-peach bg-brand-peach/10 shadow-[0_0_15px_rgba(var(--brand-peach-rgb),0.1)]'
                                : isConfirming
                                    ? 'border-orange-400 bg-orange-400/20'
                                    : 'border-[#f0f0f0] bg-black/[0.02] hover:bg-black/[0.04] hover:border-black/10'
                                } ${purchasing === layout.id ? 'opacity-70' : ''}`}
                            whileTap={!isCurrent ? { scale: 0.98 } : {}}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isCurrent ? 'bg-brand-peach/20' : 'bg-black/5'}`}>
                                        <Smartphone className={`w-5 h-5 ${isCurrent ? 'text-brand-peach' : 'text-[#1c1c1e]/30'}`} />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-sm transition-colors ${isCurrent ? 'text-brand-peach' : (isConfirming ? 'text-orange-400' : 'text-[#1c1c1e]')}`}>
                                            {isConfirming ? '消費して変更しますか？' : layout.name}
                                        </h3>
                                        <p className="text-xs text-[#1c1c1e]/40 leading-relaxed mt-0.5">{isConfirming ? 'もう一度タップして確定' : layout.description}</p>
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
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${isConfirming ? 'bg-orange-400 text-white animate-pulse' : 'text-[#1c1c1e]/40 bg-black/5'}`}>
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

            <div className="pt-6 border-t border-[#f0f0f0]">
                <div className="text-xs font-bold text-[#1c1c1e]/40 mb-3 flex items-center gap-2">
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
                                        setTimeout(() => setConfirmChange(null), 3000);
                                        return;
                                    }

                                    await changeViewMode(mode.id);
                                }}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left relative ${isCurrentMode
                                    ? 'border-brand-peach bg-brand-peach/10'
                                    : isConfirmingMode
                                        ? 'border-orange-400 bg-orange-400/20'
                                        : 'border-[#f0f0f0] bg-black/[0.02] hover:border-black/10 hover:bg-black/[0.04]'
                                    } ${purchasing === mode.id ? 'opacity-70' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div>
                                        <span className={`block text-sm font-bold ${isCurrentMode ? 'text-brand-peach' : (isConfirmingMode ? 'text-orange-400' : 'text-[#1c1c1e]')}`}>
                                            {isConfirmingMode ? '消費して変更しますか？' : mode.name}
                                        </span>
                                        <span className="block text-xs text-[#1c1c1e]/40 mt-0.5">{isConfirmingMode ? 'もう一度タップして確定' : mode.description}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {isCurrentMode ? (
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center border border-brand-peach text-brand-peach">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    ) : (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${isConfirmingMode ? 'bg-orange-400 text-white animate-pulse' : 'text-[#1c1c1e]/40 bg-black/5'}`}>
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

            <p className="text-[10px] text-center text-[#1c1c1e]/30 mt-2">
                レイアウトやスタイルはいつでも変更できます
            </p>
        </div>
    );
};
