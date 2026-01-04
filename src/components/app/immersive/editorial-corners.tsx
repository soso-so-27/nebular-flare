"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface EditorialCornersProps {
    onOpenPickup: () => void;
    onOpenCalendar: () => void;
    onOpenGallery: () => void;
    onOpenCare: () => void;
    onOpenActivity: () => void;
    contrastMode: 'light' | 'dark';
}

export function EditorialCorners({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenCare, onOpenActivity, contrastMode }: EditorialCornersProps) {
    const today = new Date();
    const dateStr = format(today, "MMM d", { locale: ja }); // e.g., Oct 31
    const dayStr = format(today, "EEE", { locale: ja }); // e.g., Sat

    const isLight = contrastMode === 'light';
    const textColor = isLight ? 'text-zinc-900' : 'text-white';
    const subTextColor = isLight ? 'text-zinc-600' : 'text-white/70';
    const decorationColor = isLight ? 'decoration-black/40' : 'decoration-white/50';

    return (
        <div className="absolute inset-0 pointer-events-none z-40 p-6 flex flex-col justify-between">
            {/* Top Row */}
            <div className="flex justify-between items-start pointer-events-auto">
                {/* Calendar */}
                <button
                    onClick={onOpenCalendar}
                    className="text-left group"
                >
                    <div className={`${subTextColor} text-xs tracking-widest font-light uppercase`}>{dayStr}</div>
                    <div className={`${textColor} text-xl font-serif tracking-widest leading-none group-hover:underline ${decorationColor} underline-offset-4`}>
                        {dateStr}
                    </div>
                </button>

                {/* Activity & Care */}
                <div className="flex items-start gap-6">
                    <button
                        onClick={onOpenActivity}
                        className="text-right group"
                    >
                        <div className={`${subTextColor} text-xs tracking-widest font-light uppercase`}>Recent</div>
                        <div className={`${textColor} text-sm font-serif group-hover:underline ${decorationColor} underline-offset-4`}>
                            Logs
                        </div>
                    </button>
                    <button
                        onClick={onOpenCare}
                        className="text-right group"
                    >
                        <div className={`${subTextColor} text-xs tracking-widest font-light uppercase`}>App</div>
                        <div className={`${textColor} text-sm font-serif group-hover:underline ${decorationColor} underline-offset-4`}>
                            Care
                        </div>
                    </button>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="flex justify-between items-end pointer-events-auto">
                <button
                    onClick={onOpenGallery}
                    className="text-left group"
                >
                    <div className={`${subTextColor} text-xs tracking-widest font-light uppercase`}>View</div>
                    <div className={`${textColor} text-sm font-serif group-hover:underline ${decorationColor} underline-offset-4`}>
                        Gallery
                    </div>
                </button>

                <button
                    onClick={onOpenPickup}
                    className="text-right group"
                >
                    <div className={`${subTextColor} text-xs tracking-widest font-light uppercase`}>Daily</div>
                    <div className={`${textColor} text-4xl font-thin font-serif italic tracking-wider group-active:scale-95 transition-transform drop-shadow-md`}>
                        PICKUP
                    </div>
                </button>
            </div>
        </div>
    );
}
