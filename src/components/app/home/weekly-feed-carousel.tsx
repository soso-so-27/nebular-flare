"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Lightbulb, History, TrendingUp, Heart } from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";

interface FeedItem {
    id: string;
    type: 'stats' | 'tip' | 'memory';
    title: string;
    content: string;
    value?: string;
    icon?: any;
    imageUrl?: string;
    color?: string;
}

interface WeeklyFeedCarouselProps {
    screenWidth: number;
    items?: FeedItem[];
}

export function WeeklyFeedCarousel({ screenWidth, items }: WeeklyFeedCarouselProps) {
    // Generate dummy items if none provided
    const displayItems: FeedItem[] = items || [
        {
            id: 'stats-1',
            type: 'stats',
            title: '今週のお世話',
            content: '完了したタスク',
            value: '24',
            icon: TrendingUp,
            color: 'text-emerald-400'
        },
        {
            id: 'tip-1',
            type: 'tip',
            title: '猫の豆知識',
            content: '猫が喉を鳴らすのは、リラックスしている時だけでなく、不安な時や体を癒そうとしている時もあります。',
            icon: Lightbulb,
            color: 'text-amber-400'
        },
        {
            id: 'memory-1',
            type: 'memory',
            title: '去年の今日',
            content: '日向ぼっこ中の一枚。穏やかな午後でした。',
            imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400',
            icon: History,
            color: 'text-rose-400'
        },
        {
            id: 'stats-2',
            type: 'stats',
            title: '足あと',
            content: '獲得したポイント',
            value: '1,250',
            icon: Sparkles,
            color: 'text-sky-400'
        }
    ];

    const cardWidth = Math.floor(screenWidth * 0.74); // 74% for even better readability and peeking
    const cardHeight = 155;

    return (
        <section className="mt-0 mb-0 overflow-hidden relative">
            <div className="px-5 mb-1.5 flex items-center justify-between">
                <h2 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400/60" />
                    あなたの記録
                </h2>
                <button className="text-[9px] font-bold text-white/20 hover:text-white/40 transition-colors tracking-wider">
                    すべて見る
                </button>
            </div>

            {/* Right edge fade gradient to suggest scrolling */}
            <div className="absolute right-0 top-8 bottom-0 w-16 bg-gradient-to-l from-[#0A0A0B] to-transparent z-20 pointer-events-none" />

            <div
                className="flex gap-3 overflow-x-auto px-5 pb-5 no-scrollbar snap-x snap-mandatory relative z-10"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {displayItems.map((item) => (
                    <div
                        key={item.id}
                        className="snap-start shrink-0"
                        style={{ width: cardWidth }}
                    >
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            className="relative h-full overflow-hidden rounded-[24px] bg-[#1C1C1E]/80 backdrop-blur-md border border-white/5 shadow-2xl flex flex-col"
                            style={{ height: cardHeight }}
                        >
                            {/* Background image for memories */}
                            {item.imageUrl && (
                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={item.imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover opacity-40"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/40 to-transparent" />
                                </div>
                            )}

                            <div className="relative z-10 p-5 flex flex-col h-full">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center bg-white/5",
                                        item.imageUrl && "bg-black/20 backdrop-blur-sm"
                                    )}>
                                        {item.icon && <item.icon className={cn("w-4.5 h-4.5", item.color)} />}
                                    </div>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                        {item.title}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    {item.value ? (
                                        <div className="flex items-baseline gap-1.5 mt-1">
                                            <span className="text-4xl font-black text-white tabular-nums tracking-tighter">
                                                {item.value}
                                            </span>
                                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                                {item.content}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-[12px] text-white/80 leading-[1.6] font-medium line-clamp-3">
                                            {item.content}
                                        </p>
                                    )}
                                </div>

                                {item.type === 'memory' && (
                                    <div className="mt-auto flex items-center gap-1.5">
                                        <div className="flex -space-x-1.5">
                                            {[1, 2].map(id => (
                                                <div key={id} className="w-4 h-4 rounded-full border border-[#1C1C1E] bg-white/10" />
                                            ))}
                                        </div>
                                        <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Favorite Moment</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                ))}

                {/* End Spacer */}
                <div className="shrink-0 w-6" />
            </div>
        </section>
    );
}
