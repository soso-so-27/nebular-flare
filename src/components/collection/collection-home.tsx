"use client";

import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Camera, Sparkles } from "lucide-react";
import { PhotoDetailView } from "@/components/app/immersive/photo-detail-view";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { getFullImageUrl } from "@/lib/utils";
import { useCatContext, useCoreContext } from "@/store/app-store";

/* eslint-disable @next/next/no-img-element */

interface CollectionHomeProps {
    onOpenCollection: () => void;
    onOpenImport: () => void;
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

function takeRelation<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
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
    const catName = group.primary.cat_id ? catsById.get(group.primary.cat_id) || "\u306d\u3053" : "\u306d\u3053";
    const entryName = definition?.name;

    if (entryName) {
        return `\u300c${entryName}\u3001\u307e\u305f\u5897\u3048\u307e\u3057\u305f\u3002\u300d`;
    }

    return `\u300c${catName}\u306e\u65b0\u3057\u3044\u4e00\u9762\u3001\u898b\u3064\u304b\u308a\u307e\u3057\u305f\u3002\u300d`;
}

export function CollectionHome({ onOpenCollection, onOpenImport }: CollectionHomeProps) {
    const { cats } = useCatContext();
    const { householdId, isDemo } = useCoreContext();
    const { session, loading: authLoading } = useAuth();
    const supabaseRef = useRef(createClient());
    const [selectedDetailImage, setSelectedDetailImage] = useState<HomePhoto | null>(null);

    const catsById = useMemo(() => new Map(cats.map((cat) => [cat.id, cat.name])), [cats]);
    const catIds = useMemo(() => cats.map((cat) => cat.id), [cats]);
    const canRunLiveQueries = !isDemo && !!householdId && !!session && !authLoading;

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

    const photos = photosQuery.data || [];
    const discoveries = discoveriesQuery.data || [];
    const heroPhoto = useMemo(() => selectHeroPhoto(photos), [photos]);
    const recentPhotos = useMemo(() => photos.filter((photo) => photo.id !== heroPhoto?.id).slice(0, 6), [heroPhoto?.id, photos]);
    const heroDate = heroPhoto?.createdAt
        ? format(new Date(heroPhoto.createdAt), "M\u6708d\u65e5", { locale: ja })
        : format(new Date(), "M\u6708d\u65e5", { locale: ja });
    const questionCatName = heroPhoto?.catId ? catsById.get(heroPhoto.catId) || "\u306d\u3053" : "\u306d\u3053";
    const heroPhotoAgeMs = heroPhoto ? Date.now() - new Date(heroPhoto.createdAt).getTime() : 0;
    const promptText = (() => {
        const days = heroPhotoAgeMs / (24 * 60 * 60 * 1000);
        const catName = questionCatName;

        if (days >= 365) {
            return `1\u5e74\u524d\u306e\u4eca\u65e5\u306e${catName}\u3002`;
        }
        if (days >= 90) {
            const months = Math.floor(days / 30);
            return `${months}\u30f6\u6708\u524d\u306e${catName}\u3002\u306a\u3093\u304b\u9055\u3046\u6c17\u304c\u3059\u308b\u3002`;
        }
        if (days >= 30) {
            return `1\u30f6\u6708\u524d\u306e${catName}\u3001\u899a\u3048\u3066\u308b\uff1f`;
        }
        if (days >= 7) {
            return `1\u9031\u9593\u524d\u306e${catName}\u3001\u899a\u3048\u3066\u308b\uff1f`;
        }
        if (days >= 3) {
            return `${catName}\u306e\u6700\u8fd1\u306f\uff1f`;
        }
        if (days < 1) {
            return `\u4eca\u65e5\u306e${catName}\u3001\u3069\u3093\u306a\u5b50\uff1f`;
        }
        return `\u6628\u65e5\u306e${catName}\u3002`;
    })();

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

                {heroPhoto ? (
                    <section className="bg-[#F2F1EF] px-4 py-4">
                        <div className="rounded-[4px] border border-[#DDDCD8] bg-[#FAFAF9] p-4">
                            <p className="text-[14px] text-[#5A5958]">{promptText}</p>
                        </div>
                    </section>
                ) : null}

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
                                {discoveries.slice(0, 3).map((group) => {
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

                {!heroPhoto && discoveries.length === 0 && recentPhotos.length === 0 ? (
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
