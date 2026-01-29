"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { Cat, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CatProfileDetail } from "./cat-profile-detail";

export function CatProfileCard() {
    const { cats, activeCatId, setActiveCatId } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId) || cats[0];
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    if (!activeCat) return null;

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                {/* Cat Switcher (if multiple cats) */}
                {cats.length > 1 && (
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex gap-2">
                            {cats.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCatId(cat.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                        cat.id === activeCatId
                                            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    )}
                                >{(cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/')) ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                    <span className="text-base">{cat.avatar || "🐈"}</span>
                                )}
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Profile Content - Tappable to open detail */}
                <button
                    onClick={() => setIsDetailOpen(true)}
                    className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-start gap-4">
                        {/* Cat Avatar */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 flex items-center justify-center text-3xl shadow-inner overflow-hidden">
                            {(activeCat.avatar?.startsWith('http') || activeCat.avatar?.startsWith('/')) ? (
                                <img src={activeCat.avatar} alt={activeCat.name} className="w-full h-full object-cover" />
                            ) : (
                                activeCat.avatar || "🐈"
                            )}
                        </div>

                        {/* Cat Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                                {activeCat.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {activeCat.age && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {activeCat.age}
                                    </span>
                                )}
                                {activeCat.sex && (
                                    <span className={cn(
                                        "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                                        activeCat.sex === "オス"
                                            ? "bg-brand-sage/10 dark:bg-brand-sage/20 text-brand-sage dark:text-brand-sage"
                                            : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
                                    )}>
                                        {activeCat.sex === "オス" ? "♂" : "♀"} {activeCat.sex}
                                    </span>
                                )}
                                {activeCat.weight && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {activeCat.weight}kg
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                タップして詳細を表示
                            </p>
                        </div>

                        {/* Arrow indicator */}
                        <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 self-center" />
                    </div>
                </button>
            </div>

            {/* Cat Profile Detail Modal */}
            <CatProfileDetail
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                catId={activeCatId}
            />
        </>
    );
}
