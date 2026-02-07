"use client";

import React, { useRef } from "react";
import { Sparkles, Heart, Camera, ArrowRight, BookOpen, Stethoscope, FileText } from "lucide-react";

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

    const displayItems: FeedItem[] = items || [];
    const cardWidth = Math.floor(screenWidth * 0.74);
    const cardHeight = 135;

    const renderPhotoCard = (item: FeedItem) => (
        <div className="relative w-full h-full flex flex-col">
            {item.imageUrl ? (
                <div className="absolute inset-0">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-sm font-bold text-white mb-0.5">{item.title}</h3>
                        {item.dateLabel && <p className="text-[10px] text-white/70">{item.dateLabel}</p>}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                        <Camera className="w-5 h-5 text-white/40" />
                    </div>
                    <p className="text-[11px] text-white/50 mb-3">{item.content}</p>
                    {item.ctaLabel && (
                        <div className="px-5 py-1.5 bg-white/10 rounded-full text-[10px] font-bold text-white border border-white/10 group-hover:bg-white/20 transition-colors">
                            {item.ctaLabel}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderCareCard = (item: FeedItem) => (
        <div className="h-full flex flex-col px-4 pt-2.5 pb-3">
            <div className="flex items-center gap-2 mb-2">
                <Heart className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-bold text-white/90">{item.title}</h3>
            </div>
            <div className="flex-1 flex flex-col gap-1 mt-0.5">
                {item.listItems?.slice(0, 2).map((log, idx) => (
                    <div
                        key={idx}
                        className={`group/item relative flex items-center justify-between px-3 py-2 rounded-xl border border-white/5 bg-white/[0.03] transition-all ${log.onClick ? 'cursor-pointer hover:bg-white/[0.08] active:scale-[0.96]' : ''}`}
                        onClick={(e) => {
                            if (log.onClick) {
                                e.stopPropagation();
                                log.onClick();
                            }
                        }}
                    >
                        <div className="flex-1 flex flex-col min-w-0 pr-2">
                            <span className="text-[10.5px] font-bold text-white/80 group-hover/item:text-white transition-colors truncate">
                                {log.label}
                            </span>
                            <span className="text-[8.5px] text-white/30 font-medium">
                                {log.time}
                            </span>
                        </div>
                        {log.onClick && (
                            <div className="w-4.5 h-4.5 rounded-full border border-white/10 flex items-center justify-center group-hover/item:border-white/20 group-hover/item:bg-white/5 transition-all shrink-0">
                                <Heart className="w-2 h-2 text-white/20 group-hover/item:text-white/40" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {item.ctaLabel && (
                <div className="mt-auto pt-1 flex justify-end">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-white/40 group-hover:opacity-80 transition-opacity">
                        {item.ctaLabel} <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
            )}
        </div>
    );

    const renderAlbumCard = (item: FeedItem) => (
        <div className="relative w-full h-full flex flex-col group/album">
            {item.imageUrl ? (
                <div className="absolute inset-0">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover opacity-70 group-hover/album:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <BookOpen className="w-3 h-3 text-brand-peach" />
                                <span className="text-[10px] font-bold text-brand-peach uppercase tracking-widest">Weekly Album</span>
                            </div>
                            <h3 className="text-sm font-black text-white leading-tight">今週のアルバム</h3>
                            {item.subContent && <p className="text-[10px] text-white/60 mt-0.5">{item.subContent}</p>}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover/album:bg-white/20 transition-colors">
                            <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white/5">
                    <BookOpen className="w-8 h-8 text-white/20 mb-2" />
                    <h3 className="text-xs font-bold text-white/80 mb-1">{item.title}</h3>
                    <p className="text-[10px] text-white/40">{item.content}</p>
                </div>
            )}
        </div>
    );

    const renderReportCard = (item: FeedItem) => (
        <div className="h-full flex flex-col p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-white/5 relative overflow-hidden group/report">
            {/* Background Medical Pattern */}
            <div className="absolute top-0 right-0 p-2 opacity-[0.03] pointer-events-none">
                <Stethoscope className="w-24 h-24 rotate-12" />
            </div>

            <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-brand-peach/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-brand-peach" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-white/90">受診用レポート</h3>
                    <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Clinic Report</p>
                </div>
            </div>

            <p className="text-[11px] text-white/70 leading-relaxed mb-3 relative z-10">
                {item.content || "今週の体調変化を獣医さんに。"}
            </p>

            <div className="mt-auto flex justify-between items-center relative z-10">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-peach animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white/60 border border-white/10 group-hover/report:bg-brand-peach group-hover/report:text-slate-900 group-hover/report:border-transparent transition-all">
                    レポートを作成
                </div>
            </div>
        </div>
    );

    const renderContent = (item: FeedItem) => {
        const content = (
            <div className="h-full flex flex-col group transition-all duration-300 active:scale-[0.98]">
                {item.type === 'photo' || item.type === 'memory' ? renderPhotoCard(item) : (
                    <div className="h-full flex flex-col bg-white/5 border border-white/5 rounded-2xl overflow-hidden group-hover:bg-white/10 transition-colors">
                        {item.type === 'care' ? renderCareCard(item) : (
                            item.type === 'album' ? renderAlbumCard(item) : (
                                item.type === 'report' ? renderReportCard(item) : (
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-3">
                                            {item.icon && <item.icon className="w-3.5 h-3.5 text-slate-400" />}
                                            <h3 className="text-xs font-bold text-white/90">{item.title}</h3>
                                        </div>
                                        <p className="text-[11px] text-white/60 leading-relaxed line-clamp-4">{item.content}</p>
                                        {item.subContent && (
                                            <div className="mt-auto pt-2 text-[10px] text-white/40 italic">
                                                {item.subContent}
                                            </div>
                                        )}
                                    </div>
                                )
                            )
                        )}
                    </div>
                )}
            </div>
        );

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
            {/* Header: Exact text alignment with paddingLeft */}
            <div
                className="mb-2 relative flex items-center"
                style={{ paddingLeft: textStartPos }}
            >
                <div className="relative flex items-center">
                    <h2 className="text-[10px] font-medium text-white/40 uppercase tracking-[0.12em] leading-none m-0">
                        チェック
                    </h2>
                </div>
            </div>

            {/* Scroll Area: Exact matching with cardStartPos & Snap logic */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full pb-4"
                style={{
                    paddingLeft: cardStartPos,
                    scrollPaddingLeft: cardStartPos
                }}
            >
                {/* Visual Gap correction */}
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
                        <div className="w-full h-full rounded-2xl bg-[#121214] border border-white/5 overflow-hidden shadow-sm">
                            {renderContent(item)}
                        </div>
                    </div>
                ))}
                {/* End spacer */}
                <div className="flex-shrink-0" style={{ width: cardStartPos }} />
            </div>

            {/* Smooth Edge Mask */}
            {/* Subtle Edge Mask: Centered to cards */}
            <div className="absolute top-[34px] bottom-6 right-0 w-8 bg-gradient-to-l from-black/60 to-transparent pointer-events-none z-20" />
        </section>
    );
}
