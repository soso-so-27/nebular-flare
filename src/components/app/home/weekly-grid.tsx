"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { isToday } from "date-fns";
import { DayCell } from "./day-cell";

const OUTER_RADIUS = 8;
const HAIRLINE = 1;
const DIVIDER_COLOR = '#000000';

interface LayoutData {
    bentoH: number;
    bentoTop: number;
    contentWidth: number;
    screenWidth: number;
    unitW: number;
    unitH: number;
    xOffset: number;
}

interface WeeklyGridProps {
    weekDays: Date[];
    selectedCatIds: string[];
    onDaySelect: (day: Date) => void;
    layoutData: LayoutData;
}

export function WeeklyGrid({
    weekDays,
    selectedCatIds,
    onDaySelect,
    layoutData
}: WeeklyGridProps) {
    const { bentoH, contentWidth, unitW, unitH, xOffset, bentoTop } = layoutData;

    const todayIndex = useMemo(() => {
        const idx = weekDays.findIndex(day => isToday(day));
        return idx >= 0 ? idx : 0;
    }, [weekDays]);

    const todayDate = weekDays[todayIndex];
    const otherDays = useMemo(() => weekDays.filter((_, i) => i !== todayIndex), [weekDays, todayIndex]);

    /**
     * 【不変整数マトリクス】
     * コンテナは (contentWidth, bentoH) の純粋な黒い板。
     * タイルはこの上の (1, 1) から始まり、(unit + 1) ごとに配置される。
     */
    const getPos = (index: number, size: number) => HAIRLINE + index * (size + HAIRLINE);

    return (
        <div
            style={{
                position: 'absolute',
                top: bentoTop,
                left: xOffset,
                width: contentWidth,
                height: bentoH,
                borderRadius: OUTER_RADIUS,
                background: DIVIDER_COLOR, // 1pxの線の実体
                overflow: 'hidden',
                // GPU Snapping
                transform: 'translateZ(0)',
            }}
        >
            {/* 1. TODAY (左上: Col 0-1, Row 0-2) */}
            <div
                style={{
                    position: 'absolute',
                    top: getPos(0, unitH), // = 1
                    left: getPos(0, unitW), // = 1
                    width: unitW * 2 + HAIRLINE,
                    height: unitH * 3 + HAIRLINE * 2,
                    overflow: 'hidden'
                }}
            >
                <DayCell
                    day={todayDate}
                    isToday={true}
                    isLarge={true}
                    selectedCatIds={selectedCatIds}
                    onClick={() => onDaySelect(todayDate)}
                    cornerRadius={{ topLeft: OUTER_RADIUS - HAIRLINE, topRight: 0, bottomLeft: 0, bottomRight: 0 }}
                />
            </div>

            {/* 2. 右列 (MON, TUE, WED - 列インデックス 2) */}
            {otherDays.slice(0, 3).map((day, i) => (
                <div
                    key={`right-${i}`}
                    style={{
                        position: 'absolute',
                        top: getPos(i, unitH),
                        left: getPos(2, unitW),
                        width: unitW,
                        height: unitH,
                        overflow: 'hidden'
                    }}
                >
                    <DayCell
                        day={day}
                        isToday={false}
                        isLarge={false}
                        selectedCatIds={selectedCatIds}
                        onClick={() => onDaySelect(day)}
                        cornerRadius={{
                            topLeft: 0,
                            topRight: i === 0 ? OUTER_RADIUS - HAIRLINE : 0,
                            bottomLeft: 0,
                            bottomRight: 0
                        }}
                    />
                </div>
            ))}

            {/* 3. 下段 (THU, SAT, SUN - 行インデックス 3) */}
            {otherDays.slice(3, 6).map((day, i) => (
                <div
                    key={`bottom-${i}`}
                    style={{
                        position: 'absolute',
                        top: getPos(3, unitH),
                        left: getPos(i, unitW),
                        width: unitW,
                        height: unitH,
                        overflow: 'hidden'
                    }}
                >
                    <DayCell
                        day={day}
                        isToday={false}
                        isLarge={false}
                        selectedCatIds={selectedCatIds}
                        onClick={() => onDaySelect(day)}
                        cornerRadius={{
                            topLeft: 0,
                            topRight: 0,
                            bottomLeft: i === 0 ? OUTER_RADIUS - HAIRLINE : 0,
                            bottomRight: i === 2 ? OUTER_RADIUS - HAIRLINE : 0
                        }}
                    />
                </div>
            ))}
        </div>
    );
}
