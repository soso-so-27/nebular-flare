"use client";

import React from "react";
import { motion } from "framer-motion";

import type { Cat } from "@/types";
import { format } from "date-fns";
import { Check } from "lucide-react";

interface StoryCoverViewProps {
    cat: Cat | null;
    weekKey: string;
    photos: { url: string; date: string }[];
    layout?: string;
    forExport?: boolean;
    aiCaption?: string;
    dateRange?: string; // Vol. 8 specific
    ambientColor?: string; // Vol. 10: Dynamic Color Sync
}

export const StoryCoverView = ({
    cat,
    weekKey,
    photos,
    forExport = false,
    aiCaption,
    dateRange,
    ambientColor = "#F5E6D3" // Default peach highlight
}: StoryCoverViewProps) => {
    // --- DESIGN CONSTANTS (Synced with Home Vol. 6) ---
    const COFFEE_BROWN = "#4E342E";
    const PEACH_ACCENT = "#C89386";
    const PAPER_WHITE = "#FEFDFB";
    // 1. iPhone 16 Pro Frame Design System
    const bezelWidth = 6;
    const dynamicIslandWidth = 120;
    const dynamicIslandHeight = 36;

    const WeekWatermark = () => (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center items-center pointer-events-none z-0 overflow-hidden">
            <span
                className="text-[320px] font-black opacity-[0.06] select-none tracking-tighter"
                style={{ color: COFFEE_BROWN }}
            >
                {weekKey.split('-').pop() || "00"}
            </span>
        </div>
    );

    const Header = () => (
        <div className="pt-24 pb-12 px-12 text-center relative z-20">
            <span className="text-[11px] font-black text-[#4E342E]/30 tracking-[0.4em] uppercase block mb-4 font-sans">
                {cat?.name || "CAT"} JOURNAL
            </span>
            <div className="relative inline-block">
                <h1 className="text-[56px] font-black text-[#4E342E] leading-none mb-8 relative z-10 tracking-tight">
                    今週のアルバム
                </h1>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-brand-peach/30 rounded-full" />
            </div>
            <p className="text-[22px] font-black text-[#4E342E]/40 tracking-[0.2em] uppercase mt-4 font-sans">
                {dateRange || "FEB 03 – 09, 2026"}
            </p>
        </div>
    );

    const PhotoGrid = () => (
        <div className="flex-1 px-8 pt-4 pb-6 flex flex-col relative z-20 min-h-0">
            <div className="grid grid-cols-6 grid-rows-4 gap-4 h-full">
                {/* Hero */}
                <div className="col-span-4 row-span-3 rounded-[38px] overflow-hidden bg-white/50 border border-white/40 shadow-[0_30px_80px_rgba(78,52,46,0.15)] relative">
                    {photos[0] ? (
                        <img src={photos[0].url} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#4E342E]/[0.02]" />
                    )}
                    <div className="absolute top-6 left-8 px-5 py-2 bg-brand-peach/90 backdrop-blur-md rounded-full text-[11px] font-black text-white shadow-xl uppercase tracking-[0.2em]">
                        Best Shot
                    </div>
                </div>

                {/* Sides */}
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`side-${i}`} className="col-span-2 row-span-1 rounded-[28px] overflow-hidden bg-white/40 border border-white/20 shadow-sm">
                        {photos[i + 1] ? (
                            <img src={photos[i + 1].url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#4E342E]/[0.01]" />
                        )}
                    </div>
                ))}

                {/* Bottom Row */}
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`bottom-${i}`} className="col-span-2 row-span-1 rounded-[28px] overflow-hidden bg-white/40 border border-white/20 shadow-sm">
                        {photos[i + 4] ? (
                            <img src={photos[i + 4].url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#4E342E]/[0.01]" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const CaptionSection = () => (
        <div className="px-10 pb-20 relative z-30 shrink-0">
            <div className="relative p-12 pt-14 rounded-[56px] bg-white/75 backdrop-blur-[32px] border border-white/60 shadow-[0_60px_140px_rgba(78,52,46,0.18)] overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.4]"
                    style={{ filter: 'url(#paper-noise)' }}
                />
                <div className="absolute top-0 left-0 w-full h-[6px] bg-brand-peach/30" />
                <div className="absolute top-6 right-10 w-12 h-6 bg-brand-peach/15 -rotate-[15deg] border-l border-white/30 pointer-events-none" />

                <div className="flex flex-col gap-6 relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-brand-peach" />
                        <span className="text-[11px] font-black text-[#4E342E]/50 tracking-[0.3em] uppercase font-sans">Weekly Word</span>
                    </div>
                    <p className="text-[34px] font-medium text-[#4E342E] leading-[1.6] tracking-tight break-all font-serif italic selection:bg-brand-peach/20">
                        {aiCaption || "何気ない日常の断片が、かけがえのない宝物だと気づかせてくれた一週間でした。"}
                    </p>
                    <div className="mt-6 pt-6 border-t border-[#4E342E]/10 flex justify-between items-center">
                        <span className="text-[13px] font-black tracking-[0.4em] uppercase text-[#4E342E]/35 font-sans">Journal Signature</span>
                        <div className="flex gap-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="w-2.5 h-2.5 rounded-full border border-[#4E342E]/15" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const DynamicIsland = () => (
        <div
            className="absolute top-12 left-1/2 -translate-x-1/2 bg-black rounded-full z-50 flex items-center justify-between px-6"
            style={{ width: dynamicIslandWidth, height: dynamicIslandHeight }}
        >
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-1 h-1 rounded-full bg-green-400" />
        </div>
    );

    const frameStyle: React.CSSProperties = {
        width: '1080px',
        height: '1920px',
        background: '#FEFDFB', // Museum Paper White
        borderRadius: '164px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 80px 200px rgba(78,52,46,0.12)',
        border: '1px solid #E8E4E1', // Titanium Silk Border
        boxSizing: 'border-box',
        overflow: 'hidden'
    };

    const screenStyle: React.CSSProperties = {
        flex: 1,
        background: `radial-gradient(circle at 80% 20%, ${ambientColor}1A 0%, #FFFFFF 100%), #FEFDFB`,
        borderRadius: '140px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
    };

    return (
        <div style={frameStyle}>
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id='paper-noise'>
                    <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch' />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
                </filter>
            </svg>

            <div style={screenStyle}>
                {/* Texture Layer */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.4] z-[100]"
                    style={{ filter: 'url(#paper-noise)' }}
                />

                <DynamicIsland />
                <WeekWatermark />
                <Header />
                <PhotoGrid />
                <CaptionSection />
            </div>
        </div>
    );
};
