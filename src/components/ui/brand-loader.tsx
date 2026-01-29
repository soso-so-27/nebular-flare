"use client";

import { motion } from "framer-motion";
import { CatUpLogo } from "@/components/ui/cat-up-logo";

interface BrandLoaderProps {
    onClick?: () => void;
    className?: string;
}

export function BrandLoader({ onClick, className = "" }: BrandLoaderProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center select-none ${className}`}
            onClick={onClick}
        >
            {/* Breathing Brand Icon */}
            <motion.div
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.9, 1, 0.9],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="relative w-32 h-32 flex items-center justify-center cursor-pointer"
            >
                {/* Glass Container */}
                <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" />

                {/* Inner Specular Highlight */}
                <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70" />

                {/* App Icon - Use standardized icon */}
                {/* App Icon - Use standardized icon */}
                <CatUpLogo className="w-20 h-20 relative z-20 drop-shadow-sm" />
            </motion.div>

            {/* Brand Text */}
            <div className="mt-8 flex flex-col items-center gap-3">
                <h1 className="text-2xl font-black tracking-wider text-slate-700">
                    Nyaruhodo
                </h1>

                {/* Loading Dots */}
                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-brand-peach' : i === 1 ? 'bg-brand-sage' : 'bg-brand-lavender'}`}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
