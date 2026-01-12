"use client";

import { motion } from "framer-motion";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAF9F7] select-none overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#E8B4A0]/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#7CAA8E]/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div
                className="relative z-10 flex flex-col items-center"
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
                    className="relative w-32 h-32 flex items-center justify-center"
                >
                    {/* Glass Container */}
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" />

                    {/* Inner Specular Highlight */}
                    <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70" />

                    {/* App Icon */}
                    <img
                        src="/icon.svg"
                        alt="NyaruHD Logo"
                        className="w-20 h-20 relative z-20 drop-shadow-sm object-contain"
                    />
                </motion.div>

                {/* Brand Text */}
                <div className="mt-8 flex flex-col items-center gap-3">
                    <h1 className="text-2xl font-black tracking-wider text-slate-700">
                        NyaruHD
                    </h1>

                    {/* Loading Dots */}
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-[#E8B4A0]' : i === 1 ? 'bg-[#7CAA8E]' : 'bg-[#B8A6D9]'}`}
                                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                        ))}
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 text-[10px] font-bold tracking-[0.2em] text-[#7CAA8E]/60 animate-pulse"
                    >
                        LOADING...
                    </motion.p>
                </div>
            </div>
        </div>
    );
}
