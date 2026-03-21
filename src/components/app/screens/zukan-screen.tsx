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

interface V2CollectionItemRecord {
    cat_id: string;
    photo_count: number | null;
    latest_photo_id: string | null;
    collection_definition_id: string;
    collection_definitions: {
        id: string;
        slug: string | null;
        name: string | null;
        category: string | null;
        description?: string | null;
    } | {
        id: string;
        slug: string | null;
        name: string | null;
        category: string | null;
        description?: string | null;
    }[] | null;
}

interface V2CollectionPhotoRecord {
    cat_id: string;
    collection_definition_id: string;
    photos: {
        id: string;
        storage_path: string;
        created_at: string;
        source?: string | null;
    } | {
        id: string;
        storage_path: string;
        created_at: string;
        source?: string | null;
    }[] | null;
}

interface V2DefinitionRecord {
    id: string;
    slug: string | null;
    name: string | null;
    category: string | null;
    description?: string | null;
}

interface V2DisplayItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    isLegendary?: boolean;
}

interface V2DisplayAxis {
    id: string;
    title: string;
    description: string;
    color: string;
    fallbackIcon: React.ReactNode;
    items: V2DisplayItem[];
    itemMap: Record<string, ShelfPhoto[]>;
    itemCounts: Record<string, number>;
    collectedCount: number;
    totalCount: number;
}

const V2_CATEGORY_PRESENTATION: Record<string, { title: string; description: string; color: string; icon: React.ReactNode }> = {
    pose: {
        title: 'ポーズ図鑑',
        description: '毎日のしぐさが少しずつ集まって、この子らしいポーズの棚になっていきます。',
        color: '#C8A97E',
        icon: <PawPrint className="w-5 h-5" />,
    },
    action: {
        title: '行動図鑑',
        description: '見つめる、遊ぶ、くつろぐ。何気ない動きが物語の断片として並びます。',
        color: '#A08D74',
        icon: <Activity className="w-5 h-5" />,
    },
    location: {
        title: '場所図鑑',
        description: 'おうちのどこで過ごしているかが、暮らしの地図みたいに見えてきます。',
        color: '#BFAE97',
        icon: <Home className="w-5 h-5" />,
    },
    emotion: {
        title: '表情図鑑',
        description: '落ち着いた顔、好奇心いっぱいの顔。表情の違いがこの子らしさになります。',
        color: '#7EB5A6',
        icon: <Smile className="w-5 h-5" />,
    },
    object: {
        title: '暮らしの道具図鑑',
        description: '植物や本や家具と一緒に写る風景から、日々の空気感を集めます。',
        color: '#C4A882',
        icon: <Package className="w-5 h-5" />,
    },
};

function takeRelation<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
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

import { DAILY_MISSIONS, ZUKAN_AXES, ZukanAxisDef, ZukanItemDef } from "@/lib/zukan-data";

interface ZukanScreenProps {
    onClose?: () => void;
}

