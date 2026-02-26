"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format, isSameDay } from "date-fns";
import { Camera, PenLine, Cat } from "lucide-react";
import { useCatContext, useIncidentContext } from "@/store/app-store";
import { getFullImageUrl } from "@/lib/utils";

interface CornerRadius {
    topLeft: number;
    topRight: number;
    bottomLeft: number;
    bottomRight: number;
}

interface DayCellProps {
    day: Date;
    isToday: boolean;
    isLarge: boolean;
    selectedCatIds: string[];
    onClick: (e?: React.MouseEvent) => void;
    onQuickPost?: (day: Date) => void;
    cornerRadius?: CornerRadius;
}

// UI Constants (Natural Warm Theme)
const DEFAULT_BORDER_RADIUS = 16; // Increased for friendly feel
const BORDER_COLOR = 'rgba(78, 52, 46, 0.08)'; // Brown-tinted border

/*
// Original Neutral Theme (Commented for reversal)
const DEFAULT_BORDER_RADIUS = 8;
const BORDER_COLOR = 'rgba(0, 0, 0, 0.08)';
const CELL_BG = '#F6F6F6';
const TEXT_COLOR_PRIMARY = 'rgba(0, 0, 0, 0.85)';
const TEXT_COLOR_SECONDARY = 'rgba(0, 0, 0, 0.55)';
const TEXT_COLOR_MUTED = 'rgba(0, 0, 0, 0.35)';
*/

// Warm theme colors
const CELL_BG = '#FEFDFB';  // Pure Paper White
const TEXT_COLOR_PRIMARY = '#4E342E'; // Deep Coffee Brown
const TEXT_COLOR_SECONDARY = '#8D6E63'; // Muted Cocoa
const TEXT_COLOR_MUTED = '#A1887F'; // Soft Brown

