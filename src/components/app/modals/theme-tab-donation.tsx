"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export const ThemeTabDonation = () => {
    return (
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
    );
};
