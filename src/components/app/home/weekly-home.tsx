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
    X
} from "lucide-react";
import { WeeklyGrid } from "./weekly-grid";
import { DayDetailView } from "./day-detail-view";
import { WeeklyFeedCarousel, FeedItem } from "./weekly-feed-carousel";
import { NotificationSheet, NotificationItem } from "./notification-sheet";
import { CaptureWorkflowSheet } from "../shared/capture-workflow-sheet";
import { useCatContext, useIncidentContext, useCareContext, useCoreContext } from "@/store/app-store";
import { DEFAULT_CARE_TASK_DEFS } from "@/lib/constants";
import { getFullImageUrl } from "@/lib/utils";
import { useCareData } from "@/hooks/use-care-logic";
import { useHouseholdMembers } from "@/hooks/supabase/use-household";
import { WeeklyPageClient } from "../shared/weekly-page-client";
import { ReportConfigModal } from "../modals/report-config-modal";
import { MedicalReportView } from "../shared/medical-report-view";
import { useAuth } from "@/providers/auth-provider";
import { ReportConfigData, Incident } from "@/types";
import { LayoutIslandNeo } from "../immersive/layout-island-neo";
// HomeBackground はコンテキストプロップスが必要なため、WeeklyHomeでは使用しない

// UI Layout Constants
const HEADER_BAR_HEIGHT = 56;
const BENTO_TOP_GAP = 16;
const BENTO_BOTTOM_GAP = 16;
const CAROUSEL_AREA_HEIGHT = 160;
const FAB_HEIGHT = 56;
const FAB_BOTTOM_PADDING = 12;
const HAIRLINE = 1;
const MARGIN = 16;
const GUTTER = 1;
const PAGE_BG = '#FDF8F1'; // Natural Cream
// const ORIGINAL_PAGE_BG = '#0A0A0B';

// Daily Prompt Pool
const DAILY_PROMPTS = [
    { emoji: '☀️', title: '朝の一枚', desc: '起きたての猫ちゃんを撮ってみよう' },
    { emoji: '🛋️', title: 'リラックスしてる姿', desc: 'くつろぎタイムをキャッチ' },
    { emoji: '🍽️', title: 'ごはんの瞬間', desc: '一生懸命食べる姿を記録' },
    { emoji: '😺', title: '今日のベスト表情', desc: '一番かわいい顔をおさめよう' },
    { emoji: '📍', title: 'お気に入りの場所', desc: '無意識に行く定位置を検証' },
    { emoji: '🌙', title: '夜のまったり', desc: 'おやすみ前の静かな時間' },
    { emoji: '👀', title: '何かを見つめる目', desc: '集中している瞄をキャッチ' },
    { emoji: '🐾', title: '肉球チラリ', desc: 'かわいい肉球を撮れたらラッキー' },
    { emoji: '💤', title: '寝顔コレクション', desc: 'すやすや寝息を納めよう' },
    { emoji: '🪟', title: '窓辺パトロール中', desc: '外を眠める後ろ姿をパシャリ' },
    { emoji: '🎾', title: '遊んでるところ', desc: '元気に遊ぶ姿を記録' },
    { emoji: '🐈', title: 'しっぽの形', desc: '今日のしっぽはどんな形？' },
    { emoji: '🧶', title: 'もふもふアップ', desc: '毛並みの美しさを記録' },
    { emoji: '📦', title: '入れるかな？', desc: '箱や袋と猫の関係' },
    { emoji: '☕', title: '飼い主との距離感', desc: '今どのぐらい近い？' },
    { emoji: '🌞', title: '日向ぼっこ', desc: '陽光を浴びる姿をキャッチ' },
    { emoji: '💨', title: '小走りシーン', desc: '走り回る瞬間をおさめよう' },
    { emoji: '🧹', title: 'お手入れ中', desc: 'グルーミング中の真剣な顔' },
    { emoji: '🪩', title: '掌を見せて', desc: 'りんとしたポーズを探そう' },
    { emoji: '🍃', title: '季節を感じて', desc: '季節と猫ちゃんの一枚' },
];

