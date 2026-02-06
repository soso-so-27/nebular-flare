"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { isToday } from "date-fns";
import { DayCell } from "./day-cell";

const GUTTER = 6;
const MARGIN = 16;
const INNER_GAP = 3;      // Gap between cells inside the unified container
const INNER_PADDING = 6;  // Padding inside the unified container

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
 * 理想的なアスペクト比からレイアウトを逆算
 * 
 * 方程式:
 * - todayH = 3 * rightH + 2 * GUTTER (高さ同期)
 * - todayW = todayH * todayAspect
 * - rightW = rightH * rightAspect
 * - todayW + GUTTER + rightW = contentWidth
 * 
 * 解:
 * rightH = (contentWidth - GUTTER*(1 + 2*todayAspect)) / (rightAspect + 3*todayAspect)
 */
function calculateIdealLayout(contentWidth: number, maxBentoH: number) {
    const todayAspect = IDEAL_TODAY_ASPECT;
    const rightAspect = IDEAL_RIGHT_ASPECT;
    const bottomAspect = IDEAL_BOTTOM_ASPECT;

    // Step 1: rightH を方程式から解く
    const numerator = contentWidth - GUTTER * (1 + 2 * todayAspect);
    const denominator = rightAspect + 3 * todayAspect;
    const rightH = numerator / denominator;

    // Step 2: 他の寸法を計算
    const rightW = rightH * rightAspect;
    const todayH = 3 * rightH + 2 * GUTTER;
    const todayW = contentWidth - GUTTER - rightW;
    const topRowH = todayH;

    // Step 3: 下段の寸法
    const bottomW = (contentWidth - GUTTER * 2) / 3;
    const bottomH = bottomW / bottomAspect;

    // Step 4: 理想的なBento高さ
    const idealBentoH = topRowH + GUTTER + bottomH;

    // maxBentoHを超える場合はスケールダウン
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
    const { bentoH, contentWidth, safeH, screenWidth } = layoutData;

    // Account for inner padding when calculating tile sizes
    const innerContentWidth = contentWidth - INNER_PADDING * 2;
    const innerBentoH = bentoH - INNER_PADDING * 2;

    const tiles = useMemo(() => {
        return calculateIdealLayout(innerContentWidth, innerBentoH);
    }, [innerBentoH, innerContentWidth]);

    // 実際のアスペクト比
    const todayAspect = tiles.todayW / tiles.todayH;
    const rightAspect = tiles.rightW / tiles.rightH;
    const bottomAspect = tiles.bottomW / tiles.bottomH;

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
                position: 'relative'
            }}
        >
            {/* Unified Container for Bento Grid */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 24,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: INNER_PADDING,
                    boxSizing: 'border-box'
                }}
            >
                {/* 上段: TODAY + 右列3枠 */}
                <div style={{ display: 'flex', gap: INNER_GAP, height: tiles.topRowH }}>
                    {/* TODAY - 縦長大 (2:3) */}
                    <motion.div
                        style={{ width: tiles.todayW, height: tiles.todayH, flexShrink: 0 }}
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
                        />
                    </motion.div>

                    {/* 右列 - 横長小×3 (16:10) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: INNER_GAP, flex: 1 }}>
                        {rightColumn.map((day, index) => (
                            <motion.div
                                key={day.toISOString()}
                                style={{ width: tiles.rightW, height: tiles.rightH }}
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
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* 下段 - 縦長小×3 (5:6) */}
                <div style={{ display: 'flex', gap: INNER_GAP, marginTop: INNER_GAP }}>
                    {bottomRow.map((day, index) => (
                        <motion.div
                            key={day.toISOString()}
                            style={{ width: tiles.bottomW, height: tiles.bottomH }}
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
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
