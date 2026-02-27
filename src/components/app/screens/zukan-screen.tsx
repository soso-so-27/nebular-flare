"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, ChevronLeft, Loader2, ChevronRight, Sparkles, Calendar, Clock, Camera, Award,
    ImageIcon, Wand2, AlertTriangle, History, Search, PawPrint, Cat, Package, Circle,
    Activity, Box, Utensils, Moon, Zap, Target, Wind, Smile, Frown, Meh, Ghost, Cloud,
    Sun, Stethoscope, Thermometer, Droplets, Bandage, Flame, Scissors, ShieldAlert,
    UserPlus, HeartPulse, Home, Sofa, Map, MapPin, Footprints, Camera as CameraIcon2,
    CalendarDays, Gift, Cake, Baby, TrendingUp, ShoppingBag, Brush, Heart, AlertCircle,
    Lock
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { PhotoDetailView } from "../immersive/photo-detail-view";
import { WeeklyPageClient } from "../shared/weekly-page-client";
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
    metadata?: Record<string, string>;
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

interface ZukanItemDef {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface ZukanAxisDef {
    id: string;
    title: string;
    metaKey: string;
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

interface ZukanScreenProps {
    onClose?: () => void;
}

export function ZukanScreen({ onClose }: ZukanScreenProps) {
    const { cats, analyzeCatImage, updateCatImage } = useCatContext();
    const { householdId } = useCoreContext();

    const [filterCatId, setFilterCatId] = useState<string | null>(null);
    const [showEmptyShelves, setShowEmptyShelves] = useState(false);
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
    const [selectedDetailImage, setSelectedDetailImage] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isVerificationOpen, setIsVerificationOpen] = useState(false);
    const [batchTagging, setBatchTagging] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, done: false });
    const [showWeeklyAlbum, setShowWeeklyAlbum] = useState(false);

    const supabaseRef = useRef(createClient());

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

    const filteredPhotos = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allPhotos;
        return allPhotos.filter(photo => {
            if (photo.memo?.toLowerCase().includes(q)) return true;
            if (photo.catName?.toLowerCase().includes(q)) return true;
            if (photo.tags?.some((t: any) => {
                const name = typeof t === 'string' ? t : t.name;
                return name?.toLowerCase().includes(q);
            })) return true;
            const labels = photo.aiAnalysis?.labels;
            if (labels) {
                if (labels.moment?.toLowerCase().includes(q)) return true;
                if (labels.scene?.toLowerCase().includes(q)) return true;
                if (labels.shot?.toLowerCase().includes(q)) return true;
            }
            if (photo.aiAnalysis?.uiTags?.some((tag: string) => tag.toLowerCase().includes(q))) return true;
            if (photo.aiAnalysis?.zukanShelf?.toLowerCase().includes(q)) return true;
            const metadata = photo.aiAnalysis?.metadata;
            if (metadata) {
                if (Object.values(metadata).some(val => val?.toLowerCase().includes(q))) return true;
            }
            return false;
        });
    }, [allPhotos, searchQuery]);

    const encyclopediaShelves = useMemo(() => {
        const categories = [
            '眠り', 'ごはん', '遊び', '甘えん坊', 'いたずら', 'ハプニング',
            'ふたり', '窓辺', 'おでかけ・病院', '記念日', 'その他'
        ];
        const shelves: Record<string, ShelfPhoto[]> = {};
        categories.forEach(c => shelves[c] = []);

        filteredPhotos.forEach(photo => {
            const ai = photo.aiAnalysis;
            const labels = ai?.labels;

            if (ai?.zukanShelf && shelves[ai.zukanShelf]) shelves[ai.zukanShelf].push(photo);
            else if (ai?.zukanShelf === 'ねんね') shelves['眠り'].push(photo);
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
            } else {
                shelves['その他'].push(photo);
            }
        });

        return categories.map(name => ({
            name,
            photos: shelves[name].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }));
    }, [filteredPhotos]);

    const zukanCollections = useMemo(() => {
        return ZUKAN_AXES.map(axis => {
            const itemMap: Record<string, ShelfPhoto[]> = {};
            axis.items.forEach(item => { itemMap[item.id] = []; });

            filteredPhotos.forEach(photo => {
                const ai = photo.aiAnalysis;
                if (!ai) return;
                let val: string | undefined;
                if (axis.metaKey === 'pose') val = ai.pose;
                else if (ai.metadata) val = ai.metadata[axis.metaKey];
                if (val && itemMap[val]) itemMap[val].push(photo);
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

    const openDetail = (photo: ShelfPhoto) =>
        setSelectedDetailImage({
            id: photo.id, url: photo.url, catName: photo.catName, catIds: photo.catIds,
            createdAt: photo.createdAt, source: photo.source, memo: photo.memo,
            tags: photo.tags, aiAnalysis: photo.aiAnalysis
        });

    const verificationQueue = useMemo(() => {
        return allPhotos.filter(p => p.aiAnalysis && p.aiAnalysis.needUserConfirm === true).map(p => ({
            id: p.id, url: p.url, aiAnalysis: p.aiAnalysis, currentCatId: p.catId
        }));
    }, [allPhotos]);

    const untaggedCount = useMemo(() => {
        return allPhotos.filter((p) => !p.aiAnalysis || (p.aiAnalysis && !p.aiAnalysis.pose)).length;
    }, [allPhotos]);

    const runBatchTagging = useCallback(async () => {
        const untagged = allPhotos.filter((p) => !p.aiAnalysis || (p.aiAnalysis && !p.aiAnalysis.pose));
        if (untagged.length === 0) return;
        setBatchTagging(true);
        setBatchProgress({ current: 0, total: untagged.length, done: false });
        for (let i = 0; i < untagged.length; i++) {
            const photo = untagged[i];
            const imageUrl = getFullImageUrl(photo.storagePath, { width: 800, height: 800, resize: 'contain', quality: 90 });
            try { await analyzeCatImage(photo.id, imageUrl); } catch (e) { console.error(e); }
            setBatchProgress({ current: i + 1, total: untagged.length, done: false });
            if (i < untagged.length - 1) await new Promise((r) => setTimeout(r, 2000));
        }
        setBatchTagging(false);
        loadPhotos();
    }, [allPhotos, loadPhotos, analyzeCatImage]);

    if (selectedShelf) {
        return (
            <div className="fixed inset-0 z-50 bg-[#FDF8F1] dark:bg-[#121214] flex flex-col">
                <div className="sticky top-0 z-30 bg-[#FDF8F1]/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-[#F2EFEA] dark:border-white/10 pt-[env(safe-area-inset-top)]">
                    <header className="flex items-center justify-between px-5 h-14" role="navigation" aria-label="詳細ヘッダー">
                        <button onClick={() => setSelectedShelf(null)} className="flex items-center gap-0.5 text-brand-peach font-bold text-[15px]" aria-label="図鑑トップに戻る">
                            <ChevronLeft className="w-5 h-5" />戻る
                        </button>
                        <h2 className="text-[18px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">{selectedShelf.name}</h2>
                        <span className="text-[14px] text-[#8E8B85] dark:text-[#A6A29A] font-medium">{selectedShelf.photos.length}枚</span>
                    </header>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-[2px] pb-24">
                        {selectedShelf.photos.map((photo, idx) => (
                            <motion.div key={photo.id} onClick={() => openDetail(photo)} className="relative aspect-square bg-[#F2EFEA] dark:bg-white/5 cursor-pointer overflow-hidden">
                                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                            </motion.div>
                        ))}
                    </div>
                </div>
                <PhotoDetailView isOpen={!!selectedDetailImage} onClose={() => setSelectedDetailImage(null)} image={selectedDetailImage} />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#FDF8F1] dark:bg-[#121214] flex flex-col pb-32">
            <header className="sticky top-0 z-30 bg-[#FDF8F1]/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-[#F2EFEA] dark:border-white/10 pt-[env(safe-area-inset-top)]" role="banner">
                <div className="flex items-center px-5 h-14">
                    <div className="w-16" /> {/* Spacer for centering alignment */}
                    <h1 className="flex-1 text-center text-[18px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">アルバム図鑑</h1>
                    <div className="flex items-center justify-end w-16">
                        {verificationQueue.length > 0 ? (
                            <button onClick={() => setIsVerificationOpen(true)} className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white shadow-sm animate-pulse" aria-label={`${verificationQueue.length}件の確認待ち記録があります`}>
                                <span className="font-bold text-xs">{verificationQueue.length}</span>
                            </button>
                        ) : batchTagging ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#787570]/10 text-[#787570] dark:text-[#A6A29A] text-[12px] font-medium animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{batchProgress.current}/{batchProgress.total}</span>
                            </div>
                        ) : untaggedCount > 0 ? (
                            <button onClick={runBatchTagging} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-peach/10 text-brand-peach text-[13px] font-bold" aria-label={`${untaggedCount}件をAIで自動タグ付け`}>
                                <Wand2 className="w-4 h-4" /><span className="text-[12px] ml-0.5">{untaggedCount}</span>
                            </button>
                        ) : <div className="w-8" />}
                    </div>
                </div>
            </header>

            <nav className="sticky top-[56px] z-30 bg-[#FDF8F1]/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-[#F2EFEA] dark:border-white/10 flex-shrink-0 px-5 py-3 space-y-2.5" aria-label="猫別フィルタ">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
                    <button onClick={() => setFilterCatId(null)} className={cn("flex items-center gap-1.5 px-4 h-9 rounded-full border shrink-0 font-bold text-[14px]", filterCatId === null ? "bg-[#4E342E] dark:bg-[#E8E6E1] text-white dark:text-[#121214] shadow-sm" : "bg-white dark:bg-[#1c1c1e] border-[#F2EFEA] dark:border-white/10 text-[#787570] dark:text-[#A6A29A]")}>すべて</button>
                    {cats.map(cat => (
                        <button key={cat.id} onClick={() => setFilterCatId(cat.id)} className={cn("flex items-center gap-1.5 px-3 h-9 rounded-full border shrink-0 font-bold text-[14px]", filterCatId === cat.id ? "bg-[#4E342E] dark:bg-[#E8E6E1] text-white dark:text-[#121214] shadow-sm" : "bg-white dark:bg-[#1c1c1e] border-[#F2EFEA] dark:border-white/10 text-[#787570] dark:text-[#A6A29A]")}>
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#F2EFEA] dark:bg-white/5 shrink-0">
                                {cat.avatar && cat.avatar !== 'cat-fallback' ? <img src={cat.avatar} className="w-full h-full object-cover" alt="" /> : <Cat className="w-4 h-4 m-auto" />}
                            </div>
                            {cat.name}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787570] dark:text-[#A6A29A]" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="メモ・タグで検索" className="w-full h-10 pl-9 pr-8 bg-[#F2EFEA] dark:bg-white/10 rounded-xl text-[15px] outline-none text-[#4E342E] dark:text-[#E8E6E1] placeholder:text-[#787570]" aria-label="図鑑を検索" />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#787570]/30 flex items-center justify-center" aria-label="検索内容をクリア"><X className="w-4 h-4 text-[#787570] dark:text-[#A6A29A]" /></button>}
                </div>
            </nav>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-3"><Loader2 className="w-6 h-6 animate-spin text-[#D4CFC9]" /><p className="text-[13px] text-[#787570]">読み込み中...</p></div>
                ) : allPhotos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-8"><div className="w-20 h-20 rounded-full bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center"><Camera className="w-8 h-8 text-[#D4CFC9]" /></div><p className="text-[15px] font-bold text-[#787570]">まだ写真がありません</p></div>
                ) : (
                    <div className="pb-24 pt-4">
                        <div className="px-5 space-y-10">
                            {/* ─── WEEKLY MISSION (THEME) ─── */}
                            {(() => {
                                const POSE_MISSIONS = [
                                    { id: '香箱座り', label: '「香箱座り」を見つけよう！', desc: '前足を体の下に折りたたんで座るポーズ。リラックスの証拠です。' },
                                    { id: 'へそ天', label: '「へそ天」を見つけよう！', desc: '仰向けでお腹を見せていたら信頼の証。' },
                                    { id: 'スフィンクス', label: '「スフィンクス」を見つけよう！', desc: '前足を前に伸ばして伏せるポーズ。' },
                                    { id: 'まんまる', label: '「まんまる」を見つけよう！', desc: 'まんまるになっていたらすかさずパシャリ。' },
                                    { id: 'にょろーん', label: '「にょろーん」を見つけよう！', desc: '長く伸びているポーズ。暑い日によく見るかも。' },
                                    { id: 'ちょこん座り', label: '「ちょこん座り」を見つけよう！', desc: '背筋を伸ばして上品に座る姿。' },
                                    { id: '箱イン', label: '「箱イン」を見つけよう！', desc: '箱や袋に入っていたらチャンス！' },
                                    { id: 'ふみふみ', label: '「ふみふみ」を見つけよう！', desc: '前足を交互に動かすニーディング。' },
                                ];
                                const today = new Date();
                                const weekNumber = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
                                const mission = POSE_MISSIONS[weekNumber % POSE_MISSIONS.length];
                                return (
                                    <div className="mb-2 relative overflow-hidden rounded-[24px] bg-white dark:bg-[#1c1c1e] shadow-sm border border-[#F2EFEA] dark:border-white/5">
                                        <div className="p-4 relative z-10">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <div className="w-4 h-4 rounded-full bg-[#FF9500]/10 flex items-center justify-center text-[#FF9500]">
                                                    <Target className="w-3 h-3" />
                                                </div>
                                                <h3 className="text-[10px] font-black uppercase tracking-wider text-[#4E342E]/50 dark:text-[#E8E6E1]/50">今週のテーマ</h3>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="w-[85%]">
                                                    <h4 className="text-[14px] font-black text-[#4E342E] dark:text-[#E8E6E1] leading-tight mb-1">{mission.label}</h4>
                                                    <p className="text-[11px] font-bold text-[#4E342E]/60 dark:text-[#E8E6E1]/60 leading-relaxed">
                                                        {mission.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Subtle gradient accent matching Home screen theme card */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FF9500]/10 to-transparent rounded-bl-full pointer-events-none" />
                                    </div>
                                );
                            })()}

                            {/* ─── ZUKAN COLLECTIONS ─── */}
                            {zukanCollections.map(axis => (
                                <div key={axis.id} className="mb-2">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <Award className="w-5 h-5" style={{ color: axis.color }} />
                                            <h3 className="text-[18px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">{axis.title}</h3>
                                        </div>
                                        <span className="text-[14px] font-bold text-[#787570] dark:text-[#A6A29A] tabular-nums" aria-label={`達成度: ${axis.collectedCount} / ${axis.totalCount}`}>
                                            {axis.collectedCount}/{axis.totalCount}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-[#F2EFEA] dark:bg-white/10 rounded-full mb-5 overflow-hidden mx-1">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: axis.color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(axis.collectedCount / axis.totalCount) * 100}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-3.5">
                                        {axis.items.map(item => {
                                            const photos = axis.itemMap[item.id] || [];
                                            const isUnlocked = photos.length > 0;
                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    whileTap={isUnlocked ? { scale: 0.95 } : { scale: 0.98 }}
                                                    onClick={() => {
                                                        if (isUnlocked) {
                                                            setSelectedShelf({ name: item.label, photos });
                                                        } else {
                                                            toast('まだ発見されていません', { description: `「${item.label}」の写真を撮って図鑑を埋めよう！` });
                                                        }
                                                    }}
                                                    className={cn(
                                                        "relative flex flex-col items-center p-2.5 rounded-[20px] transition-all",
                                                        isUnlocked
                                                            ? "bg-white dark:bg-[#1c1c1e] shadow-sm border border-[#F2EFEA] dark:border-white/5"
                                                            : "bg-[#F2EFEA]/60 dark:bg-white/5"
                                                    )}
                                                    style={{ opacity: isUnlocked ? 1 : 0.6 }}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-full flex items-center justify-center mb-1.5 overflow-hidden",
                                                        !isUnlocked && "bg-[#F2EFEA]/50 dark:bg-white/5"
                                                    )}>
                                                        {isUnlocked && photos[0]
                                                            ? <img src={photos[0].url} className="w-full h-full object-cover" alt="" />
                                                            : <div className="scale-110 opacity-30">{item.icon}</div>}
                                                    </div>
                                                    <span className={cn(
                                                        "text-[11px] font-bold text-center leading-tight truncate w-full",
                                                        isUnlocked ? "text-[#4E342E] dark:text-[#E8E6E1]" : "text-[#787570] dark:text-[#A6A29A]"
                                                    )}>{item.label}</span>
                                                    <span className="text-[11px] text-[#787570] dark:text-[#A6A29A] mt-0.5 font-medium">
                                                        {isUnlocked ? `${photos.length}枚` : <Lock className="w-3 h-3 inline" />}
                                                    </span>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* ─── SCENE SHELVES ─── */}
                            <div className="pt-6 border-t border-[#F2EFEA] dark:border-white/10" role="region" aria-label="シーン別の棚">
                                <h3 className="text-[20px] font-bold mb-5 ml-1 text-[#4E342E] dark:text-[#E8E6E1]">シーン別の棚</h3>
                                <div className="space-y-4">
                                    {encyclopediaShelves
                                        .filter(s => showEmptyShelves || s.photos.length > 0)
                                        .map((shelf, idx) => (
                                            <motion.div
                                                key={shelf.name}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSelectedShelf(shelf)}
                                                className="flex items-center gap-4 bg-white dark:bg-[#1c1c1e] p-3.5 rounded-[24px] shadow-sm border border-[#F2EFEA] dark:border-white/5 cursor-pointer"
                                            >
                                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F2EFEA] dark:bg-white/5 flex-shrink-0">
                                                    {shelf.photos[0] ? (
                                                        <img src={shelf.photos[0].url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6 m-auto text-[#D4CFC9]" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-[16px] mb-0.5 text-[#4E342E] dark:text-[#E8E6E1]">{shelf.name}</p>
                                                    <p className="text-[12px] text-[#8E8B85] dark:text-[#A6A29A] font-medium">{shelf.photos.length}点の記録</p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-[#D4CFC9]" />
                                            </motion.div>
                                        ))}

                                    <div className="pt-4 pb-12 flex justify-center">
                                        <button
                                            onClick={() => setShowEmptyShelves(!showEmptyShelves)}
                                            className="px-6 py-3 bg-[#8E8B85]/10 dark:bg-white/5 rounded-full text-[13px] font-bold text-[#8E8B85] active:scale-95 transition-all"
                                        >
                                            {showEmptyShelves ? "空の棚を隠す" : "すべての棚を表示"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <PhotoDetailView isOpen={!!selectedDetailImage} onClose={() => setSelectedDetailImage(null)} image={selectedDetailImage} />
            <AnimatePresence>{showWeeklyAlbum && <WeeklyPageClient onClose={() => setShowWeeklyAlbum(false)} />}</AnimatePresence>
            <AnimatePresence>{isVerificationOpen && <VerificationModal queue={verificationQueue} onClose={() => { setIsVerificationOpen(false); loadPhotos(); }} cats={cats} />}</AnimatePresence>
        </div>
    );
}

function VerificationModal({ queue, onClose, cats }: { queue: any[]; onClose: () => void; cats: any[]; }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { updateCatImage } = useCatContext();
    const currentItem = queue[currentIndex];
    const handleConfirm = async (catId: string) => {
        if (!currentItem) return;
        const updates = { cat_id: catId, cat_ids: [catId], ai_analysis: { ...currentItem.aiAnalysis, catId, needUserConfirm: false, userConfirmed: true, confirmedAt: new Date().toISOString() } };
        await updateCatImage(currentItem.id, updates);
        if (currentIndex < queue.length - 1) setCurrentIndex(v => v + 1);
        else onClose();
    };
    if (!currentItem) return null;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-5 h-14 shrink-0"><h2 className="text-white font-bold text-[17px]">この子はだれ？</h2><button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white"><X className="w-5 h-5" /></button></div>
            <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <img src={currentItem.url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                        <p className="text-white text-[11px] font-bold">判定待ち: {currentIndex + 1} / {queue.length}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <p className="text-white/60 text-center text-sm">AIが自信を持って判断できませんでした。<br />正しい子を選んでください。</p>
                    <div className="grid grid-cols-2 gap-3">
                        {cats.map(cat => (
                            <button key={cat.id} onClick={() => handleConfirm(cat.id)} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/5 active:bg-white/20 transition-all">
                                <div className="w-16 h-16 rounded-full overflow-hidden">
                                    {cat.avatar && cat.avatar !== 'cat-fallback'
                                        ? <img src={cat.avatar} className="w-full h-full object-cover" alt="" />
                                        : <Cat className="w-8 h-8 m-auto text-white/20" />}
                                </div>
                                <span className="text-white font-bold text-sm">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