// Weekly Mission Poses
const POSE_MISSIONS = [
    { id: '香箱座り', emoji: '🍞', label: '「香箱座り」を見つけよう！', desc: '前足を体の下に折りたたんで座るポーズ。リラックスの証拠です。' },
    { id: 'へそ天', emoji: '🐾', label: '「へそ天」を見つけよう！', desc: '仰向けでお腹を見せていたら信頼の証。' },
    { id: 'スフィンクス', emoji: '🏛️', label: '「スフィンクス」を見つけよう！', desc: '前足を前に伸ばして伏せるポーズ。' },
    { id: 'まんまる', emoji: '⚪', label: '「まんまる」を見つけよう！', desc: 'まんまるになっていたらすかさずパシャリ。' },
    { id: 'にょろーん', emoji: '🐍', label: '「にょろーん」を見つけよう！', desc: '長く伸びているポーズ。暑い日によく見るかも。' },
    { id: 'ちょこん座り', emoji: '🐈', label: '「ちょこん座り」を見つけよう！', desc: '背筋を伸ばして上品に座る姿。' },
    { id: '箱イン', emoji: '📦', label: '「箱イン」を見つけよう！', desc: '箱や袋に入っていたらチャンス！' },
    { id: 'ふみふみ', emoji: '🫧', label: '「ふみふみ」を見つけよう！', desc: '前足を交互に動かすニーディング。' },
];

interface WeeklyHomeProps {
    onOpenSidebar: () => void;
    onOpenNewEvent: () => void;
    onNavigate?: (id: string) => void;
    onToggleView?: () => void;
    selectedCatIds: string[];
    // Dock Props
    onOpenCalendar: () => void;
    onOpenExchange: () => void;
    onOpenPhoto: () => void;
    onOpenGallery: () => void;
    onOpenIncident: () => void;
    onOpenIncidentDetail: (id: string) => void;
    onOpenNyannlogSheet: (tab?: 'events' | 'requests' | 'input', date?: Date) => void;
}

