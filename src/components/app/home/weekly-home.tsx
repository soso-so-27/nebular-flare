"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    format,
    addWeeks,
    subWeeks,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    subMonths,
    isAfter,
    subDays
} from "date-fns";
import {
    ChevronLeft,
    ChevronRight,
    Bell,
    Sparkles,
    Menu,
    TrendingUp,
    Lightbulb,
    History,
    Camera,
    Heart,
    FileText,
    Library,
    X,
    Sun,
    Coffee,
    Utensils,
    Smile,
    MapPin,
    Moon,
    Eye,
    PawPrint,
    Wind,
    Box,
    Sparkles as SparklesIcon,
    Dumbbell,
    Cigarette,
    Ghost,
    Milestone,
    Cat as CatIcon,
    Thermometer,
    Zap
} from "lucide-react";
import { WeeklyGrid } from "./weekly-grid";
import { DayDetailView } from "./day-detail-view";
import { WeeklyFeedCarousel, FeedItem } from "./weekly-feed-carousel";
import { NotificationSheet, NotificationItem } from "./notification-sheet";
import { useCatContext, useCareContext, useIncidentContext, useCoreContext } from "@/store/app-store";
import { getFullImageUrl } from "@/lib/utils";
import { useCareData } from "@/hooks/use-care-logic";
import { useHouseholdMembers } from "@/hooks/supabase/use-household";
import { WeeklyPageClient } from "../shared/weekly-page-client";
import { ReportConfigModal } from "../modals/report-config-modal";
import { MedicalReportView } from "../shared/medical-report-view";
import { useAuth } from "@/providers/auth-provider";
import { ReportConfigData, SitterReportData, Incident } from "@/types";
import { toast } from "sonner";
import { SitterReportConfigModal } from "../modals/sitter-report-config-modal";
import { SitterReportView } from "../shared/sitter-report-view";
import { LayoutIslandNeo } from "../immersive/layout-island-neo";
import { useMemories } from "@/hooks/use-memories";
// HomeBackground はコンテキストプロップスが必要なため、WeeklyHomeでは使用しない

// UI Layout Constants
const HEADER_BAR_HEIGHT = 56;
const BENTO_TOP_GAP = 16;
const BENTO_BOTTOM_GAP = 16;
const CAROUSEL_AREA_HEIGHT = 180;
const FAB_HEIGHT = 56;
const FAB_BOTTOM_PADDING = 12;
const HAIRLINE = 1;
const MARGIN = 16;
const GUTTER = 1;
const PAGE_BG = '#FDF8F1'; // Natural Cream
// const ORIGINAL_PAGE_BG = '#0A0A0B';

// Daily Prompt Pool
const DAILY_PROMPTS = [
    { icon: <Sun className="w-5 h-5 text-amber-500" />, title: '朝の一枚', desc: '起きたての猫ちゃんを撮ってみよう' },
    { icon: <Coffee className="w-5 h-5 text-amber-500" />, title: 'リラックスしてる姿', desc: 'くつろぎタイムをキャッチ' },
    { icon: <Utensils className="w-5 h-5 text-amber-500" />, title: 'ごはんの瞬間', desc: '一生懸命食べる姿を記録' },
    { icon: <Smile className="w-5 h-5 text-amber-500" />, title: '今日のベスト表情', desc: '一番かわいい顔をおさめよう' },
    { icon: <MapPin className="w-5 h-5 text-amber-500" />, title: 'お気に入りの場所', desc: '無意識に行く定位置を検証' },
    { icon: <Moon className="w-5 h-5 text-amber-500" />, title: '夜のまったり', desc: 'おやすみ前の静かな時間' },
    { icon: <Eye className="w-5 h-5 text-amber-500" />, title: '何かを見つめる目', desc: '集中している瞄をキャッチ' },
    { icon: <PawPrint className="w-5 h-5 text-amber-500" />, title: '肉球チラリ', desc: 'かわいい肉球を撮れたらラッキー' },
    { icon: <Moon className="w-5 h-5 text-amber-500" />, title: '寝顔コレクション', desc: 'すやすや寝息を納めよう' },
    { icon: <Sun className="w-5 h-5 text-amber-500" />, title: '窓辺パトロール中', desc: '外を眠める後ろ姿をパシャリ' },
    { icon: <Dumbbell className="w-5 h-5 text-amber-500" />, title: '遊んでるところ', desc: '元気に遊ぶ姿を記録' },
    { icon: <CatIcon className="w-5 h-5 text-amber-500" />, title: 'しっぽの形', desc: '今日のしっぽはどんな形？' },
    { icon: <Ghost className="w-5 h-5 text-amber-500" />, title: 'もふもふアップ', desc: '毛並みの美しさを記録' },
    { icon: <Box className="w-5 h-5 text-amber-500" />, title: '入れるかな？', desc: '箱や袋と猫の関係' },
    { icon: <Coffee className="w-5 h-5 text-amber-500" />, title: '飼い主との距離感', desc: '今どのぐらい近い？' },
    { icon: <Sun className="w-5 h-5 text-amber-500" />, title: '日向ぼっこ', desc: '陽光を浴びる姿をキャッチ' },
    { icon: <Zap className="w-5 h-5 text-amber-500" />, title: '小走りシーン', desc: '走り回る瞬間をおさめよう' },
    { icon: <SparklesIcon className="w-5 h-5 text-amber-500" />, title: 'お手入れ中', desc: 'グルーミング中の真剣な顔' },
    { icon: <Milestone className="w-5 h-5 text-amber-500" />, title: '掌を見せて', desc: 'りんとしたポーズを探そう' },
    { icon: <Thermometer className="w-5 h-5 text-amber-500" />, title: '季節を感じて', desc: '季節と猫ちゃんの一枚' },
];