export function ZukanScreen({ onClose }: ZukanScreenProps) {
    const { cats, analyzeCatImage, updateCatImage } = useCatContext();
    const { householdId } = useCoreContext();

    const [filterCatId, setFilterCatId] = useState<string | null>(null);
    const [showEmptyShelves, setShowEmptyShelves] = useState(false);
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [v2CollectionMap, setV2CollectionMap] = useState<Record<string, ShelfPhoto[]>>({});
    const [v2CollectionCounts, setV2CollectionCounts] = useState<Record<string, number>>({});
    const [v2Definitions, setV2Definitions] = useState<V2DefinitionRecord[]>([]);
    const [hasV2Collections, setHasV2Collections] = useState(false);
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
        const targetCatIds = (filterCatId ? [filterCatId] : cats.map((cat) => cat.id)).filter(Boolean);

        const [{ data, error }, v2Result] = await Promise.all([
            (supabase.rpc as any)("get_unified_gallery", {
                target_household_id: householdId,
                filter_cat_id: filterCatId || undefined,
                limit_count: 500,
                offset_count: 0,
            }),
            (async () => {
                if (targetCatIds.length === 0) {
                    return {
                        hasData: false,
                        itemMap: {} as Record<string, ShelfPhoto[]>,
                        countMap: {} as Record<string, number>,
                        definitions: [] as V2DefinitionRecord[],
                    };
                }

                const { data: definitions, error: definitionsError } = await supabase
                    .from('collection_definitions')
                    .select('id, slug, name, category, description')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (definitionsError) {
                    console.warn('V2 definition load failed:', definitionsError.message);
                }

                const { data: collectionItems, error: collectionItemsError } = await supabase
                    .from('cat_collection_items')
                    .select('cat_id, photo_count, latest_photo_id, collection_definition_id, collection_definitions(id, slug, name, category, description)')
                    .in('cat_id', targetCatIds);

                if (collectionItemsError || !collectionItems || collectionItems.length === 0) {
                    if (collectionItemsError) {
                        console.warn('V2 collection load failed, using fallback:', collectionItemsError.message);
                    }

                    return {
                        hasData: false,
                        itemMap: {} as Record<string, ShelfPhoto[]>,
                        countMap: {} as Record<string, number>,
                        definitions: (definitions || []) as V2DefinitionRecord[],
                    };
                }

                const definitionById = new Map<string, V2DefinitionRecord>();
                const countMap: Record<string, number> = {};

                for (const definition of (definitions || []) as V2DefinitionRecord[]) {
                    definitionById.set(definition.id, definition);
                }

                for (const item of collectionItems as V2CollectionItemRecord[]) {
                    const definition = takeRelation(item.collection_definitions);
                    if (!definition?.slug) continue;
                    definitionById.set(item.collection_definition_id, definition as V2DefinitionRecord);
                    countMap[definition.slug] = (countMap[definition.slug] || 0) + (item.photo_count || 0);
                }

                const definitionIds = Array.from(definitionById.keys());
                const { data: collectionPhotos, error: collectionPhotosError } = await supabase
                    .from('cat_collection_photos')
                    .select('cat_id, collection_definition_id, photos(id, storage_path, created_at, source)')
                    .in('cat_id', targetCatIds)
                    .in('collection_definition_id', definitionIds);

                const itemMap: Record<string, ShelfPhoto[]> = {};

                if (collectionPhotosError) {
                    console.warn('V2 collection photo load failed, using item counts only:', collectionPhotosError.message);
                } else {
                    for (const row of (collectionPhotos || []) as V2CollectionPhotoRecord[]) {
                        const definition = definitionById.get(row.collection_definition_id);
                        const photo = takeRelation(row.photos);
                        if (!definition?.slug || !photo?.storage_path) continue;

                        if (!itemMap[definition.slug]) {
                            itemMap[definition.slug] = [];
                        }

                        const alreadyExists = itemMap[definition.slug].some((existing) => existing.id === photo.id);
                        if (alreadyExists) continue;

                        const catName = cats.find((cat) => cat.id === row.cat_id)?.name || 'Cat';
                        itemMap[definition.slug].push({
                            id: photo.id,
                            url: getFullImageUrl(photo.storage_path, { width: 400, height: 400, resize: "cover", quality: 80 }),
                            storagePath: photo.storage_path,
                            catId: row.cat_id,
                            catName,
                            createdAt: photo.created_at,
                            source: photo.source || 'profile',
                        });
                    }
                }

                Object.values(itemMap).forEach((photos) =>
                    photos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                );

                return {
                    hasData: true,
                    itemMap,
                    countMap,
                    definitions: Array.from(definitionById.values()).filter((definition) => !!definition.slug),
                };
            })(),
        ]);

        if (error) {
            console.error("Error loading photos:", error);
            setAllPhotos([]);
        } else {
            const items = (data as any[]) || [];
            setAllPhotos(items.map((img) => mapToShelfPhoto(img)));
        }

        setV2CollectionMap(v2Result.itemMap);
        setV2CollectionCounts(v2Result.countMap);
        setV2Definitions(v2Result.definitions);
        setHasV2Collections(v2Result.hasData);
        setLoading(false);
    }, [householdId, filterCatId, cats]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadPhotos();
        }, 0);

        return () => clearTimeout(timer);
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
        if (hasV2Collections) {
            const groupedDefinitions = v2Definitions.reduce<Record<string, V2DefinitionRecord[]>>((acc, definition) => {
                const category = definition.category || 'other';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(definition);
                return acc;
            }, {});

            return Object.entries(groupedDefinitions).map(([category, definitions]) => {
                const presentation = V2_CATEGORY_PRESENTATION[category] || {
                    title: category,
                    description: 'このカテゴリの記録が少しずつたまっていきます。',
                    color: '#C4A882',
                    icon: <Award className="w-5 h-5" />,
                };

                const itemMap: Record<string, ShelfPhoto[]> = {};
                const itemCounts: Record<string, number> = {};
                const items = definitions.map((definition) => {
                    const slug = definition.slug || definition.id;
                    itemMap[slug] = v2CollectionMap[slug] || [];
                    itemCounts[slug] = v2CollectionCounts[slug] || 0;

                    return {
                        id: slug,
                        label: definition.name || slug,
                        description: definition.description || '',
                        icon: presentation.icon,
                    };
                });

                const collectedCount = items.filter((item) => itemCounts[item.id] > 0).length;

                return {
                    id: category,
                    title: presentation.title,
                    description: presentation.description,
                    color: presentation.color,
                    fallbackIcon: presentation.icon,
                    items,
                    itemMap,
                    itemCounts,
                    collectedCount,
                    totalCount: items.length,
                } satisfies V2DisplayAxis;
            });
        }

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
    }, [filteredPhotos, hasV2Collections, v2CollectionCounts, v2CollectionMap, v2Definitions]);

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
        const latestPhoto = selectedShelf.photos[0];
        const nameLen = selectedShelf.name.length;
        const trendVerbs = ['よく見かけます', 'お気に入りです', 'この子の定番です', '記録されています'];
        const trendVerb = trendVerbs[nameLen % trendVerbs.length];

        const contextDescriptions = [
            `${latestPhoto?.catName || 'この子'}の日常のひとコマを集めました。`,
            `暮らしのなかでふと見せる、${selectedShelf.name}の瞬間です。`,
            `リラックスしているときに見せる姿が記録されています。`
        ];
        const contextDesc = contextDescriptions[nameLen % contextDescriptions.length];

        return (
            <div className="fixed inset-0 z-50 bg-[#FDF8F1] dark:bg-[#121214] flex flex-col overflow-y-auto">
                <div className="relative w-full aspect-[4/3] bg-[#F2EFEA] dark:bg-[#1c1c1e] shrink-0">
                    {latestPhoto && (
                        <img src={latestPhoto.url} className="w-full h-full object-cover" alt="" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pt-[env(safe-area-inset-top)] flex flex-col justify-between">
                        <header className="flex items-center justify-between px-5 h-14" role="navigation">
                            <button onClick={() => setSelectedShelf(null)} className="flex items-center gap-1.5 text-white font-bold text-[15px] drop-shadow-md bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <ChevronLeft className="w-5 h-5 -ml-1" />戻る
                            </button>
                        </header>
                        <div className="p-5">
                            <h2 className="text-[28px] font-black text-white drop-shadow-lg mb-2">{selectedShelf.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md text-white text-[12px] font-bold">全 {selectedShelf.photos.length} 枚の写真</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 pt-6 pb-2 space-y-3 shrink-0 -mt-4 relative rounded-t-[24px] bg-[#FDF8F1] dark:bg-[#121214]">
                    <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-[20px] shadow-sm border border-[#F2EFEA] dark:border-white/5">
                        <h3 className="text-[12px] font-bold text-[#C8A97E] mb-1.5 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> このコレクションについて</h3>
                        <p className="text-[14px] text-[#2F2A26] dark:text-[#E8E6E1] font-medium leading-relaxed">
                            {contextDesc}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-[20px] shadow-sm border border-[#F2EFEA] dark:border-white/5">
                            <h3 className="text-[11px] font-bold text-[#8E8B85] dark:text-[#A6A29A] mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> 最近の傾向</h3>
                            <p className="text-[13px] text-[#4E342E] dark:text-[#E8E6E1] font-bold leading-tight">
                                最近、{trendVerb}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-[20px] shadow-sm border border-[#F2EFEA] dark:border-white/5">
                            <h3 className="text-[11px] font-bold text-[#8E8B85] dark:text-[#A6A29A] mb-1.5 flex items-center gap-1.5"><Heart className="w-3 h-3" /> 暮らしとの関わり</h3>
                            <p className="text-[13px] text-[#4E342E] dark:text-[#E8E6E1] font-bold leading-tight">
                                この子らしさが出ています
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-5 pt-4 pb-24 shrink-0">
                    <h3 className="text-[16px] font-bold text-[#2F2A26] dark:text-[#E8E6E1] mb-3 ml-1">記録された写真 ({selectedShelf.photos.length})</h3>
                    <div className="grid grid-cols-3 gap-1.5">
                        {selectedShelf.photos.map((photo, idx) => (
                            <motion.div key={photo.id} onClick={() => openDetail(photo)} className="relative aspect-square bg-[#F2EFEA] dark:bg-white/5 rounded-[14px] cursor-pointer overflow-hidden border border-black/5 dark:border-white/5">
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
                    <h1 className="flex-1 text-center text-[18px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">コレクション</h1>
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
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="メモやタグを検索" className="w-full h-10 pl-9 pr-8 bg-[#F2EFEA] dark:bg-white/10 rounded-xl text-[15px] outline-none text-[#4E342E] dark:text-[#E8E6E1] placeholder:text-[#787570]" aria-label="コレクションを検索" />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#787570]/30 flex items-center justify-center" aria-label="検索内容をクリア"><X className="w-4 h-4 text-[#787570] dark:text-[#A6A29A]" /></button>}
                </div>
            </nav>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-3"><Loader2 className="w-6 h-6 animate-spin text-[#D4CFC9]" /><p className="text-[13px] text-[#787570]">読み込み中...</p></div>
                ) : !hasV2Collections && allPhotos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-8"><div className="w-20 h-20 rounded-full bg-[#F2EFEA] dark:bg-white/5 flex items-center justify-center"><Camera className="w-8 h-8 text-[#D4CFC9]" /></div><p className="text-[15px] font-bold text-[#787570]">まだ写真がありません</p></div>
                ) : (
                    <div className="pb-24 pt-4">
                        <div className="px-5 space-y-10">
                            {/* ─── WEEKLY MISSION (THEME) ─── */}
                            {(() => {
                                const today = new Date();
                                const weekNumber = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
                                const mission = DAILY_MISSIONS[weekNumber % DAILY_MISSIONS.length] || DAILY_MISSIONS[0];
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
                                    <div className="flex items-start justify-between mb-3 px-1 gap-3">
                                        <div className="flex items-start gap-2">
                                            <span style={{ color: axis.color }}>
                                                {axis.fallbackIcon}
                                            </span>
                                            <div>
                                                <h3 className="text-[18px] font-bold text-[#4E342E] dark:text-[#E8E6E1]">{axis.title}</h3>
                                                {'description' in axis && axis.description ? (
                                                    <p className="text-[12px] text-[#8E8B85] dark:text-[#A6A29A] mt-0.5 max-w-[32ch] leading-relaxed">
                                                        {axis.description}
                                                    </p>
                                                ) : null}
                                            </div>
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
                                    <div className="grid grid-cols-2 gap-3.5">
                                        {axis.items.map(item => {
                                            const photos = axis.itemMap[item.id] || [];
                                            const photoCount = 'itemCounts' in axis ? axis.itemCounts[item.id] || 0 : photos.length;
                                            const isUnlocked = photoCount > 0;
                                            const latestPhoto = photos[0];

                                            // 簡易的な傾向テキストのモック
                                            const trendVerbs = ['よく見かけます', 'お気に入りです', 'この子の定番です', '記録されています'];
                                            const trendVerb = trendVerbs[item.id.length % trendVerbs.length];

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    whileTap={isUnlocked ? { scale: 0.96 } : { scale: 0.98 }}
                                                    onClick={() => {
                                                        if (isUnlocked) {
                                                            setSelectedShelf({ name: item.label, photos });
                                                        } else {
                                                            toast('まだ記録がありません', { description: `日常のなかで ${item.label} の様子がないか観察してみましょう。` });
                                                        }
                                                    }}
                                                    className={cn(
                                                        "relative flex flex-col p-3 rounded-[20px] transition-all",
                                                        isUnlocked
                                                            ? "bg-[#FFFFFF] dark:bg-[#1c1c1e] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/5 dark:border-white/5"
                                                            : item.isLegendary
                                                                ? "bg-gradient-to-br from-[#FFF8EF] to-transparent border border-[#C8A97E]/30"
                                                                : "bg-[#FDF8F1] dark:bg-white/5 border border-dashed border-[#F2EFEA] dark:border-white/10"
                                                    )}
                                                >
                                                    {item.isLegendary && !isUnlocked && (
                                                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gradient-to-tr from-[#C8A97E] to-yellow-600 rounded-full flex items-center justify-center shadow-sm z-10">
                                                            <Sparkles className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    )}

                                                    {isUnlocked ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 mb-2.5">
                                                                <div className="flex-1 min-w-0">
                                                                    <span
                                                                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold mb-1"
                                                                        style={{ backgroundColor: `${axis.color}18`, color: axis.color }}
                                                                    >
                                                                        {axis.title}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[14px] font-bold text-[#2F2A26] dark:text-[#E8E6E1] truncate">{item.label}</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[12px] font-medium text-[#7A726B] dark:text-[#A6A29A]">{photoCount}</span>
                                                            </div>

                                                            <div className="relative aspect-[4/3] w-full rounded-[14px] overflow-hidden bg-[#F6F3EE] dark:bg-white/5 mb-3">
                                                                {latestPhoto ? (
                                                                    <img src={latestPhoto.url} className="w-full h-full object-cover" alt="" />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center bg-[#F3EEE6] dark:bg-white/5">
                                                                        <ImageIcon className="w-6 h-6 text-[#C8A97E]/70" />
                                                                    </div>
                                                                )}
                                                                {photoCount >= 3 && (
                                                                    <div className="absolute top-2 left-2 bg-[#FFFFFF]/90 dark:bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/50">
                                                                        <span className="text-[10px] font-bold text-[#6B7A6B] flex items-center gap-0.5"><Activity className="w-3 h-3" /> 新着あり</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="bg-[#F6F3EE] dark:bg-white/5 px-2.5 py-2 rounded-xl mt-auto">
                                                                {/*
                                                                    {'description' in item && item.description ? item.description : `${latestPhoto.catName ? `${latestPhoto.catName}の` : ''}${item.label}の様子が${trendVerb}。`}
                                                                */}
                                                                {/*
                                                                    {'description' in item && item.description ? item.description : `${latestPhoto?.catName ? `${latestPhoto.catName}の` : ''}${item.label}の記録が増えています。`}
                                                                */}
                                                                {/*
                                                                    {'description' in item && item.description ? item.description : `${latestPhoto?.catName ? `${latestPhoto.catName}の` : ''}${item.label}の記録が増えています。`}
                                                                */}
                                                                <p className="text-[11px] text-[#7A726B] dark:text-[#A6A29A] leading-relaxed line-clamp-2">
                                                                    {'description' in item && item.description ? item.description : 'コレクションが更新されました。'}
                                                                </p>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-4 opacity-60">
                                                            <div className="aspect-[4/3] w-full rounded-[14px] flex flex-col items-center justify-center mb-3">
                                                                <div className={cn("transform scale-[1.3] mb-3", item.isLegendary ? "text-[#C8A97E]" : "text-[#D4CFC9]")}>
                                                                    {item.icon}
                                                                </div>
                                                                <span className="text-[11px] font-bold text-[#D4CFC9]"><Lock className="w-3 h-3 inline mb-0.5 opacity-50" /></span>
                                                            </div>
                                                            <span className={cn(
                                                                "text-[12px] font-bold text-center",
                                                                item.isLegendary ? "text-[#C8A97E]" : "text-[#A6A29A]"
                                                            )}>
                                                                ？？？
                                                            </span>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* ─── SCENE SHELVES ─── */}
                            <div className="pt-6 border-t border-[#F2EFEA] dark:border-white/10" role="region" aria-label="シーン別の棚">
                                <h3 className="text-[20px] font-bold mb-5 ml-1 text-[#4E342E] dark:text-[#E8E6E1]">シーン別アルバム</h3>
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
