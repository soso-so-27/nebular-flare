"use client";

import { motion } from "framer-motion";
import { Cat, PawPrint } from "lucide-react";
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
    "猫を探しています...",
    "お皿を洗っています...",
    "カリカリを補充中...",
    "トイレを掃除中...",
    "お昼寝の準備...",
    "爪を研いでいます...",
    "毛づくろい中...",
    "またたびを検品中...",
    "肉球をマッサージ中...",
    "ひなたぼっこ中..."
];

export function SplashScreen() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F5F0E6] text-amber-900 select-none">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
            >
                {/* Brand Logo Animation */}
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center relative overflow-hidden"
                >
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-amber-100 rounded-full opacity-50" />
                    <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-orange-100 rounded-full opacity-50" />

                    <Cat className="w-12 h-12 text-amber-500 fill-amber-500/10 relative z-10" />
                </motion.div>

                {/* Paw Prints Animation */}
                <motion.div
                    animate={{ opacity: [0, 1, 0], y: -20 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    className="absolute -top-8 right-0"
                >
                    <PawPrint className="w-4 h-4 text-amber-400/40 rotate-12" />
                </motion.div>
                <motion.div
                    animate={{ opacity: [0, 1, 0], y: -20 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    className="absolute -top-4 -right-6"
                >
                    <PawPrint className="w-4 h-4 text-amber-400/40 rotate-45" />
                </motion.div>

            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 text-center"
            >
                <h1 className="text-2xl font-black tracking-tight text-amber-950">
                    CatUp
                </h1>
                <p className="text-xs font-medium text-amber-700/60 mt-2 animate-pulse">
                    {message}
                </p>
            </motion.div>

            {/* Bottom Credit */}
            <div className="absolute bottom-8 text-[10px] text-amber-900/20 font-medium">
                Syncing with your household...
            </div>
        </div>
    );
}
