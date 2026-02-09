"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface BackdropSurfaceProps {
    /**
     * The content that sits in the back (e.g., The Modal/Menu/Context).
     * This is revealed when the front layer drops down or slides up.
     */
    backLayer: React.ReactNode;

    /**
     * The main content that sits in the front (e.g., Home Screen).
     * This layer moves to reveal the back layer.
     */
    frontLayer: React.ReactNode;

    /**
     * Whether the back layer is currently revealed.
     * true = Front layer has moved (to reveal back).
     * false = Front layer is covering back (default state).
     */
    isRevealed: boolean;

    /**
     * Callback when the user taps the front layer to conceal the back layer.
     */
    onConceal?: () => void;

    /**
     * The Y-axis offset for the front layer when revealed.
     * e.g. "-30%" means the front layer moves UP by 30% of its height.
     * e.g. "80vh" means the front layer moves DOWN to 80vh.
     * Default: "-30%" (Slide Up Reveal)
     */
    revealOffset?: string;

    /**
     * ClassName for the front layer container.
     */
    className?: string;
}

/**
 * BackdropSurface
 * 
 * A formal implementation of the "Backdrop" or "Reveal" UI pattern.
 * Manages the z-index and motion coordination between a front 'active' layer
 * and a back 'context' layer.
 * 
 * Behavior:
 * - Front layer sits on top (z-30).
 * - Back layer sits behind (z-0).
 * - When `isRevealed` is true, Front layer animates to `revealOffset`.
 */
export const BackdropSurface = ({
    backLayer,
    frontLayer,
    isRevealed,
    onConceal,
    revealOffset = "-30%",
    className
}: BackdropSurfaceProps) => {

    // Snappy Premium Spring Transition
    const springTransition = {
        type: "spring" as const,
        stiffness: 400, // Faster tracking
        damping: 38,   // No bounce
        mass: 1
    };

    const variants: Variants = {
        concealed: {
            y: 0,
            scale: 1,
            borderRadius: "0px",
            opacity: 1
        },
        revealed: {
            y: revealOffset,
            scale: 1, // Research-backed: Do not scale front layer for "Reveal" pattern
            borderRadius: "32px", // Smooth rounding when detaching
            opacity: 1
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#FAF8F5]">

            {/* Back Layer (Static Context) */}
            <div className="absolute inset-0 z-0 bg-[#FAF8F5]">
                {backLayer}
            </div>

            {/* Front Layer (Active Content) */}
            <motion.div
                className={cn(
                    "flex-1 w-full max-w-md mx-auto relative flex flex-col bg-[#18181B] z-30 origin-top overflow-hidden",
                    className
                )}
                initial="concealed"
                animate={isRevealed ? "revealed" : "concealed"}
                variants={variants}
                transition={springTransition}
                onClick={() => {
                    if (isRevealed && onConceal) {
                        onConceal();
                    }
                }}
            >
                {/* Visual Scrim Overlay on the front layer when revealed to fix overlap noise */}
                <motion.div
                    className="absolute inset-0 z-[31] pointer-events-none bg-black/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isRevealed ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                />

                {frontLayer}
            </motion.div>
        </div>
    );
};
