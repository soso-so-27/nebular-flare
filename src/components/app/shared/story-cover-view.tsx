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
    forExport?: boolean;
}

export function StoryCoverView({ cat, weekKey, layout, photos, forExport }: StoryCoverViewProps) {
    // 日付フォーマットロジック: 2026.01.25 – 01.26
    const dateRangeDisplay = React.useMemo(() => {
        try {
            if (photos.length > 0) {
                const timestamps = photos.map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
                if (timestamps.length > 0) {
                    const minDate = new Date(Math.min(...timestamps));
                    const maxDate = new Date(Math.max(...timestamps));

                    if (minDate.toDateString() === maxDate.toDateString()) {
                        return format(minDate, "yyyy.MM.dd");
                    }
                    return `${format(minDate, "yyyy.MM.dd")} – ${format(maxDate, "MM.dd")}`;
                }
            }
        } catch (e) {
            console.error("Date calc error", e);
        }
        return weekKey;
    }, [photos, weekKey]);

    // 自動レイアウト選択
    const activeLayout = React.useMemo(() => {
        const count = photos.length;
        if (count >= 8) return 'C';
        if (count >= 5) return 'B';
        return 'A';
    }, [photos.length]);

    // 共通ベーススタイル (1080x1920 base)
    const outerWrapperStyle: React.CSSProperties = {
        width: '1080px',
        height: '1920px',
        background: 'radial-gradient(circle at center, #FDFDFD 0%, #F5F6F7 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '140px 60px 240px 60px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxSizing: 'border-box'
    };

    const cardStyle: React.CSSProperties = {
        width: '960px',
        flex: 1, // Fills space between vertical padding
        backgroundColor: 'white',
        borderRadius: '32px',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px',
        position: 'relative',
        border: '1px solid rgba(0,0,0,0.07)', // Clear 1px border (black 7%)
        boxShadow: '0 30px 100px rgba(0,0,0,0.02)', // Very thin wide shadow
        flexShrink: 0,
        boxSizing: 'border-box',
        overflow: 'hidden'
    };

    const Header = () => (
        <div className="flex flex-col items-start mb-[48px] pl-2 shrink-0">
            <h2 className="text-[42px] font-medium tracking-tight text-[#1A1A1A] leading-tight">
                今週のアルバム
            </h2>
            <p className="text-[#1A1A1A]/50 text-[24px] mt-[14px] font-medium">
                {dateRangeDisplay}
            </p>
        </div>
    );

    const Signature = () => (
        <div className="flex items-center justify-end w-full px-2 mt-auto shrink-0 pt-6">
            <div className="flex flex-col items-end gap-1.5">
                <span className="text-[14px] font-bold tracking-[0.4em] uppercase text-[#1A1A1A] opacity-30">
                    NYARUHD
                </span>
                <div className="h-[1px] w-6 bg-black/10" />
                <span className="text-[11px] font-medium italic text-[#1A1A1A] opacity-20 tracking-widest">
                    Weekly Journal
                </span>
            </div>
        </div>
    );

    const PhotoCard = ({ url, className = "", style = {} }: { url: string; className?: string; style?: React.CSSProperties }) => (
        <div
            className={`rounded-[18px] overflow-hidden bg-[#F5F5F5] relative ${className}`}
            style={{ ...style, flexShrink: 0 }}
        >
            <img
                src={url}
                className="absolute inset-0 w-full h-full object-cover object-[center_28%]"
                alt=""
                crossOrigin={url.startsWith('data:') ? undefined : "anonymous"}
            />
            {/* Subtle inner shadow for each photo card */}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.03] pointer-events-none rounded-[18px]" />
        </div>
    );

    const NoiseOverlay = () => (
        <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundSize: '150px 150px'
            }}
        />
    );

    const Container = forExport ? "div" : motion.div;
    const motionProps = forExport ? {} : {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
    };

    return (
        <div style={outerWrapperStyle}>
            {!forExport && <NoiseOverlay />}
            <Container
                {...motionProps}
                style={cardStyle}
            >
                {!forExport && <NoiseOverlay />}
                <Header />

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                    {activeLayout === 'A' && (
                        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-[12px] min-h-0">
                            {Array.from({ length: 4 }).map((_, i) => (
                                photos[i] ? <PhotoCard key={i} url={photos[i].url} className="w-full h-full" /> : <div key={i} className="rounded-[18px] bg-[#F9F9F9]" />
                            ))}
                        </div>
                    )}

                    {activeLayout === 'B' && (
                        <div className="flex-1 flex gap-[14px] min-h-0">
                            {/* Hero: 60% width */}
                            <PhotoCard url={photos[0].url} className="w-[60%] h-full" />

                            {/* Bento Rest: 40% width grid */}
                            <div className="flex-1 grid grid-cols-2 gap-[14px] min-h-0">
                                {Array.from({ length: photos.length > 5 ? 6 : 4 }).map((_, i) => (
                                    photos[i + 1] ? (
                                        <PhotoCard
                                            key={i}
                                            url={photos[i + 1].url}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <div key={i} className="rounded-[18px] bg-[#F9F9F9] flex items-center justify-center">
                                            <div className="w-1 h-1 rounded-full bg-black/5" />
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {activeLayout === 'C' && (
                        <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-[10px] min-h-0">
                            {Array.from({ length: 9 }).map((_, i) => (
                                photos[i] ? (
                                    <PhotoCard
                                        key={i}
                                        url={photos[i].url}
                                        className="w-full h-full"
                                        style={i === 4 ? { boxShadow: '0 25px 60px rgba(0,0,0,0.12)', zIndex: 10, scale: 1.02 } : {}}
                                    />
                                ) : (
                                    <div key={i} className="rounded-[18px] bg-[#F9F9F9]" />
                                )
                            ))}
                        </div>
                    )}
                </div>

                <Signature />
            </Container>
        </div>
    );
}