export function WeeklyHome({
    onOpenSidebar,
    onOpenNewEvent,
    onNavigate,
    onToggleView,
    selectedCatIds,
    onOpenCalendar,
    onOpenExchange,
    onOpenPhoto,
    onOpenGallery,
    onOpenIncident,
    onOpenIncidentDetail,
    onOpenNyannlogSheet
}: WeeklyHomeProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [screenWidth, setScreenWidth] = useState(0);
    const [screenHeight, setScreenHeight] = useState(0);
    const [safeAreaTop, setSafeAreaTop] = useState(0);
    const [safeAreaBottom, setSafeAreaBottom] = useState(0);
    const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
    const [isCaptureWorkflowOpen, setIsCaptureWorkflowOpen] = useState(false);
    const [initialPhotos, setInitialPhotos] = useState<File[]>([]);
    const hiddenFileInputRef = useRef<HTMLInputElement>(null);
    const [lastViewedAt, setLastViewedAt] = useState<Date>(() => new Date(Date.now() - 3600000)); // Default to 1 hour ago for demo/init
    const { householdId } = useCoreContext();
    const { members } = useHouseholdMembers(householdId);
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();
    const { careLogs, careTaskDefs, addCareLog } = useCareContext();
    const { careItems } = useCareData();
    const { user: currentUser } = useAuth();

    // Support for Album & Report views
    const [showWeeklyAlbum, setShowWeeklyAlbum] = useState(false);
    const [showReportConfig, setShowReportConfig] = useState(false);
    const [reportData, setReportData] = useState<ReportConfigData | null>(null);
    const [showReportView, setShowReportView] = useState(false);
    const [selectedReportCatId, setSelectedReportCatId] = useState<string | null>(null);

    // Aggregated real-data notifications
    const realNotifications = useMemo(() => {
        const items: NotificationItem[] = [];
        const threshold = new Date(Date.now() - 48 * 3600 * 1000); // 48 hours ago

        // 1. Care Logs (Grouped by User + Cat + Minute)
        const careGroups: Record<string, {
            user: any,
            userName: string,
            catId: string,
            tasks: string[],
            timestamp: Date,
            notes?: string,
            ids: string[]
        }> = {};

        careLogs?.forEach(log => {
            const timestamp = new Date(log.done_at);
            if (timestamp < threshold) return;

            const user = members?.find((m: any) => m.id === log.done_by);
            let userName = user?.display_name || "家族";

            // Support nickname priority for current user
            if (currentUser && log.done_by === currentUser.id) {
                userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || userName;
            }

            const taskDef = careTaskDefs?.find((d: any) => d.id === log.type.split(':')[0]);
            const taskTitle = taskDef?.title || log.type;

            // Grouping key: userId + catId + minute
            const hourMinute = format(timestamp, "yyyy-MM-dd HH:mm");
            const groupKey = `${log.done_by}_${log.cat_id}_${hourMinute}`;

            if (!careGroups[groupKey]) {
                careGroups[groupKey] = {
                    user,
                    userName,
                    catId: log.cat_id,
                    tasks: [],
                    timestamp,
                    ids: []
                };
            }
            careGroups[groupKey].tasks.push(taskTitle);
            careGroups[groupKey].ids.push(log.id);
            if (log.notes) careGroups[groupKey].notes = log.notes;
        });

        Object.values(careGroups).forEach(group => {
            const uniqueTasks = Array.from(new Set(group.tasks));
            const tasksLabel = uniqueTasks.length > 1
                ? `${uniqueTasks[0]}ほか${uniqueTasks.length - 1}件`
                : uniqueTasks[0];

            items.push({
                id: group.ids[0],
                type: 'care',
                title: `${group.userName}が「${tasksLabel}」を完了しました`,
                message: group.notes || "お世話を記録しました 🐾",
                timestamp: group.timestamp,
                isUnread: group.timestamp > lastViewedAt,
                // Meta for navigation: Jump to the specific day Detail view
                targetDate: group.timestamp
            });
        });

        // 2. Incidents
        incidents?.forEach(inc => {
            const user = members?.find((m: any) => m.id === inc.created_by);
            let userName = user?.display_name || "家族";
            if (currentUser && inc.created_by === currentUser.id) {
                userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || userName;
            }

            const cat = cats?.find((c: any) => c.id === inc.cat_id);
            const catName = cat?.name || "猫ちゃん";
            const timestamp = new Date(inc.created_at);
            if (timestamp < threshold) return;

            const typeLabels: Record<string, string> = {
                vomit: '嘔吐', diarrhea: '下痢', injury: '怪我', appetite: '食欲不振',
                energy: '元気がない', toilet: 'トイレ失敗', other: 'その他'
            };

            // Severity based labeling
            let label = "";
            if (inc.status === 'resolved') {
                label = "解決済み: ";
            } else {
                if (['vomit', 'diarrhea', 'injury'].includes(inc.type)) {
                    label = "要注意: ";
                } else if (['appetite', 'energy', 'toilet'].includes(inc.type)) {
                    label = "体調の変化: ";
                }
                // 'other' or unknown types get no label (for peace of mind)
            }

            items.push({
                id: inc.id,
                type: inc.status === 'resolved' ? 'system' : 'alert',
                title: `${label}${catName}の「${typeLabels[inc.type] || ((inc.type as any) === 'daily' ? '日常の記録' : inc.type)}」`,
                message: inc.note || `${userName}が記録しました`,
                timestamp,
                isUnread: inc.status !== 'resolved' || timestamp > lastViewedAt,
                // Meta for navigation: Open the specific incident detail modal
                incidentId: inc.id
            });
        });

        // 3. Photos & AI Insights (Tags)
        const allTagsByCat: Record<string, Record<string, { count: number, latest: Date }>> = {};
        const weeklyTagCounts: Record<string, { count: number, latest: Date }> = {};
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

        cats?.forEach(cat => {
            allTagsByCat[cat.id] = {};
            cat.images?.forEach((img: any) => {
                const timestamp = new Date(img.createdAt);

                // 3a. Normal Photo Notification
                if (timestamp > threshold) {
                    items.push({
                        id: img.id,
                        type: 'photo',
                        title: `${cat.name}の新しい写真`,
                        message: img.memo || "可愛い写真が届きました 💕",
                        timestamp,
                        isUnread: timestamp > lastViewedAt,
                        targetDate: timestamp
                    });
                }

                // 3b. Aggregate Tags for Insight
                if (Array.isArray(img.tags)) {
                    img.tags.forEach((tag: any) => {
                        const name = typeof tag === 'string' ? tag : tag.name;
                        if (!name) return;

                        if (!allTagsByCat[cat.id][name]) {
                            allTagsByCat[cat.id][name] = { count: 0, latest: timestamp };
                        }
                        allTagsByCat[cat.id][name].count++;
                        if (timestamp > allTagsByCat[cat.id][name].latest) {
                            allTagsByCat[cat.id][name].latest = timestamp;
                        }

                        if (timestamp > weekAgo) {
                            if (!weeklyTagCounts[name]) {
                                weeklyTagCounts[name] = { count: 0, latest: timestamp };
                            }
                            weeklyTagCounts[name].count++;
                            if (timestamp > weeklyTagCounts[name].latest) {
                                weeklyTagCounts[name].latest = timestamp;
                            }
                        }
                    });
                }
            });

            // 4. AIShelf Discovery: If a tag has many photos, notify about the "Shelf"
            Object.entries(allTagsByCat[cat.id]).forEach(([tagName, data]) => {
                if (data.count >= 3) { // 3枚以上で棚としての価値ありと判断
                    items.push({
                        id: `shelf-${cat.id}-${tagName}`,
                        type: 'system',
                        title: `図鑑に新しい棚ができました: ${tagName}`,
                        message: `${cat.name}ちゃんの「${tagName}」が${data.count}枚集まりました！図鑑でまとめて見てみませんか？`,
                        timestamp: data.latest,
                        isUnread: data.latest > lastViewedAt,
                        link: 'zukan'
                    });
                }
            });
        });

        // 5. Weekly AI Summary: Highlight the most frequent tag this week
        const topWeeklyTag = Object.entries(weeklyTagCounts)
            .sort((a, b) => b[1].count - a[1].count)[0];

        if (topWeeklyTag && topWeeklyTag[1].count >= 2) {
            items.push({
                id: 'weekly-ai-summary',
                type: 'system',
                title: '今週のトレンド ✨',
                message: `今週は「${topWeeklyTag[0]}」の瞬間がたくさん記録されました。AIがハイライトをまとめています。`,
                timestamp: topWeeklyTag[1].latest,
                isUnread: topWeeklyTag[1].latest > lastViewedAt,
                link: 'zukan'
            });
        }

        return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 30);
    }, [careLogs, incidents, cats, members, careTaskDefs, currentUser]);

    const hasUnread = useMemo(() => realNotifications.some(n => n.isUnread), [realNotifications]);

    const handleTriggerCapture = useCallback(() => {
        hiddenFileInputRef.current?.click();
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setInitialPhotos(Array.from(e.target.files));
            setIsCaptureWorkflowOpen(true);
        }
    }, []);

    // Generate Smart Feed Items
    const feedItems = useMemo(() => {
        const items: FeedItem[] = [];
        const today = new Date();

        // 1. Filter helper - respects cat selection
        const belongsToSelectedCats = (catId: string | null | undefined) => {
            if (!selectedCatIds || selectedCatIds.length === 0) return true;
            return !!(catId && selectedCatIds.includes(catId));
        };

        // 2. Today's Photo (Latest of the day)
        const todaysPhotos = (incidents || [])
            .filter(inc =>
                inc.photos && inc.photos.length > 0 &&
                isSameDay(new Date(inc.created_at), today) &&
                belongsToSelectedCats(inc.cat_id)
            )
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const topToday = todaysPhotos[0];
        const topTodayUrl = topToday ? getFullImageUrl(topToday.photos[0]) : undefined;

        // 2. Prepare Cards
        const photoCard: FeedItem = {
            id: 'todays-photo',
            type: 'photo',
            title: '今日の1枚',
            content: topToday ? format(new Date(topToday.created_at), 'HH:mm') + ' の記録' : '今日の様子を写真に残しませんか？',
            imageUrl: topTodayUrl,
            ctaLabel: topToday ? '記録を追加' : '記録する',
            onClick: handleTriggerCapture,
            icon: Camera,
            color: 'text-white'
        };

        const undoneTasks = (careItems || [])
            .filter(t => !t.done && belongsToSelectedCats(t.catId))
            .slice(0, 2);

        const requestsCard: FeedItem = {
            id: 'today-requests',
            type: 'care',
            title: '今日のおねがい',
            listItems: undoneTasks.length > 0 ? undoneTasks.map(t => ({
                label: t.label,
                time: t.slot === 'morning' ? '午前中' : t.slot === 'evening' ? '夕方以降' : 'いつでも',
                icon: Heart,
                onClick: () => addCareLog(t.actionId || t.id, t.catId)
            })) : undefined,
            ctaLabel: undoneTasks.length > 0 ? undefined : 'もっと見る',
            onClick: undoneTasks.length > 0 ? undefined : onOpenNewEvent,
            icon: Heart,
            color: 'text-slate-400'
        };

        // 5. Weekly Mission Card
        const weekNumber = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const missionIndex = weekNumber % POSE_MISSIONS.length;
        const currentMission = POSE_MISSIONS[missionIndex];

        // Check if mission is completed (any this-week photo has this pose)
        const weekStart = currentWeekStart;
        const thisWeekIncidents = (incidents || []).filter(inc =>
            inc.photos && inc.photos.length > 0 &&
            new Date(inc.created_at) >= weekStart &&
            belongsToSelectedCats(inc.cat_id)
        );
        const missionCompleted = thisWeekIncidents.some(inc =>
            (inc as any).ai_analysis?.pose === currentMission.id
        );

        const missionCard: FeedItem = {
            id: 'weekly-mission',
            type: 'mission',
            title: currentMission.label,
            missionEmoji: currentMission.emoji,
            missionDesc: currentMission.desc,
            missionCompleted,
            onClick: handleTriggerCapture,
        };

        // 6. Daily Prompt Card (replaces fortune)
        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
        const promptIndex = dayOfYear % DAILY_PROMPTS.length;
        const todayPrompt = DAILY_PROMPTS[promptIndex];

        const promptCard: FeedItem = {
            id: 'daily-prompt',
            type: 'prompt',
            title: todayPrompt.title,
            content: todayPrompt.desc,
            missionEmoji: todayPrompt.emoji,
            onClick: handleTriggerCapture,
        };

        // Insert mission card after photo card (position 1 or 2)
        if (topToday) {
            items.push(requestsCard);
            items.push(missionCard);
            items.push(photoCard);
        } else {
            items.push(photoCard);
            items.push(missionCard);
            items.push(requestsCard);
        }

        // 7. Clinic Report Card
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const healthIncidents = (incidents || []).filter(inc => {
            const d = new Date(inc.created_at);
            const isHealthType = ['vomit', 'diarrhea', 'injury', 'appetite', 'energy'].includes(inc.type);
            return isHealthType && d >= weekStart && d <= weekEnd && belongsToSelectedCats(inc.cat_id);
        });

        items.push({
            id: 'clinic-report-card',
            type: 'report',
            title: '受診用レポート',
            content: healthIncidents.length > 0
                ? `今週は${healthIncidents.length}件の気になる症状がありました。`
                : '今週の体調変化を獣医さんに。',
            onClick: () => {
                if (selectedCatIds?.length === 1) {
                    setSelectedReportCatId(selectedCatIds[0]);
                } else if (healthIncidents.length > 0) {
                    setSelectedReportCatId(healthIncidents[0].cat_id);
                }
                setShowReportConfig(true);
            }
        });

        // 8. Daily Prompt (replacing fortune)
        items.push(promptCard);

        return items;
    }, [incidents, careLogs, selectedCatIds, cats, currentWeekStart, careItems]);


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

        const fabTopY = sHeight - sBottom - FAB_BOTTOM_PADDING - FAB_HEIGHT;
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
    const handleDaySelect = useCallback((day: Date) => setSelectedDay(day), []);
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

                        <span className="mx-1 text-[#4E342E]/90 font-bold tracking-wide tabular-nums font-serif">
                            {weekRangeLabel}
                        </span>

                        <button onClick={handleNextWeek} className="p-1.5 rounded-full hover:bg-[#4E342E]/10">
                            <ChevronRight className="w-5 h-5 text-[#4E342E]/70" />
                        </button>
                    </div>

                    {/* Right: Notification Toggle */}
                    <div className="absolute right-4 flex items-center gap-2">
                        <button
                            onClick={() => onNavigate?.('zukan')}
                            className="p-1.5 rounded-full hover:bg-[#4E342E]/10"
                            title="図鑑を開く"
                        >
                            <Library className="w-5 h-5 text-[#4E342E]/70" />
                        </button>
                        <button
                            onClick={() => {
                                setIsNotificationSheetOpen(true);
                                setLastViewedAt(new Date());
                            }}
                            className="p-1.5 rounded-full hover:bg-[#4E342E]/10 relative"
                        >
                            <Bell className="w-5 h-5 text-[#4E342E]/70" />
                            {hasUnread && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#FDF8F1]" />
                            )}
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
                            onQuickPost={handleTriggerCapture}
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

            {/* Notification Sheet */}
            <NotificationSheet
                isOpen={isNotificationSheetOpen}
                onClose={() => setIsNotificationSheetOpen(false)}
                notifications={realNotifications}
                onSelectItem={(item) => {
                    if (item.link === 'zukan' && onNavigate) {
                        onNavigate('zukan');
                        setIsNotificationSheetOpen(false);
                    } else if (item.incidentId) {
                        onOpenIncidentDetail(item.incidentId);
                        setIsNotificationSheetOpen(false);
                    } else if (item.targetDate) {
                        setSelectedDay(item.targetDate);
                        setIsNotificationSheetOpen(false);
                    }
                }}
            />

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
                onComplete={(data) => {
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
                            medicationLogs={[]} // We can pass real medicationLogs if needed
                        />
                    </div>
                </div>
            )}

            {/* Dock Island - Moves with the page (Absolute Bottom) */}
            <div className={`absolute bottom-6 left-0 right-0 z-50 px-4 transition-all duration-300 ${isNotificationSheetOpen ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                {/* Dock Removed as per user request */}
            </div>

            <CaptureWorkflowSheet
                isOpen={isCaptureWorkflowOpen}
                initialPhotos={initialPhotos}
                onClose={() => {
                    setIsCaptureWorkflowOpen(false);
                    setInitialPhotos([]);
                }}
            />

            <input
                type="file"
                ref={hiddenFileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
            />
        </div>
    );
}
