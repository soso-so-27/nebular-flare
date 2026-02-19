"use client";

import React from "react";
import { FileText, Camera, ShieldAlert, Heart, Calendar } from "lucide-react";

interface ThemeTabReportProps {
    onIssueReport: () => void;
    onOpenWeekly: () => void;
}

export const ThemeTabReport = ({
    onIssueReport,
    onOpenWeekly
}: ThemeTabReportProps) => {
    return (
        <div className="space-y-6">
            {/* 1. Medical & Health Section (Primary Purpose) */}
            <div className="space-y-3">
                <div className="text-[10px] font-bold text-[#1c1c1e]/30 uppercase tracking-widest flex items-center gap-2 px-1">
                    <ShieldAlert className="w-3 h-3 text-brand-peach/60" />
                    通院・健康管理
                </div>

                <div className="p-4 rounded-[20px] bg-black/[0.02] border border-[#f0f0f0] hover:bg-black/[0.04] transition-all group relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-peach/10 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-brand-peach" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#1c1c1e] text-base">受診用レポート</h3>
                            <p className="text-[11px] text-[#1c1c1e]/40 line-clamp-1">獣医さんへの説明をスムーズにする健康記録</p>
                        </div>
                        <button
                            className="px-5 py-2 text-sm font-bold rounded-xl transition-all bg-brand-peach text-white shadow-lg shadow-brand-peach/10 hover:shadow-brand-peach/20 active:scale-95 whitespace-nowrap"
                            onClick={onIssueReport}
                        >
                            発行
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Memories Section */}
            <div className="space-y-3">
                <div className="text-[10px] font-bold text-[#1c1c1e]/30 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Heart className="w-3 h-3 text-brand-peach/60" />
                    日々の思い出
                </div>

                <div className="p-4 rounded-[20px] bg-black/[0.02] border border-[#f0f0f0] hover:bg-black/[0.04] transition-all group relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-peach/10 flex items-center justify-center shrink-0">
                            <Camera className="w-6 h-6 text-brand-peach" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#1c1c1e] text-base">一週間アルバム</h3>
                            <p className="text-[11px] text-[#1c1c1e]/40 line-clamp-1">今週撮った写真をお世話記録と一緒に振り返る</p>
                        </div>
                        <button
                            className="px-5 py-2 text-sm font-bold rounded-xl transition-all bg-brand-peach text-white shadow-lg shadow-brand-peach/10 hover:shadow-brand-peach/20 active:scale-95 whitespace-nowrap"
                            onClick={onOpenWeekly}
                        >
                            開く
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Future Concepts Section */}
            <div className="space-y-3">
                <div className="text-[10px] font-bold text-[#1c1c1e]/30 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Calendar className="w-3 h-3 opacity-30" />
                    準備中の機能
                </div>

                <div className="grid grid-cols-1 gap-2">
                    <div className="p-3 rounded-xl bg-black/[0.02] border border-[#f0f0f0] opacity-40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center">
                                <ShieldAlert className="w-4 h-4 text-[#1c1c1e]/30" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#1c1c1e] text-xs">迷子・災害レポート</h3>
                                <p className="text-[9px] text-[#1c1c1e]/30">緊急時の捜索用プロフィール</p>
                            </div>
                        </div>
                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-black/5 text-[#1c1c1e]/30 font-bold">
                            COMING SOON
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/[0.02] border border-[#f0f0f0] opacity-40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center">
                                <Heart className="w-4 h-4 text-[#1c1c1e]/30" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#1c1c1e] text-xs">預け先レポート</h3>
                                <p className="text-[9px] text-[#1c1c1e]/30">ペットホテル・シッター向け情報</p>
                            </div>
                        </div>
                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-black/5 text-[#1c1c1e]/30 font-bold">
                            COMING SOON
                        </span>
                    </div>
                </div>
            </div>

            {/* Medical Disclaimer Footer */}
            <div className="px-4 py-3 rounded-xl bg-brand-peach/5 border border-brand-peach/10 mt-4">
                <p className="text-[10px] text-center text-brand-peach/70 leading-relaxed font-medium">
                    受診レポートは飼い主さんの大切な記録として<br />
                    獣医師に提示することができます
                </p>
            </div>
        </div>
    );
};
