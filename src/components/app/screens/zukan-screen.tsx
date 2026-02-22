"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, ChevronLeft, Loader2, ChevronRight, Sparkles, Calendar, Clock, Camera, Award,
    ImageIcon, Wand2, AlertTriangle, History, Search, PawPrint, Cat, Package, Circle,
    Activity, Box, Utensils, Moon, Zap, Target, Wind, Smile, Frown, Meh, Ghost, Cloud,
    Sun, Stethoscope, Thermometer, Droplets, Bandage, Flame, Scissors, ShieldAlert,
    UserPlus, HeartPulse, Home, Sofa, Map, MapPin, Footprints, Camera as CameraIcon2,
    CalendarDays, Gift, Cake, Baby, TrendingUp, ShoppingBag, Brush, Heart, AlertCircle
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { PhotoDetailView } from "../immersive/photo-detail-view";
import { WeeklyPageClient } from "../shared/weekly-page-client";
import { RewindDigestCard } from "./rewind-digest";
import { subDays, startOfWeek } from "date-fns";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────
// Types
// ─────────────────────────────────
interface AIAnalysis {
    labels?: {
        moment?: string;
        scene?: string;
        shot?: string;
    };
    forYouScores?: {
        dailyPick?: number;
        weeklyHighlight?: number;
        funnyMoment?: number;
    };
    uiTags?: string[];
    needUserConfirm?: boolean;
    userConfirmed?: boolean;
    confirmedAt?: string;
    zukanShelf?: string;
    pose?: string;
    metadata?: Record<string, string>; // A-K Metadata
    identificationReason?: string;
    catConfidence?: number;
}

interface ShelfPhoto {
    id: string;
    url: string;
    storagePath: string;
    catId: string;
    catName: string;
    catIds?: string[];
    createdAt: string;
    source: string;
    memo?: string;
    tags?: any[];
    isUrl?: boolean;
    aiAnalysis?: AIAnalysis;
}

interface Shelf {
    name: string;
    photos: ShelfPhoto[];
}

// ─────────────────────────────────
// Helpers
// ─────────────────────────────────

function mapToShelfPhoto(img: any): ShelfPhoto {
    return {
        id: img.id,
        url: getFullImageUrl(img.url, { width: 400, height: 400, resize: "cover", quality: 80 }),
        storagePath: img.url,
        catId: img.cat_id,
        catName: img.cat_name,
        catIds: img.cat_ids,
        createdAt: img.created_at,
        source: img.source || "profile",
        memo: img.memo,
        tags: img.tags,
        isUrl: img.is_url,
        aiAnalysis: img.ai_analysis,
    };
}