// Weekly Mission Poses
const POSE_MISSIONS = [
    { id: '香箱座り', icon: <Box className="w-4 h-4" />, label: '「香箱座り」を見つけよう！', desc: '前足を体の下に折りたたんで座るポーズ。リラックスの証拠です。' },
    { id: 'へそ天', icon: <PawPrint className="w-4 h-4" />, label: '「へそ天」を見つけよう！', desc: '仰向けでお腹を見せていたら信頼の証。' },
    { id: 'スフィンクス', icon: <CatIcon className="w-4 h-4" />, label: '「スフィンクス」を見つけよう！', desc: '前足を前に伸ばして伏せるポーズ。' },
    { id: 'まんまる', icon: <Milestone className="w-4 h-4" />, label: '「まんまる」を見つけよう！', desc: 'まんまるになっていたらすかさずパシャリ. ' },
    { id: 'にょろーん', icon: <Zap className="w-4 h-4" />, label: '「にょろーん」を見つけよう！', desc: '長く伸びているポーズ。暑い日によく見るかも。' },
    { id: 'ちょこん座り', icon: <CatIcon className="w-4 h-4" />, label: '「ちょこん座り」を見つけよう！', desc: '背筋を伸ばして上品に座る姿。' },
    { id: '箱イン', icon: <Box className="w-4 h-4" />, label: '「箱イン」を見つけよう！', desc: '箱や袋に入っていたらチャンス！' },
    { id: 'ふみふみ', icon: <SparklesIcon className="w-4 h-4" />, label: '「ふみふみ」を見つけよう！', desc: '前足を交互に動かすニーディング。' },
];

interface WeeklyHomeProps {
    onOpenSidebar: () => void;
    onTriggerCapture?: () => void;
    onNavigate?: (id: string) => void;
    selectedCatIds: string[];
    // Dock Props
    onOpenCalendar: () => void;
    onOpenExchange: () => void;
    onOpenPhoto: () => void;
    onOpenGallery: () => void;
    onOpenIncident: () => void;
    onOpenIncidentDetail: (id: string) => void;
    onOpenNyannlogSheet: (tab?: 'events' | 'requests' | 'input', date?: Date) => void;
    selectedDate?: Date;
    onDateChange?: (date: Date) => void;
}

