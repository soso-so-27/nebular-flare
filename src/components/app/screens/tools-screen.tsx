"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    FileText,
    TrendingUp,
    Package,
    History,
    Settings,
    ChevronRight,
    Cat
} from "lucide-react";
import { triggerFeedback } from "@/lib/haptics";

interface ToolsScreenProps {
    onOpenReport: () => void;
    onOpenTrends: () => void;
    onOpenInventory: () => void;
    onOpenSitter: () => void;
    onOpenSettings: () => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
    onOpenReport,
    onOpenTrends,
    onOpenInventory,
    onOpenSitter,
    onOpenSettings
}) => {
    const tools = [
        {
            title: "レポート作成",
            desc: "獣医さんへの説明用レポートを作成",
            icon: FileText,
            onClick: onOpenReport,
            color: "bg-blue-50 text-blue-600"
        },
        {
            title: "健康推移",
            desc: "体重や体調のトレンドを確認",
            icon: TrendingUp,
            onClick: onOpenTrends,
            color: "bg-green-50 text-green-600"
        },
        {
            title: "在庫管理",
            desc: "フードや消耗品の残量を管理",
            icon: Package,
            onClick: onOpenInventory,
            color: "bg-amber-50 text-amber-600"
        },
        {
            title: "引継ぎシート",
            desc: "シッターさんへの指示書を作成",
            icon: History,
            onClick: onOpenSitter,
            color: "bg-purple-50 text-purple-600"
        },
        {
            title: "設定",
            desc: "アプリや通知の設定を変更",
            icon: Settings,
            onClick: onOpenSettings,
            color: "bg-slate-50 text-slate-600"
        }
    ];

    return (
        <div className="h-full bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl overflow-y-auto px-6 pt-16 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
            <div className="max-w-md mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">ツール</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">毎日のお世話をサポートする機能</p>
                </header>

                <div className="grid gap-4">
                    {tools.map((tool, idx) => {
                        const Icon = tool.icon;
                        return (
                            <motion.button
                                key={tool.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => {
                                    triggerFeedback('light');
                                    tool.onClick();
                                }}
                                className="w-full flex items-center gap-4 p-5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-[24px] border border-white/20 shadow-sm active:scale-[0.98] transition-all text-left"
                            >
                                <div className={`w-12 h-12 rounded-2xl ${tool.color} flex items-center justify-center`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white">{tool.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{tool.desc}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            </motion.button>
                        );
                    })}
                </div>

                <div className="mt-8 p-6 bg-brand-peach/5 rounded-[32px] border border-brand-peach/10 backdrop-blur-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-peach/10 flex items-center justify-center">
                        <Cat className="w-6 h-6 text-brand-peach" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-brand-peach/60 uppercase tracking-tight">Quick Status</div>
                        <div className="text-sm font-bold text-slate-700">すべての猫ちゃんが元気です</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