export function DayCell({
    day,
    isToday,
    isLarge,
    selectedCatIds,
    onClick,
    onQuickPost,
    cornerRadius
}: DayCellProps) {
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();

    // Photos from cats
    const catPhotos = useMemo(() => {
        if (!cats) return [];
        return cats.flatMap((cat: any) =>
            (cat.images || []).map((img: any) => ({ ...img, cat_id: cat.id, source: 'cat' }))
        );
    }, [cats]);

    // Photos from incidents
    const incidentPhotos = useMemo(() => {
        if (!incidents) return [];
        return incidents.flatMap((inc: any) =>
            (inc.photos || []).map((photoUrl: string) => ({
                url: photoUrl,
                storagePath: photoUrl,
                cat_id: inc.cat_id,
                createdAt: inc.onset_at || inc.created_at,
                created_at: inc.onset_at || inc.created_at,
                source: 'incident'
            }))
        );
    }, [incidents]);

    const allPhotos = useMemo(() => [...catPhotos, ...incidentPhotos], [catPhotos, incidentPhotos]);

    // Photos for this day
    const dayPhotos = useMemo(() => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        return allPhotos.filter((img: any) => {
            const imgDate = new Date(img.createdAt || img.created_at);
            const inDateRange = imgDate >= dayStart && imgDate <= dayEnd;
            if (selectedCatIds?.length > 0 && img.cat_id) {
                return inDateRange && selectedCatIds.includes(img.cat_id);
            }
            return inDateRange;
        });
    }, [allPhotos, day, selectedCatIds]);

    // Incidents for this day
    const dayIncidents = useMemo(() => {
        if (!incidents) return [];
        return incidents.filter((inc: any) => {
            const logicalDate = new Date(inc.onset_at || inc.created_at);
            return isSameDay(logicalDate, day);
        });
    }, [incidents, day]);



    // Labels (統一フォーマット)
    const dayLabel = format(day, "EEE").toUpperCase();
    const dateNumber = format(day, "d");
    const thumbnailUrl = dayPhotos[0]
        ? getFullImageUrl(dayPhotos[0].storagePath || dayPhotos[0].storage_path || dayPhotos[0].url)
        : null;

    // Compute border radius string
    const borderRadiusStyle = cornerRadius
        ? `${cornerRadius.topLeft}px ${cornerRadius.topRight}px ${cornerRadius.bottomRight}px ${cornerRadius.bottomLeft}px`
        : `${DEFAULT_BORDER_RADIUS}px`;

    return (
        <motion.div
            role="button"
            tabIndex={0}
            onClick={(e) => onClick(e)}
            whileTap={{ opacity: 0.85 }}
            className="relative w-full h-full overflow-hidden cursor-pointer"
            style={{
                borderRadius: borderRadiusStyle,
                background: thumbnailUrl
                    ? '#18181b'
                    : CELL_BG,
                border: 'none',
                outline: 'none'
            }}
        >
            {/* Background Photo - cover + 上寄せ(35%) */}
            {thumbnailUrl && (
                <div className="absolute inset-0">
                    <img
                        src={thumbnailUrl}
                        alt=""
                        className="w-full h-full"
                        style={{
                            objectFit: 'cover',
                            objectPosition: '50% 35%',
                            imageRendering: 'pixelated' // 境界線の鮮明度を最大化
                        }}
                    />
                    {/* 雑誌のような暖色グラデーション */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(to top, rgba(78, 52, 46, 0.7) 0%, rgba(78, 52, 46, 0.2) 50%, rgba(78, 52, 46, 0.05) 100%)'
                        }}
                    />
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-2">
                {/* 左上: 曜日ラベル + 日付 (TODAYラベル主役、数字は従) */}
                <div className="flex flex-col items-start">
                    <span
                        style={{
                            fontSize: isLarge ? 10 : 8,
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            color: thumbnailUrl
                                ? 'rgba(255, 255, 255, 0.75)'
                                : isToday
                                    ? TEXT_COLOR_SECONDARY
                                    : TEXT_COLOR_MUTED,
                            textShadow: thumbnailUrl ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        {isToday ? 'TODAY' : dayLabel}
                    </span>
                    <span
                        style={{
                            fontSize: isLarge ? 26 : 18,
                            fontWeight: isToday ? 800 : 500,
                            lineHeight: 1,
                            fontFamily: 'serif', // 雑誌のような上品な数字に
                            color: thumbnailUrl
                                ? '#FFFFFF'
                                : isToday
                                    ? TEXT_COLOR_PRIMARY
                                    : TEXT_COLOR_SECONDARY,
                            textShadow: thumbnailUrl ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
                        }}
                    >
                        {dateNumber}
                    </span>
                </div>



                <div className="flex-1 flex items-center justify-center">
                    {isToday && !thumbnailUrl ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickPost?.(day);
                            }}
                            className="w-12 h-12 rounded-2xl border border-[#4E342E]/10 flex items-center justify-center bg-[#4E342E]/[0.04] active:scale-95 transition-transform"
                            aria-label="きろくする"
                        >
                            <PenLine className="w-5 h-5 text-[#4E342E]/30" />
                        </button>
                    ) : (
                        !thumbnailUrl && (
                            <Cat className="w-10 h-10 text-[#4E342E]/[0.03]" />
                        )
                    )}
                    {isToday && thumbnailUrl && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickPost?.(day);
                            }}
                            className="absolute bottom-2 right-2 w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                            aria-label="きろくする"
                        >
                            <PenLine className="w-3.5 h-3.5 text-white" />
                        </button>
                    )}
                </div>

                {/* 右下: カメラアイコン (状態表示、薄く小さく) */}
                <div className="flex items-center justify-end">
                    {!thumbnailUrl && (
                        <Camera
                            className="transition-opacity duration-300"
                            style={{
                                width: isLarge ? 14 : 10,
                                height: isLarge ? 14 : 10,
                                color: 'rgba(0, 0, 0, 0.12)'
                            }}
                        />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
