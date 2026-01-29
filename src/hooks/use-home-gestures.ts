"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PanInfo } from "framer-motion";
import { Cat } from "@/types";

export function useHomeGestures(
    cats: Cat[],
    activeCatId: string,
    setActiveCatId: (id: string) => void
) {
    const [uiVisible, setUiVisible] = useState(true);
    const [direction, setDirection] = useState(0);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetHideTimer = useCallback(() => {
        setUiVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            setUiVisible(false);
        }, 3000);
    }, []);

    useEffect(() => {
        const resetHandler = () => resetHideTimer();
        window.addEventListener('mousemove', resetHandler);
        window.addEventListener('touchstart', resetHandler);
        window.addEventListener('click', resetHandler);

        resetHideTimer();

        return () => {
            window.removeEventListener('mousemove', resetHandler);
            window.removeEventListener('touchstart', resetHandler);
            window.removeEventListener('click', resetHandler);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, [resetHideTimer]);

    const handleSwipe = (_event: any, info: PanInfo) => {
        const currentIndex = cats.findIndex(c => c.id === activeCatId);
        const threshold = 50;
        if (info.offset.x < -threshold && currentIndex < cats.length - 1) {
            setDirection(1);
            setActiveCatId(cats[currentIndex + 1].id);
        } else if (info.offset.x > threshold && currentIndex > 0) {
            setDirection(-1);
            setActiveCatId(cats[currentIndex - 1].id);
        }
    };

    const goToCat = (index: number) => {
        const currentIndex = cats.findIndex(c => c.id === activeCatId);
        if (index >= 0 && index < cats.length) {
            setDirection(index > currentIndex ? 1 : -1);
            setActiveCatId(cats[index].id);
        }
    };

    return {
        uiVisible,
        direction,
        setDirection,
        handleSwipe,
        goToCat,
        resetHideTimer
    };
}
