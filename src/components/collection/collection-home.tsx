"use client";

import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { BookOpen, Camera, Cat, Sparkles } from "lucide-react";
import { PhotoDetailView } from "@/components/app/immersive/photo-detail-view";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { getFullImageUrl } from "@/lib/utils";
import { useCatContext, useCoreContext } from "@/store/app-store";

/* eslint-disable @next/next/no-img-element */

interface CollectionHomeProps {
    onOpenCollection: () => void;
    onOpenImport: () => void;
    onOpenCat: () => void;
}

interface HomePhoto {
    id: string;
    storagePath: string;
    thumbnailPath: string | null;
    url: string;
    createdAt: string;
    source: string;
    catId: string | null;
    catIds: string[];
    catName: string;
    poseTags: string[];
    sceneSummary: string | null;
    rawDescription: string | null;
}

interface DiscoveryGroup {
    key: string;
    photoId: string | null;
    primary: any;
    discoveries: any[];
    count: number;
}

interface HighlightGroup {
    id: string;
    title: string;
    headline: string;
    body: string;
    totalCount: number;
    unlockedCount: number;
    remaining: number;
    complete: boolean;
    latestAt: string | null;
    representativePhoto: string | null;
}

const CATEGORY_COPY: Record<string, { title: string; body: string; completeBody: string }> = {
    pose: {
        title: "\u3053\u306e\u5b50\u3089\u3057\u3044\u30dd\u30fc\u30ba\u304c\u96c6\u307e\u3063\u3066\u3044\u307e\u3059",
        body: "\u5ea7\u308a\u65b9\u3084\u898b\u4e0a\u3052\u308b\u4ed5\u8349\u306b\u3001\u3053\u306e\u5b50\u3089\u3057\u3055\u304c\u306b\u3058\u3093\u3067\u3044\u307e\u3059",
        completeBody: "\u3053\u306e\u5b50\u3089\u3057\u3044\u30dd\u30fc\u30ba\u306e\u8a18\u9332\u304c\u3072\u3068\u3064\u63c3\u3044\u307e\u3057\u305f",
    },
    action: {
        title: "\u6bce\u65e5\u306e\u3057\u3050\u3055\u304c\u898b\u3048\u3066\u304d\u307e\u3057\u305f",
        body: "\u898b\u3064\u3081\u308b\u3001\u304f\u3064\u308d\u3050\u3001\u904a\u3076\u3002\u6bce\u65e5\u306e\u52d5\u304d\u304c\u7269\u8a9e\u306b\u306a\u3063\u3066\u3044\u304d\u307e\u3059",
        completeBody: "\u6bce\u65e5\u306e\u3057\u3050\u3055\u306e\u8a18\u9332\u304c\u3072\u3068\u3064\u63c3\u3044\u307e\u3057\u305f",
    },
    location: {
        title: "\u3088\u304f\u3044\u308b\u5834\u6240\u304c\u898b\u3048\u3066\u304d\u307e\u3057\u305f",
        body: "\u843d\u3061\u7740\u304f\u5834\u6240\u3084\u304f\u3064\u308d\u3050\u98a8\u666f\u304c\u3001\u3053\u306e\u5b50\u306e\u5c45\u5834\u6240\u3092\u6559\u3048\u3066\u304f\u308c\u307e\u3059",
        completeBody: "\u3088\u304f\u904e\u3054\u3059\u5834\u6240\u306e\u8a18\u9332\u304c\u305d\u308d\u3063\u3066\u3044\u307e\u3059",
    },
    emotion: {
        title: "\u8868\u60c5\u306e\u5909\u5316\u304c\u898b\u3048\u3066\u304d\u307e\u3057\u305f",
        body: "\u3084\u3055\u3057\u3044\u76ee\u7dda\u3084\u597d\u5947\u5fc3\u306e\u9854\u306b\u3001\u3053\u306e\u5b50\u306e\u6c17\u5206\u304c\u306b\u3058\u307f\u307e\u3059",
        completeBody: "\u3053\u306e\u5b50\u3089\u3057\u3044\u8868\u60c5\u306e\u7269\u8a9e\u304c\u3072\u3068\u3064\u63c3\u3044\u307e\u3057\u305f",
    },
    object: {
        title: "\u66ae\u3089\u3057\u306e\u98a8\u666f\u304c\u96c6\u307e\u3063\u3066\u3044\u307e\u3059",
        body: "\u5bb6\u5177\u3084\u672c\u3068\u4e00\u7dd2\u306e\u5199\u771f\u304b\u3089\u3001\u3053\u306e\u5b50\u306e\u66ae\u3089\u3057\u304c\u898b\u3048\u3066\u304d\u307e\u3059",
        completeBody: "\u66ae\u3089\u3057\u306e\u8a18\u61b6\u304c\u63c3\u3044\u3001\u7269\u8a9e\u304c\u3072\u3068\u3064\u5b8c\u6210\u3057\u307e\u3057\u305f",
    },
    other: {
        title: "\u65b0\u3057\u3044\u767a\u898b",
        body: "\u5c0f\u3055\u306a\u6c17\u3065\u304d\u304c\u91cd\u306a\u308b\u307b\u3069\u3001\u3053\u306e\u5b50\u306e\u7269\u8a9e\u304c\u80b2\u3063\u3066\u3044\u304d\u307e\u3059",
        completeBody: "\u3053\u306e\u5b50\u3089\u3057\u3044\u7269\u8a9e\u304c\u3072\u3068\u3064\u63c3\u3044\u307e\u3057\u305f",
    },
};

