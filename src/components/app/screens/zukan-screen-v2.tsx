"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    BookOpen,
    Camera,
    Loader2,
    PawPrint,
    Smile,
    Activity,
    Home,
    Package,
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { PhotoDetailView } from "../immersive/photo-detail-view";
import { CatSettingsModal } from "@/components/app/modals/cat-settings-modal";

/* eslint-disable @next/next/no-img-element */

interface AIAnalysis {
    labels?: {
        moment?: string;
        scene?: string;
        shot?: string;
    };
    uiTags?: string[];
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

interface V2CollectionItemRecord {
    cat_id: string;
    photo_count: number | null;
    collection_definition_id: string;
    collection_definitions:
        | {
              id: string;
              slug: string | null;
              name: string | null;
              category: string | null;
              description?: string | null;
          }
        | {
              id: string;
              slug: string | null;
              name: string | null;
              category: string | null;
              description?: string | null;
          }[]
        | null;
}

interface V2CollectionPhotoRecord {
    cat_id: string;
    collection_definition_id: string;
    photos:
        | {
              id: string;
              storage_path: string;
              created_at: string;
              source?: string | null;
          }
        | {
              id: string;
              storage_path: string;
              created_at: string;
              source?: string | null;
          }[]
        | null;
}

interface V2DefinitionRecord {
    id: string;
    slug: string | null;
    name: string | null;
    category: string | null;
    description?: string | null;
}

interface ZukanScreenProps {
    onClose?: () => void;
}

type Discovery = { id: string; title: string; description: string | null; created_at: string };

type CollectionItem = {
    id: string;
    name: string;
    description: string;
    count: number;
    photos: ShelfPhoto[];
    latestAt: string | null;
    unlocked: boolean;
};

type CollectionGroup = {
    id: string;
    title: string;
    description: string;
    accentClass: string;
    items: CollectionItem[];
    unlockedItems: CollectionItem[];
    lockedItems: CollectionItem[];
    unlockedCount: number;
    totalCount: number;
    remaining: number;
    lastUpdatedAt: string | null;
    complete: boolean;
};

const CATEGORY_PRESENTATION: Record<
    string,
    { title: string; description: string; icon: React.ReactNode; accentClass: string }
> = {
    pose: {
        title: "ポーズ図鑑",
        description: "この子らしいポーズが集まっています。",
        icon: <PawPrint className="h-5 w-5" />,
        accentClass: "bg-[#3D5A80]",
    },
    action: {
        title: "行動図鑑",
        description: "毎日のしぐさが見えてきました。",
        icon: <Activity className="h-5 w-5" />,
        accentClass: "bg-[#3D5A80]",
    },
    location: {
        title: "場所図鑑",
        description: "よくいる場所が見えてきました。",
        icon: <Home className="h-5 w-5" />,
        accentClass: "bg-[#3D5A80]",
    },
    emotion: {
        title: "表情図鑑",
        description: "表情の変化が見えてきました。",
        icon: <Smile className="h-5 w-5" />,
        accentClass: "bg-[#3D5A80]",
    },
    object: {
        title: "暮らしの図鑑",
        description: "暮らしの風景が集まっています。",
        icon: <Package className="h-5 w-5" />,
        accentClass: "bg-[#3D5A80]",
    },
};

const CATEGORY_STORY_COPY: Record<
    string,
    { headline: string; completeHeadline: string; completeBody: string; nextHint: string }
> = {
    pose: {
        headline: "この子らしいポーズが集まっています",
        completeHeadline: "この子らしいポーズがそろいました",
        completeBody: "この子らしい動きや座り方の物語が、ひとつ揃いました。",
        nextHint: "この子らしい表情やポーズが、もうすぐそろいます。",
    },
    action: {
        headline: "毎日のしぐさが見えてきました",
        completeHeadline: "毎日のしぐさが見えてきました",
        completeBody: "遊ぶ、見つめる、くつろぐ。その子らしいしぐさの物語がそろいました。",
        nextHint: "次のしぐさが見つかると、毎日の物語がさらに育ちます。",
    },
    location: {
        headline: "よくいる場所が見えてきました",
        completeHeadline: "よくいる場所が見えてきました",
        completeBody: "この子らしい居場所の物語がそろいました。",
        nextHint: "次の居場所が見つかると、この子らしい過ごし方がもっと見えてきます。",
    },
    emotion: {
        headline: "表情の変化が見えてきました",
        completeHeadline: "表情の変化が見えてきました",
        completeBody: "おだやかさや好奇心まで、この子らしい表情の物語がひとつ揃いました。",
        nextHint: "次の表情が見つかると、この子らしい気分の変化がそろっていきます。",
    },
    object: {
        headline: "暮らしの風景が集まっています",
        completeHeadline: "暮らしの風景がそろいました",
        completeBody: "この子らしい暮らしの場面が集まり、物語がひとつ揃いました。",
        nextHint: "次の風景が見つかると、暮らしの物語がもっと豊かになります。",
    },
    other: {
        headline: "この子の新しい一面が見えてきました",
        completeHeadline: "この子の新しい一面がそろいました",
        completeBody: "この子らしい物語がひとつ揃いました。",
        nextHint: "次のひとつが見つかると、この子らしい物語がさらに育ちます。",
    },
};

function getStoryCopy(group: CollectionGroup) {
    return CATEGORY_STORY_COPY[group.id] || CATEGORY_STORY_COPY.other;
}

function getNextHint(group: CollectionGroup) {
    const storyCopy = getStoryCopy(group);
    const nextItem = group.lockedItems[0]?.name;
    if (!nextItem) return storyCopy.nextHint;
    return `${nextItem} が見つかると、${storyCopy.nextHint}`;
}

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

export function ZukanScreen({ onClose }: ZukanScreenProps) {
    const { cats } = useCatContext();
    const { householdId } = useCoreContext();
    const supabaseRef = useRef(createClient());
    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [v2CollectionMap, setV2CollectionMap] = useState<Record<string, ShelfPhoto[]>>({});
    const [v2CollectionCounts, setV2CollectionCounts] = useState<Record<string, number>>({});
    const [v2Definitions, setV2Definitions] = useState<V2DefinitionRecord[]>([]);
    const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDetailImage, setSelectedDetailImage] = useState<any>(null);
    const [isCatSettingsOpen, setIsCatSettingsOpen] = useState<boolean>(false);

