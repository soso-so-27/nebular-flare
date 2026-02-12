"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCatContext, useIncidentContext } from "@/store/app-store";
import { Incident } from "@/types";
import { createClient } from "@/lib/supabase";
import { useWeeklySummary } from "@/hooks/use-weekly-summary";
import { StoryCoverView } from "./story-cover-view";
import type { Cat } from "@/types";
import { format, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { generateWeeklyCaption } from "@/lib/ai-album-helper";
import { Share2, Loader2, ChevronLeft } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────
interface WeeklyPageClientProps {
    onClose?: () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function WeeklyPageClient({ onClose }: WeeklyPageClientProps) {
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();
    const dummyCat = cats[0];

    // Export ref for hidden 1:1 canvas
    const exportRef = useRef<HTMLDivElement>(null);

    // ── Helper: get public URL ──
    const getPublicUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const supabase = createClient();
        const bucket = path.startsWith('cat-photos/') ? 'cat-images' : 'avatars';
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    };

    // ── Collect weekly photos ──
    const weeklyPhotos = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const photos: { url: string; date: string }[] = [];

        incidents.forEach((inc: Incident) => {
            if (new Date(inc.created_at) >= sevenDaysAgo && inc.photos) {
                inc.photos.forEach((path: string) => {
                    photos.push({ url: getPublicUrl(path), date: inc.created_at });
                });
            }
        });

        cats.forEach(cat => {
            cat.images?.forEach((img: any) => {
                const imgDate = new Date(img.createdAt || img.created_at);
                if (imgDate >= sevenDaysAgo) {
                    photos.push({ url: getPublicUrl(img.storagePath), date: imgDate.toISOString() });
                }
            });
        });

        return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [incidents, cats]);

    const { weekKey } = useWeeklySummary(dummyCat?.id, weeklyPhotos.length);

    // ── State ──
    const [isSharing, setIsSharing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [base64Photos, setBase64Photos] = useState<{ url: string; date: string }[]>([]);
    const [viewScale, setViewScale] = useState(0.35);

    // ── Responsive scale ──
    useEffect(() => {
        if (typeof window === "undefined") return;
        const calc = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            // Fit 1080×1920 into viewport with padding
            const sx = (vw - 32) / 1080;
            const sy = (vh - 100) / 1920;
            setViewScale(Math.min(sx, sy, 0.45));
        };
        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, []);

    // ── Base64 conversion ──
    useEffect(() => {
        const convert = async () => {
            const results = await Promise.all(
                weeklyPhotos.map(async (photo) => {
                    try {
                        const res = await fetch(photo.url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const blob = await res.blob();
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        const imgUrl = URL.createObjectURL(blob);

                        return new Promise<{ url: string; date: string }>((resolve) => {
                            img.onload = () => {
                                URL.revokeObjectURL(imgUrl);
                                const MAX = 800;
                                let w = img.width, h = img.height;
                                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                                else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                                const c = document.createElement("canvas");
                                c.width = w; c.height = h;
                                const ctx = c.getContext("2d");
                                if (!ctx) { resolve(photo); return; }
                                ctx.drawImage(img, 0, 0, w, h);
                                resolve({ url: c.toDataURL("image/jpeg", 0.75), date: photo.date });
                            };
                            img.onerror = () => {
                                URL.revokeObjectURL(imgUrl);
                                resolve({ url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', date: photo.date });
                            };
                            img.src = imgUrl;
                        });
                    } catch {
                        return photo;
                    }
                })
            );
            setBase64Photos(results);
        };
        if (weeklyPhotos.length > 0) convert();
    }, [weeklyPhotos]);

    // ── AI Caption ──
    const [aiCaption, setAiCaption] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(true);

    const { data: careLogs = [] } = useQuery({
        queryKey: ['weekly-care-logs', dummyCat?.id],
        queryFn: async () => {
            if (!dummyCat) return [];
            const supabase = createClient();
            const { data } = await supabase
                .from('care_logs')
                .select('*')
                .eq('cat_id', dummyCat.id)
                .gte('done_at', subDays(new Date(), 7).toISOString());
            return data || [];
        },
        enabled: !!dummyCat
    });

    const weeklyLogs = useMemo(() => [
        ...weeklyPhotos.map(p => ({ type: 'incident' as const, content: p.date, date: new Date(p.date) })),
        ...incidents
            .filter(inc => new Date(inc.created_at) >= subDays(new Date(), 7))
            .map(inc => ({ type: 'incident' as const, content: inc.note || (inc as any).type, date: new Date(inc.created_at) })),
        ...(careLogs as any[]).map(log => ({ type: 'care' as const, content: log.notes || log.type, date: new Date(log.done_at) }))
    ], [weeklyPhotos, incidents, careLogs]);

    useEffect(() => {
        const fetchCaption = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase.functions.invoke('generate-weekly-caption', {
                    body: {
                        incidents: incidents.filter(i => new Date(i.created_at) >= subDays(new Date(), 7)),
                        careLogs,
                        photos: weeklyPhotos.map(p => ({ date: p.date })),
                        catProfile: dummyCat ? { name: dummyCat.name } : { name: '猫ちゃん' }
                    }
                });
                if (error) throw error;
                if (data?.caption) setAiCaption(data.caption);
            } catch {
                setAiCaption(generateWeeklyCaption(weeklyLogs));
            } finally {
                setIsAiLoading(false);
            }
        };
        if (dummyCat) fetchCaption();
    }, [weeklyLogs, incidents, careLogs, weeklyPhotos, dummyCat]);

    // ── Date range display ──
    const dateRangeDisplay = useMemo(() => {
        if (weeklyPhotos.length > 0) {
            const ts = weeklyPhotos.map(x => new Date(x.date).getTime()).filter(t => !isNaN(t));
            if (ts.length > 0) {
                const minD = new Date(Math.min(...ts));
                const maxD = new Date(Math.max(...ts));
                return minD.toDateString() === maxD.toDateString()
                    ? format(minD, "yyyy.MM.dd")
                    : `${format(minD, "MMM dd")} – ${format(maxD, "dd, yyyy")}`;
            }
        }
        return weekKey;
    }, [weeklyPhotos, weekKey]);

    // ── Ambient color ──
    const [ambientColor, setAmbientColor] = useState("#C89386");
    useEffect(() => {
        if (!base64Photos[0]) return;
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            if (!ctx) return;
            c.width = 1; c.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            setAmbientColor(`rgb(${r},${g},${b})`);
        };
        img.src = base64Photos[0].url;
    }, [base64Photos]);

    // ── Readiness ──
    const [mounted, setMounted] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    useEffect(() => {
        if (!dummyCat) return;
        const photosReady = weeklyPhotos.length === 0 || base64Photos.length > 0;
        const captionReady = !isAiLoading;
        if (photosReady && captionReady) {
            const t = setTimeout(() => setReady(true), 400);
            return () => clearTimeout(t);
        }
    }, [dummyCat, weeklyPhotos.length, base64Photos.length, isAiLoading]);

    // ── Share / Export ──
    const handleShare = async () => {
        if (!exportRef.current) return;
        setIsSharing(true);
        setIsExporting(true);
        try {
            await new Promise(r => setTimeout(r, 800));
            const dataUrl = await toPng(exportRef.current, {
                quality: 0.95,
                pixelRatio: 2,
                cacheBust: true,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                }
            });
            if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 1000) {
                throw new Error("Generation failed");
            }
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `album-${weekKey}.png`, { type: "image/png" });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Weekly Album' });
                toast.success("シェアしました");
            } else {
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = `weekly-album-${weekKey}.png`;
                link.click();
                toast.success("画像を保存しました");
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                toast.error(`生成に失敗: ${err.message || 'Unknown'}`);
            }
        } finally {
            setIsSharing(false);
            setIsExporting(false);
        }
    };

    // ── Guards ──
    if (!mounted) return null;

    if (cats.length === 0 || !ready) {
        return (
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: '#2C2420',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <Loader2 style={{ width: 32, height: 32, color: '#C89386' }} className="animate-spin" />
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,245,238,0.5)', textTransform: 'uppercase' }}>
                        Creating...
                    </span>
                </div>
            </div>
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RENDER — Viewer (鑑賞画面)
    // Spec §8: 左上=戻る, 右上=共有, それ以外なし
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: '#2C2420',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* ── Top Bar: Back + Share ── */}
            {!isExporting && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '24px',
                        paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
                        pointerEvents: 'none',
                    }}
                >
                    {/* Back */}
                    <button
                        onClick={() => onClose?.()}
                        style={{
                            pointerEvents: 'auto',
                            width: 44, height: 44,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#4E342E',
                        }}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {/* Share — icon only */}
                    <button
                        onClick={handleShare}
                        disabled={isSharing || isAiLoading || (weeklyPhotos.length > 0 && base64Photos.length < weeklyPhotos.length)}
                        style={{
                            pointerEvents: 'auto',
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(12px)',
                            color: '#4E342E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            opacity: (isSharing || isAiLoading) ? 0.4 : 1,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {isSharing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Share2 size={18} />
                        )}
                    </button>
                </div>
            )}

            {/* ── Canvas Preview ── */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    /* Ensure preview doesn't collide with absolute top bar buttons */
                    paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                {/* Hidden export canvas (1:1 pixel) */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden' }}>
                    <div ref={exportRef} style={{ width: 1080, height: 1920 }}>
                        <StoryCoverView
                            photos={base64Photos}
                            aiCaption={aiCaption}
                            dateRange={dateRangeDisplay}
                            ambientColor={ambientColor}
                        />
                    </div>
                </div>

                {/* Visible preview: outer div = visual size, inner div = 1080×1920 scaled down */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                        width: Math.round(1080 * viewScale),
                        height: Math.round(1920 * viewScale),
                        overflow: 'hidden',
                        borderRadius: Math.round(32 * viewScale),
                        flexShrink: 0,
                    }}
                >
                    <div
                        style={{
                            width: 1080,
                            height: 1920,
                            transformOrigin: 'top left',
                            transform: `scale(${viewScale})`,
                        }}
                    >
                        <StoryCoverView
                            photos={weeklyPhotos}
                            aiCaption={aiCaption}
                            dateRange={dateRangeDisplay}
                            ambientColor={ambientColor}
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
