import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

// Available reactions - Simplified to just Heart
const REACTIONS = [
    { emoji: '❤️', label: 'ハート' },
];

type Reaction = {
    emoji: string;
    user_id: string;
    user_name?: string;
};

type ReactionBarProps = {
    incidentId: string;
    reactions: Reaction[];
    currentUserId?: string;
    onAddReaction: (emoji: string) => void;
    onRemoveReaction: (emoji: string) => void;
    compact?: boolean;
    orientation?: 'horizontal' | 'vertical'; // Kept for compatibility, though badge style makes it less relevant
};

export function ReactionBar({
    incidentId,
    reactions,
    currentUserId,
    onAddReaction,
    onRemoveReaction,
    compact = false,
    orientation = 'horizontal'
}: ReactionBarProps) {
    // Group reactions by emoji (though we only use heart now)
    const groupedReactions = reactions.reduce((acc, r) => {
        if (!acc[r.emoji]) {
            acc[r.emoji] = [];
        }
        acc[r.emoji].push(r);
        return acc;
    }, {} as Record<string, Reaction[]>);

    // Check if current user has reacted at least once with the heart
    const hasAnyHeart = reactions.some(r => r.emoji === '❤️' && r.user_id === currentUserId);
    const heartCount = groupedReactions['❤️']?.length || 0;

    const handleHeartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Optimistic UI update logic should differ ideally, but for now we just call the prop
        // The parent component handles the optimistic add/remove via Supabase
        onAddReaction('❤️');
    };

    return (
        <div className={`relative flex items-center justify-center`}>
            <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleHeartClick}
                animate={{
                    scale: heartCount > 0 ? [1, 1.25, 1] : 1
                }}
                transition={{
                    duration: 0.4,
                    times: [0, 0.5, 1],
                    ease: "easeInOut"
                }}
                key={heartCount} // Trigger animation on count change
                className={`
                    w-9 h-9 flex items-center justify-center rounded-full
                    transition-all duration-300
                    ${hasAnyHeart
                        ? 'bg-[#E8B4A0]/20 text-[#E8B4A0]'
                        : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}
                `}
            >
                <Heart
                    size={18}
                    fill={hasAnyHeart ? "currentColor" : "none"}
                    strokeWidth={hasAnyHeart ? 2.5 : 2}
                    className="transition-colors duration-300"
                />
            </motion.button>

            {heartCount > 0 && (
                <div className="absolute -bottom-1 -right-1 pointer-events-none z-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={heartCount}
                        className="flex items-center justify-center min-w-[14px] h-[14px] px-0.5 bg-[#E8B4A0] text-[#1E1E23] text-[9px] font-black rounded-full border border-[#1E1E23] shadow-sm tracking-tighter leading-none"
                    >
                        {heartCount}
                    </motion.div>
                </div>
            )}
        </div>
    );
}

// Compact version for timeline items (showing only if count > 0)
export function ReactionBadges({ reactions }: { reactions: Reaction[] }) {
    const heartCount = reactions.filter(r => r.emoji === '❤️').length;
    if (heartCount === 0) return null;

    return (
        <div className="flex items-center gap-1">
            <span className="text-[11px] flex items-center gap-0.5 text-[#E8B4A0]">
                <span>❤️</span>
                <span className="font-black tabular-nums">{heartCount}</span>
            </span>
        </div>
    );
}