    const loadPhotos = useCallback(async () => {
        if (!householdId) return;
        setLoading(true);

        const supabase = supabaseRef.current;
        const targetCatIds = cats.map((cat) => cat.id).filter(Boolean);

        const [{ data, error }, v2Result, discoveriesResult] = await Promise.all([
            (supabase.rpc as any)("get_unified_gallery", {
                target_household_id: householdId,
                limit_count: 500,
                offset_count: 0,
            }),
            (async () => {
                const { data: definitions, error: definitionsError } = await supabase
                    .from("collection_definitions")
                    .select("id, slug, name, category, description")
                    .eq("is_active", true)
                    .order("sort_order", { ascending: true });

                if (definitionsError) {
                    console.warn("V2 definition load failed:", definitionsError.message);
                }

                if (targetCatIds.length === 0) {
                    return {
                        itemMap: {} as Record<string, ShelfPhoto[]>,
                        countMap: {} as Record<string, number>,
                        definitions: (definitions || []) as V2DefinitionRecord[],
                    };
                }

                const { data: collectionItems, error: collectionItemsError } = await supabase
                    .from("cat_collection_items")
                    .select("cat_id, photo_count, collection_definition_id, collection_definitions(id, slug, name, category, description)")
                    .in("cat_id", targetCatIds);

                if (collectionItemsError) {
                    console.warn("V2 collection load failed:", collectionItemsError.message);
                }

                const definitionById = new Map<string, V2DefinitionRecord>();
                const countMap: Record<string, number> = {};

                for (const definition of (definitions || []) as V2DefinitionRecord[]) {
                    definitionById.set(definition.id, definition);
                }

                for (const item of (collectionItems || []) as V2CollectionItemRecord[]) {
                    const definition = takeRelation(item.collection_definitions);
                    if (!definition?.slug) continue;
                    definitionById.set(item.collection_definition_id, definition as V2DefinitionRecord);
                    countMap[definition.slug] = (countMap[definition.slug] || 0) + (item.photo_count || 0);
                }

                const definitionIds = Array.from(definitionById.keys());
                const { data: collectionPhotos, error: collectionPhotosError } = await supabase
                    .from("cat_collection_photos")
                    .select("cat_id, collection_definition_id, photos(id, storage_path, created_at, source)")
                    .in("cat_id", targetCatIds)
                    .in("collection_definition_id", definitionIds);

                const itemMap: Record<string, ShelfPhoto[]> = {};

                if (collectionPhotosError) {
                    console.warn("V2 collection photo load failed:", collectionPhotosError.message);
                } else {
                    for (const row of (collectionPhotos || []) as V2CollectionPhotoRecord[]) {
                        const definition = definitionById.get(row.collection_definition_id);
                        const photo = takeRelation(row.photos);
                        if (!definition?.slug || !photo?.storage_path) continue;

                        if (!itemMap[definition.slug]) {
                            itemMap[definition.slug] = [];
                        }

                        if (itemMap[definition.slug].some((existing) => existing.id === photo.id)) {
                            continue;
                        }

                        const catName = cats.find((cat) => cat.id === row.cat_id)?.name || "うちの子";
                        itemMap[definition.slug].push({
                            id: photo.id,
                            url: getFullImageUrl(photo.storage_path, { width: 400, height: 400, resize: "cover", quality: 80 }),
                            storagePath: photo.storage_path,
                            catId: row.cat_id,
                            catName,
                            createdAt: photo.created_at,
                            source: photo.source || "profile",
                        });
                    }
                }

                Object.values(itemMap).forEach((photos) =>
                    photos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                );

                return {
                    itemMap,
                    countMap,
                    definitions: Array.from(definitionById.values()).filter((definition) => !!definition.slug),
                };
            })(),
            (async () => {
                const { data: discoveryRows, error: discoveriesError } = await supabase
                    .from("discoveries")
                    .select("id, title, description, created_at")
                    .eq("household_id", householdId)
                    .eq("is_visible", true)
                    .order("created_at", { ascending: false })
                    .limit(3);

                if (discoveriesError) {
                    console.warn("Discovery load failed:", discoveriesError.message);
                }

                return ((discoveryRows || []) as Discovery[]).map((row) => ({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    created_at: row.created_at,
                }));
            })(),
        ]);

        if (error) {
            console.error("Error loading photos:", error);
            setAllPhotos([]);
        } else {
            setAllPhotos(((data as any[]) || []).map((img) => mapToShelfPhoto(img)));
        }

        setV2CollectionMap(v2Result.itemMap);
        setV2CollectionCounts(v2Result.countMap);
        setV2Definitions(v2Result.definitions);
        setDiscoveries(discoveriesResult);
        setLoading(false);
    }, [householdId, cats]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadPhotos();
        }, 0);

        return () => clearTimeout(timer);
    }, [loadPhotos]);

    const filteredPhotos = useMemo(() => allPhotos, [allPhotos]);

    const collectionGroups = useMemo<CollectionGroup[]>(() => {
        const groupedDefinitions = v2Definitions.reduce<Record<string, V2DefinitionRecord[]>>((acc, definition) => {
            const category = definition.category || "other";
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(definition);
            return acc;
        }, {});

        return Object.entries(groupedDefinitions)
            .map(([category, definitions]) => {
                const presentation = CATEGORY_PRESENTATION[category] || {
                    title: "図鑑",
                    description: "この子の記録が少しずつ集まっていきます。",
                    icon: <BookOpen className="h-5 w-5" />,
                    accentClass: "bg-[#3D5A80]",
                };

                const items = definitions
                    .map((definition) => {
                        const slug = definition.slug || definition.id;
                        const photos = v2CollectionMap[slug] || [];
                        const count = v2CollectionCounts[slug] || 0;
                        return {
                            id: slug,
                            name: definition.name || "図鑑",
                            description: definition.description || "",
                            count,
                            photos,
                            latestAt: photos[0]?.createdAt || null,
                            unlocked: count > 0,
                        } satisfies CollectionItem;
                    })
                    .sort((a, b) => {
                        if (a.unlocked !== b.unlocked) {
                            return a.unlocked ? -1 : 1;
                        }
                        return new Date(b.latestAt || 0).getTime() - new Date(a.latestAt || 0).getTime();
                    })
                const unlockedItems = items.filter((item) => item.unlocked);
                const lockedItems = items.filter((item) => !item.unlocked);
                const totalCount = items.length;
                const unlockedCount = unlockedItems.length;
                const remaining = Math.max(totalCount - unlockedCount, 0);
                const lastUpdatedAt = unlockedItems
                    .map((item) => item.latestAt)
                    .filter(Boolean)
                    .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] || null;

                return {
                    id: category,
                    title: presentation.title,
                    description: presentation.description,
                    accentClass: presentation.accentClass,
                    items,
                    unlockedItems,
                    lockedItems,
                    unlockedCount,
                    totalCount,
                    remaining,
                    lastUpdatedAt,
                    complete: totalCount > 0 && unlockedCount === totalCount,
                };
            })
            .filter((group) => group.totalCount > 0)
            .sort((a, b) => {
                if (a.complete !== b.complete) {
                    return a.complete ? 1 : -1;
                }
                return new Date(b.lastUpdatedAt || 0).getTime() - new Date(a.lastUpdatedAt || 0).getTime();
            });
    }, [v2CollectionCounts, v2CollectionMap, v2Definitions]);

    const inProgressGroups = useMemo(
        () => collectionGroups.filter((group) => group.unlockedCount > 0),
        [collectionGroups]
    );
    const spotlightGroups = useMemo(() => inProgressGroups, [inProgressGroups]);
    const primaryCat = cats[0];
    const primaryCatBirthday = primaryCat?.birthday ?? null;

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-bg-primary text-text-tertiary">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">読み込み中です...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-bg-primary pb-32">
            <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-primary/90 px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-2 backdrop-blur-xl">
                <h1 className="text-xl font-bold text-center text-[#1E2840]">{"\u306d\u3053"}</h1>
            </header>

            <div className="space-y-8 px-5 py-4">
                {discoveries.length > 0 ? (
                    <section className="space-y-3">
                        <h2
                            className="text-[9px] uppercase tracking-[0.24em] text-[#3D5A80]"
                            style={{ fontFamily: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace' }}
                        >
                            {"\u304d\u3065\u304d"}
                        </h2>
                        <div className="space-y-2">
                            {discoveries.map((discovery) => (
                                <div key={discovery.id} className="rounded-[4px] border border-[#DDDCD8] bg-[#FAFAF9] px-4 py-[14px]">
                                    <p className="text-[14px] font-semibold text-[#1E2840]">{discovery.title}</p>
                                    {discovery.description ? (
                                        <p className="mt-1 text-[13px] font-light text-[#5A5958]">{discovery.description}</p>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {spotlightGroups.length > 0 ? (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-text-primary">{"\u3053\u306e\u5b50\u306e\u3053\u3068"}</h2>
                        </div>
                        <div className="space-y-5">
                            {spotlightGroups.map((group) => (
                                <article
                                    key={group.id}
                                    className={cn(
                                        "rounded-2xl overflow-hidden mb-5",
                                        group.complete
                                            ? "bg-[#3D5A80]/5 border border-[#3D5A80]/15"
                                            : "bg-[#FAFAF9] border border-[#E8E7E4]"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                        "bg-[#3D5A80]/10 text-[#1E2840]"
                                                    )}
                                                >
                                                    {group.title}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <p className={cn("text-[#1E2840]", group.complete ? "text-lg font-bold" : "text-base font-bold")}>
                                                    {group.complete ? getStoryCopy(group).completeHeadline : getStoryCopy(group).headline}
                                                </p>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-sm text-[#5A5958]">
                                                {group.complete
                                                    ? getStoryCopy(group).completeBody
                                                    : group.remaining <= 2
                                                        ? getNextHint(group)
                                                        : group.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="px-4 pb-4 pt-4">
                                        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        {group.unlockedItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => item.photos[0] && setSelectedDetailImage(item.photos[0])}
                                                className="w-[112px] shrink-0 overflow-hidden rounded-xl bg-bg-secondary text-left"
                                            >
                                                <div className="aspect-[4/5] overflow-hidden bg-bg-secondary">
                                                    {item.photos[0] ? (
                                                        <img src={item.photos[0].url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-text-tertiary">
                                                            <BookOpen className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1 px-3 py-3">
                                                    <p className="line-clamp-1 text-[13px] font-semibold text-text-primary">{item.name}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {group.lockedItems.length > 0 ? (
                                            <div
                                                className="min-w-[96px] h-[96px] rounded-xl bg-[#E7E6E3] flex items-center justify-center flex-shrink-0"
                                            >
                                                <span className="text-sm text-[#8A8988] font-medium">
                                                    +{group.lockedItems.length}
                                                </span>
                                            </div>
                                        ) : null}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ) : null}

                {primaryCat ? (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2
                                className="text-[9px] uppercase tracking-[0.24em] text-[#3D5A80]"
                                style={{ fontFamily: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace' }}
                            >
                                {"\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u30fb\u30b1\u30a2\u8a18\u9332"}
                            </h2>
                            <button
                                type="button"
                                className="text-[12px] text-[#3D5A80]"
                                onClick={() => setIsCatSettingsOpen(true)}
                            >
                                {"\u7de8\u96c6"}
                            </button>
                        </div>
                        <div className="rounded-[4px] border border-[#DDDCD8] bg-[#FAFAF9] px-4 py-[14px]">
                            <p className="text-[16px] font-semibold text-[#1E2840]">{primaryCat.name}</p>
                            {primaryCatBirthday ? (
                                <p className="mt-1 text-[13px] text-[#5A5958]">
                                    {(() => {
                                        const d = new Date(primaryCatBirthday);
                                        return `${d.getFullYear()}\u5e74${d.getMonth() + 1}\u6708${d.getDate()}\u65e5`;
                                    })()}
                                </p>
                            ) : null}
                        </div>
                    </section>
                ) : null}

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-[#8A8988]">すべての写真</h2>
                    </div>
                    <AllPhotosSection
                        photos={filteredPhotos}
                        onSelect={setSelectedDetailImage}
                    />
                </section>
            </div>

            <CatSettingsModal
                isOpen={isCatSettingsOpen}
                onClose={() => setIsCatSettingsOpen(false)}
            />
            <PhotoDetailView isOpen={!!selectedDetailImage} onClose={() => setSelectedDetailImage(null)} image={selectedDetailImage} />
        </div>
    );
}

function AllPhotosSection({
    photos,
    onSelect,
}: {
    photos: ShelfPhoto[];
    onSelect: (photo: ShelfPhoto) => void;
}) {
    const [visibleCount, setVisibleCount] = useState(12);
    const visiblePhotos = photos.slice(0, visibleCount);

    if (visiblePhotos.length === 0) {
        return (
            <div className="rounded-xl bg-bg-elevated px-5 py-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-text-tertiary">
                    <Camera className="h-5 w-5" />
                </div>
                <p className="mt-3 text-[15px] font-semibold text-text-primary">まだ写真がありません</p>
                <p className="mt-1 text-[13px] leading-6 text-text-secondary">
                    最初の一枚を見つけると、この子の物語がここから少しずつ始まります。                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-3 gap-[2px]">
                {visiblePhotos.map((photo) => (
                    <button
                        key={photo.id}
                        type="button"
                        onClick={() => onSelect(photo)}
                        className="aspect-square overflow-hidden rounded-none bg-bg-secondary"
                    >
                        <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    </button>
                ))}
            </div>
            {visibleCount < photos.length ? (
                <div className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={() => setVisibleCount((count) => count + 12)}
                        className="px-4 py-2 text-center text-sm font-medium text-[#5A5958]"
                    >
                        もっと見る
                    </button>
                </div>
            ) : null}
        </>
    );
}

