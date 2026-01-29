"use client";

import React from "react";
import { motion } from "framer-motion";

import type { Cat, AlbumLayoutType } from "@/types";
import { format } from "date-fns";
import { Cat as CatIcon } from "lucide-react";

interface StoryCoverViewProps {
    cat: Cat;
    weekKey: string;
    layout: AlbumLayoutType;
    photos: { url: string; date: string }[];
}

export function StoryCoverView({ cat, weekKey, layout, photos }: StoryCoverViewProps) {
    // 日付フォーマットロジック
    // photosの日付があればそれを使って "M/d - M/d" を算出
    const dateRangeDisplay = React.useMemo(() => {
        try {
            if (photos.length > 0) {
                const timestamps = photos.map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
                if (timestamps.length > 0) {
                    const minDate = new Date(Math.min(...timestamps));
                    const maxDate = new Date(Math.max(...timestamps));
                    // 同じ日なら "1/22"
                    if (minDate.toDateString() === maxDate.toDateString()) {
                        return format(minDate, "M/d");
                    }
                    // 範囲があるなら "1/22 - 1/28"
                    return `${format(minDate, "M/d")} - ${format(maxDate, "M/d")}`;
                }
            }
        } catch (e) {
            console.error("Date calc error", e);
        }
        // フォールバック: weekKey解析
        const [y, w] = weekKey.split("-");
        const weekNum = parseInt(w?.replace("W", "") || "0");
        return `${y} Week ${weekNum}`;
    }, [photos, weekKey]);


    // 共通のコンテナスタイル（白背景カード）
    // Padding optimized slightly larger for "polaroid" feel
    const cardBaseClass = "w-full aspect-[3/4] bg-[#FBFBFB] rounded-[2rem] overflow-hidden flex flex-col p-7 pt-9 relative text-slate-800 border border-slate-100";

    // 共通ヘッダー
    const Header = () => (
        <div className="flex flex-col items-center mb-5 z-10 shrink-0">
            <h2 className="text-xl font-bold tracking-tight text-[#2D2D2D] mb-1.5">
                今週のアルバム
            </h2>
            <p className="text-[#999] text-[10px] font-bold tracking-widest font-mono">
                {dateRangeDisplay}
            </p>
        </div>
    );

    // 共通フッター（署名 - カード内配置用）
    // Replaced CatIcon with /cat-outline.svg
    const Signature = () => (
        <div className="flex items-center justify-end gap-1.5 opacity-50">
            <span className="text-[9px] font-bold tracking-widest uppercase font-mono text-[#4A4A4A]">
                NyaruHD
            </span>
            <img src="/cat-outline.svg" alt="logo" className="w-3 h-3 text-[#4A4A4A] opacity-80" />
        </div>
    );

    // 空の状態
    if (photos.length === 0) {
        return (
            <div className={cardBaseClass}>
                <Header />
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-bold">
                    NO PHOTOS
                </div>
                <div className="absolute bottom-7 right-7">
                    <Signature />
                </div>
            </div>
        );
    }

    // Layout 1: Hero (Magazine)
    if (layout === "hero3") {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cardBaseClass}
            >
                {/* Texture Overlay (Simple Noise Pattern) */}
                <div
                    className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-multiply"
                    style={{
                        backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAA5OTkAAAAAAAAAAABMTExERERmRmZ7606OAAAACHRSTlMAMwA3Q0aHj45LcOQAAABcSURBVDjLY2AYBaNgFIyCUTAKRsEwBAiJgYkJywQGBiYvEJuBCcQGs4GYDAwgNogNxGZgALHBbCAmAwOIDWIDsRmYQGwwG4jJwABig9hAbAYmEBvMBmIywAAoGhoAAPR5D0OlRsh5AAAAAElFTkSuQmCC")`,
                        backgroundSize: '100px 100px'
                    }}
                />

                <Header />

                <div className="flex-1 flex flex-col min-h-0 z-0 pb-1">
                    {/* Main Photo (Top) */}
                    <div className="flex-[3] rounded-2xl overflow-hidden bg-slate-100 mb-2.5 relative shadow-sm">
                        <img src={photos[0].url} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    </div>

                    {/* Sub Photos (Bottom Row) - 4 Columns Grid */}
                    <div className="h-20 grid grid-cols-4 gap-2.5">
                        {/* Sub 1 */}
                        <div className="rounded-lg overflow-hidden bg-slate-100 relative shadow-sm">
                            {photos[1] && <img src={photos[1].url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
                        </div>
                        {/* Sub 2 */}
                        <div className="rounded-lg overflow-hidden bg-slate-100 relative shadow-sm">
                            {photos[2] && <img src={photos[2].url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
                        </div>
                        {/* Sub 3 */}
                        <div className="rounded-lg overflow-hidden bg-slate-100 relative shadow-sm">
                            {photos[3] && <img src={photos[3].url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
                        </div>

                        {/* 4th Slot: Signature Space */}
                        <div className="rounded-lg flex items-end justify-end p-0.5">
                            <Signature />
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Layout 2: Filmstrip (Cinematic)
    if (layout === "filmstrip") {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cardBaseClass}
            >
                <div
                    className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-multiply"
                    style={{
                        backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAA5OTkAAAAAAAAAAABMTExERERmRmZ7606OAAAACHRSTlMAMwA3Q0aHj45LcOQAAABcSURBVDjLY2AYBaNgFIyCUTAKRsEwBAiJgYkJywQGBiYvEJuBCcQGs4GYDAwgNogNxGZgALHBbCAmAwOIDWIDsRmYQGwwG4jJwABig9hAbAYmEBvMBmIywAAoGhoAAPR5D0OlRsh5AAAAAElFTkSuQmCC")`,
                        backgroundSize: '100px 100px'
                    }}
                />

                <Header />

                <div className="flex-1 flex flex-col min-h-0 z-0 p-2 gap-4 pb-8">
                    {/* Top Row: Two photos (slightly rotated film frames) */}
                    <div className="flex gap-4 h-[45%]">
                        <div className="flex-1 rounded-sm overflow-hidden bg-slate-900 relative shadow-lg transform -rotate-2 border-[6px] border-[#1a1a1a]">
                            <img src={photos[0].url} className="absolute inset-0 w-full h-full object-cover grayscale-[0.2]" alt="" />
                            {/* Film Holes */}
                            <div className="absolute inset-x-0 top-0 h-2 flex justify-between px-1 bg-black/40">
                                {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 bg-white/20 rounded-[0.5px] my-0.5" />)}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-2 flex justify-between px-1 bg-black/40">
                                {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 bg-white/20 rounded-[0.5px] my-0.5" />)}
                            </div>
                        </div>
                        <div className="flex-1 rounded-sm overflow-hidden bg-slate-900 relative shadow-lg transform rotate-1 border-[6px] border-[#1a1a1a]">
                            {photos[1] ? (
                                <img src={photos[1].url} className="absolute inset-0 w-full h-full object-cover grayscale-[0.2]" alt="" />
                            ) : (
                                <img src={photos[0].url} className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] opacity-30" alt="" />
                            )}
                            <div className="absolute inset-x-0 top-0 h-2 flex justify-between px-1 bg-black/40">
                                {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 bg-white/20 rounded-[0.5px] my-0.5" />)}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-2 flex justify-between px-1 bg-black/40">
                                {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 bg-white/20 rounded-[0.5px] my-0.5" />)}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: One large strip photo */}
                    <div className="flex-1 rounded-sm overflow-hidden bg-slate-900 relative shadow-lg border-[8px] border-[#1a1a1a]">
                        {photos[2] ? (
                            <img src={photos[2].url} className="absolute inset-0 w-full h-full object-cover grayscale-[0.1]" alt="" />
                        ) : photos[0] ? (
                            <img src={photos[0].url} className="absolute inset-0 w-full h-full object-cover grayscale-[0.1] opacity-30" alt="" />
                        ) : null}
                        <div className="absolute inset-x-0 top-0 h-3 flex justify-between px-2 bg-black/40">
                            {[...Array(10)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-white/20 rounded-[1px] my-0.5" />)}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-3 flex justify-between px-2 bg-black/40">
                            {[...Array(10)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-white/20 rounded-[1px] my-0.5" />)}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 right-7">
                    <Signature />
                </div>
            </motion.div>
        );
    }

    // Layout 2: Grid 4 (Tile)
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cardBaseClass}
        >
            <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-multiply"
                style={{
                    backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAA5OTkAAAAAAAAAAABMTExERERmRmZ7606OAAAACHRSTlMAMwA3Q0aHj45LcOQAAABcSURBVDjLY2AYBaNgFIyCUTAKRsEwBAiJgYkJywQGBiYvEJuBCcQGs4GYDAwgNogNxGZgALHBbCAmAwOIDWIDsRmYQGwwG4jJwABig9hAbAYmEBvMBmIywAAoGhoAAPR5D0OlRsh5AAAAAElFTkSuQmCC")`,
                    backgroundSize: '100px 100px'
                }}
            />

            <Header />

            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 min-h-0 mb-6 z-0">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-slate-100 relative shadow-sm">
                        {photos[i % photos.length] && (
                            <img src={photos[i % photos.length].url} className="absolute inset-0 w-full h-full object-cover" alt="" />
                        )}
                    </div>
                ))}
            </div>

            <div className="absolute bottom-5 right-7">
                <Signature />
            </div>
        </motion.div>
    );
}
