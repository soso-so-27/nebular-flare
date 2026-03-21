"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Award, Target, ChevronRight, Loader2, Camera, Wand2, Sparkles,
    Search, X, Cat, Lock, Image as ImageIcon,
    Package, PawPrint, Circle, Activity, Box,
    Utensils, Moon, Zap, Smile, Frown, Meh, AlertCircle,
    Cloud, Sun, Stethoscope, Droplets, Flame, Scissors, ShieldAlert,
    UserPlus, HeartPulse, Home, Sofa, MapPin, Footprints,
    CalendarDays, Gift, Cake, Baby, TrendingUp, ShoppingBag, Brush, Heart,
    Wind, History, Camera as CameraIcon2
} from "lucide-react";
import { cn, getFullImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useCatContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { PhotoDetailView } from "@/components/app/immersive/photo-detail-view";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────
// Shared types (same as zukan-screen)
// ─────────────────────────────────
interface AIAnalysis {
    labels?: { moment?: string; scene?: string; shot?: string; };
    forYouScores?: { dailyPick?: number; weeklyHighlight?: number; funnyMoment?: number; };
    uiTags?: string[];
    needUserConfirm?: boolean;
    userConfirmed?: boolean;
    confirmedAt?: string;
    zukanShelf?: string;
    pose?: string;
    metadata?: Record<string, string>;
}

interface ShelfPhoto {
    id: string; url: string; storagePath: string; catId: string; catName: string;
    catIds?: string[]; createdAt: string; source: string; memo?: string;
    tags?: any[]; isUrl?: boolean; aiAnalysis?: AIAnalysis;
}

function mapToShelfPhoto(img: any): ShelfPhoto {
    return {
        id: img.id,
        url: getFullImageUrl(img.url, { width: 400, height: 400, resize: "cover", quality: 80 }),
        storagePath: img.url, catId: img.cat_id, catName: img.cat_name,
        catIds: img.cat_ids, createdAt: img.created_at, source: img.source || "profile",
        memo: img.memo, tags: img.tags, isUrl: img.is_url, aiAnalysis: img.ai_analysis,
    };
}

interface ZukanItemDef { id: string; label: string; icon: React.ReactNode; isLegendary?: boolean; }
interface ZukanAxisDef { id: string; title: string; metaKey: string; items: ZukanItemDef[]; color: string; fallbackIcon: React.ReactNode; }

import { ZUKAN_AXES, DAILY_MISSIONS } from "@/lib/zukan-data";

// ─────────────────────────────────
// Props
// ─────────────────────────────────
interface CollectionHomeProps {
    onOpenCollection: () => void;
    onOpenImport: () => void;
}

export function CollectionHome({ onOpenCollection, onOpenImport }: CollectionHomeProps) {
    const { cats, analyzeCatImage } = useCatContext();
    const { householdId } = useCoreContext();

    const [allPhotos, setAllPhotos] = useState<ShelfPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDetailImage, setSelectedDetailImage] = useState<any>(null);
    const [batchTagging, setBatchTagging] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

    const supabaseRef = useRef(createClient());

    const loadPhotos = useCallback(async () => {
        const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
        if (isDemo) {
            // Generate mock data for demo
            const mockPhotos: ShelfPhoto[] = [
                {
                    id: 'mock-1', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
                    storagePath: '', catId: 'cat-1', catName: '麦', createdAt: new Date().toISOString(),
                    source: 'profile', aiAnalysis: { forYouScores: { dailyPick: 0.95 }, pose: '香箱座り' }
                },
                {
                    id: 'mock-2', url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800',
                    storagePath: '', catId: 'cat-2', catName: '雨', createdAt: new Date(Date.now() - 86400000).toISOString(),
                    source: 'profile', aiAnalysis: { forYouScores: { dailyPick: 0.8 }, pose: 'へそ天' }
                },
                {
                    id: 'mock-3', url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800',
                    storagePath: '', catId: 'cat-1', catName: '麦', createdAt: new Date(Date.now() - 172800000).toISOString(),
                    source: 'profile', aiAnalysis: { pose: 'スフィンクス' }
                },
                {
                    id: 'mock-4', url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800',
                    storagePath: '', catId: 'cat-1', catName: '麦', createdAt: new Date(Date.now() - 259200000).toISOString(),
                    source: 'profile', aiAnalysis: { pose: 'まんまる' }
                },
                {
                    id: 'mock-5', url: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=800',
                    storagePath: '', catId: 'cat-1', catName: '麦', createdAt: new Date(Date.now() - 345600000).toISOString(),
                    source: 'profile', aiAnalysis: { pose: 'ちょうちん座り' }
                },
                {
                    id: 'mock-6', url: 'https://images.unsplash.com/photo-1511044568932-338cba0ad80dc?w=800',
                    storagePath: '', catId: 'cat-2', catName: '雨', createdAt: new Date(Date.now() - 432000000).toISOString(),
                    source: 'profile', aiAnalysis: { pose: 'にょーん' }
                },
            ];
            setAllPhotos(mockPhotos);
            setLoading(false);
            return;
        }

        if (!householdId) { setLoading(false); return; }
        setLoading(true);
        const supabase = supabaseRef.current;
        const { data, error } = await (supabase.rpc as any)("get_unified_gallery", {
            target_household_id: householdId, limit_count: 500, offset_count: 0,
        });
        if (error) { console.error(error); setLoading(false); return; }
        setAllPhotos((data as any[] || []).map(mapToShelfPhoto));
        setLoading(false);
    }, [householdId]);

    useEffect(() => { loadPhotos(); }, [loadPhotos]);

    // ─── Compute collections ───
    const zukanCollections = useMemo(() => {
        return ZUKAN_AXES.map(axis => {
            const itemMap: Record<string, ShelfPhoto[]> = {};
            axis.items.forEach(item => { itemMap[item.id] = []; });
            allPhotos.forEach(photo => {
                const ai = photo.aiAnalysis;
                if (!ai) return;
                let val: string | undefined;
                if (axis.metaKey === 'pose') val = ai.pose;
                else if (ai.metadata) val = ai.metadata[axis.metaKey];
                if (val && itemMap[val]) itemMap[val].push(photo);
            });
            const collectedCount = axis.items.filter(item => itemMap[item.id].length > 0).length;
            // Get a preview photo (first found)
            const previewPhotos = axis.items
                .map(item => itemMap[item.id][0])
                .filter(Boolean)
                .slice(0, 4);
            return { ...axis, itemMap, collectedCount, totalCount: axis.items.length, previewPhotos };
        });
    }, [allPhotos]);

    const totalCollected = useMemo(() => zukanCollections.reduce((sum, c) => sum + c.collectedCount, 0), [zukanCollections]);
    const totalItems = useMemo(() => zukanCollections.reduce((sum, c) => sum + c.totalCount, 0), [zukanCollections]);

    const untaggedCount = useMemo(() => {
        return allPhotos.filter(p => !p.aiAnalysis || !p.aiAnalysis.pose).length;
    }, [allPhotos]);

    // ─── Daily Highlight Photo ───
    const dailyHighlight = useMemo(() => {
        if (allPhotos.length === 0) return null;
        const sorted = [...allPhotos].sort((a, b) => {
            const scoreA = a.aiAnalysis?.forYouScores?.dailyPick ?? 0;
            const scoreB = b.aiAnalysis?.forYouScores?.dailyPick ?? 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return sorted[0];
    }, [allPhotos]);

    // ─── Recent Discoveries ───
    const recentDiscoveries = useMemo(() => {
        return allPhotos.slice(0, 8);
    }, [allPhotos]);

    // ─── Weekly Album ───
    const weeklyAlbum = useMemo(() => {
        if (allPhotos.length === 0) return null;
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = allPhotos.filter(p => new Date(p.createdAt) >= oneWeekAgo);
        if (thisWeek.length < 3) return null;
        return {
            title: "のんびり穏やかな1週間",
            photos: thisWeek.slice(0, 5),
            startDate: oneWeekAgo.toISOString(),
            endDate: now.toISOString()
        };
    }, [allPhotos]);

    const runBatchTagging = useCallback(async () => {
        const untagged = allPhotos.filter(p => !p.aiAnalysis || !p.aiAnalysis.pose);
        if (untagged.length === 0) return;
        setBatchTagging(true);
        setBatchProgress({ current: 0, total: untagged.length });
        for (let i = 0; i < untagged.length; i++) {
            const photo = untagged[i];
            const imageUrl = getFullImageUrl(photo.storagePath, { width: 800, height: 800, resize: 'contain', quality: 90 });
            try { await analyzeCatImage(photo.id, imageUrl); } catch (e) { console.error(e); }
            setBatchProgress({ current: i + 1, total: untagged.length });
            if (i < untagged.length - 1) await new Promise(r => setTimeout(r, 2000));
        }
        setBatchTagging(false);
        loadPhotos();
    }, [allPhotos, loadPhotos, analyzeCatImage]);

    // Weekly mission
    const mission = useMemo(() => {
        const today = new Date();
        const weekNumber = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        return DAILY_MISSIONS[weekNumber % DAILY_MISSIONS.length];
    }, []);

    const [discoveries, setDiscoveries] = useState<any[]>([]);

    const checkDiscoveries = useCallback(async () => {
        const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
        if (!householdId || isDemo) return;
        const supabase = supabaseRef.current;
        const { data, error } = await supabase
            .from('discoveries')
            .select('*, collection_definitions(*), photos(*)')
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setDiscoveries(data);
        }
    }, [householdId]);

    useEffect(() => {
        checkDiscoveries();
        const interval = setInterval(checkDiscoveries, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [checkDiscoveries]);

    const markDiscoveryAsRead = async (id: string) => {
        setDiscoveries(prev => prev.filter(d => d.id !== id));
        await (supabaseRef.current.from('discoveries') as any).update({ is_read: true }).eq('id', id);
        onOpenCollection();
    };

    return (
        <div className="fixed inset-0 z-0 bg-[#F6F3EE] dark:bg-[#121214] flex flex-col">
            {/* ─── Header ─── */}
            <header className="sticky top-0 z-30 bg-[#F6F3EE]/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-[#F2EFEA] dark:border-white/10 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center justify-between px-5 h-14">
                    <h1 className="text-[28px] font-[700] tracking-[-0.5px] text-[#4E342E] dark:text-[#E8E6E1]">今日のねこ</h1>
                    <div className="flex items-center gap-2">
                        {batchTagging ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#787570]/10 text-[#787570] text-[12px] font-medium animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{batchProgress.current}/{batchProgress.total}</span>
                            </div>
                        ) : untaggedCount > 0 ? (
                            <button
                                onClick={runBatchTagging}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C8A97E]/10 text-[#C8A97E] text-[13px] font-bold active:scale-95 transition-transform"
                            >
                                <Wand2 className="w-4 h-4" />
                                <span>一括解析({untaggedCount})</span>
                            </button>
                        ) : null}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pb-32">
                <AnimatePresence>
                    {discoveries.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -20 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-5 pt-4"
                        >
                            <button
                                onClick={() => markDiscoveryAsRead(discoveries[0].id)}
                                className="w-full flex items-center justify-between p-4 rounded-[20px] bg-[#FFFFFF] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] relative overflow-hidden group text-left"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-[#C8A97E]/5 to-transparent pointer-events-none" />
                                <div className="flex items-center gap-4 relative z-10 w-full">
                                    <div className="w-12 h-12 rounded-full bg-[#C8A97E]/20 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-6 h-6 text-[#C8A97E]" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-bold text-[#C8A97E] px-2 py-0.5 rounded-full bg-[#C8A97E]/10">
                                                今日の発掘({discoveries.length})
                                            </span>
                                        </div>
                                        <h3 className="text-[14px] font-bold text-[#4E342E] dark:text-[#E8E6E1] truncate">
                                            {discoveries[0].title}
                                        </h3>
                                        <p className="text-[12px] text-[#8E8B85] truncate">
                                            タップしてコレクションを開く
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-[#C8A97E] shrink-0" />
                                </div>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-[#D4CFC9]" />
                        <p className="text-[13px] text-[#787570]">読み込み中...</p>
                    </div>
                ) : (
                    <div className="px-5 pt-4 space-y-8 pb-10">
                        {/* ─── A. 今日の一枚 ─── */}
                        {dailyHighlight && (() => {
                            const ai = dailyHighlight.aiAnalysis;
                            let copy = "今日はのんびり過ごしていました";
                            if (ai?.pose) {
                                if (ai.pose.includes('寝')) copy = "今日はよく眠っていました";
                                else if (ai.pose.includes('へそ天')) copy = "今日はリラックスしていました";
                                else if (ai.pose.includes('香箱')) copy = "今日は落ち着いた様子でした";
                            }

                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative aspect-[4/4.8] w-full rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)] group cursor-pointer"
                                    onClick={() => setSelectedDetailImage(dailyHighlight)}
                                >
                                    <img
                                        src={dailyHighlight.url}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        alt="Today's Cat"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#2F2A26]/80 via-transparent to-transparent" />

                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-1.5 mb-1 opacity-90">
                                                <span className="text-[12px] font-medium text-white shadow-sm">
                                                    {new Date(dailyHighlight.createdAt).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <h2 className="text-[24px] font-[600] text-white leading-tight drop-shadow-md">
                                                {dailyHighlight.catName}
                                            </h2>
                                            <p className="text-[14px] font-[400] text-white/90 drop-shadow-sm mt-1">
                                                {copy}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}

                        <div className="space-y-4">
                            <h2 className="text-[18px] font-[600] text-[#2F2A26] px-1">最近の発見</h2>
                            {discoveries.length > 0 ? (
                                <div className="space-y-3">
                                    {discoveries.slice(0, 2).map((disc, idx) => (
                                        <motion.button
                                            key={disc.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            onClick={() => markDiscoveryAsRead(disc.id)}
                                            className="w-full flex items-center justify-between p-4 rounded-[20px] bg-[#FFFFFF] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-[14px] bg-[#C8A97E]/10 flex items-center justify-center shrink-0">
                                                    <Sparkles className="w-5 h-5 text-[#C8A97E]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-[14px] font-[600] text-[#2F2A26]">
                                                        {disc.title.replace('コレクション追加', 'の傾向が見えました')}
                                                    </h3>
                                                    <p className="text-[12px] font-[400] text-[#7A726B] mt-0.5">
                                                        タップしてさらに詳しく
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-[#C8A97E]/60 shrink-0" />
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[14px] bg-[#F6F3EE] flex items-center justify-center shrink-0">
                                        <Search className="w-5 h-5 text-[#A08D74]" />
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-[600] text-[#2F2A26]">まだ新しい発見はありません</h3>
                                        <p className="text-[12px] font-[400] text-[#7A726B] mt-0.5">写真が増えると、この子らしさが見えてきます</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── C. コレクション進捗 ─── */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-[18px] font-[600] text-[#2F2A26]">この子らしさ</h2>
                                <button
                                    onClick={onOpenCollection}
                                    className="text-[12px] font-[400] text-[#C8A97E] active:opacity-70"
                                >
                                    すべて見る
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {zukanCollections.slice(0, 4).map((axis, idx) => {
                                    const maxBlocks = 6;
                                    const blockRatio = axis.collectedCount / axis.totalCount;
                                    const filledBlocks = Math.max(1, Math.round(maxBlocks * blockRatio));

                                    return (
                                        <motion.button
                                            key={axis.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 + idx * 0.04 }}
                                            onClick={onOpenCollection}
                                            className="bg-[#FFFFFF] p-4 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.06)] text-left flex flex-col justify-between aspect-[4/3]"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-[8px] flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: `${axis.color}15`, color: axis.color }}>
                                                    {axis.fallbackIcon}
                                                </div>
                                                <p className="text-[14px] font-[600] text-[#2F2A26] truncate">{axis.title}</p>
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex gap-1 h-1.5 mb-2">
                                                    {[...Array(maxBlocks)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex-1 rounded-full transition-colors duration-500"
                                                            style={{
                                                                backgroundColor: i < filledBlocks ? axis.color : '#F2EFEA'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-[12px] font-medium text-[#A08D74] tabular-nums">
                                                    {axis.collectedCount} / {axis.totalCount} 集まりました
                                                </p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}
            </div>
            <PhotoDetailView isOpen={!!selectedDetailImage} onClose={() => setSelectedDetailImage(null)} image={selectedDetailImage} />
        </div>
    );
}
