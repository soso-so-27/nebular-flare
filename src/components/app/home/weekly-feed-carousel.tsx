"use client";

import React, { useRef } from "react";
import { Sparkles, Heart, Camera, ArrowRight, BookOpen, Stethoscope, FileText, Plus, History } from "lucide-react";

export interface FeedItem {
    id: string;
    type: 'photo' | 'care' | 'memory' | 'fortune' | 'tip' | 'insight' | 'album' | 'report';
    title: string;
    content?: string;
    subContent?: string;
    imageUrl?: string;
    dateLabel?: string;
    ctaLabel?: string;
    icon?: any;
    color?: string;
    listItems?: { label: string; time: string; icon: any; onClick?: () => void }[];
    onClick?: () => void;
}

interface WeeklyFeedCarouselProps {
    screenWidth: number;
    xOffset: number;
    items?: FeedItem[];
}

export function WeeklyFeedCarousel({ screenWidth, xOffset, items }: WeeklyFeedCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const HAIRLINE = 1;
    const GRID_INNER_PADDING = 8; // p-2 in DayCell

    // 【座標の定義】
    // 1. グリッド全体の左端 = xOffset
    // 2. セルの枠線の位置 = xOffset + 1px (HAIRLINE)
    // 3. セル内テキストの開始点 = xOffset + 1px + 8px (GRID_INNER_PADDING)

    // カードの開始位置（セルの枠線と揃える）
    const cardStartPos = xOffset + HAIRLINE;

    // ラベルの開始位置（TODAYなどのテキストと揃える）
    const textStartPos = cardStartPos + GRID_INNER_PADDING;

    // 初期化時にスクロール位置をリセット
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = 0;
        }
    }, []);

    const displayItems: FeedItem[] = items || [];
    const cardWidth = Math.floor(screenWidth * 0.74);
    const cardHeight = 135;

    const renderPhotoCard = (item: FeedItem) => (
        <div className="h-full flex overflow-hidden group/photo relative">
            {/* Left Column: Context & Action */}
            <div className="w-[42%] flex flex-col p-3.5 pr-2 z-10 bg-gradient-to-r from-white/20 to-transparent">
                <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                    <div className="w-1 h-1 rounded-full bg-brand-peach" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.05em] text-[#4E342E]/60 truncate">
                        {item.title}
                    </h3>
                </div>

                {item.dateLabel && (
                    <span className="text-[8px] font-black text-[#8D6E63]/60 tracking-tight mb-2">
                        {item.dateLabel}
                    </span>
                )}

                <div className="mt-auto">
                    {item.ctaLabel && (
                        <div className="inline-flex px-2 py-1 bg-[#4E342E]/5 rounded-md text-[8.5px] font-black text-[#4E342E]/70 border border-[#4E342E]/10 backdrop-blur-sm">
                            {item.ctaLabel}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: The "Visible" Content */}
            <div className="flex-1 relative overflow-hidden">
                {item.imageUrl ? (
                    <>
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        {/* Decorative Paper Tape overlaying the seam */}
                        <div className="absolute -left-1 top-4 w-3 h-10 bg-white/10 -rotate-12 backdrop-blur-[1px] border-x border-white/5" />
                        {/* Subtle edge shadow for depth */}
                        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#4E342E]/[0.03] space-y-1">
                        <Camera className="w-4 h-4 text-[#4E342E]/20" />
                        <p className="text-[8px] text-[#4E342E]/30 font-bold px-4 text-center leading-tight">{item.content}</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCareCard = (item: FeedItem) => {
        const items = item.listItems?.slice(0, 2) || [];
        return (
            <div className="h-full flex flex-col px-4 pt-4 pb-3 overflow-hidden">
                <div className="flex items-center gap-2 mb-2 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-peach" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.05em] text-[#4E342E]/50">{item.title}</h3>
                </div>
                <div className="flex-1 flex flex-col justify-center gap-1.5 min-h-0 overflow-hidden">
                    {items.map((log, idx) => (
                        <div
                            key={idx}
                            className={`group/item flex items-center justify-between py-1.5 border-b border-[#4E342E]/[0.05] last:border-0 transition-all ${log.onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                            onClick={(e) => {
                                if (log.onClick) {
                                    e.stopPropagation();
                                    log.onClick();
                                }
                            }}
                        >
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11.5px] font-black text-[#4E342E] truncate leading-tight">
                                    {log.label}
                                </span>
                                <span className="text-[8.5px] text-[#8D6E63] font-bold tracking-tight">
                                    {log.time}
                                </span>
                            </div>
                            {log.onClick && (
                                <div className="w-5 h-5 rounded-full bg-brand-peach/5 border border-brand-peach/10 flex items-center justify-center shrink-0">
                                    <Heart className="w-2 h-2 text-brand-peach/50" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAlbumCard = (item: FeedItem) => (
        <div className="relative w-full h-full flex group/album overflow-hidden bg-[#4E342E]/[0.02]">
            <div className="w-full h-full relative">
                {item.imageUrl ? (
                    <>
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#4E342E]/80 via-transparent to-transparent" />
                        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#4E342E]/30 to-transparent" />

                        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                            <div>
                                <span className="text-[8px] font-black text-brand-peach/80 uppercase tracking-widest block mb-0.5">Summary</span>
                                <h3 className="text-xs font-black text-white leading-tight">今週のアルバム</h3>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                                <ArrowRight className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <BookOpen className="w-6 h-6 text-[#4E342E]/10 mb-2" />
                        <h3 className="text-[10px] font-bold text-[#4E342E]/40 tracking-widest uppercase">No Photos</h3>
                    </div>
                )}
            </div>
        </div>
    );

    const renderReportCard = (item: FeedItem) => (
        <div className="h-full flex flex-col p-4 bg-gradient-to-br from-[#FEFDFB] to-[#F5E6D3] relative overflow-hidden group/report">
            <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-7 h-7 rounded-lg bg-brand-peach/20 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-brand-peach" />
                </div>
                <div>
                    <h3 className="text-xs font-black text-[#4E342E]">受診用レポート</h3>
                </div>
            </div>

            <p className="text-[10px] text-[#4E342E]/60 font-medium leading-tight mb-2 relative z-10">
                {item.content || "今週の体調変化を獣医さんに。"}
            </p>

            <div className="mt-auto flex justify-between items-center relative z-10">
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-brand-peach animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-[#4E342E]/10" />
                </div>
                <div className="px-3 py-1 bg-[#4E342E]/10 rounded-full text-[9px] font-bold text-[#4E342E]/70 border border-[#4E342E]/10">
                    レポートを作成
                </div>
            </div>
        </div>
    );

    const renderContent = (item: FeedItem) => {
        let content;
        if (item.type === 'album') content = renderAlbumCard(item);
        else if (item.type === 'report') content = renderReportCard(item);
        else if (item.type === 'care') content = renderCareCard(item);
        else if (item.type === 'photo' || item.type === 'memory') content = renderPhotoCard(item);
        else {
            content = (
                <div className="p-4 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        {item.icon && <item.icon className="w-3 h-3 text-[#8D6E63]" />}
                        <h3 className="text-xs font-bold text-[#4E342E]">{item.title}</h3>
                    </div>
                    <p className="text-[10px] text-[#4E342E]/70 font-medium leading-tight line-clamp-3">{item.content}</p>
                </div>
            );
        }

        if (item.onClick) {
            return (
                <button onClick={item.onClick} className="w-full h-full text-left appearance-none">
                    {content}
                </button>
            );
        }

        return content;
    };

    return (
        <section className="m-0 p-0 overflow-hidden relative">
            {/* Global SVG Filter for Paper Grain */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id='paper-noise'>
                    <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch' />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
                </filter>
            </svg>

            <div
                className="mb-2 relative flex items-center"
                style={{ paddingLeft: textStartPos }}
            >
                <div className="relative flex items-center">
                    <h2 className="text-[10px] font-black text-[#4E342E]/30 uppercase tracking-[0.2em] leading-none m-0 font-sans">
                        チェックリスト
                    </h2>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full pb-4"
                style={{
                    paddingLeft: cardStartPos,
                    scrollPaddingLeft: cardStartPos
                }}
            >
                {displayItems.map((item) => (
                    <div
                        key={item.id}
                        className="snap-start flex-shrink-0 relative"
                        style={{
                            width: cardWidth,
                            height: cardHeight,
                            marginRight: 10,
                        }}
                    >
                        {/* THE CARD CONTAINER: Standardized Vol. 6 Design */}
                        <div className="w-full h-full rounded-2xl bg-[#FEFDFB]/70 border border-[#4E342E]/5 overflow-hidden shadow-[0_6px_20px_rgba(78,52,46,0.08)] backdrop-blur-sm relative">
                            {/* Texture Overlay */}
                            <div
                                className="absolute inset-0 pointer-events-none opacity-[0.4]"
                                style={{ filter: 'url(#paper-noise)' }}
                            />

                            <div className="relative w-full h-full">
                                {renderContent(item)}
                            </div>
                        </div>
                    </div>
                ))}
                <div className="flex-shrink-0" style={{ width: cardStartPos }} />
            </div>
        </section>
    );
}
