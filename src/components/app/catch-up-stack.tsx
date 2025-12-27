"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { CatchUpItem } from "@/lib/utils-catchup";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SwipeableCardProps {
    item: CatchUpItem;
    onSwipe: (direction: 'left' | 'right') => void;
    onVerticalSwipe?: (direction: 'up' | 'down') => void;
    onButtonAction?: (value: string) => void;
    isTop: boolean;
}

interface CatchUpStackProps {
    items: CatchUpItem[];
    onAction: (item: CatchUpItem, action: 'done' | 'later', value?: string) => void;
    onIndexChange?: (index: number) => void;
    onVerticalSwipe?: (direction: 'up' | 'down') => void;
}

const SwipeableCard = ({ item, onSwipe, onVerticalSwipe, onButtonAction, isTop }: SwipeableCardProps) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // State for inline memo input
    const [isExpanded, setIsExpanded] = useState(false);
    const [memoText, setMemoText] = useState('');

    const rotate = useTransform(x, [-150, 150], [-15, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
    const scaleOnDrag = useTransform(x, [-50, 0, 50], [1.02, 1.03, 1.02]);

    const handleDragEnd = (_: any, info: any) => {
        // Use Framer Motion's built-in velocity from info for more accuracy
        const offsetX = info.offset.x;
        const offsetY = info.offset.y;
        const velocityX = info.velocity.x;
        const velocityY = info.velocity.y;

        // === Mobile-optimized Tinder/Slack-like settings ===
        // Lower thresholds for touch - fingers move faster and with more intention
        const positionThreshold = 80;  // Reduced from 150 - easier to trigger
        // Lower velocity threshold for natural flick gestures
        const velocityThreshold = 300;  // Reduced from 500 - responsive to quick flicks
        // Combined score: position + velocity contribution
        const combinedScore = Math.abs(offsetX) + Math.abs(velocityX) * 0.15;
        const combinedThreshold = 100;  // Reduced from 160

        // Vertical swipe settings (for cat switching)
        const verticalThreshold = 60;  // Reduced from 100
        const verticalVelocityThreshold = 250;  // Reduced from 400

        // Calculate primary gesture direction
        const absX = Math.abs(offsetX);
        const absY = Math.abs(offsetY);
        const isHorizontal = absX > absY * 1.5 || (absX > 40 && absY < 30);
        const isVertical = absY > absX * 1.5 || (absY > 40 && absX < 30);

        if (isHorizontal) {
            // Right swipe = DONE (more generous detection for touch)
            const shouldSwipeRight =
                offsetX > positionThreshold ||
                velocityX > velocityThreshold ||
                (offsetX > 30 && combinedScore > combinedThreshold);

            // Left swipe = LATER
            const shouldSwipeLeft =
                offsetX < -positionThreshold ||
                velocityX < -velocityThreshold ||
                (offsetX < -30 && combinedScore > combinedThreshold);

            if (shouldSwipeRight) {
                onSwipe('right');
            } else if (shouldSwipeLeft) {
                onSwipe('left');
            }
        } else if (isVertical && onVerticalSwipe) {
            // Vertical swipe for cat switching
            const shouldSwipeUp =
                offsetY < -verticalThreshold ||
                velocityY < -verticalVelocityThreshold;
            const shouldSwipeDown =
                offsetY > verticalThreshold ||
                velocityY > verticalVelocityThreshold;

            if (shouldSwipeUp) {
                onVerticalSwipe('up');
            } else if (shouldSwipeDown) {
                onVerticalSwipe('down');
            }
        }
    };

    if (!isTop) {
        return (
            <motion.div
                style={{
                    scale: useTransform(x, [-200, 0, 200], [1, 0.98, 1]),
                    opacity: useTransform(x, [-200, 0, 200], [0.6, 0.4, 0.6]),
                    y: useTransform(x, [-200, 0, 200], [0, 8, 0])
                }}
                className="absolute inset-0 pointer-events-none"
            >
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg" />
            </motion.div>
        );
    }

    return (
        <motion.div
            style={{ x, y, rotate, opacity, scale: scaleOnDrag, zIndex: 10, willChange: "transform", touchAction: "none" }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1}  // Maximum elasticity = card follows finger exactly
            dragMomentum={true}
            dragTransition={{
                bounceStiffness: 500,  // Snappier bounce back
                bounceDamping: 25,
                power: 0.2,
                timeConstant: 150
            }}
            onDragEnd={handleDragEnd}
            whileTap={{ scale: 1.02 }}
            whileDrag={{ scale: 1.03 }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 35,
                mass: 0.4
            }}
        >
            {/* Card with content only - no buttons (Slack style: buttons outside card) */}
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                {/* Main content area */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-center">
                    {/* Title */}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-3">
                        {item.title}
                    </h3>

                    {/* Body text */}
                    <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                        {item.body}
                    </p>

                    {/* Meta info if available */}
                    {item.meta && (
                        <p className="mt-4 text-sm text-slate-400">
                            {item.meta}
                        </p>
                    )}

                    {/* Expanded memo input - only shown inside card when needed */}
                    {(item.type === 'unrecorded' || item.type === 'notice') && onButtonAction && isExpanded && (
                        <div className="mt-6 space-y-3">
                            <textarea
                                value={memoText}
                                onChange={(e) => setMemoText(e.target.value)}
                                placeholder="何が違いましたか？"
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                                rows={2}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(false);
                                        setMemoText('');
                                    }}
                                    className="flex-1 py-3 px-4 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 active:scale-95 transition-all"
                                >
                                    戻る
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const value = memoText.trim() ? `ちょっと違う: ${memoText.trim()}` : 'ちょっと違う';
                                        onButtonAction(value);
                                    }}
                                    className="flex-1 py-3 px-4 rounded-full bg-rose-500 text-white font-medium text-sm hover:bg-rose-600 active:scale-95 transition-all"
                                >
                                    記録する
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export function CatchUpStack({
    items,
    onAction,
    onIndexChange,
    onVerticalSwipe
}: CatchUpStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleSwipe = (direction: 'left' | 'right') => {
        const item = items[currentIndex];
        if (item) {
            onAction(item, direction === 'right' ? 'done' : 'later');
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            if (onIndexChange) onIndexChange(nextIndex);
        }
    };

    const handleButtonAction = (value: string) => {
        const item = items[currentIndex];
        if (item) {
            onAction(item, 'done', value);
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            if (onIndexChange) onIndexChange(nextIndex);
        }
    };

    const currentItem = items[currentIndex];
    const nextItem = items[currentIndex + 1];

    return (
        <div className="absolute inset-0">
            <AnimatePresence>
                {currentItem ? (
                    <React.Fragment key={currentItem.id}>
                        {nextItem && (
                            <SwipeableCard
                                key={nextItem.id + "_back"}
                                item={nextItem}
                                onSwipe={() => { }}
                                isTop={false}
                            />
                        )}
                        <SwipeableCard
                            key={currentItem.id}
                            item={currentItem}
                            onSwipe={handleSwipe}
                            onVerticalSwipe={onVerticalSwipe}
                            onButtonAction={(currentItem.type === 'unrecorded' || currentItem.type === 'notice') ? handleButtonAction : undefined}
                            isTop={true}
                        />
                    </React.Fragment>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