export function WeeklyHome({
    onOpenSidebar,
    onTriggerCapture,
    onNavigate,
    selectedCatIds,
    onOpenCalendar,
    onOpenExchange,
    onOpenPhoto,
    onOpenGallery,
    onOpenIncident,
    onOpenIncidentDetail,
    onOpenNyannlogSheet,
    selectedDate,
    onDateChange
}: WeeklyHomeProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [screenWidth, setScreenWidth] = useState(0);
    const [screenHeight, setScreenHeight] = useState(0);
    const [safeAreaTop, setSafeAreaTop] = useState(0);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const { householdId } = useCoreContext();
    const { members } = useHouseholdMembers(householdId);
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();
    const { careLogs, careTaskDefs, addCareLog } = useCareContext();
    const { careItems } = useCareData();
    const { user: currentUser } = useAuth();
    const memories = useMemories();

    // Support for Album & Report views
    const [showWeeklyAlbum, setShowWeeklyAlbum] = useState(false);
    const [showReportConfig, setShowReportConfig] = useState(false);
    const [reportData, setReportData] = useState<ReportConfigData | null>(null);
    const [showReportView, setShowReportView] = useState(false);
    const [selectedReportCatId, setSelectedReportCatId] = useState<string | null>(null);
    const [showSitterReportConfig, setShowSitterReportConfig] = useState(false);
    const [sitterReportData, setSitterReportData] = useState<SitterReportData | null>(null);
    const [selectedSitterCatId, setSelectedSitterCatId] = useState<string | null>(null);



    const handleDaySelect = useCallback((day: Date) => setSelectedDay(day), []);

    // Generate Smart Feed Items
    const feedItems = useMemo(() => {
        const items: FeedItem[] = [];
        const today = new Date();

        // 1. Filter helper - respects cat selection
        const belongsToSelectedCats = (catId: string | null | undefined) => {
            if (!selectedCatIds || selectedCatIds.length === 0) return true;
            return !!(catId && selectedCatIds.includes(catId));
        };

        // ====== ONBOARDING CARD (only if truly no data yet) ======
        const hasAnyData = (incidents || []).length > 0 || (careLogs || []).length > 0;
        if (!hasAnyData) {
            items.push({
                id: 'onboarding-guide',
                type: 'prompt',
                title: 'はじめの3ステップ',
                content: '① 写真を撮る → ② お世話を記録 → ③ 図鑑を眺める',
                missionIcon: <SparklesIcon className="w-5 h-5 text-brand-peach" />,
                onClick: undefined,
            });
        }

        // ====== UNIFIED CARE CARD (merged status + requests) ======
        const filteredCareItems = (careItems || []).filter(t => belongsToSelectedCats(t.catId));
        const totalTasks = filteredCareItems.length;
        const doneTasks = filteredCareItems.filter(t => t.done).length;
        const undoneTasks = filteredCareItems.filter(t => !t.done).slice(0, 2);

        if (totalTasks > 0) {
            items.push({
                id: 'care-unified',
                type: 'care',
                title: doneTasks >= totalTasks
                    ? `今日のお世話 ✨ ${doneTasks}/${totalTasks} 完了`
                    : `今日のおねがい（${doneTasks}/${totalTasks}）`,
                listItems: undoneTasks.length > 0 ? undoneTasks.map(t => ({
                    label: t.label,
                    time: t.slot === 'morning' ? '午前中' : t.slot === 'evening' ? '夕方以降' : 'いつでも',
                    icon: Heart,
                    onClick: async () => {
                        await addCareLog(t.actionId || t.id, t.catId);
                        toast.success(`✅ ${t.label} 完了！`, { duration: 2000 });
                    }
                })) : undefined,
                content: doneTasks >= totalTasks ? '全部おわったよ！えらい 🎉' : undefined,
                ctaLabel: undoneTasks.length === 0 ? 'もっと見る' : undefined,
                onClick: undoneTasks.length === 0 ? undefined : undefined,
                icon: Heart,
                color: doneTasks >= totalTasks ? 'text-green-500' : 'text-brand-peach',
            });
        }

        // ====== PHOTO CHALLENGE CARD (merged today's photo + daily prompt) ======
        const todaysPhotos = (incidents || [])
            .filter(inc =>
                inc.photos && inc.photos.length > 0 &&
                isSameDay(new Date(inc.created_at), today) &&
                belongsToSelectedCats(inc.cat_id)
            )
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const topToday = todaysPhotos[0];
        const topTodayUrl = topToday ? getFullImageUrl(topToday.photos[0]) : undefined;

        // Calculate week photo dots (Mon-Sun)
        const dotWeekStart = currentWeekStart;
        const dotWeekEnd = endOfWeek(dotWeekStart, { weekStartsOn: 1 });
        const weekDays2 = eachDayOfInterval({ start: dotWeekStart, end: dotWeekEnd });
        const weekDots = weekDays2.map(day =>
            (incidents || []).some(inc =>
                inc.photos && inc.photos.length > 0 &&
                isSameDay(new Date(inc.created_at), day) &&
                belongsToSelectedCats(inc.cat_id)
            )
        );

        items.push({
            id: 'photo-challenge',
            type: 'photo',
            title: 'きょうの1枚',
            imageUrl: topTodayUrl,
            weekDots,
            onClick: onTriggerCapture,
        });

        // ====== WEEKLY MISSION CARD ======
        const weekNumber = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const missionIndex = weekNumber % POSE_MISSIONS.length;
        const currentMission = POSE_MISSIONS[missionIndex];

        const weekStart = currentWeekStart;
        const thisWeekIncidents = (incidents || []).filter(inc =>
            inc.photos && inc.photos.length > 0 &&
            new Date(inc.created_at) >= weekStart &&
            belongsToSelectedCats(inc.cat_id)
        );
        const missionCompleted = thisWeekIncidents.some(inc =>
            (inc as any).ai_analysis?.pose === currentMission.id
        );

        items.push({
            id: 'weekly-mission',
            type: 'mission',
            title: currentMission.label,
            missionIcon: currentMission.icon,
            missionDesc: currentMission.desc,
            missionCompleted,
            onClick: undefined,
        });

        // ====== CLINIC REPORT (conditional — only if health incidents this week) ======
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const healthIncidents = (incidents || []).filter(inc => {
            const d = new Date(inc.created_at);
            const isHealthType = ['vomit', 'diarrhea', 'injury', 'appetite', 'energy'].includes(inc.type);
            return isHealthType && d >= weekStart && d <= weekEnd && belongsToSelectedCats(inc.cat_id);
        });

        if (healthIncidents.length > 0) {
            items.push({
                id: 'clinic-report-card',
                type: 'report',
                title: '受診用レポート',
                content: `今週は${healthIncidents.length}件の気になる症状がありました。`,
                onClick: () => {
                    if (selectedCatIds?.length === 1) {
                        setSelectedReportCatId(selectedCatIds[0]);
                    } else if (healthIncidents.length > 0) {
                        setSelectedReportCatId(healthIncidents[0].cat_id);
                    }
                    setShowReportConfig(true);
                }
            });
        }

        // ====== MEMORY REWIND CARDS ======
        for (const memory of memories) {
            items.push({
                id: memory.id,
                type: 'memory',
                title: memory.label,
                content: memory.note || undefined,
                imageUrl: memory.imageUrl,
                memoryLabel: memory.label,
                catName: memory.catName,
                dateLabel: format(memory.date, 'yyyy/M/d'),
                onClick: () => handleDaySelect(memory.date),
            });
        }

        return items;
    }, [incidents, careLogs, selectedCatIds, cats, currentWeekStart, careItems, addCareLog, handleDaySelect, setShowReportConfig, setSelectedReportCatId, memories]);


    // Initial measurement
    useEffect(() => {
        const updateDimensions = () => {
            setScreenWidth(window.innerWidth);
            setScreenHeight(window.innerHeight);
            // safeAreaTop/Bottom は CSS 側で設定されている前提、あるいはここでは0とする(後で計算に含める)
            const root = document.documentElement;
            const sat = parseFloat(getComputedStyle(root).getPropertyValue('--sat') || '0');
            const sab = parseFloat(getComputedStyle(root).getPropertyValue('--sab') || '0');
            setSafeAreaTop(sat);
            setSafeAreaBottom(sab);
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Bento寸法計算 - 物理画素スナップ (Integer Pixel Snap)
    const layoutData = useMemo(() => {
        // 全ての入力を整数に丸める
        const sTop = Math.floor(safeAreaTop);
        const sBottom = Math.floor(safeAreaBottom);
        const sWidth = Math.floor(screenWidth);
        const sHeight = Math.floor(screenHeight);

        // 1. 幅の決定
        const availableW = sWidth - MARGIN * 2;
        const unitW = Math.floor((availableW - 4 * HAIRLINE) / 3);
        const contentWidth = unitW * 3 + 4 * HAIRLINE;
        const xOffset = Math.floor((sWidth - contentWidth) / 2);

        // 2. 高さの決定
        const headerBottomY = sTop + HEADER_BAR_HEIGHT;
        const bentoTopY = headerBottomY + BENTO_TOP_GAP;

        // Space for BottomNavigationBar (approx 80px)
        const NAV_BAR_HEIGHT = 80;
        const fabTopY = sHeight - sBottom - BENTO_BOTTOM_GAP - NAV_BAR_HEIGHT;
        const totalGridAvailableH = fabTopY - bentoTopY - CAROUSEL_AREA_HEIGHT - BENTO_BOTTOM_GAP;

        const unitH = Math.floor((totalGridAvailableH - 5 * HAIRLINE) / 4);
        const bentoH = unitH * 4 + 5 * HAIRLINE;

        return {
            bentoH,
            bentoTop: bentoTopY,
            contentWidth,
            screenWidth: sWidth,
            unitW,
            unitH,
            xOffset,
        };
    }, [screenWidth, screenHeight, safeAreaTop, safeAreaBottom]);

    const weekDays = useMemo(() => {
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
    }, [currentWeekStart]);

    const weekRangeLabel = useMemo(() => {
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        const startStr = format(currentWeekStart, "MMM d");
        const endStr = format(weekEnd, "d");
        return `${startStr} – ${endStr}`;
    }, [currentWeekStart]);

    const handlePrevWeek = useCallback(() => setCurrentWeekStart(prev => subWeeks(prev, 1)), []);
    const handleNextWeek = useCallback(() => setCurrentWeekStart(prev => addWeeks(prev, 1)), []);
    const handleBackToGrid = useCallback(() => setSelectedDay(null), []);



    return (
        <div className="absolute inset-0 bg-[#FDF8F1] overflow-hidden select-none">

            {/* Header Area - Perfectly Integer Positioned */}
            {!selectedDay && (
                <header
                    style={{
                        position: 'absolute',
                        top: Math.floor(safeAreaTop),
                        left: 0,
                        right: 0,
                        height: HEADER_BAR_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', // Center the main group
                        padding: '0 16px',
                        zIndex: 30
                    }}
                >
                    {/* Left: Menu Button */}
                    <button
                        onClick={onOpenSidebar}
                        className="absolute left-4 p-2 -ml-2 rounded-full hover:bg-[#4E342E]/10"
                    >
                        <Menu className="w-6 h-6 text-[#4E342E]/70" />
                    </button>

                    {/* Center: Date + Navigation Controls */}
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevWeek} className="p-1.5 rounded-full hover:bg-[#4E342E]/10">
                            <ChevronLeft className="w-5 h-5 text-[#4E342E]/70" />
                        </button>

                        <button
                            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                            className="mx-1 text-[#4E342E]/90 font-bold tracking-wide tabular-nums font-serif hover:text-brand-peach transition-colors cursor-pointer"
                        >
                            {weekRangeLabel}
                        </button>

                        <button onClick={handleNextWeek} className="p-1.5 rounded-full hover:bg-[#4E342E]/10">
                            <ChevronRight className="w-5 h-5 text-[#4E342E]/70" />
                        </button>
                    </div>

                </header>
            )}

            {/* Content Layer */}
            <AnimatePresence mode="wait">
                {selectedDay ? (
                    <motion.div
                        key="detail"
                        className="absolute inset-0 z-40 bg-[#FDF8F1]"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <DayDetailView
                            day={selectedDay}
                            selectedCatIds={selectedCatIds}
                            onBack={handleBackToGrid}
                            onOpenIncidentDetail={onOpenIncidentDetail}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="grid-layer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0"
                    >
                        <WeeklyGrid
                            weekDays={weekDays}
                            selectedCatIds={selectedCatIds}
                            onDaySelect={handleDaySelect}
                            layoutData={layoutData}
                        />

                        {/* Horizontal Feed Carousel */}
                        {!selectedDay && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: layoutData.bentoTop + layoutData.bentoH + 16,
                                    width: '100%',
                                    height: CAROUSEL_AREA_HEIGHT,
                                }}
                            >
                                <WeeklyFeedCarousel
                                    screenWidth={screenWidth}
                                    xOffset={layoutData.xOffset}
                                    items={feedItems}
                                    key={`carousel-absolute-align-${screenWidth}`}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Specialized Views (Reused) */}
            {showWeeklyAlbum && (
                <WeeklyPageClient
                    onClose={() => setShowWeeklyAlbum(false)}
                />
            )}

            <ReportConfigModal
                isOpen={showReportConfig}
                onClose={() => setShowReportConfig(false)}
                cats={cats.filter(c => !selectedCatIds?.length || selectedCatIds.includes(c.id))}
                onComplete={(data: ReportConfigData & { cat_id: string }) => {
                    setReportData(data);
                    setSelectedReportCatId(data.cat_id);
                    setShowReportConfig(false);
                    setShowReportView(true);
                }}
            />

            {showReportView && reportData && selectedReportCatId && (
                <div className="fixed inset-0 z-[12000] bg-white dark:bg-slate-950 overflow-y-auto">
                    <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b pt-[env(safe-area-inset-top)]">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-peach" />
                            <h2 className="font-bold">受診レポート</h2>
                        </div>
                        <button
                            onClick={() => setShowReportView(false)}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 pb-20 max-w-2xl mx-auto">
                        <MedicalReportView
                            cat={cats.find((c: any) => c.id === selectedReportCatId)!}
                            config={reportData}
                            incidents={incidents || []}
                        />
                    </div>
                </div>
            )}


            {/* Specialized Views (Reused) */}
        </div>
    );
}
