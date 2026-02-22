"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    BookOpen,
    History,
    Image as ImageIcon,
    ChevronRight,
    Sparkles,
    LayoutGrid
} from "lucide-react";
import { triggerFeedback } from "@/lib/haptics";

interface AlbumScreenProps {
    onOpenZukan: () => void;
    onOpenDekigoto: () => void;
    onOpenGallery: () => void;
}

export const AlbumScreen: React.FC<AlbumScreenProps> = ({
    onOpenZukan,
    onOpenDekigoto,
    onOpenGallery
}) => {
    const categories = [
        {
            id: "zukan",
            label: "ねこ図鑑",
            description: "集めたポーズや表情のコレクション",
            icon: BookOpen,
            color: "bg-amber-100 text-amber-600",
            bgImage: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&auto=format&fit=crop",
            onClick: onOpenZukan
        },
        {
            id: "dekigoto",
            label: "できごと",
            description: "日々の思い出をタイムラインで",
            icon: History,
            color: "bg-blue-100 text-blue-600",
            bgImage: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=400&auto=format&fit=crop",
            onClick: onOpenDekigoto
        },
        {
            id: "gallery",
            label: "ギャラリー",
            description: "すべての写真と動画",
            icon: ImageIcon,
            color: "bg-purple-100 text-purple-600",
            bgImage: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?q=80&w=400&auto=format&fit=crop",
            onClick: onOpenGallery
        }
    ];

    return (
        <div className="min-h-full bg-[#FAF9F7] pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
            <header className="px-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-6">
                <h1 className="text-2xl font-bold text-slate-800">アルバム</h1>
                <p className="text-sm text-slate-500 mt-1">猫ちゃんとの思い出のすべて</p>
            </header>

            <div className="px-6 space-y-4">
                {categories.map((cat, idx) => {
                    const Icon = cat.icon;
                    return (
                        <motion.button
                            key={cat.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                triggerFeedback('medium');
                                cat.onClick();
                            }}
                            className="w-full relative h-40 rounded-3xl overflow-hidden shadow-sm group"
                        >
                            {/* Background Image with Overlay */}
                            <div className="absolute inset-0">
                                <img
                                    src={cat.bgImage}
                                    alt={cat.label}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="relative h-full p-6 flex flex-col justify-between items-start text-white">
                                <div className={`p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold">{cat.label}</div>
                                    <div className="text-sm opacity-80 mt-1">{cat.description}</div>
                                </div>
                            </div>

                            <div className="absolute right-6 bottom-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                <ChevronRight className="w-6 h-6 text-white" />
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* AI Highlight Section Placeholder */}
            <div className="px-6 mt-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        AI ハイライト
                    </h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
                    <div className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
                </div>
            </div>
        </div>
    );
};
