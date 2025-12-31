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
}

export function EditorialCorners({ onOpenPickup, onOpenCalendar, onOpenGallery, onOpenCare, onOpenActivity }: EditorialCornersProps) {
    const today = new Date();
    const dateStr = format(today, "MMM d", { locale: ja }); // e.g., Oct 31
    const dayStr = format(today, "EEE", { locale: ja }); // e.g., Sat

    return (
        <div className="absolute inset-0 pointer-events-none z-40 p-6 flex flex-col justify-between">
            {/* Top Row */}
            <div className="flex justify-between items-start pointer-events-auto">
                {/* Calendar */}
                <button
                    onClick={onOpenCalendar}
                    className="text-left group"
                >
                    <div className="text-white/70 text-xs tracking-widest font-light uppercase">{dayStr}</div>
                    <div className="text-white text-xl font-serif tracking-widest leading-none group-hover:underline decoration-white/50 underline-offset-4">
                        {dateStr}
                    </div>
                </button>

                {/* Activity & Care */}
                <div className="flex items-start gap-6">
                    <button
                        onClick={onOpenActivity}
                        className="text-right group"
                    >
                        <div className="text-white/70 text-xs tracking-widest font-light uppercase">Recent</div>
                        <div className="text-white text-sm font-serif group-hover:underline decoration-white/50 underline-offset-4">
                            Logs
                        </div>
                    </button>
                    <button
                        onClick={onOpenCare}
                        className="text-right group"
                    >
                        <div className="text-white/70 text-xs tracking-widest font-light uppercase">App</div>
                        <div className="text-white text-sm font-serif group-hover:underline decoration-white/50 underline-offset-4">
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
                    <div className="text-white/70 text-xs tracking-widest font-light uppercase">View</div>
                    <div className="text-white text-sm font-serif group-hover:underline decoration-white/50 underline-offset-4">
                        Gallery
                    </div>
                </button>

                <button
                    onClick={onOpenPickup}
                    className="text-right group"
                >
                    <div className="text-white/70 text-xs tracking-widest font-light uppercase">Daily</div>
                    <div className="text-white text-4xl font-thin font-serif italic tracking-wider group-active:scale-95 transition-transform drop-shadow-md">
                        PICKUP
                    </div>
                </button>
            </div>
        </div>
    );
}