function takeRelation<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function getCategoryCopy(category: string | null | undefined) {
    if (!category) return CATEGORY_COPY.other;
    return CATEGORY_COPY[category] || CATEGORY_COPY.other;
}

function selectHeroPhoto(photos: HomePhoto[]) {
    if (!photos.length) return null;

    const faceForward = photos.find((photo) => {
        const poseText = photo.poseTags.join(" ").toLowerCase();
        const description = `${photo.sceneSummary ?? ""} ${photo.rawDescription ?? ""}`.toLowerCase();
        return (
            poseText.includes("facing_forward") ||
            poseText.includes("facing forward") ||
            description.includes("face") ||
            description.includes("close") ||
            description.includes("portrait")
        );
    });

    if (faceForward) return faceForward;

    const withPose = photos.find((photo) => photo.poseTags.length > 0);
    if (withPose) return withPose;

    return photos[0];
}

function buildDiscoveryHeadline(group: DiscoveryGroup, catsById: Map<string, string>) {
    const definition = takeRelation<any>(group.primary.collection_definitions);
    const catName = group.primary.cat_id ? catsById.get(group.primary.cat_id) : null;
    const entryName = definition?.name || group.primary.title || "\u65b0\u3057\u3044\u767a\u898b";

    if (group.count <= 1) {
        return catName
            ? `${catName}\u306e\u300c${entryName}\u300d\u304c\u898b\u3048\u3066\u304d\u307e\u3057\u305f`
            : `\u300c${entryName}\u300d\u304c\u898b\u3048\u3066\u304d\u307e\u3057\u305f`;
    }

    return catName
        ? `${catName}\u306e\u65b0\u3057\u3044\u767a\u898b\u304c${group.count}\u4ef6\u3042\u308a\u307e\u3057\u305f`
        : `\u65b0\u3057\u3044\u767a\u898b\u304c${group.count}\u4ef6\u3042\u308a\u307e\u3057\u305f`;
}

function buildHighlightCopy(group: HighlightGroup) {
    if (group.complete) {
        return {
            headline: `${group.title}\u304c\u5b8c\u6210\u3057\u307e\u3057\u305f`,
            body: getCategoryCopy(group.id).completeBody,
        };
    }

    if (group.remaining > 0 && group.remaining <= 2) {
        return {
            headline: `\u3042\u3068${group.remaining}\u3064\u3067${group.title}\u304c\u5b8c\u6210\u3057\u307e\u3059`,
            body: getCategoryCopy(group.id).body,
        };
    }

    return {
        headline: `${group.title}\u306b\u65b0\u3057\u3044\u5199\u771f\u304c\u52a0\u308f\u308a\u307e\u3057\u305f`,
        body: getCategoryCopy(group.id).body,
    };
}

