"use client";

import React from "react";
import { useAppState } from "@/store/app-store";
import { Cat } from "lucide-react";
import { cn } from "@/lib/utils";

export function CatProfileCard() {
    const { cats, activeCatId, setActiveCatId } = useAppState();
    const activeCat = cats.find(c => c.id === activeCatId) || cats[0];

    if (!activeCat) return null;

    return (
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
                            >
                                <span className="text-base">{cat.avatar || "🐈"}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Profile Content */}
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Cat Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 flex items-center justify-center text-3xl shadow-inner">
                        {activeCat.avatar || "🐈"}
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
                                        ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                                        : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
                                )}>
                                    {activeCat.sex === "オス" ? "♂" : "♀"} {activeCat.sex}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
