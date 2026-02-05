"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getFullImageUrl } from "@/lib/utils";

interface Cat {
    id: string;
    name: string;
    avatar?: string | null;
}

interface CatFilterBarProps {
    cats: Cat[];
    selectedCatIds: string[];
    onToggle: (catId: string) => void;
    onSelectAll: () => void;
}

export function CatFilterBar({
    cats,
    selectedCatIds,
    onToggle,
    onSelectAll
}: CatFilterBarProps) {
    const isAllSelected = selectedCatIds.length === 0;

    return (
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* All Cats Button */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onSelectAll}
                className={`
                    flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                    transition-colors flex items-center gap-2
                    ${isAllSelected
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-white/70 hover:bg-zinc-700'
                    }
                `}
            >
                {isAllSelected && <Check className="w-4 h-4" />}
                全員
            </motion.button>

            {/* Individual Cat Buttons */}
            {cats.map(cat => {
                const isSelected = selectedCatIds.includes(cat.id);
                const avatarUrl = cat.avatar ? getFullImageUrl(cat.avatar) : null;

                return (
                    <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onToggle(cat.id)}
                        className={`
                            flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium
                            transition-colors flex items-center gap-2
                            ${isSelected
                                ? 'bg-white text-black'
                                : 'bg-zinc-800 text-white/70 hover:bg-zinc-700'
                            }
                        `}
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={cat.name}
                                className="w-5 h-5 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <span className="text-[10px]">🐱</span>
                            </div>
                        )}
                        {cat.name}
                        {isSelected && <Check className="w-4 h-4" />}
                    </motion.button>
                );
            })}
        </div>
    );
}
