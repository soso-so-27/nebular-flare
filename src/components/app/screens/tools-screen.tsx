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
    Cat,
    Sparkles,
    ArrowLeftRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerFeedback } from "@/lib/haptics";

interface ToolsScreenProps {
    onOpenReport: () => void;
    onOpenTrends: () => void;
    onOpenInventory: () => void;
    onOpenSitter: () => void;
    onOpenZukanDiscover: () => void;
    onOpenThemeExchange: () => void;
}

export function ToolsScreen({
    onOpenReport,
    onOpenTrends,
    onOpenInventory,
    onOpenSitter,
    onOpenZukanDiscover,
    onOpenThemeExchange
}: ToolsScreenProps) {
    const sections = [
        {
            title: "📋 記録をまとめる・出力する",
            tools: [
                {
                    title: "レポート作成",
                    desc: "獣医さんへの説明用レポートを作成",
                    icon: FileText,
                    onClick: onOpenReport,
                },
                {
                    title: "引継ぎシート",
                    desc: "シッターさんへの指示書を作成",
                    icon: History,
                    onClick: onOpenSitter,
                }
            ]
        },
        {
            title: "📊 振り返る・お楽しみ",
            tools: [
                {
                    title: "みつける",
                    desc: "AIが選んだ今日の猫ちゃんをチェック",
                    icon: Sparkles,
                    onClick: onOpenZukanDiscover,
                    highlight: true
                },
                {
                    title: "足あと交換所",
                    desc: "貯まったポイントでテーマや寄付に交換",
                    icon: ArrowLeftRight,
                    onClick: onOpenThemeExchange,
                },
                {
                    title: "健康推移",
                    desc: "体重や体調のトレンドを確認",
                    icon: TrendingUp,
                    onClick: onOpenTrends,
                }
            ]
        },
        {
            title: "📦 管理する",
            tools: [
                {
                    title: "在庫管理",
                    desc: "フードや消耗品の残量を管理",
                    icon: Package,
                    onClick: onOpenInventory,
                }
            ]
        }
    ];

    return (
        <div className="h-full bg-[#FAF9F7] dark:bg-[#1c1c1e] overflow-y-auto px-6 pt-16 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
            <div className="max-w-md mx-auto">
                <header className="mb-10 text-center">
                    <h1 className="text-[22px] font-bold text-[#4E342E] dark:text-[#E8E6E1] tracking-wider">ツール</h1>
                    <p className="text-[13px] text-[#A69C94] dark:text-[#8E8B85] mt-2 font-medium tracking-wide">毎日のお世話をより楽しく、便利に</p>
                </header>

                <div className="space-y-10">
                    {sections.map((section) => (
                        <div key={section.title}>
                            <h2 className="text-[13px] font-bold text-[#A69C94] dark:text-[#8E8B85] mb-4 ml-2 tracking-wider opacity-80 uppercase italic">{section.title}</h2>
                            <div className="grid gap-[12px]">
                                {section.tools.map((tool, idx) => {
                                    const Icon = tool.icon;
                                    return (
                                        <motion.button
                                            key={tool.title}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }}
                                            onClick={() => {
                                                triggerFeedback('light');
                                                tool.onClick();
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-5 px-6 py-[18px] rounded-[28px] border active:scale-[0.98] transition-all text-left group",
                                                tool.highlight
                                                    ? "bg-white dark:bg-[#2A2928] border-brand-peach/20 shadow-[0_4px_20px_rgba(255,149,0,0.06)]"
                                                    : "bg-white dark:bg-[#2A2928] border-[#F2EFEA] dark:border-white/5 shadow-[0_2px_12px_rgba(78,52,46,0.02)]"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                                tool.highlight
                                                    ? "bg-brand-peach/10 text-brand-peach"
                                                    : "bg-[#FAF9F7] dark:bg-white/5 text-[#8C827A] dark:text-[#C4C0B6]"
                                            )}>
                                                <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[15px] text-[#4E342E] dark:text-[#E8E6E1]">{tool.title}</h3>
                                                    {tool.highlight && (
                                                        <span className="text-[9px] font-black bg-brand-peach text-white px-1.5 py-0.5 rounded-full tracking-tighter uppercase">AI Pick</span>
                                                    )}
                                                </div>
                                                <p className="text-[12px] text-[#B0A8A0] dark:text-[#8E8B85] font-medium leading-relaxed truncate">{tool.desc}</p>
                                            </div>
                                            <ChevronRight className="w-[18px] h-[18px] text-[#D4CFC9] dark:text-[#6E6B65] shrink-0 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 flex flex-col items-center justify-center gap-3 opacity-80 pb-8">
                    <Cat className="w-6 h-6 text-[#D4CFC9] dark:text-[#6E6B65]" strokeWidth={1.2} />
                    <div className="text-center">
                        <div className="text-[10px] font-medium text-[#B0A8A0] dark:text-[#8E8B85] tracking-[0.15em] mb-1">QUICK STATUS</div>
                        <div className="text-[13px] font-medium text-[#8C827A] dark:text-[#B5B2A9]">すべての猫ちゃんが元気です</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

