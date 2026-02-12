"use client";

import React from "react";

interface StoryCoverViewProps {
    photos: { url: string; date: string }[];
    aiCaption?: string;
    dateRange?: string;
    ambientColor?: string;
    frameless?: boolean;
}

/*
 * ─────────────────────────────────────────────────────
 * Scrapbook v5 — Visibility & Mobile Top-Bar Fix
 *
 * Improvements:
 *   ✅ Safe Area: Moved top slots from y=55/70 to y=200+ to clear UI buttons.
 *   ✅ Global Dates: Dates moved from photo-child to canvas-child with high z-index.
 *   ✅ Date Contrast: Added subtle border to labels to ensure visibility on light photos.
 *   ✅ Spacing: Optimized 5-photo layout to reduce messy overlap zones.
 * ─────────────────────────────────────────────────────
 */

const BORDER = 10;

/* 
 * Re-calculated SLOTS for 1080x1920 canvas.
 * Starting Y shifted to 200 to clear Back/Share buttons (approx 180px in scaled view).
 */
const SLOTS = [
    { x: 55, y: 200, w: 520, h: 660, rotate: -3, z: 2 },   // 0: Hero, mid-top-left
    { x: 540, y: 220, w: 485, h: 420, rotate: 2.5, z: 3 },   // 1: wide, mid-top-right
    { x: 85, y: 810, w: 510, h: 390, rotate: -1.5, z: 5 },   // 2: wide, middle-left
    { x: 530, y: 720, w: 430, h: 510, rotate: 3, z: 4 },   // 3: tall, mid-right
    { x: 120, y: 1210, w: 600, h: 380, rotate: 1.5, z: 6 },   // 4: panoramic, bottom
];

/* Tape positions adjusted for new photo coordinates */
const TAPES: {
    slot?: number;
    absX?: number; absY?: number;
    right?: number; left?: number;
    top?: number; bottom?: number;
    w: number; h: number;
    rotate: number;
    z?: number;
}[] = [
        { slot: 0, right: 25, top: -9, w: 110, h: 24, rotate: 10 },
        { slot: 1, left: 22, top: -8, w: 100, h: 22, rotate: -8 },
        { slot: 1, right: 35, top: -7, w: 95, h: 22, rotate: 5 },
        { slot: 2, left: 210, top: -10, w: 115, h: 24, rotate: 1 },
        { slot: 3, left: 20, top: -8, w: 98, h: 22, rotate: -5 },
        { slot: 4, right: 60, top: -9, w: 105, h: 23, rotate: 8 },
        { absX: 950, absY: 1560, w: 95, h: 24, rotate: -15, z: 15 },
    ];

const ACCENT = {
    heart: "#D65D4C",
    arrow: "#6B584D",
    tape: "rgba(232,226,216,0.72)",
    dateBg: "rgba(255,255,255,0.9)",
    dateText: "rgba(60,48,38,0.7)",
    dateBorder: "rgba(60,48,38,0.1)",
};

const KLEE = "var(--font-klee), 'Hiragino Mincho ProN', 'Yu Mincho', serif";

function formatPhotoDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()} ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]}`;
    } catch {
        return "";
    }
}

export const StoryCoverView = ({
    photos,
    aiCaption,
    dateRange,
}: StoryCoverViewProps) => {
    const displayPhotos = React.useMemo(() => {
        return SLOTS.map((_, i) => photos[i] || null);
    }, [photos]);

    return (
        <div
            style={{
                position: "relative",
                width: 1080,
                height: 1920,
                overflow: "hidden",
                userSelect: "none",
                background: "#F4F1EC",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.2,
                    backgroundImage: `
                        radial-gradient(ellipse at 20% 25%, rgba(200,175,150,0.1) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 70%, rgba(190,165,140,0.07) 0%, transparent 50%)
                    `,
                    pointerEvents: "none",
                }}
            />

            {/* ── Photos ── */}
            {SLOTS.map((slot, i) => {
                const photo = displayPhotos[i];
                return (
                    <div
                        key={`photo-${i}`}
                        style={{
                            position: "absolute",
                            left: slot.x,
                            top: slot.y,
                            width: slot.w,
                            height: slot.h,
                            transform: `rotate(${slot.rotate}deg)`,
                            zIndex: slot.z,
                            padding: BORDER,
                            background: "#FDFCFA",
                            boxShadow: "0 5px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
                        }}
                    >
                        {photo ? (
                            <img
                                src={photo.url}
                                alt=""
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "#F9F7F4",
                                    border: "1.5px dashed rgba(0,0,0,0.06)",
                                }}
                            />
                        )}
                    </div>
                );
            })}

            {/* ── Global Date Labels (Higher Z-Index to prevent clipping) ── */}
            {SLOTS.map((slot, i) => {
                const photo = displayPhotos[i];
                if (!photo) return null;
                const label = formatPhotoDate(photo.date);

                return (
                    <div
                        key={`date-${i}`}
                        style={{
                            position: "absolute",
                            left: slot.x,
                            top: slot.y,
                            width: slot.w,
                            height: slot.h,
                            transform: `rotate(${slot.rotate}deg)`,
                            pointerEvents: "none",
                            zIndex: slot.z + 1,
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                bottom: BORDER + 1,
                                left: BORDER + 10,
                                fontSize: 20,
                                fontFamily: KLEE,
                                color: "rgba(60,48,38,0.45)",
                                letterSpacing: "0.02em",
                                fontWeight: 400,
                            }}
                        >
                            {label}
                        </div>
                    </div>
                );
            })}

            {/* ── Tapes ── */}
            {TAPES.map((tape, i) => {
                const css: React.CSSProperties = {
                    position: "absolute",
                    width: tape.w,
                    height: tape.h,
                    background: ACCENT.tape,
                    pointerEvents: "none",
                };

                if (tape.slot !== undefined) {
                    const slot = SLOTS[tape.slot];
                    css.transform = `rotate(${slot.rotate + tape.rotate}deg)`;
                    css.zIndex = slot.z + 20;
                    if (tape.left !== undefined) css.left = slot.x + tape.left;
                    if (tape.right !== undefined)
                        css.left = slot.x + slot.w - tape.right - tape.w;
                    if (tape.top !== undefined) css.top = slot.y + tape.top;
                    if (tape.bottom !== undefined)
                        css.top = slot.y + slot.h - tape.bottom - tape.h;
                } else {
                    css.left = tape.absX;
                    css.top = tape.absY;
                    css.transform = `rotate(${tape.rotate}deg)`;
                    css.zIndex = tape.z || 15;
                }
                return <div key={`t-${i}`} style={css} />;
            })}

            {/* ── Doodles ── */}
            <div style={{ position: "absolute", left: 38, top: 785, fontSize: 44, color: ACCENT.heart, transform: "rotate(-15deg)", zIndex: 30, lineHeight: 1 }}>
                ♥
            </div>
            <div style={{ position: "absolute", left: 70, top: 835, fontSize: 32, color: ACCENT.heart, transform: "rotate(8deg)", zIndex: 30, lineHeight: 1 }}>
                ♡
            </div>

            <div style={{ position: "absolute", left: 955, top: 1160, fontSize: 38, transform: "rotate(15deg)", zIndex: 30, opacity: 0.4 }}>
                🐾
            </div>

            <svg
                style={{
                    position: "absolute",
                    left: 320, top: 1180,
                    width: 90, height: 65,
                    zIndex: 30,
                    transform: "rotate(12deg)",
                    opacity: 0.45,
                }}
                viewBox="0 0 90 65"
                fill="none"
            >
                <path d="M8 50 C25 20, 55 12, 75 35" stroke={ACCENT.arrow} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M66 28 L78 36 L66 43" stroke={ACCENT.arrow} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>

            {/* ── Caption ── */}
            <div
                style={{
                    position: "absolute",
                    left: 80, right: 80, top: 1650,
                    zIndex: 30,
                }}
            >
                <p
                    style={{
                        fontSize: 34,
                        lineHeight: 1.6,
                        fontWeight: 400,
                        fontFamily: KLEE,
                        color: "#3D3028",
                        margin: 0,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical" as any,
                    }}
                >
                    {aiCaption || "一週間の断片。静かな時間も、やんちゃな瞬間も。"}
                </p>
                <span
                    style={{
                        display: "block",
                        marginTop: 16,
                        fontSize: 19,
                        fontWeight: 400,
                        fontFamily: KLEE,
                        color: "rgba(61,48,40,0.35)",
                        letterSpacing: "0.08em",
                    }}
                >
                    {dateRange || "Feb 5 – 11, 2026"}
                </span>
            </div>
        </div>
    );
};
