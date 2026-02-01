"use client";

import React from "react";
import { Cat } from "@/types";
import { getFullImageUrl, cn } from "@/lib/utils";
import { Camera, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface DekigotoCatBoxProps {
    cats: Cat[];
    weeklyPhotos: Record<string, string[]>;
    onAddPhoto: (catId: string) => void;
}

export const DekigotoCatBox = ({ cats, weeklyPhotos, onAddPhoto }: DekigotoCatBoxProps) => {
    return (
        <div className="w-full shrink-0">
            <div className="px-6 flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Weekly Photos</h3>
                <span className="text-[10px] text-white/20 font-bold">今週の記録</span>
            </div>

            <div className="flex gap-4 px-6 overflow-x-auto no-scrollbar pb-4 snap-x">
                {cats?.map((cat) => {
                    const photos = weeklyPhotos?.[cat.id] || [];
                    const maxPhotos = 8;
                    const displayPhotos = Array.from({ length: maxPhotos }, (_, i) => photos[i] || null);

                    return (
                        <div
                            key={cat.id}
                            className="w-[280px] shrink-0 snap-center bg-white/[0.03] rounded-[24px] p-4 border border-white/[0.05] shadow-xl flex flex-col gap-3"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-peach shadow-[0_0_8px_rgba(255,160,122,0.8)]" />
                                    <span className="text-[12px] font-black text-white">{cat.name}</span>
                                </div>
                                <div className="text-[10px] font-black tracking-tight">
                                    <span className="text-brand-peach">{photos.length}</span>
                                    <span className="text-white/20">/{maxPhotos}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                                {displayPhotos.map((url, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "aspect-square rounded-[10px] overflow-hidden relative",
                                            url ? "bg-slate-800" : "bg-white/[0.02] border border-dashed border-white/5"
                                        )}
                                    >
                                        {url ? (
                                            <img
                                                src={getFullImageUrl(url)}
                                                className="w-full h-full object-cover opacity-80"
                                                alt=""
                                            />
                                        ) : (
                                            <button
                                                onClick={() => onAddPhoto(cat.id)}
                                                className="absolute inset-0 flex items-center justify-center"
                                            >
                                                <Plus className="w-3 h-3 text-white/5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