function daysAgo(dateStr: string): number {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
// Types for Zukan Collection
interface ZukanItemDef {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface ZukanAxisDef {
    id: string;
    title: string;
    metaKey: string; // Key in ai_analysis.metadata or 'pose'
    items: ZukanItemDef[];
    color: string;
}

const ZUKAN_AXES: ZukanAxisDef[] = [
    {
        id: 'pose',
        title: 'ポーズ図鑑',
        metaKey: 'pose',
        color: '#FF9500',
        items: [
            { id: '香箱座り', label: '香箱座り', icon: <Package className="w-4 h-4" /> },
            { id: 'へそ天', label: 'へそ天', icon: <PawPrint className="w-4 h-4" /> },
            { id: 'スフィンクス', label: 'スフィンクス', icon: <Cat className="w-4 h-4" /> },
            { id: 'まんまる', label: 'まんまる', icon: <Circle className="w-4 h-4" /> },
            { id: 'にょろーん', label: 'にょろーん', icon: <Activity className="w-4 h-4" /> },
            { id: 'ちょこん座り', label: 'ちょこん座り', icon: <Cat className="w-4 h-4" /> },
            { id: '箱イン', label: '箱イン', icon: <Box className="w-4 h-4" /> },
            { id: 'ふみふみ', label: 'ふみふみ', icon: <Sparkles className="w-4 h-4" /> },
        ]
    },
    {
        id: 'activity',
        title: '日常図鑑',
        metaKey: 'activity',
        color: '#34C759',
        items: [
            { id: '食べる', label: '食べる', icon: <Utensils className="w-4 h-4" /> },
            { id: '飲む', label: '飲む', icon: <Droplets className="w-4 h-4" /> },
            { id: 'トイレ', label: 'トイレ', icon: <Wind className="w-4 h-4" /> },
            { id: '毛づくろい', label: '毛づくろい', icon: <Heart className="w-4 h-4" /> },
            { id: '寝る', label: '寝る', icon: <Moon className="w-4 h-4" /> },
            { id: '遊ぶ', label: '遊ぶ', icon: <Zap className="w-4 h-4" /> },
            { id: '甘える', label: '甘える', icon: <Smile className="w-4 h-4" /> },
            { id: '探索', label: '探索', icon: <Search className="w-4 h-4" /> },
        ]
    },
    {
        id: 'emotion',
        title: 'きもち図鑑',
        metaKey: 'emotion',
        color: '#AF52DE',
        items: [
            { id: 'ごきげん', label: 'ごきげん', icon: <Sun className="w-4 h-4" /> },
            { id: '不満', label: '不満', icon: <Frown className="w-4 h-4" /> },
            { id: '眠い', label: '眠い', icon: <Moon className="w-4 h-4" /> },
            { id: 'びっくり', label: 'びっくり', icon: <AlertCircle className="w-4 h-4" /> },
            { id: 'ドヤ顔', label: 'ドヤ顔', icon: <Award className="w-4 h-4" /> },
            { id: '真顔', label: '真顔', icon: <Meh className="w-4 h-4" /> },
            { id: 'あまえ顔', label: 'あまえ顔', icon: <Heart className="w-4 h-4" /> },
            { id: '集中', label: '集中', icon: <Target className="w-4 h-4" /> },
        ]
    },
    {
        id: 'location',
        title: 'お気に入り場所図鑑',
        metaKey: 'location',
        color: '#5856D6',
        items: [
            { id: '窓辺', label: '窓辺', icon: <Sun className="w-4 h-4" /> },
            { id: 'ベッド', label: 'ベッド', icon: <Moon className="w-4 h-4" /> },
            { id: 'ソファ', label: 'ソファ', icon: <Sofa className="w-4 h-4" /> },
            { id: '棚の上', label: '棚の上', icon: <MapPin className="w-4 h-4" /> },
            { id: '玄関', label: '玄関', icon: <Home className="w-4 h-4" /> },
            { id: '階段', label: '階段', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'こたつ', label: 'こたつ', icon: <Flame className="w-4 h-4" /> },
            { id: 'キャットタワー', label: 'キャットタワー', icon: <TrendingUp className="w-4 h-4" /> },
        ]
    },
    {
        id: 'physicalPart',
        title: '部位フェチ図鑑',
        metaKey: 'physicalPart',
        color: '#FF2D55',
        items: [
            { id: '肉球', label: '肉球', icon: <PawPrint className="w-4 h-4" /> },
            { id: 'おしり', label: 'おしり', icon: <Footprints className="w-4 h-4" /> },
            { id: 'しっぽ', label: 'しっぽ', icon: <Activity className="w-4 h-4" /> },
            { id: 'お腹', label: 'お腹', icon: <Heart className="w-4 h-4" /> },
            { id: 'ヒゲ', label: 'ヒゲ', icon: <Sparkles className="w-4 h-4" /> },
            { id: '耳', label: '耳', icon: <Activity className="w-4 h-4" /> },
            { id: '顔アップ', label: '顔アップ', icon: <CameraIcon2 className="w-4 h-4" /> },
            { id: '背中', label: '背中', icon: <Activity className="w-4 h-4" /> },
        ]
    },
    {
        id: 'health',
        title: 'みまもり図鑑',
        metaKey: 'healthSymptoms',
        color: '#FF3B30',
        items: [
            { id: '吐いた', label: '吐いた', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: '下痢', label: '下痢', icon: <Droplets className="w-4 h-4" /> },
            { id: '目ヤニ', label: '目ヤニ', icon: <AlertCircle className="w-4 h-4" /> },
            { id: 'くしゃみ', label: 'くしゃみ', icon: <Wind className="w-4 h-4" /> },
            { id: 'かゆみ', label: 'かゆみ', icon: <AlertCircle className="w-4 h-4" /> },
            { id: '食欲低下', label: '食欲低下', icon: <Utensils className="w-4 h-4" /> },
            { id: '元気ない', label: '元気ない', icon: <Activity className="w-4 h-4" /> },
            { id: '震え', label: '震え', icon: <ShieldAlert className="w-4 h-4" /> },
        ]
    },
    {
        id: 'event',
        title: 'ハプニング図鑑',
        metaKey: 'event',
        color: '#FF453A',
        items: [
            { id: 'いたずら', label: 'いたずら', icon: <Flame className="w-4 h-4" /> },
            { id: '破壊', label: '破壊', icon: <Scissors className="w-4 h-4" /> },
            { id: '脱走未遂', label: '脱走未遂', icon: <AlertCircle className="w-4 h-4" /> },
            { id: 'ケンカ', label: 'ケンカ', icon: <Scissors className="w-4 h-4" /> },
            { id: '水こぼし', label: '水こぼし', icon: <Droplets className="w-4 h-4" /> },
            { id: '登りすぎ', label: '登りすぎ', icon: <TrendingUp className="w-4 h-4" /> },
            { id: '侵入禁止', label: '侵入禁止', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'おもちゃ没収', label: 'おもちゃ没収', icon: <ShoppingBag className="w-4 h-4" /> },
        ]
    },
    {
        id: 'relationship',
        title: 'なかよし図鑑',
        metaKey: 'relationship',
        color: '#FF375F',
        items: [
            { id: 'ぴったり', label: 'ぴったり', icon: <Heart className="w-4 h-4" /> },
            { id: '毛づくろい中', label: '毛づくろい中', icon: <HeartPulse className="w-4 h-4" /> },
            { id: '近い', label: '近い', icon: <UserPlus className="w-4 h-4" /> },
            { id: '微妙な距離', label: '微妙な距離', icon: <Search className="w-4 h-4" /> },
            { id: 'ケンカ前', label: 'ケンカ前', icon: <AlertCircle className="w-4 h-4" /> },
            { id: '仲直り', label: '仲直り', icon: <Heart className="w-4 h-4" /> },
            { id: '一緒に食事', label: '一緒に食事', icon: <Utensils className="w-4 h-4" /> },
            { id: '追いかけっこ', label: '追いかけっこ', icon: <Zap className="w-4 h-4" /> },
        ]
    },
    {
        id: 'seasonEvent',
        title: '季節といべんと図鑑',
        metaKey: 'seasonEvent',
        color: '#FFD60A',
        items: [
            { id: '換毛期', label: '換毛期', icon: <Brush className="w-4 h-4" /> },
            { id: '暑さ対策', label: '暑さ対策', icon: <Sun className="w-4 h-4" /> },
            { id: '冬支度', label: '冬支度', icon: <Cloud className="w-4 h-4" /> },
            { id: '誕生日', label: '誕生日', icon: <Cake className="w-4 h-4" /> },
            { id: 'クリスマス', label: 'クリスマス', icon: <Gift className="w-4 h-4" /> },
            { id: 'お正月', label: 'お正月', icon: <CalendarDays className="w-4 h-4" /> },
            { id: 'うちの子記念日', label: 'うちの子記念日', icon: <Heart className="w-4 h-4" /> },
            { id: '記念写真', label: '記念写真', icon: <CameraIcon2 className="w-4 h-4" /> },
        ]
    },
    {
        id: 'growth',
        title: '成長のきろく図鑑',
        metaKey: 'growth',
        color: '#64D2FF',
        items: [
            { id: '子猫', label: '子猫', icon: <Baby className="w-4 h-4" /> },
            { id: '成猫', label: '成猫', icon: <Cat className="w-4 h-4" /> },
            { id: '老猫', label: '老猫', icon: <Moon className="w-4 h-4" /> },
            { id: '冬毛', label: '冬毛', icon: <Cloud className="w-4 h-4" /> },
            { id: '夏毛', label: '夏毛', icon: <Sun className="w-4 h-4" /> },
            { id: '体格の変化', label: '体格の変化', icon: <TrendingUp className="w-4 h-4" /> },
            { id: '毛並みの変化', label: '毛並みの変化', icon: <Sparkles className="w-4 h-4" /> },
            { id: '成長記録', label: '成長記録', icon: <History className="w-4 h-4" /> },
        ]
    },
    {
        id: 'items',
        title: 'お気に入りアイテム図鑑',
        metaKey: 'items',
        color: '#0A84FF',
        items: [
            { id: 'おもちゃ', label: 'おもちゃ', icon: <Zap className="w-4 h-4" /> },
            { id: '爪とぎ', label: '爪とぎ', icon: <Scissors className="w-4 h-4" /> },
            { id: 'べッド', label: 'べッド', icon: <Moon className="w-4 h-4" /> },
            { id: '食器', label: '食器', icon: <Utensils className="w-4 h-4" /> },
            { id: 'おやつ', label: 'おやつ', icon: <Gift className="w-4 h-4" /> },
            { id: '首輪', label: '首輪', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'キャリーケース', label: 'キャリーケース', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: 'ブラシ', label: 'ブラシ', icon: <Brush className="w-4 h-4" /> },
        ]
    }
];

// ─────────────────────────────────
// Props
// ─────────────────────────────────
interface ZukanScreenProps {
    onClose?: () => void;
}

// ─────────────────────────────────
// Main Component
// ─────────────────────────────────
export function ZukanScreen({ onClose }: ZukanScreenProps) {
    const { cats, analyzeCatImage } = useCatContext();
    const { householdId } = useCoreContext();

    const [activeTab, setActiveTab] = useState<'discover' | 'encyclopedia'>('discover');
    const [filterCatId, setFilterCatId] = useState<string | null>(null);
    const [showEmptyShelves, setShowEmptyShelves] = useState(false);
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
    const [selectedDetailImage, setSelectedDetailImage] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Verification State
    const [isVerificationOpen, setIsVerificationOpen] = useState(false);

    // Batch tagging state
    const [batchTagging, setBatchTagging] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, done: false });
    const [showWeeklyAlbum, setShowWeeklyAlbum] = useState(false);

    const supabaseRef = useRef(createClient());

    // ─────────────────────────────────
    // Fetch all photos
    // ─────────────────────────────────
    const loadPhotos = useCallback(async () => {
        if (!householdId) return;
        setLoading(true);

        const supabase = supabaseRef.current;
        const { data, error } = await (supabase.rpc as any)("get_unified_gallery", {
            target_household_id: householdId,
            filter_cat_id: filterCatId || undefined,
            limit_count: 500,
            offset_count: 0,
        });

        if (error) {
            console.error("Error loading photos:", error);
            setLoading(false);
            return;
        }

        const items = (data as any[]) || [];
        const photos = items.map((img) => mapToShelfPhoto(img));
        setAllPhotos(photos);
        setLoading(false);
    }, [householdId, filterCatId]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    // ─────────────────────────────────
    // Free-text Search Filter
    // ─────────────────────────────────
    const filteredPhotos = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allPhotos;
        return allPhotos.filter(photo => {
            // memo
            if (photo.memo?.toLowerCase().includes(q)) return true;
            // catName
            if (photo.catName?.toLowerCase().includes(q)) return true;
            // tags
            if (photo.tags?.some((t: any) => {
                const name = typeof t === 'string' ? t : t.name;
                return name?.toLowerCase().includes(q);
            })) return true;
            // AI labels
            const labels = photo.aiAnalysis?.labels;
            if (labels) {
                if (labels.moment?.toLowerCase().includes(q)) return true;
                if (labels.scene?.toLowerCase().includes(q)) return true;
                if (labels.shot?.toLowerCase().includes(q)) return true;
            }
            // AI uiTags
            if (photo.aiAnalysis?.uiTags?.some((tag: string) => tag.toLowerCase().includes(q))) return true;
            // zukanShelf
            if (photo.aiAnalysis?.zukanShelf?.toLowerCase().includes(q)) return true;
            // metadata (A-K)
            const metadata = photo.aiAnalysis?.metadata;
            if (metadata) {
                if (Object.values(metadata).some(val => val?.toLowerCase().includes(q))) return true;
            }
            return false;
        });
    }, [allPhotos, searchQuery]);

    // ─────────────────────────────────
    // Helper: Categorize Photos (Fixed Shelves)
    // ─────────────────────────────────
    const encyclopediaShelves = useMemo(() => {
        const shelves: Record<string, ShelfPhoto[]> = {
            '眠り': [],
            'ごはん': [],
            '遊び': [],
            '甘えん坊': [],
            'いたずら': [],
            'ハプニング': [],
            'ふたり': [],
            '窓辺': [],
            'おでかけ・病院': [],
            '記念日': [],
            'その他': []
        };

        filteredPhotos.forEach(photo => {
            const ai = photo.aiAnalysis;
            const labels = ai?.labels;

            // 1. Priority: Direct Zukan Shelf Mapping from AI
            if (ai?.zukanShelf && shelves[ai.zukanShelf]) {
                shelves[ai.zukanShelf].push(photo);
            }
            // 1.5 Special: Fix legacy naming (ねんね -> 眠り)
            else if (ai?.zukanShelf === 'ねんね') {
                shelves['眠り'].push(photo);
            }
            // 2. Fallback: By Labels (mapping from English keys)
            else if (labels) {
                if (labels.moment === 'sleep' || labels.moment === 'rest' || labels.moment === 'ねんね') shelves['眠り'].push(photo);
                else if (labels.moment === 'meal') shelves['ごはん'].push(photo);
                else if (labels.moment === 'play' || labels.moment === 'explore') shelves['遊び'].push(photo);
                else if (labels.moment === 'cuddle' || labels.moment === 'grooming') shelves['甘えん坊'].push(photo);
                else if (labels.moment === 'mischief') shelves['いたずら'].push(photo);
                else if (labels.moment === 'accident') shelves['ハプニング'].push(photo);

                if (labels.shot === 'two_cats') shelves['ふたり'].push(photo);

                if (labels.scene === 'window') shelves['窓辺'].push(photo);
                if (labels.scene === 'vet' || labels.scene === 'outside') shelves['おでかけ・病院'].push(photo);
            }
            // 3. Last Resort: Tags
            else if (photo.tags && photo.tags.length > 0) {
                const t = photo.tags.map((t: any) => (typeof t === 'string' ? t : t.name));
                if (t.includes('寝顔') || t.includes('寝る')) shelves['眠り'].push(photo);
                else if (t.includes('ごはん') || t.includes('食べる')) shelves['ごはん'].push(photo);
                else shelves['その他'].push(photo);
            } else {
                shelves['その他'].push(photo);
            }
        });

        // Return all shelves, even empty ones
        return Object.entries(shelves)
            .map(([name, photos]) => ({
                name,
                photos: photos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            }));
    }, [filteredPhotos]);

    // ─────────────────────────────────
    // Zukan Collections (Multi-Axis)
    // ─────────────────────────────────
    const zukanCollections = useMemo(() => {
        return ZUKAN_AXES.map(axis => {
            const itemMap: Record<string, ShelfPhoto[]> = {};
            axis.items.forEach(item => { itemMap[item.id] = []; });

            filteredPhotos.forEach(photo => {
                const ai = photo.aiAnalysis;
                if (!ai) return;

                let val: string | undefined;
                if (axis.metaKey === 'pose') {
                    val = ai.pose;
                } else if (ai.metadata) {
                    val = ai.metadata[axis.metaKey];
                }

                if (val && itemMap[val]) {
                    itemMap[val].push(photo);
                }
            });

            const collectedCount = axis.items.filter(item => itemMap[item.id].length > 0).length;
            return {
                ...axis,
                itemMap,
                collectedCount,
                totalCount: axis.items.length
            };
        });
    }, [filteredPhotos]);

    // ─────────────────────────────────
    // Discover Logic
    // ─────────────────────────────────
    const discoverItems = useMemo(() => {
        // 1. Daily Pick (Highest score today)
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));

        const todaysPhotos = filteredPhotos.filter(p => new Date(p.createdAt) >= startOfToday);
        const dailyPick = todaysPhotos.sort((a, b) => (b.aiAnalysis?.forYouScores?.dailyPick || 0) - (a.aiAnalysis?.forYouScores?.dailyPick || 0))[0];

        // 2. Weekly Highlight (Fallback to 'Recent' if empty)
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        let weeklyPhotos = filteredPhotos.filter(p => new Date(p.createdAt) >= weekStart);

        const isFallback = weeklyPhotos.length === 0;
        if (isFallback) {
            weeklyPhotos = [...filteredPhotos];
        }

        const weeklyHighlight = weeklyPhotos
            .filter(p => p.id !== dailyPick?.id)
            .sort((a, b) => (b.aiAnalysis?.forYouScores?.weeklyHighlight || 0) - (a.aiAnalysis?.forYouScores?.weeklyHighlight || 0))
            .slice(0, 6);

        // 3. Similar Day (Past photo)
        let similarDay = null;
        if (dailyPick && dailyPick.aiAnalysis?.labels) {
            const { scene, moment } = dailyPick.aiAnalysis.labels;
            if (scene || moment) {
                const candidates = filteredPhotos.filter(p =>
                    p.id !== dailyPick.id &&
                    new Date(p.createdAt) < startOfToday &&
                    (p.aiAnalysis?.labels?.scene === scene || p.aiAnalysis?.labels?.moment === moment)
                );
                if (candidates.length > 0) {
                    similarDay = candidates[Math.floor(Math.random() * candidates.length)];
                }
            }
        }

        // 4. This Time Past Years (同日の過去写真)
        const nowDate = new Date();
        const thisMonth = nowDate.getMonth();
        const thisDay = nowDate.getDate();
        const pastYearPhotos = filteredPhotos
            .filter(p => {
                const d = new Date(p.createdAt);
                return d.getMonth() === thisMonth && d.getDate() === thisDay && daysAgo(p.createdAt) >= 30;
            })
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return { dailyPick, weeklyHighlight, similarDay, isFallback, pastYearPhotos };
    }, [filteredPhotos]);

    // ─────────────────────────────────
    // Monthly Digest
    // ─────────────────────────────────
    const monthlyDigest = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthPhotos = allPhotos.filter(p => {
            const d = new Date(p.createdAt);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        if (monthPhotos.length === 0) return null;

        // Top shelf
        const shelfCounts: Record<string, number> = {};
        monthPhotos.forEach(p => {
            const shelf = p.aiAnalysis?.zukanShelf;
            if (shelf && shelf !== 'その他') {
                shelfCounts[shelf] = (shelfCounts[shelf] || 0) + 1;
            }
        });
        const topShelf = Object.entries(shelfCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // Top pose
        const poseCounts: Record<string, number> = {};
        monthPhotos.forEach(p => {
            const pose = p.aiAnalysis?.pose;
            if (pose && pose !== 'その他') {
                poseCounts[pose] = (poseCounts[pose] || 0) + 1;
            }
        });
        const topPose = Object.entries(poseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // Best photo by score
        const bestPhoto = [...monthPhotos].sort((a, b) =>
            (b.aiAnalysis?.forYouScores?.weeklyHighlight || 0) - (a.aiAnalysis?.forYouScores?.weeklyHighlight || 0)
        )[0] || null;

        const monthName = `${currentMonth + 1}月`;

        return { totalPhotos: monthPhotos.length, topShelf, topPose, bestPhoto, monthName };
    }, [allPhotos]);
    // UI Helpers
    // ─────────────────────────────────
    const openDetail = (photo: ShelfPhoto) =>
        setSelectedDetailImage({
            id: photo.id,
            url: photo.url,
            catName: photo.catName,
            catIds: photo.catIds,
            createdAt: photo.createdAt,
            source: photo.source,
            memo: photo.memo,
            tags: photo.tags,
            aiAnalysis: photo.aiAnalysis
        });

    // ─────────────────────────────────
    // Verification Items
    // ─────────────────────────────────
    const verificationQueue = useMemo(() => {
        return allPhotos.filter(p => p.aiAnalysis && p.aiAnalysis.needUserConfirm === true).map(p => ({
            id: p.id,
            url: p.url,
            aiAnalysis: p.aiAnalysis,
            currentCatId: p.catId
        }));
    }, [allPhotos]);

    // ─────────────────────────────────
    // Batch AI tagging (Existing Logic)
    // ─────────────────────────────────
    // Update Untagged Count to identify photos without AI Analysis OR missing Pose info
    const untaggedCount = useMemo(() => {
        return allPhotos.filter(
            (p) => !p.aiAnalysis || (p.aiAnalysis && !p.aiAnalysis.pose)
        ).length;
    }, [allPhotos]);

    const runBatchTagging = useCallback(async () => {
        // Filter for photos that haven't been analyzed by AI OR missing pose (new requirement)
        const untagged = allPhotos.filter(
            (p) => !p.aiAnalysis || (p.aiAnalysis && !p.aiAnalysis.pose)
        );
        if (untagged.length === 0) return;

        setBatchTagging(true);
        setBatchProgress({ current: 0, total: untagged.length, done: false });

        for (let i = 0; i < untagged.length; i++) {
            const photo = untagged[i];
            const imageUrl = getFullImageUrl(photo.storagePath, { width: 800, height: 800, resize: 'contain', quality: 90 });

            try {
                const { error: invokeError } = await analyzeCatImage(photo.id, imageUrl);
                if (invokeError) {
                    console.error(`[AI Batch] Error (Photo ${i + 1}):`, invokeError);
                    // Error handling...
                }
            } catch (e) {
                console.error("[AI Batch] Unexpected exception:", e);
            }
            setBatchProgress({ current: i + 1, total: untagged.length, done: false });
            if (i < untagged.length - 1) await new Promise((r) => setTimeout(r, 2000));
        }

        setBatchProgress((prev) => ({ ...prev, done: true }));
        setBatchTagging(false);
        loadPhotos();
    }, [allPhotos, loadPhotos, analyzeCatImage]);


    // ─────────────────────────────────
    // Render: Shelf Detail
    // ─────────────────────────────────
    if (selectedShelf) {
        return (
            <div className="fixed inset-0 z-50 bg-[#fafafa] dark:bg-[#1c1c1e] flex flex-col">
                <div className="sticky top-0 z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10 pt-[env(safe-area-inset-top)]">
                    <div className="flex items-center justify-between px-5 h-14">
                        <button
                            onClick={() => setSelectedShelf(null)}
                            className="flex items-center gap-0.5 text-[#007AFF] font-semibold text-[15px] active:opacity-50 transition-opacity"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            戻る
                        </button>
                        <h2 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">
                            {selectedShelf.name}
                        </h2>
                        <span className="text-[13px] text-[#8e8e93] font-medium tabular-nums">
                            {selectedShelf.photos.length}枚
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-[2px] pb-24">
                        {selectedShelf.photos.map((photo, idx) => (
                            <motion.div
                                key={photo.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                                className="relative aspect-square bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer overflow-hidden active:opacity-80 transition-opacity"
                                onClick={() => openDetail(photo)}
                            >
                                <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            </motion.div>
                        ))}
                    </div>
                </div>

                <PhotoDetailView
                    isOpen={!!selectedDetailImage}
                    onClose={() => setSelectedDetailImage(null)}
                    image={selectedDetailImage}
                />
            </div>
        );
    }

    // ─────────────────────────────────
    // Render: Main Screen
    // ─────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-[#fafafa] dark:bg-[#1c1c1e] flex flex-col pb-32">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center justify-between px-5 h-14">
                    <button
                        onClick={onClose}
                        className="p-1.5 -ml-1.5 rounded-full active:bg-black/5 dark:active:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5 text-[#8e8e93]" />
                    </button>

                    {/* Segmented Control for Tabs */}
                    <div className="flex p-0.5 bg-[#767680]/15 rounded-lg w-[180px]">
                        <button
                            onClick={() => setActiveTab('discover')}
                            className={cn(
                                "flex-1 text-[13px] font-semibold py-1 rounded-[6px] transition-all",
                                activeTab === 'discover' ? "bg-white shadow-sm text-black" : "text-[#8e8e93]"
                            )}
                        >
                            みつける
                        </button>
                        <button
                            onClick={() => setActiveTab('encyclopedia')}
                            className={cn(
                                "flex-1 text-[13px] font-semibold py-1 rounded-[6px] transition-all",
                                activeTab === 'encyclopedia' ? "bg-white shadow-sm text-black" : "text-[#8e8e93]"
                            )}
                        >
                            図鑑
                        </button>
                    </div>

                    {/* Right Action: Verify or AI Analyze */}
                    <div className="flex items-center justify-end w-20">
                        {(() => {
                            if (verificationQueue.length > 0) {
                                return (
                                    <button
                                        onClick={() => setIsVerificationOpen(true)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white shadow-sm animate-pulse"
                                    >
                                        <span className="font-bold text-xs">{verificationQueue.length}</span>
                                    </button>
                                );
                            }
                            if (batchTagging) {
                                return (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8e8e93]/10 text-[#8e8e93] text-[11px] font-medium animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>{batchProgress.current}/{batchProgress.total}</span>
                                    </div>
                                );
                            }
                            if (untaggedCount > 0) {
                                return (
                                    <button
                                        onClick={runBatchTagging}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-[12px] font-semibold active:bg-[#007AFF]/20 transition-colors"
                                    >
                                        <Wand2 className="w-3.5 h-3.5" />
                                        <span className="text-[10px] ml-0.5">{untaggedCount}</span>
                                    </button>
                                );
                            }
                            return <div className="w-8" />;
                        })()}
                    </div>
                </div>
            </div>

            {/* Cat Filter Selector (Sticky Chips) */}
            <div className="sticky top-[56px] z-30 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea]/60 dark:border-white/10 flex-shrink-0">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 py-3">
                    <button
                        onClick={() => setFilterCatId(null)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 h-9 rounded-full border transition-all shrink-0 font-bold text-[13px]",
                            filterCatId === null
                                ? "bg-[#1c1c1e] dark:bg-white border-[#1c1c1e] dark:border-white text-white dark:text-black shadow-sm"
                                : "bg-white dark:bg-[#2c2c2e] border-[#e5e5ea] dark:border-white/10 text-[#8e8e93]"
                        )}
                    >
                        すべて
                    </button>
                    {cats.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilterCatId(cat.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 h-9 rounded-full border transition-all shrink-0 font-bold text-[13px]",
                                filterCatId === cat.id
                                    ? "bg-[#1c1c1e] dark:bg-white border-[#1c1c1e] dark:border-white text-white dark:text-black shadow-sm"
                                    : "bg-white dark:bg-[#2c2c2e] border-[#e5e5ea] dark:border-white/10 text-[#8e8e93]"
                            )}
                        >
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#f2f2f7] dark:bg-[#3a3a3c] shrink-0">
                                {cat.avatar && cat.avatar !== 'cat-fallback' ? (
                                    <img src={cat.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#1c1c1e]/20">
                                        <Cat className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="sticky top-[100px] z-30 px-5 py-2 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="メモ・タグで検索"
                        className="w-full h-9 pl-9 pr-8 bg-[#e5e5ea]/60 dark:bg-white/10 rounded-xl text-[14px] text-[#1c1c1e] dark:text-white placeholder:text-[#8e8e93] outline-none focus:ring-2 focus:ring-[#007AFF]/40 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#8e8e93]/30 flex items-center justify-center"
                        >
                            <X className="w-3 h-3 text-[#8e8e93]" />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <p className="text-[11px] text-[#8e8e93] mt-1.5 pl-1">
                        {filteredPhotos.length}件の写真が見つかりました
                    </p>
                )}
            </div>

            {/* Verification Banner (Optional, sticky below header) */}
            {verificationQueue.length > 0 && (
                <div
                    onClick={() => setIsVerificationOpen(true)}
                    className="mx-5 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between cursor-pointer active:opacity-70 transition-opacity"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-100">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                {verificationQueue.length}枚の確認が必要です
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                AIが自信を持てない写真があります
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-[#c7c7cc]" />
                        <p className="text-[13px] text-[#8e8e93]">読み込み中...</p>
                    </div>
                ) : allPhotos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-8">
                        <div className="w-20 h-20 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center">
                            <Camera className="w-8 h-8 text-[#c7c7cc]" />
                        </div>
                        <p className="text-[15px] font-bold text-[#8e8e93]">まだ写真がありません</p>
                    </div>
                ) : (
                    <div className="pb-24 pt-4">

                        {/* ─── DISCOVER TAB ─── */}
                        {activeTab === 'discover' && (
                            <div className="px-5 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* 1. Rewind Digest (Hero) */}
                                <RewindDigestCard
                                    allPhotos={allPhotos.map(p => ({
                                        id: p.id,
                                        url: p.url,
                                        catName: p.catName,
                                        createdAt: p.createdAt,
                                        memo: p.memo,
                                    }))}
                                />

                                {/* 2. Weekly Highlight */}
                                {discoverItems.weeklyHighlight.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">
                                                {discoverItems.isFallback ? '最近のハイライト' : '今週のハイライト'}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {discoverItems.weeklyHighlight.map((photo, i) => (
                                                <div
                                                    key={photo.id}
                                                    className={cn(
                                                        "relative rounded-xl overflow-hidden cursor-pointer",
                                                        i === 0 ? "aspect-square col-span-2" : "aspect-square"
                                                    )}
                                                    onClick={() => openDetail(photo)}
                                                >
                                                    <img src={photo.url} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Similar Day */}
                                {discoverItems.similarDay && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">似ている日</h3>
                                        </div>
                                        <div className="flex items-center gap-4 bg-[#f2f2f7] p-4 rounded-2xl cursor-pointer" onClick={() => openDetail(discoverItems.similarDay!)}>
                                            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                                                <img src={discoverItems.similarDay.url} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#1c1c1e] text-[15px] mb-1">
                                                    {new Date(discoverItems.similarDay.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-[12px] text-[#8e8e93]">
                                                    {discoverItems.similarDay.aiAnalysis?.labels?.moment === discoverItems.dailyPick?.aiAnalysis?.labels?.moment
                                                        ? '同じような行動をしていました'
                                                        : '同じ場所で過ごしていました'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 4. This Time Past Years */}
                                {discoverItems.pastYearPhotos.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <History className="w-4.5 h-4.5 text-[#AF52DE]" />
                                            <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">
                                                {(() => {
                                                    const oldest = new Date(discoverItems.pastYearPhotos[0].createdAt);
                                                    const years = new Date().getFullYear() - oldest.getFullYear();
                                                    return years >= 1 ? `${years}年前の今日` : '以前の今日';
                                                })()}
                                            </h3>
                                        </div>
                                        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                                            {discoverItems.pastYearPhotos.map(photo => {
                                                const d = new Date(photo.createdAt);
                                                const yearsAgo = new Date().getFullYear() - d.getFullYear();
                                                const label = yearsAgo >= 1 ? `${yearsAgo}年前` : `${daysAgo(photo.createdAt)}日前`;
                                                return (
                                                    <div
                                                        key={photo.id}
                                                        className="relative shrink-0 w-28 cursor-pointer group"
                                                        onClick={() => openDetail(photo)}
                                                    >
                                                        <div className="aspect-square rounded-xl overflow-hidden ring-1 ring-black/5">
                                                            <img src={photo.url} className="w-full h-full object-cover group-active:scale-95 transition-transform" alt="" />
                                                        </div>
                                                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-full">
                                                            <span className="text-[10px] font-bold text-white">{label}</span>
                                                        </div>
                                                        <p className="text-[11px] text-[#8e8e93] mt-1.5 truncate font-medium">
                                                            {photo.catName}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 5. Monthly Digest */}
                                {monthlyDigest && (
                                    <div className="mt-4">
                                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5856D6] via-[#AF52DE] to-[#FF2D55] p-[1px]">
                                            <div className="rounded-[15px] bg-[#1c1c1e]/90 backdrop-blur-xl p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-[17px] font-bold text-white">
                                                        {monthlyDigest.monthName}のまとめ
                                                    </h3>
                                                    <span className="text-[11px] text-white/50 font-medium">
                                                        {new Date().getFullYear()}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-black text-white tabular-nums">
                                                            {monthlyDigest.totalPhotos}
                                                        </p>
                                                        <p className="text-[10px] text-white/60 font-medium mt-0.5">総写真</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold text-white">
                                                            {monthlyDigest.topShelf || '―'}
                                                        </p>
                                                        <p className="text-[10px] text-white/60 font-medium mt-0.5">最多シーン</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold text-white">
                                                            {monthlyDigest.topPose || '―'}
                                                        </p>
                                                        <p className="text-[10px] text-white/60 font-medium mt-0.5">人気ポーズ</p>
                                                    </div>
                                                </div>

                                                {monthlyDigest.bestPhoto && (
                                                    <div
                                                        className="relative rounded-xl overflow-hidden h-36 cursor-pointer active:opacity-80 transition-opacity"
                                                        onClick={() => openDetail(monthlyDigest.bestPhoto!)}
                                                    >
                                                        <img
                                                            src={monthlyDigest.bestPhoto.url}
                                                            className="w-full h-full object-cover"
                                                            alt=""
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                                        <div className="absolute bottom-2.5 left-3">
                                                            <p className="text-[11px] font-bold text-white/90">✨ ベストショット</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── ENCYCLOPEDIA TAB ─── */}
                        {activeTab === 'encyclopedia' && (
                            <div className="px-5 space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                {/* ─── ENCYCLOPEDIA TAB ─── */}
                                {activeTab === 'encyclopedia' && (
                                    <div className="px-5 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                        {zukanCollections.map(axis => (
                                            <div key={axis.id} className="mb-8">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Award className="w-4.5 h-4.5" style={{ color: axis.color }} />
                                                        <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white">{axis.title}</h3>
                                                    </div>
                                                    <span className="text-[13px] font-bold text-[#8e8e93] tabular-nums">
                                                        {axis.collectedCount}/{axis.totalCount}
                                                    </span>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="h-1.5 bg-[#e5e5ea]/60 dark:bg-white/10 rounded-full mb-4 overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: axis.color }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(axis.collectedCount / axis.totalCount) * 100}%` }}
                                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    />
                                                </div>
                                                {/* Grid */}
                                                <div className="grid grid-cols-4 gap-2.5">
                                                    {axis.items.map(item => {
                                                        const photos = axis.itemMap[item.id] || [];
                                                        const isUnlocked = photos.length > 0;
                                                        const representative = photos[0];
                                                        return (
                                                            <motion.div
                                                                key={item.id}
                                                                whileTap={isUnlocked ? { scale: 0.95 } : undefined}
                                                                className={cn(
                                                                    "relative flex flex-col items-center cursor-pointer rounded-xl p-2 transition-all",
                                                                    isUnlocked
                                                                        ? "bg-white dark:bg-[#2c2c2e] shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                                        : "bg-[#f2f2f7]/60 dark:bg-[#2c2c2e]/40"
                                                                )}
                                                                onClick={() => {
                                                                    if (isUnlocked) setSelectedShelf({ name: item.label, photos });
                                                                }}
                                                            >
                                                                <div className={cn(
                                                                    "w-12 h-12 rounded-full flex items-center justify-center mb-1.5 overflow-hidden",
                                                                    isUnlocked ? "" : "bg-[#e5e5ea]/60 dark:bg-white/5"
                                                                )}>
                                                                    {isUnlocked && representative ? (
                                                                        <img src={representative.url} className="w-full h-full object-cover rounded-full" alt="" />
                                                                    ) : (
                                                                        <div className="opacity-30">{item.icon}</div>
                                                                    )}
                                                                </div>
                                                                <span className={cn(
                                                                    "text-[10px] font-bold text-center leading-tight",
                                                                    isUnlocked ? "text-[#1c1c1e] dark:text-white" : "text-[#c7c7cc] dark:text-[#636366]"
                                                                )}>
                                                                    {item.label}
                                                                </span>
                                                                {isUnlocked ? (
                                                                    <span className="text-[9px] text-[#8e8e93] font-medium mt-0.5">{photos.length}枚</span>
                                                                ) : (
                                                                    <span className="text-[9px] text-[#c7c7cc] dark:text-[#48484a] mt-0.5">🔒</span>
                                                                )}
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Scene Shelves */}
                                        <div className="pt-4 border-t border-[#e5e5ea]/60 dark:border-white/10">
                                            <h3 className="text-[17px] font-bold text-[#1c1c1e] dark:text-white mb-4">シーン別の棚</h3>
                                            {encyclopediaShelves.length > 0 ? (
                                                <div className="space-y-4">
                                                    {encyclopediaShelves
                                                        .filter(s => showEmptyShelves || s.photos.length > 0)
                                                        .map((shelf, shelfIdx) => (
                                                            <ShelfRow
                                                                key={shelf.name}
                                                                shelf={shelf}
                                                                index={shelfIdx}
                                                                onTap={() => setSelectedShelf(shelf)}
                                                                onPhotoTap={openDetail}
                                                            />
                                                        ))
                                                    }

                                                    {/* Show Empty Shelves Toggle */}
                                                    <div className="pt-4 pb-12 flex justify-center">
                                                        <button
                                                            onClick={() => setShowEmptyShelves(!showEmptyShelves)}
                                                            className="px-5 py-2.5 bg-[#8e8e93]/10 dark:bg-white/5 rounded-full text-[13px] font-bold text-[#8e8e93] active:scale-95 transition-all"
                                                        >
                                                            {showEmptyShelves ? "空の棚を隠す" : `空の棚も表示する (${encyclopediaShelves.filter(s => s.photos.length === 0).length})`}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-20 text-[#8e8e93]">
                                                    <p>まだコレクションがありません</p>
                                                    <button onClick={runBatchTagging} className="mt-4 text-[#007AFF] text-sm font-bold">
                                                        AIで写真を整理する
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>

            <PhotoDetailView
                isOpen={!!selectedDetailImage}
                onClose={() => setSelectedDetailImage(null)}
                image={selectedDetailImage}
            />

            {/* Weekly Album Modal */}
            <AnimatePresence>
                {showWeeklyAlbum && (
                    <WeeklyPageClient onClose={() => setShowWeeklyAlbum(false)} />
                )}
            </AnimatePresence>

            {/* Verification Modal */}
            <AnimatePresence>
                {isVerificationOpen && (
                    <VerificationModal
                        queue={verificationQueue}
                        onClose={() => {
                            setIsVerificationOpen(false);
                            loadPhotos();
                        }}
                        cats={cats}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────
// Verification Modal
// ─────────────────────────────────
function VerificationModal({
    queue,
    onClose,
    cats,
}: {
    queue: any[];
    onClose: () => void;
    cats: any[];
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { updateCatImage } = useCatContext();
    const currentItem = queue[currentIndex];

    const handleConfirm = async (catId: string) => {
        if (!currentItem) return;

        // Update the image with the confirmed catId and remove the flag
        const updates = {
            cat_id: catId,
            cat_ids: [catId], // Update array too
            ai_analysis: {
                ...currentItem.aiAnalysis,
                catId: catId,
                needUserConfirm: false,
                userConfirmed: true,
                confirmedAt: new Date().toISOString()
            }
        };

        await updateCatImage(currentItem.id, updates);

        if (currentIndex < queue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    if (!currentItem) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col pt-[env(safe-area-inset-top)]"
        >
            <div className="flex items-center justify-between px-5 h-14 shrink-0">
                <h2 className="text-white font-bold text-[17px]">この子はだれ？</h2>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto">
                {/* Photo */}
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <img src={currentItem.url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                        <p className="text-white text-[11px] font-bold">
                            判定待ち: {currentIndex + 1} / {queue.length}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-white/60 text-center text-sm">
                        AIが自信を持って判断できませんでした。<br />正しい子を選んでください。
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {cats.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleConfirm(cat.id)}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 active:bg-white/10 transition-colors"
                            >
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent">
                                    {cat.avatar && cat.avatar !== '🐈' ? (
                                        <img src={cat.avatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-[#2c2c2e] flex items-center justify-center text-[#8e8e93]">
                                            <ImageIcon className="w-8 h-8 opacity-40" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-white font-bold">{cat.name}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => handleConfirm('null')} // Explicitly set to unknown
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:bg-white/10 transition-colors col-span-2"
                        >
                            <span className="text-white/40 font-bold text-sm">どちらでもない / 分からない</span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────
// Shelf Row (Apple Photos style)
// ─────────────────────────────────
// ─────────────────────────────────
// Shelf Row (Apple Photos style)
// ─────────────────────────────────
function ShelfRow({
    shelf,
    index,
    onTap,
    onPhotoTap,
}: {
    shelf: Shelf;
    index: number;
    onTap: () => void;
    onPhotoTap: (photo: ShelfPhoto) => void;
}) {
    // Number of photos to show directly (max 2 if there's a count card, otherwise up to 3)
    const displayCount = shelf.photos.length > 3 ? 2 : 3;
    const items = shelf.photos.slice(0, displayCount);
    // Fill with nulls to maintain 3 columns
    const placeholders = Array(Math.max(0, 3 - shelf.photos.length)).fill(null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4, ease: "easeOut" }}
            className="mb-8"
        >
            <button
                onClick={onTap}
                className="w-full h-[54px] flex items-center justify-between px-5 group active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors rounded-xl"
            >
                <div className="flex items-baseline gap-2">
                    <h3 className="text-[20px] font-bold text-[#1c1c1e] dark:text-white tracking-tight leading-none">
                        {shelf.name}
                    </h3>
                    <span className="text-[14px] font-bold text-[#c7c7cc] tabular-nums leading-none">
                        {shelf.photos.length}
                    </span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#c7c7cc] group-active:translate-x-0.5 transition-transform" />
            </button>

            <div className="grid grid-cols-3 gap-[4px] px-5 mt-0.5">
                {items.map((photo, idx) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.12) }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-[#f2f2f7] dark:bg-[#2c2c2e] cursor-pointer active:scale-[0.97] transition-all ring-1 ring-black/[0.05] shadow-sm"
                        onClick={() => onPhotoTap(photo)}
                    >
                        <img
                            src={photo.url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                ))}

                {shelf.photos.length > 3 ? (
                    <button
                        onClick={onTap}
                        className="aspect-square rounded-xl bg-[#f2f2f7] dark:bg-[#2c2c2e] border border-black/[0.05] flex flex-col items-center justify-center gap-0 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-all overflow-hidden group shadow-sm"
                    >
                        <span className="text-[21px] font-bold text-[#818186] dark:text-[#a1a1a6] tabular-nums group-active:scale-110 transition-transform leading-none">
                            +{shelf.photos.length - 2}
                        </span>
                        <div className="text-[10px] font-black text-[#8e8e93] opacity-60 mt-1.5 uppercase tracking-wider">残り</div>
                    </button>
                ) : (
                    placeholders.map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="aspect-square rounded-xl bg-[#f5f5f7]/50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                        />
                    ))
                )}
            </div>
        </motion.div>
    );
}
