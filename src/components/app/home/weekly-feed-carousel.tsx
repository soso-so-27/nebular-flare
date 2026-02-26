"use client";

import React, { useRef } from "react";
import { Sparkles, Heart, Camera, ArrowRight, BookOpen, Stethoscope, FileText, Plus, History, Eye, Clock, Check } from "lucide-react";

export interface FeedItem {
    id: string;
    type: 'photo' | 'care' | 'memory' | 'fortune' | 'tip' | 'insight' | 'album' | 'report' | 'mission' | 'prompt';
    title: string;
    content?: string;
    subContent?: string;
    imageUrl?: string;
    dateLabel?: string;
    ctaLabel?: string;
    icon?: any;
    color?: string;
    progress?: { current: number; total: number }; // Vol. 25
    listItems?: { label: string; time: string; icon: any; onClick?: () => void }[];
    onClick?: () => void;
    missionIcon?: React.ReactNode;
    missionDesc?: string;
    missionCompleted?: boolean;
    // Photo Challenge
    weekDots?: boolean[];   // 7 booleans (Mon–Sun) indicating photo taken
    promptText?: string;    // Today's prompt text
    // Memory Rewind
    memoryLabel?: string;   // e.g. "1ヶ月前の今日"
    catName?: string;       // Cat name for memory cards
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
        const listItems = item.listItems?.slice(0, 2) || [];
        return (
            <div className="h-full flex flex-col px-4 pt-4 pb-3 overflow-hidden">
                <div className="flex items-center gap-2 mb-2 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-peach" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.05em] text-[#4E342E]/50 truncate">{item.title}</h3>
                </div>
                <div className="flex-1 flex flex-col justify-center gap-1.5 min-h-0 overflow-hidden">
                    {listItems.length > 0 ? listItems.map((log, idx) => (
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
                    )) : (
                        <div className="flex flex-col items-center justify-center text-center py-2">
                            <Heart className="w-6 h-6 text-brand-peach mb-1 opacity-80" />
                            <p className="text-[12px] font-bold text-[#4E342E]/70">{item.content || '今日はまだお世話がありません'}</p>
                        </div>
                    )}
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
                                {item.progress ? (
                                    <div className="inline-flex items-center gap-2 mb-1.5 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/10 shadow-sm">
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                            Day {item.progress.current}/{item.progress.total}
                                        </span>
                                        {/* Simple Progress Bar */}
                                        <div className="flex gap-[2px]">
                                            {Array.from({ length: item.progress.total }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-2.5 rounded-[1px] ${i < item.progress!.current ? 'bg-brand-peach shadow-[0_0_4px_rgba(255,167,167,0.5)]' : 'bg-white/20'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-[8px] font-black text-brand-peach/80 uppercase tracking-widest block mb-0.5">Summary</span>
                                )}
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

    const renderMissionCard = (item: FeedItem) => (
        <div
            className="h-full flex flex-col p-4 relative overflow-hidden bg-[#FF9500]/[0.02] cursor-pointer active:scale-[0.98] transition-transform"
            onClick={item.onClick}
        >
            {/* Subtle gradient accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#FF9500]/10 to-transparent rounded-bl-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1.5 relative z-10">
                <div className="w-5 h-5 flex items-center justify-center text-[#FF9500]">
                    {item.missionIcon || <Eye className="w-4 h-4 text-[#FF9500]" />}
                </div>
                <h3 className="text-[10px] font-black tracking-[0.1em] text-[#4E342E]/50">今週のテーマ</h3>
            </div>

            {/* Title & Desc */}
            <h4 className="text-[13px] font-black text-[#4E342E] leading-tight mb-1 relative z-10">{item.title}</h4>
            <p className="text-[9px] text-[#4E342E]/70 font-medium leading-relaxed w-[75%] relative z-10">
                {item.missionDesc || item.content}
            </p>

            {/* Ticket Stamp Area */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-14 h-14 rounded-full border-[1.5px] border-dashed border-[#4E342E]/15 rotate-[-5deg]">
                {item.missionCompleted ? (
                    <div className="flex flex-col items-center justify-center text-[#34C759] rotate-[5deg]">
                        <Check className="w-6 h-6 stroke-[3]" />
                        <span className="text-[8px] font-black uppercase tracking-wider">Clear</span>
                    </div>
                ) : (
                    <span className="text-[8px] font-black text-[#4E342E]/20 text-center leading-tight">未発見</span>
                )}
            </div>
        </div>
    );

    const renderPromptCard = (item: FeedItem) => (
        <div className="h-full flex flex-col p-4 relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 opacity-[0.06] pointer-events-none select-none scale-[4] origin-bottom-right">
                {item.missionIcon}
            </div>
            <div className="flex items-center gap-2 mb-2">
                <div className="text-lg">
                    {item.missionIcon}
                </div>
                <div>
                    <h3 className="text-[8px] font-black uppercase tracking-[0.1em] text-[#4E342E]/40">今日のひとこと</h3>
                </div>
            </div>
            <h4 className="text-[13px] font-black text-[#4E342E] leading-tight mb-1">{item.title}</h4>
            <p className="text-[9.5px] text-[#4E342E]/50 font-medium leading-tight mb-auto">
                {item.content}
            </p>
            <div className="mt-2">
                <div className="inline-flex px-2.5 py-1 bg-[#4E342E]/5 rounded-xl text-[9px] font-bold text-[#4E342E]/60 border border-[#4E342E]/8">
                    記録する
                </div>
            </div>
        </div>
    );

    const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

    const renderPhotoChallengeCard = (item: FeedItem) => {
        const dots = item.weekDots || [];
        const photoDays = dots.filter(Boolean).length;
        const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0

        return (
            <div
                className="h-full flex overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform"
                onClick={item.onClick}
            >
                {/* 撮影済みの場合は右に写真を配置、未撮影の場合はフルレイアウトに */}
                <div className={`flex flex-col p-4 z-10 justify-center h-full transition-all ${item.imageUrl ? 'w-[55%]' : 'w-full'}`}>

                    {/* 上部: タイトルとステータス */}
                    <div className="flex items-center justify-between w-full mb-3">
                        <h3 className="text-[10.5px] font-black uppercase tracking-[0.1em] text-[#4E342E]/40">
                            きょうの1枚
                        </h3>
                        {!item.imageUrl && (
                            <span className="text-[10px] font-bold text-brand-peach bg-brand-peach/5 px-2 py-0.5 rounded-full">
                                {photoDays > 0 ? `今週 ${photoDays}日記録！` : '最初の1枚を記録しましょう'}
                            </span>
                        )}
                        {item.imageUrl && (
                            <span className="text-[9px] font-bold text-brand-peach bg-brand-peach/5 px-1.5 py-0.5 rounded-full">
                                {photoDays}日記録
                            </span>
                        )}
                    </div>

                    {/* 下部: 横幅フル活用のWeek Dots */}
                    <div className={`flex items-center w-full ${item.imageUrl ? 'justify-between' : 'justify-between px-2'}`}>
                        {DAY_LABELS.map((label, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                                <span className={`text-[9px] font-bold ${i === todayIdx ? 'text-brand-peach' : 'text-[#4E342E]/30'}`}>{label}</span>
                                <div className={`rounded-full border-2 transition-all flex-shrink-0 ${item.imageUrl ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'} ${dots[i]
                                    ? 'bg-brand-peach border-brand-peach shadow-[0_0_8px_rgba(232,180,160,0.4)]'
                                    : i === todayIdx
                                        ? 'border-brand-peach/50 bg-brand-peach/10'
                                        : i < todayIdx
                                            ? 'border-[#4E342E]/10 bg-[#4E342E]/[0.03]'
                                            : 'border-[#4E342E]/5 bg-transparent'
                                    }`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Photo (Only if exists) */}
                {item.imageUrl && (
                    <div className="flex-1 relative overflow-hidden">
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#FEFDFB] to-transparent" />
                    </div>
                )}
            </div>
        );
    };

    const renderMemoryCard = (item: FeedItem) => (
        <div className="h-full flex overflow-hidden relative">
            {/* Full-bleed photo with sepia overlay */}
            {item.imageUrl ? (
                <>
                    <img src={item.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'sepia(0.3) saturate(0.8)' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/80 via-[#3E2723]/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#3E2723]/40 to-transparent" />
                </>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#5D4037] to-[#3E2723]" />
            )}

            {/* Content overlay */}
            <div className="relative z-10 flex flex-col p-3.5 w-full">
                <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3 h-3 text-white/60" />
                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/50">{item.memoryLabel || '思い出'}</span>
                </div>

                <div className="mt-auto">
                    {item.catName && (
                        <span className="text-[9px] font-bold text-white/50 mb-0.5 block">{item.catName}</span>
                    )}
                    {item.content && (
                        <p className="text-[11px] font-bold text-white/90 leading-tight line-clamp-2">
                            {item.content}
                        </p>
                    )}
                    {!item.content && !item.imageUrl && (
                        <p className="text-[10px] text-white/40 italic">この日の記録</p>
                    )}
                </div>
            </div>
        </div>
    );

    const renderContent = (item: FeedItem) => {
        let content;
        if (item.type === 'album') content = renderAlbumCard(item);
        else if (item.type === 'report') content = renderReportCard(item);
        else if (item.type === 'care') content = renderCareCard(item);
        else if (item.type === 'mission') content = renderMissionCard(item);
        else if (item.type === 'prompt') content = renderPromptCard(item);
        else if (item.type === 'memory') content = renderMemoryCard(item);
        else if (item.type === 'photo' && item.weekDots) content = renderPhotoChallengeCard(item);
        else if (item.type === 'photo') content = renderPhotoCard(item);
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
                <div
                    onClick={item.onClick}
                    className="w-full h-full cursor-pointer pointer-events-auto select-none active:scale-[0.99] transition-transform"
                    role="button"
                    tabIndex={0}
                >
                    {content}
                </div>
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
                        ダイジェスト
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
