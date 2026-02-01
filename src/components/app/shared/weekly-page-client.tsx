"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCatContext, useIncidentContext } from "@/store/app-store";
import { Incident } from "@/types";
import { createClient } from "@/lib/supabase";

import { useWeeklySummary } from "@/hooks/use-weekly-summary";
import { StoryCoverView } from "./story-cover-view";
import type { Cat, AlbumLayoutType } from "@/types";
import { format } from "date-fns";
import {
    X,
    Share2,
    Download,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Layout as LayoutIcon,
    History,
    Check,
    Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas"; // Switch to html2canvas
import { toast } from "sonner";

interface WeeklyPageClientProps {
    onClose?: () => void;
}

export function WeeklyPageClient({ onClose }: WeeklyPageClientProps) {
    const { cats } = useCatContext();
    const { incidents } = useIncidentContext();
    const dummyCat = cats[0];

    // Helper to get public URL
    const getPublicUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const supabase = createClient();
        const bucket = path.startsWith('cat-photos/') ? 'cat-images' : 'avatars';
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    };

    // Filter photos early to get count for hook
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
        return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [incidents]);

    const { layout, weekKey, updateLayout } = useWeeklySummary(dummyCat?.id, weeklyPhotos.length);
    const [isSharing, setIsSharing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [base64Photos, setBase64Photos] = useState<{ url: string; date: string }[]>([]);

    // Convert photos to Base64 for stable rendering
    useEffect(() => {
        const convertToBase64 = async () => {
            const results = await Promise.all(
                weeklyPhotos.map(async (photo) => {
                    try {
                        const response = await fetch(photo.url);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const blob = await response.blob();

                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        const imgUrl = URL.createObjectURL(blob);

                        return new Promise<{ url: string; date: string }>((resolve) => {
                            img.onload = () => {
                                URL.revokeObjectURL(imgUrl);

                                // Resize to 1000px max for better performance
                                const MAX_SIZE = 1000;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                    if (width > MAX_SIZE) {
                                        height *= MAX_SIZE / width;
                                        width = MAX_SIZE;
                                    }
                                } else {
                                    if (height > MAX_SIZE) {
                                        width *= MAX_SIZE / height;
                                        height = MAX_SIZE;
                                    }
                                }

                                const canvas = document.createElement("canvas");
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext("2d");
                                if (!ctx) {
                                    resolve(photo);
                                    return;
                                }

                                ctx.drawImage(img, 0, 0, width, height);
                                const base64 = canvas.toDataURL("image/jpeg", 0.85);
                                resolve({ url: base64, date: photo.date });
                            };
                            img.onerror = () => {
                                URL.revokeObjectURL(imgUrl);
                                resolve(photo);
                            };
                            img.src = imgUrl;
                        });
                    } catch (error: any) {
                        return photo;
                    }
                })
            );
            setBase64Photos(results);
        };
        if (weeklyPhotos.length > 0) {
            convertToBase64();
        }
    }, [weeklyPhotos]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!dummyCat || !mounted) return null;

    // --- MANUAL CANVAS DRAWING ---
    const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    };

    const drawAlbumToCanvas = async (canvas: HTMLCanvasElement, photos: { url: string; date: string }[], dateDisplay: string) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");

        const loadedImgs = await Promise.all(photos.slice(0, 9).map(p => {
            return new Promise<HTMLImageElement | null>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => {
                    resolve(null);
                };
                img.src = p.url;
            });
        }));

        // Dimensions: 1080x1920
        // 1. Background (Radial Gradient)
        const grad = ctx.createRadialGradient(540, 960, 0, 540, 960, 1100);
        grad.addColorStop(0, '#FDFDFD');
        grad.addColorStop(1, '#F5F6F7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        // 2. Card Background & Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.05)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;
        ctx.fillStyle = 'white';
        drawRoundRect(ctx, 60, 140, 960, 1540, 32);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // 2b. Card Border
        ctx.strokeStyle = 'rgba(0,0,0,0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3. Header Text
        ctx.fillStyle = '#1A1A1A';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        // Font fallback for Safari
        const fontSans = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

        ctx.font = `500 42px ${fontSans}`;
        ctx.fillText("今週のアルバム", 60 + 48 + 8, 140 + 48);

        ctx.fillStyle = 'rgba(26,26,26,0.6)';
        ctx.font = `500 24px ${fontSans}`;
        ctx.fillText(dateDisplay, 60 + 48 + 8, 140 + 48 + 42 + 14);

        // 4. Photos
        const photoAreaY = 140 + 48 + 42 + 14 + 24 + 48;
        const photoAreaH = 1540 - (48 * 2 + 42 + 14 + 24 + 48 + 60); // 60 for signature
        const cardStartX = 60 + 48;
        const cardInnerWidth = 960 - 48 * 2;

        const drawPhoto = (img: HTMLImageElement | null, x: number, y: number, w: number, h: number) => {
            if (!img) {
                ctx.fillStyle = '#F9F9F9';
                drawRoundRect(ctx, x, y, w, h, 18);
                ctx.fill();
                return;
            }
            ctx.save();
            drawRoundRect(ctx, x, y, w, h, 18);
            ctx.clip();

            const imgW = img.width;
            const imgH = img.height;
            const targetRatio = w / h;
            const imgRatio = imgW / imgH;

            let drawW, drawH, drawX, drawY;
            if (imgRatio > targetRatio) {
                drawH = h;
                drawW = h * imgRatio;
                drawX = x - (drawW - w) / 2;
                drawY = y;
            } else {
                drawW = w;
                drawH = w / imgRatio;
                drawX = x;
                drawY = y - (drawH - h) * 0.28; // Focus top
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();

            // Photo border
            ctx.strokeStyle = 'rgba(0,0,0,0.03)';
            ctx.lineWidth = 1;
            drawRoundRect(ctx, x, y, w, h, 18);
            ctx.stroke();
        };

        const activeLayout = photos.length >= 8 ? 'C' : photos.length >= 5 ? 'B' : 'A';

        if (activeLayout === 'A') {
            const gap = 12;
            const w = (cardInnerWidth - gap) / 2;
            const h = (photoAreaH - gap) / 2;
            for (let i = 0; i < 4; i++) {
                const col = i % 2;
                const row = Math.floor(i / 2);
                drawPhoto(loadedImgs[i], cardStartX + col * (w + gap), photoAreaY + row * (h + gap), w, h);
            }
        } else if (activeLayout === 'B') {
            const gap = 14;
            const heroW = cardInnerWidth * 0.6;
            const restW = cardInnerWidth * 0.4 - gap;
            drawPhoto(loadedImgs[0], cardStartX, photoAreaY, heroW, photoAreaH);

            const rows = photos.length > 5 ? 3 : 2;
            const cellW = (restW - gap) / 2;
            const cellH = (photoAreaH - gap * (rows - 1)) / rows;
            for (let i = 0; i < rows * 2; i++) {
                const col = i % 2;
                const row = Math.floor(i / 2);
                drawPhoto(loadedImgs[i + 1], cardStartX + heroW + gap + col * (cellW + gap), photoAreaY + row * (cellH + gap), cellW, cellH);
            }
        } else {
            const gap = 10;
            const w = (cardInnerWidth - gap * 2) / 3;
            const h = (photoAreaH - gap * 2) / 3;
            for (let i = 0; i < 9; i++) {
                const col = i % 3;
                const row = Math.floor(i / 3);
                drawPhoto(loadedImgs[i], cardStartX + col * (w + gap), photoAreaY + row * (h + gap), w, h);
            }
        }

        // 5. Signature
        ctx.fillStyle = 'rgba(26,26,26,0.3)';
        ctx.textAlign = 'right';
        ctx.font = `bold 14px ${fontSans}`;
        ctx.fillText("NYARUHD", 1080 - 60 - 48 - 8, 1920 - 240 - 48 - 30);
        ctx.font = `italic 11px ${fontSans}`;
        ctx.fillText("Weekly Journal", 1080 - 60 - 48 - 8, 1920 - 240 - 48 - 10);
    };

    const handleShare = async () => {
        const dateRangeDisplay = (() => {
            const p = weeklyPhotos;
            if (p.length > 0) {
                const ts = p.map(x => new Date(x.date).getTime()).filter(t => !isNaN(t));
                if (ts.length > 0) {
                    const minD = new Date(Math.min(...ts));
                    const maxD = new Date(Math.max(...ts));
                    return minD.toDateString() === maxD.toDateString()
                        ? format(minD, "yyyy.MM.dd")
                        : `${format(minD, "yyyy.MM.dd")} – ${format(maxD, "MM.dd")}`;
                }
            }
            return weekKey;
        })();

        setIsSharing(true);
        setIsExporting(true);
        try {
            // Extended delay for Safari to settle Base64 rendering
            await new Promise(r => setTimeout(r, 600));

            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1920;

            await drawAlbumToCanvas(canvas, base64Photos.length > 0 ? base64Photos : weeklyPhotos, dateRangeDisplay);

            const dataUrl = canvas.toDataURL("image/png");

            // MANUAL BASE64 TO BLOB (Avoids Safari fetch hang)
            const parts = dataUrl.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);
            for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }
            const blob = new Blob([uInt8Array], { type: contentType });

            const file = new File([blob], `album-${weekKey}.png`, { type: "image/png" });

            // Web Share API
            if (navigator.share && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Weekly Album',
                        text: '今週のアルバムをシェアします！'
                    });
                    toast.success("シェアしました");
                } catch (shareError: any) {
                    // Share aborted by user or other error
                }
            } else {
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = `weekly-album-${weekKey}.png`;
                link.click();
                toast.success("画像を保存しました");
            }

        } catch (error: any) {
            toast.error("画像の生成に失敗しました");
        } finally {
            setIsSharing(false);
            setIsExporting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-[#18181B] flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
                <button
                    onClick={onClose}
                    className="pointer-events-auto bg-white/10 backdrop-blur-xl transition-all active:scale-95 text-white rounded-full p-2.5 border border-white/10"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            {/* Main Content: Scaled Preview */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-[env(safe-area-inset-top)_40px_env(safe-area-inset-bottom)_40px] relative">
                <div
                    id="preview-card"
                    className="flex-shrink-0 shadow-[0_40px_100px_rgba(0,0,0,0.5)] bg-[#F8F9FA] rounded-[32px] overflow-hidden"
                    style={{
                        width: '1080px',
                        height: '1920px',
                        transform: `scale(${Math.min(0.45, (window.innerHeight * 0.72) / 1920)})`,
                        transformOrigin: 'center center',
                    }}
                >
                    <StoryCoverView
                        cat={{ ...dummyCat, name: "FAMILY MEMORIES" }}
                        weekKey={weekKey}
                        layout={layout}
                        photos={base64Photos.length > 0 ? base64Photos : weeklyPhotos}
                        forExport={isExporting}
                    />
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-12 inset-x-8 z-20">
                <Button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full bg-white text-black font-black text-lg h-20 rounded-[1.5rem] shadow-2xl shadow-black/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isSharing ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>GENERATING...</span>
                        </>
                    ) : (
                        <>
                            <Share2 className="w-6 h-6" />
                            <span>SAVE & SHARE</span>
                        </>
                    )}
                </Button>
            </div>
        </div>,
        document.body
    );
}
