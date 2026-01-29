"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Mobile-friendly video component that ensures autoplay persists
 * through visibility changes and user interactions.
 */
interface BackgroundVideoProps {
    src: string;
    poster?: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    onLoadedData?: () => void;
}

export const BackgroundVideo = ({
    src,
    poster,
    className,
    onClick,
    onLoadedData
}: BackgroundVideoProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const attemptPlay = async () => {
            if (videoRef.current && videoRef.current.paused) {
                videoRef.current.defaultMuted = true;
                videoRef.current.muted = true;
                try {
                    await videoRef.current.play();
                } catch (e) {
                    console.log("Play failed", e);
                }
            }
        };

        // Try playing immediately
        attemptPlay();

        // Also resume when returning to the app (visibility change)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                attemptPlay();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [src]);

    return (
        <motion.video
            ref={videoRef}
            key={src} // Re-mount on src change to ensure reliable autoplay
            src={src}
            className={className}
            onClick={onClick}
            autoPlay
            muted
            loop
            playsInline
            poster={poster}
            onLoadedData={onLoadedData}
            onError={(e) => console.error("Video error:", e.currentTarget.error)}
        />
    );
};