export function CollectionHome({ onOpenCollection, onOpenImport, onOpenCat }: CollectionHomeProps) {
    const { cats } = useCatContext();
    const { householdId, isDemo } = useCoreContext();
    const { session, loading: authLoading } = useAuth();
    const supabaseRef = useRef(createClient());
    const [selectedDetailImage, setSelectedDetailImage] = useState<HomePhoto | null>(null);

    const catsById = useMemo(() => new Map(cats.map((cat) => [cat.id, cat.name])), [cats]);
    const catIds = useMemo(() => cats.map((cat) => cat.id), [cats]);
    const canRunLiveQueries = !isDemo && !!householdId && !!session && !authLoading;

    const getAvatarUrl = (path: string | null | undefined): string => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        return getFullImageUrl(path);
    };

    const photosQuery = useQuery<HomePhoto[]>({
        queryKey: ["collection-home-photos", householdId, catIds.join(","), isDemo, !!session, authLoading],
        enabled: isDemo || canRunLiveQueries,
        queryFn: async () => {
            if (isDemo || !householdId) return [];
            if (!session) return [];

            const supabase = supabaseRef.current;
            const { data: photos, error } = await supabase
                .from("photos")
                .select("id, storage_path, thumbnail_path, created_at, source")
                .eq("household_id", householdId)
                .order("created_at", { ascending: false })
                .limit(60);

            if (error) {
                console.error("[collection-home] photos query failed", error);
                return [];
            }

            const rows = photos || [];
            if (rows.length === 0) {
                const { data: galleryRows, error: galleryError } = await (supabase.rpc as any)("get_unified_gallery", {
                    target_household_id: householdId,
                    limit_count: 60,
                    offset_count: 0,
                });

                if (galleryError) {
                    console.error("[collection-home] gallery fallback failed", galleryError);
                    return [];
                }

                return ((galleryRows || []) as any[]).map((row) => ({
                    id: row.id,
                    storagePath: row.url,
                    thumbnailPath: null,
                    url: getFullImageUrl(row.url, { width: 720, height: 720, resize: "cover", quality: 82 }),
                    createdAt: row.created_at,
                    source: row.source || "profile",
                    catId: row.cat_id || null,
                    catIds: row.cat_ids || (row.cat_id ? [row.cat_id] : []),
                    catName:
                        row.cat_name ||
                        (row.cat_id ? catsById.get(row.cat_id) || "\u3046\u3061\u306e\u5b50" : "\u3046\u3061\u306e\u5b50"),
                    poseTags: row.ai_analysis?.pose ? [row.ai_analysis.pose] : [],
                    sceneSummary: row.ai_analysis?.labels?.scene || null,
                    rawDescription: row.ai_analysis?.labels?.shot || null,
                }));
            }

            const photoIds = rows.map((row) => row.id);
            const [{ data: links }, { data: analyses }] = await Promise.all([
                supabase.from("photo_cat_links").select("photo_id, cat_id, is_primary").in("photo_id", photoIds),
                supabase
                    .from("photo_analysis_results")
                    .select("photo_id, pose_tags, raw_json, scene_summary")
                    .in("photo_id", photoIds),
            ]);

            const linkMap = new Map<string, any[]>();
            for (const row of links || []) {
                const bucket = linkMap.get(row.photo_id) || [];
                bucket.push(row);
                linkMap.set(row.photo_id, bucket);
            }

            const analysisMap = new Map<string, any>();
            for (const row of analyses || []) {
                analysisMap.set(row.photo_id, row);
            }

            return rows.map((row: any) => {
                const photoLinks = linkMap.get(row.id) || [];
                const primaryLink = photoLinks.find((link: any) => link.is_primary) || photoLinks[0];
                const analysis = analysisMap.get(row.id);
                const rawJson = analysis?.raw_json || {};
                const rawDescription =
                    typeof rawJson.description === "string"
                        ? rawJson.description
                        : typeof rawJson.scene_summary === "string"
                          ? rawJson.scene_summary
                          : null;
                const catId = primaryLink?.cat_id || null;
                const imagePath = row.thumbnail_path || row.storage_path;

                return {
                    id: row.id,
                    storagePath: row.storage_path,
                    thumbnailPath: row.thumbnail_path,
                    url: getFullImageUrl(imagePath, { width: 720, height: 720, resize: "cover", quality: 82 }),
                    createdAt: row.created_at,
                    source: row.source || "camera_roll",
                    catId,
                    catIds: photoLinks.map((link: any) => link.cat_id),
                    catName: catId ? catsById.get(catId) || "\u3046\u3061\u306e\u5b50" : "\u3046\u3061\u306e\u5b50",
                    poseTags: analysis?.pose_tags || [],
                    sceneSummary: analysis?.scene_summary || null,
                    rawDescription,
                };
            });
        },
    });

    const discoveriesQuery = useQuery<DiscoveryGroup[]>({
        queryKey: ["collection-home-discoveries", householdId, catIds.join(","), isDemo, !!session, authLoading],
        enabled: isDemo || canRunLiveQueries,
        queryFn: async () => {
            if (isDemo || !householdId) return [];
            if (!session) return [];

            const supabase = supabaseRef.current;
            const { data, error } = await supabase
                .from("discoveries")
                .select(
                    "id, cat_id, title, type, photo_id, created_at, is_read, collection_definition_id, collection_definitions:collection_definitions!discoveries_collection_definition_id_fkey(id, slug, name, category), photos:photos!discoveries_photo_id_fkey!inner(id, storage_path, created_at, household_id)"
                )
                .eq("photos.household_id", householdId)
                .order("created_at", { ascending: false })
                .limit(24);

            if (error) {
                console.error("[collection-home] discoveries query failed", error);
                return [];
            }

            const grouped = new Map<string, any[]>();
            for (const row of data || []) {
                const key = row.photo_id || row.id;
                const bucket = grouped.get(key) || [];
                bucket.push(row);
                grouped.set(key, bucket);
            }

            return Array.from(grouped.entries())
                .map(([key, entries]) => {
                    const sorted = [...entries].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                    return {
                        key,
                        photoId: sorted[0]?.photo_id || null,
                        primary: sorted[0],
                        discoveries: sorted,
                        count: sorted.length,
                    };
                })
                .sort((a, b) => new Date(b.primary.created_at).getTime() - new Date(a.primary.created_at).getTime());
        },
    });

    const highlightQuery = useQuery<HighlightGroup | null>({
        queryKey: ["collection-home-highlight", householdId, catIds.join(","), isDemo, !!session, authLoading],
        enabled: isDemo || (canRunLiveQueries && catIds.length > 0),
        queryFn: async () => {
            if (isDemo || catIds.length === 0) return null;
            if (!session) return null;

            const supabase = supabaseRef.current;
            const { data: definitions, error: definitionsError } = await supabase
                .from("collection_definitions")
                .select("id, slug, name, category, description")
                .eq("is_active", true)
                .order("sort_order", { ascending: true });

            if (definitionsError) {
                console.error("[collection-home] collection definitions query failed", definitionsError);
                return null;
            }

            const definitionRows = definitions || [];
            if (definitionRows.length === 0) return null;

            const definitionIds = definitionRows.map((definition: any) => definition.id);
            const [{ data: items }, { data: photos }] = await Promise.all([
                supabase
                    .from("cat_collection_items")
                    .select("collection_definition_id, photo_count, created_at")
                    .in("cat_id", catIds)
                    .in("collection_definition_id", definitionIds),
                supabase
                    .from("cat_collection_photos")
                    .select("collection_definition_id, photos:photos!cat_collection_photos_photo_id_fkey(id, storage_path, created_at)")
                    .in("cat_id", catIds)
                    .in("collection_definition_id", definitionIds),
            ]);

            const definitionState = new Map<
                string,
                {
                    category: string;
                    photoCount: number;
                    latestAt: string | null;
                    representativePhoto: string | null;
                }
            >();

            for (const definition of definitionRows as any[]) {
                if (!definition.category) continue;
                definitionState.set(definition.id, {
                    category: definition.category,
                    photoCount: 0,
                    latestAt: null,
                    representativePhoto: null,
                });
            }

            for (const row of (items || []) as any[]) {
                const target = definitionState.get(row.collection_definition_id);
                if (!target) continue;
                target.photoCount += row.photo_count || 0;
                if (row.created_at && (!target.latestAt || row.created_at > target.latestAt)) {
                    target.latestAt = row.created_at;
                }
            }

            for (const row of (photos || []) as any[]) {
                const target = definitionState.get(row.collection_definition_id);
                const photo = takeRelation<any>(row.photos);
                if (!target || !photo?.storage_path) continue;
                if (!target.representativePhoto) {
                    target.representativePhoto = getFullImageUrl(photo.storage_path, {
                        width: 960,
                        height: 720,
                        resize: "cover",
                        quality: 84,
                    });
                }
                if (photo.created_at && (!target.latestAt || photo.created_at > target.latestAt)) {
                    target.latestAt = photo.created_at;
                }
            }

            const groups = new Map<string, HighlightGroup>();
            for (const definition of definitionRows as any[]) {
                if (!definition.category) continue;

                const progress = definitionState.get(definition.id);
                const copy = getCategoryCopy(definition.category);
                const existing =
                    groups.get(definition.category) || {
                        id: definition.category,
                        title: copy.title,
                        headline: copy.title,
                        body: copy.body,
                        totalCount: 0,
                        unlockedCount: 0,
                        remaining: 0,
                        complete: false,
                        latestAt: null,
                        representativePhoto: null,
                    };

                existing.totalCount += 1;

                if (progress && progress.photoCount > 0) {
                    existing.unlockedCount += 1;
                    if (progress.latestAt && (!existing.latestAt || progress.latestAt > existing.latestAt)) {
                        existing.latestAt = progress.latestAt;
                    }
                    if (!existing.representativePhoto && progress.representativePhoto) {
                        existing.representativePhoto = progress.representativePhoto;
                    }
                }

                groups.set(definition.category, existing);
            }

            const candidates = Array.from(groups.values())
                .map((group) => {
                    const remaining = Math.max(group.totalCount - group.unlockedCount, 0);
                    const complete = group.totalCount > 0 && remaining === 0;
                    return { ...group, remaining, complete };
                })
                .filter((group) => group.unlockedCount > 0);

            if (candidates.length === 0) return null;

            const completed = candidates
                .filter((group) => group.complete)
                .sort((a, b) => (b.latestAt || "").localeCompare(a.latestAt || ""));
            if (completed.length > 0) {
                return { ...completed[0], ...buildHighlightCopy(completed[0]) };
            }

            const almostThere = candidates
                .filter((group) => group.remaining > 0 && group.remaining <= 2)
                .sort((a, b) => a.remaining - b.remaining || (b.latestAt || "").localeCompare(a.latestAt || ""));
            if (almostThere.length > 0) {
                return { ...almostThere[0], ...buildHighlightCopy(almostThere[0]) };
            }

            const recent = [...candidates].sort((a, b) => (b.latestAt || "").localeCompare(a.latestAt || ""));
            return { ...recent[0], ...buildHighlightCopy(recent[0]) };
        },
    });

    const photos = photosQuery.data || [];
    const discoveries = discoveriesQuery.data || [];
    const featuredGroup = highlightQuery.data;
    const heroPhoto = useMemo(() => selectHeroPhoto(photos), [photos]);
    const recentPhotos = useMemo(() => photos.filter((photo) => photo.id !== heroPhoto?.id).slice(0, 6), [heroPhoto?.id, photos]);
    const heroDate = heroPhoto?.createdAt
        ? format(new Date(heroPhoto.createdAt), "M\u6708d\u65e5", { locale: ja })
        : format(new Date(), "M\u6708d\u65e5", { locale: ja });

    const renderCatAvatar = (cat: (typeof cats)[number]) => {
        if (cat.avatar && cat.avatar !== "cat-fallback") {
            return getAvatarUrl(cat.avatar);
        }
        const firstImage = cat.images?.[0]?.storagePath;
        return firstImage ? getFullImageUrl(firstImage, { width: 160, height: 160, resize: "cover", quality: 82 }) : "";
    };

    return (
        <div className="min-h-[100dvh] bg-[#F2F1EF] pb-32">
            <div className="mx-auto w-full max-w-[420px]">
                <div className="relative h-[340px] w-full overflow-hidden">
                    {heroPhoto ? (
                        <button type="button" className="h-full w-full text-left" onClick={() => setSelectedDetailImage(heroPhoto)}>
                            <img src={heroPhoto.url} alt={heroPhoto.catName} className="h-full w-full object-cover" style={{ objectPosition: "center 25%" }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5" />
                            <div className="absolute bottom-6 left-5">
                                <p className="text-4xl font-bold text-white drop-shadow-lg">{heroPhoto.catName}</p>
                                <p className="mt-1 text-base text-white/80">{heroDate}</p>
                            </div>
                        </button>
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#E7E6E3]">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DAD9D5]">
                                <Camera className="h-8 w-8 text-[#8A8988]" />
                            </div>
                            <p className="text-lg font-medium text-[#5A5958]">{"\u6700\u521d\u306e\u4e00\u679a\u3092\u64ae\u3063\u3066\u307f\u307e\u3057\u3087\u3046"}</p>
                            <button type="button" onClick={onOpenImport} className="rounded-full bg-[#3D5A80] px-6 py-3 font-medium text-white">
                                {"\u5199\u771f\u3092\u8ffd\u52a0\u3059\u308b"}
                            </button>
                        </div>
                    )}
                </div>

                {discoveries.length > 0 ? (
                    <section className="bg-[#F2F1EF] px-4 py-6">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E2840]">{"\u65b0\u3057\u3044\u767a\u898b"}</h2>
                            <button type="button" onClick={onOpenCollection} className="text-sm font-medium text-[#5A5958]">
                                {"\u3059\u3079\u3066\u898b\u308b"}
                            </button>
                        </div>
                        <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <div className="flex gap-3">
                                {discoveries.slice(0, 5).map((group) => {
                                    const photo = takeRelation<any>(group.primary.photos);
                                    const imageUrl = photo?.storage_path
                                        ? getFullImageUrl(photo.storage_path, {
                                              width: 640,
                                              height: 480,
                                              resize: "cover",
                                              quality: 82,
                                          })
                                        : "";

                                    return (
                                        <button key={group.key} type="button" onClick={onOpenCollection} className="min-w-[240px] max-w-[260px] flex-shrink-0 overflow-hidden rounded-xl border border-[#3D5A80]/15 bg-[#FAFAF9] text-left shadow-sm">
                                            <div className="relative h-40 w-full overflow-hidden">
                                                {imageUrl ? (
                                                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-[#E7E6E3]">
                                                        <Sparkles className="h-8 w-8 text-[#3D5A80]" />
                                                    </div>
                                                )}
                                                <div className="absolute left-2 top-2 rounded-full bg-white/80 p-1 backdrop-blur-sm">
                                                    <Sparkles className="h-3.5 w-3.5 text-[#3D5A80]" />
                                                </div>
                                            </div>
                                            <div className="space-y-2 p-3">
                                                <span className="inline-block rounded-full bg-[#3D5A80] px-2.5 py-0.5 text-xs font-medium text-white">{`${group.count}\u4ef6\u306e\u767a\u898b`}</span>
                                                <p className="line-clamp-1 text-sm font-medium text-[#1E2840]">{buildDiscoveryHeadline(group, catsById)}</p>
                                                <p className="text-xs text-[#5A5958]">{formatDistanceToNow(new Date(group.primary.created_at), { addSuffix: true, locale: ja })}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                ) : null}

                {featuredGroup ? (
                    <section className="bg-[#E7E6E3] px-4 py-6">
                        <button type="button" onClick={onOpenCollection} className="w-full overflow-hidden rounded-2xl border border-[#3D5A80]/15 bg-[#FAFAF9] text-left shadow-sm transition-transform active:scale-[0.98]">
                            <div className="aspect-[4/3] bg-[#E7E6E3]">
                                {featuredGroup.representativePhoto ? (
                                    <img src={featuredGroup.representativePhoto} alt={featuredGroup.title} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-[#DAD9D5]">
                                        <BookOpen className="h-8 w-8 text-[#3D5A80]" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 p-4">
                                <div className="inline-flex items-center rounded-full bg-[#3D5A80]/10 px-2.5 py-0.5 text-xs font-medium text-[#1E2840]">{featuredGroup.title}</div>
                                <div>
                                    <p className={featuredGroup.complete ? "text-xl font-bold text-[#1E2840]" : "text-lg font-bold text-[#1E2840]"}>{featuredGroup.headline}</p>
                                    <p className="mt-1 text-sm leading-6 text-[#5A5958]">{featuredGroup.body}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#D9D8D5]">
                                        <div
                                            className="h-full rounded-full bg-[#3D5A80]"
                                            style={{
                                                width: `${Math.max((featuredGroup.unlockedCount / Math.max(featuredGroup.totalCount, 1)) * 100, 8)}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[#5A5958]">
                                        <span>
                                            {featuredGroup.complete
                                                ? `${featuredGroup.unlockedCount}\u7a2e\u985e\u304c\u898b\u3064\u304b\u3063\u3066\u3044\u307e\u3059`
                                                : `\u3042\u3068${featuredGroup.remaining}\u3064\u3067\u5b8c\u6210\u3057\u307e\u3059`}
                                        </span>
                                        <span>{`${featuredGroup.unlockedCount}/${featuredGroup.totalCount}`}</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    </section>
                ) : null}

                {recentPhotos.length > 0 ? (
                    <section className="bg-[#F2F1EF] px-4 py-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-[#8A8988]">{"\u6700\u8fd1\u306e\u5199\u771f"}</h3>
                            <button type="button" onClick={onOpenCollection} className="text-sm font-medium text-[#5A5958]">
                                {"\u3059\u3079\u3066\u306e\u5199\u771f"}
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-[2px]">
                            {recentPhotos.map((photo) => (
                                <button key={photo.id} type="button" className="aspect-square overflow-hidden rounded-none" onClick={() => setSelectedDetailImage(photo)}>
                                    <img src={photo.url} alt={photo.catName} className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </section>
                ) : null}

                {cats.length > 1 ? (
                    <section className="bg-[#E7E6E3] px-4 py-5">
                        <div className="mb-3">
                            <h3 className="text-sm font-medium text-[#8A8988]">{"\u3046\u3061\u306e\u5b50\u305f\u3061"}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {cats.map((cat) => {
                                const avatarUrl = renderCatAvatar(cat);
                                return (
                                    <button key={cat.id} type="button" onClick={onOpenCat} className="flex items-center gap-3 rounded-2xl bg-[#FAFAF9] px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.98]">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={cat.name} className="h-12 w-12 rounded-full object-cover" />
                                        ) : (
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DAD9D5]">
                                                <Cat className="h-6 w-6 text-[#8A8988]" />
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-[#1E2840]">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ) : null}

                {!heroPhoto && discoveries.length === 0 && !featuredGroup && recentPhotos.length === 0 ? (
                    <section className="bg-[#F2F1EF] px-4 py-6">
                        <div className="rounded-2xl border border-[#DDDCD8] bg-[#FAFAF9] p-5 text-center shadow-sm">
                            <p className="text-base font-medium text-[#1E2840]">{"\u5199\u771f\u304c\u5897\u3048\u308b\u3068\u3001\u3053\u306e\u5b50\u306e\u7269\u8a9e\u304c\u898b\u3048\u3066\u304d\u307e\u3059"}</p>
                            <button type="button" onClick={onOpenImport} className="mt-4 rounded-full bg-[#3D5A80] px-5 py-2.5 text-sm font-medium text-white">
                                {"\u5199\u771f\u3092\u8ffd\u52a0\u3059\u308b"}
                            </button>
                        </div>
                    </section>
                ) : null}
            </div>

            <PhotoDetailView isOpen={!!selectedDetailImage} onClose={() => setSelectedDetailImage(null)} image={selectedDetailImage} />
        </div>
    );
}
