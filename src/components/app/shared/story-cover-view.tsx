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
 * Scrapbook v4 — Reference Image Deep Study
 *
 * Lessons copied from the reference:
 *   ✅ LOVE removed (user request)
 *   ✅ Tape wider & more opaque (reference: ~100px, prominent)
 *   ✅ Standalone tape piece (reference: bottom-right, no photo)
 *   ✅ Thinner white border (14→10, reference has thin borders)
 *   ✅ Stars removed (reference has none)
 *   ✅ Hearts smaller but crisper (reference: small, high-contrast)
 *   ✅ Composition rebalanced for more asymmetry
 *   ✅ Slight warm tint on photo borders (aged print feel)
 * ─────────────────────────────────────────────────────
 */

const BORDER = 10;

const SLOTS = [
    { x: 45, y: 75, w: 540, h: 685, rotate: -2.5, z: 2 },   // 0: Hero tall, top-left
    { x: 520, y: 105, w: 505, h: 435, rotate: 3, z: 3 },   // 1: wide, top-right
    { x: 75, y: 740, w: 530, h: 405, rotate: -1.5, z: 5 },   // 2: wide, middle-left
    { x: 490, y: 680, w: 450, h: 525, rotate: 3, z: 4 },   // 3: tall, mid-right
    { x: 90, y: 1185, w: 620, h: 395, rotate: 1.5, z: 6 },   // 4: panoramic, bottom
];

/*
 * Tapes: wider, more opaque — matching reference's prominent masking tape.
 * Reference uses ~100-120px wide tape strips, clearly visible.
 * Also includes a standalone tape piece (no photo attached).
 */
const TAPES: {
    slot?: number;
    absX?: number; absY?: number;
    right?: number; left?: number;
    top?: number; bottom?: number;
    w: number; h: number;
    rotate: number;
    z?: number;
}[] = [
        // Photo-attached tapes
        { slot: 0, right: 25, top: -9, w: 105, h: 24, rotate: 10 },
        { slot: 1, left: 22, top: -8, w: 95, h: 22, rotate: -8 },
        { slot: 1, right: 28, top: -7, w: 88, h: 22, rotate: 5 },
        { slot: 2, left: 200, top: -10, w: 110, h: 24, rotate: 1 },
        { slot: 3, left: 18, top: -8, w: 92, h: 22, rotate: -5 },
        { slot: 4, right: 50, top: -9, w: 100, h: 23, rotate: 8 },
        // Standalone tape piece (reference: bottom-right corner, decorative)
        { absX: 940, absY: 1540, w: 90, h: 22, rotate: -15, z: 15 },
    ];

const ACCENT = {
    heart: "#D65D4C",
    arrow: "#6B584D",
    tape: "rgba(232,226,216,0.72)",
    dateBg: "rgba(255,255,255,0.78)",
    dateText: "rgba(60,48,38,0.6)",
};

const KLEE = "var(--font-klee), 'Hiragino Mincho ProN', 'Yu Mincho', serif";

function formatPhotoDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
        return `${month}/${day} ${weekday}`;
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
            {/* ── Subtle ambient ── */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.25,
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
                const dateLabel = photo ? formatPhotoDate(photo.date) : "";
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: slot.x,
                            top: slot.y,
                            width: slot.w,
                            height: slot.h,
                            transform: `rotate(${slot.rotate}deg)`,
                            zIndex: slot.z,
                            padding: BORDER,
                            /* Slightly warm white — aged print feel */
                            background: "#FDFCFA",
                            boxShadow: "0 5px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
                        }}
                    >
                        {photo ? (
                            <>
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
                                {dateLabel && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: BORDER + 10,
                                            right: BORDER + 10,
                                            background: ACCENT.dateBg,
                                            backdropFilter: "blur(8px)",
                                            padding: "4px 12px",
                                            borderRadius: 7,
                                            fontSize: 22,
                                            fontFamily: KLEE,
                                            fontWeight: 400,
                                            color: ACCENT.dateText,
                                            letterSpacing: "0.03em",
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {dateLabel}
                                    </div>
                                )}
                            </>
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

            {/* ── Tapes — wider, more opaque (matching reference) ── */}
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
                    // Standalone tape
                    css.left = tape.absX;
                    css.top = tape.absY;
                    css.transform = `rotate(${tape.rotate}deg)`;
                    css.zIndex = tape.z || 15;
                }
                return <div key={`t-${i}`} style={css} />;
            })}

            {/* ── Hearts — small, crisp, high contrast (like reference) ── */}
            <div style={{
                position: "absolute", left: 38, top: 700,
                fontSize: 40, color: ACCENT.heart,
                transform: "rotate(-15deg)", zIndex: 30, lineHeight: 1,
            }}>
                ♥
            </div>
            <div style={{
                position: "absolute", left: 65, top: 745,
                fontSize: 30, color: ACCENT.heart,
                transform: "rotate(8deg)", zIndex: 30, lineHeight: 1,
            }}>
                ♡
            </div>

            {/* ── Paw prints ── */}
            <div style={{
                position: "absolute", left: 945, top: 1145,
                fontSize: 36, transform: "rotate(15deg)",
                zIndex: 30, opacity: 0.4,
            }}>
                🐾
            </div>
            <div style={{
                position: "absolute", left: 900, top: 1200,
                fontSize: 24, transform: "rotate(-10deg)",
                zIndex: 30, opacity: 0.25,
            }}>
                🐾
            </div>

            {/* ── Curved arrow (hand-drawn, like reference) ── */}
            <svg
                style={{
                    position: "absolute",
                    left: 310, top: 1155,
                    width: 85, height: 60,
                    zIndex: 30,
                    transform: "rotate(14deg)",
                    opacity: 0.4,
                }}
                viewBox="0 0 85 60"
                fill="none"
            >
                <path
                    d="M8 45 C20 15, 50 8, 68 32"
                    stroke={ACCENT.arrow}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    fill="none"
                />
                <path
                    d="M60 26 L70 33 L60 38"
                    stroke={ACCENT.arrow}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>

            {/* ── Caption ── */}
            <div
                style={{
                    position: "absolute",
                    left: 80, right: 80, top: 1640,
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
                    {aiCaption ||
                        "一週間の断片。静かな時間も、やんちゃな瞬間も。"}
                </p>
                <span
                    style={{
                        display: "block",
                        marginTop: 14,
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
