"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { CatchUpItem } from "@/lib/utils-catchup";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Cat } from "@/types";

interface SwipeableCardProps {
    item: CatchUpItem;
    cat?: Cat;
    onSwipe: (direction: 'left' | 'right', memo?: string) => void;
    onVerticalSwipe?: (direction: 'up' | 'down') => void;
    onButtonAction?: (value: string) => void;
    isTop: boolean;
}

interface CatchUpStackProps {
    items: CatchUpItem[];
    cats?: Cat[];
    onAction: (item: CatchUpItem, action: 'done' | 'later', value?: string) => void;
    onIndexChange?: (index: number) => void;
    onVerticalSwipe?: (direction: 'up' | 'down') => void;
}

const SwipeableCard = ({ item, cat, onSwipe, onVerticalSwipe, onButtonAction, isTop }: SwipeableCardProps) => {
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
        const positionThreshold = 80;
        const velocityThreshold = 300;
        const combinedScore = Math.abs(offsetX) + Math.abs(velocityX) * 0.15;
        const combinedThreshold = 100;

        const verticalThreshold = 60;
        const verticalVelocityThreshold = 250;

        const absX = Math.abs(offsetX);
        const absY = Math.abs(offsetY);
        const isHorizontal = absX > absY * 1.5 || (absX > 40 && absY < 30);
        const isVertical = absY > absX * 1.5 || (absY > 40 && absX < 30);

        if (isHorizontal) {
            const shouldSwipeRight =
                offsetX > positionThreshold ||
                velocityX > velocityThreshold ||
                (offsetX > 30 && combinedScore > combinedThreshold);

            const shouldSwipeLeft =
                offsetX < -positionThreshold ||
                velocityX < -velocityThreshold ||
                (offsetX < -30 && combinedScore > combinedThreshold);

            if (shouldSwipeRight) {
                onSwipe('right');
            } else if (shouldSwipeLeft) {
                // Pass memo content on left swipe
                onSwipe('left', memoText.trim() || undefined);
            }
        } else if (isVertical && onVerticalSwipe) {
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

    // Check if cat avatar is an image URL
    const hasImageAvatar = cat?.avatar && (cat.avatar.startsWith('http') || cat.avatar.startsWith('/'));

    if (!isTop) {
        // Back card - visible stack effect
        return (
            <motion.div
                style={{
                    scale: 0.95,
                    y: 12,
                    rotate: -2,
                }}
                className="absolute inset-0 pointer-events-none"
            >
                <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden">
                    {/* Show actual next cat image if available */}
                    {hasImageAvatar ? (
                        <img src={cat!.avatar} alt="" className="w-full h-full object-cover opacity-70" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" />
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            style={{ x, y, rotate, opacity, scale: scaleOnDrag, zIndex: 10, willChange: "transform", touchAction: "none" }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1}
            dragMomentum={true}
            dragTransition={{
                bounceStiffness: 500,
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
            {/* Card with background image */}
            <div className="w-full h-full rounded-2xl shadow-xl overflow-hidden flex flex-col relative">
                {/* Background Image - no overlay, just slight blur */}
                {hasImageAvatar && (
                    <img
                        src={cat!.avatar}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
                {!hasImageAvatar && (
                    <div className="absolute inset-0 bg-white dark:bg-slate-900" />
                )}

                {/* Content overlay */}
                <div className="relative z-10 flex-1 flex flex-col">
                    {/* Cat Avatar Badge - smaller, top left */}
                    {cat && (
                        <div className="px-5 pt-5 flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/30 backdrop-blur-md border-2 border-white/50 flex items-center justify-center flex-shrink-0 shadow-lg">
                                {hasImageAvatar ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl">{cat.avatar || "🐈"}</span>
                                )}
                            </div>
                            <div>
                                <p
                                    className={cn("font-bold text-sm", hasImageAvatar ? "text-white" : "text-slate-900 dark:text-white")}
                                    style={hasImageAvatar ? { textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)' } : {}}
                                >{cat.name}</p>
                                <p
                                    className={cn("text-xs", hasImageAvatar ? "text-white" : "text-slate-500")}
                                    style={hasImageAvatar ? { textShadow: '0 1px 4px rgba(0,0,0,0.8)' } : {}}
                                >様子確認</p>
                            </div>
                        </div>
                    )}

                    {/* Main content area - with frosted glass effect for readability */}
                    <div className={cn(
                        "flex-1 p-6 overflow-y-auto flex flex-col justify-end",
                        hasImageAvatar && "bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                    )}>
                        {/* Title - Large and prominent */}
                        <h3
                            className={cn(
                                "text-2xl sm:text-3xl font-black leading-tight mb-6",
                                hasImageAvatar ? "text-white" : "text-slate-900 dark:text-white"
                            )}
                            style={hasImageAvatar ? { textShadow: '0 2px 16px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)' } : {}}
                        >
                            {item.title}
                        </h3>

                        {/* Body text removed - redundant with avatar badge info */}

                        {/* Memo input - seamless glassmorphism design */}
                        {(item.type === 'unrecorded' || item.type === 'notice') && (
                            <div>
                                <input
                                    type="text"
                                    value={memoText}
                                    onChange={(e) => setMemoText(e.target.value)}
                                    placeholder="💬 メモを追加..."
                                    className={cn(
                                        "w-full px-5 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all",
                                        hasImageAvatar
                                            ? "bg-white/15 backdrop-blur-md border-0 text-white placeholder:text-white/50 focus:bg-white/25 focus:ring-2 focus:ring-white/30"
                                            : "bg-slate-100/80 border-0 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/30"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export function CatchUpStack({
    items,
    cats = [],
    onAction,
    onIndexChange,
    onVerticalSwipe
}: CatchUpStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleSwipe = (direction: 'left' | 'right', memo?: string) => {
        const item = items[currentIndex];
        if (item) {
            // Right swipe = OK, Left swipe = Notice with optional memo
            if (direction === 'right') {
                onAction(item, 'done', 'いつも通り');
            } else {
                const value = memo ? `ちょっと違う: ${memo}` : 'ちょっと違う';
                onAction(item, 'done', value);
            }
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

    // Find cats for current and next items
    const currentCat = currentItem?.catId ? cats.find(c => c.id === currentItem.catId) : undefined;
    const nextCat = nextItem?.catId ? cats.find(c => c.id === nextItem.catId) : undefined;

    return (
        <div className="absolute inset-0">
            <AnimatePresence>
                {currentItem ? (
                    <React.Fragment key={currentItem.id}>
                        {nextItem && (
                            <SwipeableCard
                                key={nextItem.id + "_back"}
                                item={nextItem}
                                cat={nextCat}
                                onSwipe={() => { }}
                                isTop={false}
                            />
                        )}
                        <SwipeableCard
                            key={currentItem.id}
                            item={currentItem}
                            cat={currentCat}
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
