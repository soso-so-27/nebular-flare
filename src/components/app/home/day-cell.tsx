"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format, isSameDay } from "date-fns";
import { Camera } from "lucide-react";
import { useCareContext, useCatContext, useIncidentContext } from "@/store/app-store";
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
    onClick: () => void;
    cornerRadius?: CornerRadius;
}

// UI Constants (統一) - White Theme (Otherkind-style)
const DEFAULT_BORDER_RADIUS = 8;
const BORDER_COLOR = 'rgba(0, 0, 0, 0.08)';

// White theme colors - UNIFIED for all cells
const CELL_BG = '#F6F6F6';  // Off-white for all cells (Otherkind exact)
const TEXT_COLOR_PRIMARY = 'rgba(0, 0, 0, 0.85)';
const TEXT_COLOR_SECONDARY = 'rgba(0, 0, 0, 0.55)';
const TEXT_COLOR_MUTED = 'rgba(0, 0, 0, 0.35)';

export function DayCell({
    day,
    isToday,
    isLarge,
    selectedCatIds,
    onClick,
    cornerRadius
}: DayCellProps) {
    const { careLogs } = useCareContext();
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
                createdAt: inc.created_at,
                created_at: inc.created_at,
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
        return incidents.filter((inc: any) => isSameDay(new Date(inc.created_at), day));
    }, [incidents, day]);

    // Event count
    const eventCount = useMemo(() => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const careCount = (careLogs || []).filter((log: any) => {
            const logDate = new Date(log.completed_at || log.created_at);
            return logDate >= dayStart && logDate <= dayEnd;
        }).length;

        return careCount + dayPhotos.length + dayIncidents.length;
    }, [careLogs, dayPhotos, dayIncidents, day]);

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
            onClick={onClick}
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
                    {/* 薄めオーバーレイ（UI視認性確保） */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.08) 100%)'
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
                                    : TEXT_COLOR_MUTED
                        }}
                    >
                        {isToday ? 'TODAY' : dayLabel}
                    </span>
                    <span
                        style={{
                            fontSize: isLarge ? 24 : 16,
                            fontWeight: isToday ? 900 : 600, // TODAYを強調するために極太に
                            lineHeight: 1,
                            color: thumbnailUrl
                                ? 'rgba(255, 255, 255, 0.85)'
                                : isToday
                                    ? TEXT_COLOR_PRIMARY
                                    : TEXT_COLOR_SECONDARY
                        }}
                    >
                        {dateNumber}
                    </span>
                </div>

                {/* 右上: +N バッジ (写真ありタイルのみ、薄め、角丸ピル) */}
                {thumbnailUrl && eventCount >= 2 && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(0, 0, 0, 0.25)', // より透明度の高い背景へ
                            backdropFilter: 'blur(8px)',     // グラスモーフィズム
                            WebkitBackdropFilter: 'blur(8px)',
                            borderRadius: 12,
                            padding: '3px 8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)' // 微細な境界線
                        }}
                    >
                        <span
                            style={{
                                fontSize: 9,
                                fontWeight: 800, // バッジ文字を鮮明に
                                color: 'rgba(255, 255, 255, 0.95)',
                                letterSpacing: '0.02em'
                            }}
                        >
                            +{eventCount}
                        </span>
                    </div>
                )}

                <div className="flex-1" />

                {/* 右下: カメラアイコン (状態表示、薄く小さく) */}
                <div className="flex items-center justify-end">
                    {!thumbnailUrl && (
                        <Camera
                            style={{
                                width: isLarge ? 16 : 12,
                                height: isLarge ? 16 : 12,
                                color: 'rgba(255, 255, 255, 0.20)' // 非常に薄く
                            }}
                        />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
