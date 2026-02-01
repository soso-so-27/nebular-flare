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
    layoutId?: string;
}

export const BackgroundVideo = ({
    src,
    poster,
    className,
    onClick,
    onLoadedData,
    layoutId
}: BackgroundVideoProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        const attemptPlay = async () => {
            if (videoRef.current && videoRef.current.paused && isMounted.current) {
                videoRef.current.defaultMuted = true;
                videoRef.current.muted = true;
                try {
                    await videoRef.current.play();
                } catch (e: any) {
                    // AbortError is normal when component unmounts - don't log it as an error
                    if (e.name !== 'AbortError') {
                        console.log("[Video] Play interrupted or failed:", e.message);
                    }
                }
            }
        };

        // Try playing immediately
        attemptPlay();

        // Also resume when returning to the app (visibility change)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isMounted.current) {
                attemptPlay();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            isMounted.current = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [src]);

    return (
        <motion.video
            ref={videoRef}
            layoutId={layoutId}
            src={src} // Use direct src for better swap handling
            className={className}
            onClick={onClick}
            autoPlay
            muted
            loop
            playsInline
            poster={poster}
            onLoadedData={onLoadedData}
            onError={(e) => {
                // Ignore errors if the component is being unmounted
                if (!isMounted.current) return;

                const error = e.currentTarget.error;
                // Only log real errors, not cancellations
                if (error && error.code !== 4) { // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED often happens on quick swaps
                    console.error("Video error detail:", {
                        code: error.code,
                        message: error.message,
                        src: src
                    });
                }
            }}
        />
    );
};
