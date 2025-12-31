"use client";

import { motion } from "framer-motion";
import { Cat } from "lucide-react";

export function SplashScreen() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 text-slate-900 select-none">
            <motion.div
                className="relative"
            >
                {/* Brand Logo Animation */}
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center relative overflow-hidden ring-1 ring-slate-100"
                >
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-slate-100 rounded-full opacity-50" />
                    <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-slate-100 rounded-full opacity-50" />

                    <Cat className="w-12 h-12 text-slate-900 relative z-10" />
                </motion.div>

            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 text-center"
            >
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    CatUp
                </h1>
                <div className="flex justify-center gap-1 mt-3">
                    <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-slate-400"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-slate-400"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-slate-400"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                </div>
            </motion.div>

            {/* Bottom Credit */}
            <div className="absolute bottom-8 text-[10px] text-slate-400 font-medium tracking-wide">
                LOADING
            </div>
        </div>
    );
}
