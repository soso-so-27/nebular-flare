"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { isToday } from "date-fns";
import { DayCell } from "./day-cell";

const MARGIN = 16;
const OUTER_RADIUS = 24;  // Rounded corners only on outer edges
const HAIRLINE = 1;       // Hairline border between cells

/**
 * 理想的なアスペクト比（写真/デザインの標準に基づく）
 * 
 * TODAY: 2:3 = 0.67（ポートレート写真の標準）
 * RIGHT: 16:10 = 1.60（横長写真・映像の標準）
 * BOTTOM: 5:6 = 0.83（やや縦長カード）
 */
const IDEAL_TODAY_ASPECT = 0.67;   // 2:3 縦長
const IDEAL_RIGHT_ASPECT = 1.60;   // 16:10 横長
const IDEAL_BOTTOM_ASPECT = 0.83;  // 5:6 やや縦長

interface LayoutData {
    safeH: number;
    bentoH: number;
    contentWidth: number;
    screenWidth: number;
}

interface WeeklyGridProps {
    weekDays: Date[];
    selectedCatIds: string[];
    onDaySelect: (day: Date) => void;
    layoutData: LayoutData;
}

/**
 * 理想的なアスペクト比からレイアウトを逆算（ゼロギャップ版）
 */
function calculateIdealLayout(contentWidth: number, maxBentoH: number) {
    const todayAspect = IDEAL_TODAY_ASPECT;
    const rightAspect = IDEAL_RIGHT_ASPECT;
    const bottomAspect = IDEAL_BOTTOM_ASPECT;

    // Zero gap layout: todayH = 3 * rightH
    const numerator = contentWidth;
    const denominator = rightAspect + 3 * todayAspect;
    const rightH = numerator / denominator;

    const rightW = rightH * rightAspect;
    const todayH = 3 * rightH;
    const todayW = contentWidth - rightW;
    const topRowH = todayH;

    const bottomW = contentWidth / 3;
    const bottomH = bottomW / bottomAspect;

    const idealBentoH = topRowH + bottomH;

    const scale = idealBentoH > maxBentoH ? maxBentoH / idealBentoH : 1;

    return {
        todayW: todayW * (scale < 1 ? Math.sqrt(scale) : 1),
        todayH: todayH * scale,
        rightW: rightW * (scale < 1 ? Math.sqrt(scale) : 1),
        rightH: rightH * scale,
        bottomW: bottomW,
        bottomH: bottomH * scale,
        topRowH: topRowH * scale,
        idealBentoH,
        actualBentoH: Math.min(idealBentoH, maxBentoH),
        scale
    };
}

export function WeeklyGrid({
    weekDays,
    selectedCatIds,
    onDaySelect,
    layoutData
}: WeeklyGridProps) {
    const { bentoH, contentWidth } = layoutData;

    const tiles = useMemo(() => {
        return calculateIdealLayout(contentWidth, bentoH);
    }, [bentoH, contentWidth]);

    // 今日のインデックス
    const todayIndex = useMemo(() => {
        const idx = weekDays.findIndex(day => isToday(day));
        return idx >= 0 ? idx : 0;
    }, [weekDays]);

    const todayDate = weekDays[todayIndex];

    // 残り6日 → 右列3 + 下段3
    const { rightColumn, bottomRow } = useMemo(() => {
        const otherDays = weekDays.filter((_, i) => i !== todayIndex);
        return {
            rightColumn: otherDays.slice(0, 3),
            bottomRow: otherDays.slice(3, 6)
        };
    }, [weekDays, todayIndex]);

    return (
        <div
            style={{
                marginLeft: MARGIN,
                marginRight: MARGIN,
                height: tiles.actualBentoH,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: OUTER_RADIUS,
                background: 'rgba(255,255,255,0.02)',
            }}
        >
            {/* Top Row: TODAY + Right Column (3 cells) */}
            <div style={{ display: 'flex', height: tiles.topRowH }}>
                {/* TODAY - Large left cell */}
                <motion.div
                    style={{
                        width: tiles.todayW,
                        height: tiles.todayH,
                        flexShrink: 0,
                        borderRight: `${HAIRLINE}px solid rgba(255,255,255,0.08)`,
                        borderBottom: `${HAIRLINE}px solid rgba(255,255,255,0.08)`,
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <DayCell
                        day={todayDate}
                        isToday={true}
                        isLarge={true}
                        selectedCatIds={selectedCatIds}
                        onClick={() => onDaySelect(todayDate)}
                        cornerRadius={{ topLeft: OUTER_RADIUS, topRight: 0, bottomLeft: 0, bottomRight: 0 }}
                    />
                </motion.div>

                {/* Right Column - 3 stacked cells */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {rightColumn.map((day, index) => (
                        <motion.div
                            key={day.toISOString()}
                            style={{
                                width: tiles.rightW,
                                height: tiles.rightH,
                                borderBottom: index < 2 ? `${HAIRLINE}px solid rgba(255,255,255,0.08)` : `${HAIRLINE}px solid rgba(255,255,255,0.08)`,
                            }}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + index * 0.05 }}
                        >
                            <DayCell
                                day={day}
                                isToday={false}
                                isLarge={false}
                                selectedCatIds={selectedCatIds}
                                onClick={() => onDaySelect(day)}
                                cornerRadius={{
                                    topLeft: 0,
                                    topRight: index === 0 ? OUTER_RADIUS : 0,
                                    bottomLeft: 0,
                                    bottomRight: 0
                                }}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Row - 3 cells */}
            <div style={{ display: 'flex' }}>
                {bottomRow.map((day, index) => (
                    <motion.div
                        key={day.toISOString()}
                        style={{
                            width: tiles.bottomW,
                            height: tiles.bottomH,
                            borderRight: index < 2 ? `${HAIRLINE}px solid rgba(255,255,255,0.08)` : 'none',
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
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
                                bottomLeft: index === 0 ? OUTER_RADIUS : 0,
                                bottomRight: index === 2 ? OUTER_RADIUS : 0
                            }}
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
