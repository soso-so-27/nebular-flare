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
import { format, startOfDay, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { generateWeeklyCaption, LogItem } from "@/lib/ai-album-helper";
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
    const [showControls, setShowControls] = useState(true);

    // Auto-hide controls timer
    useEffect(() => {
        if (!showControls || isSharing) return;
        const timer = setTimeout(() => setShowControls(false), 3500);
        return () => clearTimeout(timer);
    }, [showControls, isSharing]);

    const revealControls = () => setShowControls(true);

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

                                // Resize for mobile performance (Production Rescue Vol. 16)
                                const MAX_SIZE = 800;
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
                                const base64 = canvas.toDataURL("image/jpeg", 0.75); // Lower quality for memory
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
        console.info("[WeeklyPageClient] Component mounted. Cats:", cats.length);
        setMounted(true);
        return () => {
            console.info("[WeeklyPageClient] Component unmounted.");
            setMounted(false);
        };
    }, [cats.length]);

    // --- DATA GATHERING FOR AI ---
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

    const aiCaption = useMemo(() => {
        const logs: LogItem[] = [
            ...weeklyPhotos.map(p => ({ type: 'incident' as const, content: p.date, date: new Date(p.date) })),
            ...incidents.filter(inc => {
                const now = new Date();
                const sevenDaysAgo = subDays(now, 7);
                return new Date(inc.created_at) >= sevenDaysAgo;
            }).map(inc => ({ type: 'incident' as const, content: inc.note || (inc as any).type, date: new Date(inc.created_at) })),
            ...(careLogs as any[]).map(log => ({ type: 'care' as const, content: log.notes || log.type, date: new Date(log.done_at) }))
        ];
        return generateWeeklyCaption(logs);
    }, [weeklyPhotos, incidents, careLogs]);

    const dateRangeDisplay = useMemo(() => {
        const p = weeklyPhotos;
        if (p.length > 0) {
            const ts = p.map(x => new Date(x.date).getTime()).filter(t => !isNaN(t));
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

    // Vol. 10: Dynamic Color Extraction (Smart Color Sync)
    const [ambientColor, setAmbientColor] = useState("#C89386"); // Default peach highlight
    useEffect(() => {
        if (base64Photos[0]) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                canvas.width = 1; canvas.height = 1;
                ctx.drawImage(img, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                setAmbientColor(`rgb(${r}, ${g}, ${b})`);
            };
            img.src = base64Photos[0].url;
        }
    }, [base64Photos]);

    // --- PRODUCTION GUARD: Don't return null too early ---
    if (!mounted) return null;

    // Use loading state if cats aren't ready yet (Production fix: NO PORTAL)
    if (cats.length === 0) {
        return (
            <div className="fixed inset-0 z-[999999] bg-[#F5F5F4] flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#4E342E]/20" />
                    <p className="text-[10px] font-black tracking-widest text-[#4E342E]/30 uppercase">Initializing Album...</p>
                </div>
            </div>
        );
    }

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

    const drawAlbumToCanvas = async (canvas: HTMLCanvasElement, photos: { url: string; date: string }[], dateDisplay: string, aiCaption: string, weekKey: string, ambientColor: string) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");

        const loadedImgs = await Promise.all(photos.slice(0, 7).map(p => {
            return new Promise<HTMLImageElement | null>((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = p.url;
            });
        }));

        const fontSans = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

        // 1. Wallpaper (Radial Gradient with Vol. 10 Ambient Color)
        const grad = ctx.createRadialGradient(800, 200, 0, 800, 200, 1500);
        grad.addColorStop(0, '#FEFDFB');
        grad.addColorStop(1, '#F5E6D3');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        // Vol. 10: Analog Noise Simulation
        ctx.save();
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * 1080;
            const y = Math.random() * 1920;
            ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.restore();

        // 2. Week Watermark (NEW in Vol. 8)
        const weekNum = weekKey.split('-').pop() || '';
        ctx.save();
        ctx.fillStyle = '#4E342E';
        ctx.globalAlpha = 0.02;
        ctx.font = `900 320px ${fontSans}`;
        ctx.textAlign = 'center';
        ctx.fillText(weekNum, 540, 950);
        ctx.restore();

        // 3. iPhone Bezel
        ctx.fillStyle = '#040404';
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        drawRoundRect(ctx, 24, 24, 1032, 1872, 164);
        ctx.fill();
        ctx.stroke();

        // 4. Screen Area
        ctx.save();
        drawRoundRect(ctx, 48, 48, 984, 1824, 140);
        ctx.clip();

        const sGrad = ctx.createRadialGradient(800, 200, 0, 800, 200, 1500);
        sGrad.addColorStop(0, `${ambientColor}1A`); // Vol. 10: Dynamic Ambiance (10% opacity)
        sGrad.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = sGrad;
        ctx.fillRect(48, 48, 984, 1824);

        // Header
        ctx.fillStyle = '#4E342E';
        ctx.textAlign = 'center';
        ctx.font = `900 12px ${fontSans}`;
        ctx.globalAlpha = 0.3;
        ctx.fillText("WEEKLY JOURNAL", 540, 180);
        ctx.globalAlpha = 1.0;
        ctx.font = `900 52px ${fontSans}`;
        ctx.fillText("今週のアルバム", 540, 260);

        ctx.fillStyle = '#C89386'; // Peach color for line
        ctx.globalAlpha = 0.2;
        ctx.fillRect(540 - 24, 290, 48, 2);

        ctx.fillStyle = '#4E342E';
        ctx.globalAlpha = 0.4;
        ctx.font = `900 22px ${fontSans}`;
        ctx.fillText(dateDisplay.toUpperCase(), 540, 335);
        ctx.globalAlpha = 1.0;

        // Photo Bento Grid (Vol. 8: Adjusted to push bottom down)
        const gridX = 48 + 48;
        const gridY = 410;
        const gridW = 984 - 96;
        const gridH = 920;
        const gap = 12;

        const drawPhoto = (img: HTMLImageElement | null, x: number, y: number, w: number, h: number, r: number = 32) => {
            if (!img) {
                ctx.fillStyle = 'rgba(78,52,46,0.02)';
                drawRoundRect(ctx, x, y, w, h, r);
                ctx.fill();
                return;
            }
            ctx.save();
            drawRoundRect(ctx, x, y, w, h, r);
            ctx.clip();
            const imgW = img.width;
            const imgH = img.height;
            const targetRatio = w / h;
            const imgRatio = imgW / imgH;
            let dW, dH, dX, dY;
            if (imgRatio > targetRatio) {
                dH = h; dW = h * imgRatio; dX = x - (dW - w) / 2; dY = y;
            } else {
                dW = w; dH = w / imgRatio; dX = x; dY = y - (dH - h) * 0.28;
            }
            ctx.drawImage(img, dX, dY, dW, dH);
            ctx.restore();
        };

        const heroW = (gridW - gap * 2) * (4 / 6) + gap;
        const heroH = (gridH - gap * 2) * (3 / 4) + gap;
        drawPhoto(loadedImgs[0], gridX, gridY, heroW, heroH, 34);

        const sideW = (gridW - heroW - gap);
        const sideH = (heroH - gap * 2) / 3;
        for (let i = 0; i < 3; i++) {
            drawPhoto(loadedImgs[i + 1], gridX + heroW + gap, gridY + i * (sideH + gap), sideW, sideH, 24);
        }

        const botW = (gridW - gap * 2) / 3;
        const botH = (gridH - heroH - gap);
        for (let i = 0; i < 3; i++) {
            drawPhoto(loadedImgs[i + 4], gridX + i * (botW + gap), gridY + heroH + gap, botW, botH, 24);
        }

        // Caption Section (Vol. 10: Glassmorphism Simulation)
        const capY = 1420;
        ctx.shadowColor = 'rgba(78,52,46,0.12)';
        ctx.shadowBlur = 100;
        ctx.shadowOffsetY = 40;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // 70% opacity for glass look
        drawRoundRect(ctx, 48 + 48, capY, 984 - 96, 350, 52);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Glass border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tape Accent
        ctx.fillStyle = '#C89386';
        ctx.globalAlpha = 0.1;
        ctx.save();
        ctx.translate(gridX + gridW - 80, capY + 40);
        ctx.rotate(-12 * Math.PI / 180);
        ctx.fillRect(0, 0, 60, 25);
        ctx.restore();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = '#4E342E';
        ctx.font = `900 10px ${fontSans}`;
        ctx.globalAlpha = 0.3;
        ctx.textAlign = 'left';
        ctx.fillText("WEEKLY WORD", 48 + 48 + 40, capY + 60);
        ctx.globalAlpha = 1.0;

        // Vol. 9: Use Serif for Japanese Text
        const fontSerif = 'serif, "MS Mincho", "Hiragino Mincho ProN"';
        ctx.font = `italic 500 30px ${fontSerif}`;

        const words = aiCaption.split('');
        let line = '';
        let currentY = capY + 115;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 700 && n > 0) {
                ctx.fillText(line, 48 + 48 + 40, currentY);
                line = words[n];
                currentY += 45;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 48 + 48 + 40, currentY);

        ctx.fillStyle = '#4E342E';
        ctx.globalAlpha = 0.2;
        ctx.font = `900 14px ${fontSans}`;
        ctx.fillText("JOURNAL SIGNATURE", 48 + 48 + 40, capY + 290);
        ctx.globalAlpha = 1.0;

        // Dynamic Island
        ctx.fillStyle = 'black';
        drawRoundRect(ctx, 540 - 60, 96, 120, 36, 18);
        ctx.fill();

        ctx.restore();
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

            await drawAlbumToCanvas(canvas, base64Photos.length > 0 ? base64Photos : weeklyPhotos, dateRangeDisplay, aiCaption, weekKey, ambientColor);

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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[2147483647] bg-[#F5F5F4] flex flex-col items-center overflow-hidden"
            onMouseMove={revealControls}
            onClick={revealControls}
            onTouchStart={revealControls}
        >
            {/* Top Navigation: Ghost Placement (Top-Left Corner + Safe Area) */}
            <AnimatePresence>
                {showControls && !isExporting && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute z-50 pointer-events-none"
                        style={{
                            top: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
                            left: 'calc(1.5rem + env(safe-area-inset-left, 0px))'
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                            className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white backdrop-blur-xl transition-all active:scale-90 text-[#4E342E]/70 hover:text-[#4E342E] rounded-full border border-white shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Immersive Preview Arc: Focused on the Masterpiece */}
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.35 }}
                    animate={{
                        opacity: 1,
                        scale: isExporting ? 1.0 : Math.min(0.42, (window.innerHeight * 0.68) / 1920),
                        y: isExporting ? 0 : -10
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 35, delay: 0.2 }}
                    className="flex-shrink-0 origin-center relative"
                    style={{
                        width: '1080px',
                        height: '1920px',
                        filter: isExporting ? 'none' : 'drop-shadow(0 80px 120px rgba(78,52,46,0.12))'
                    }}
                >
                    <StoryCoverView
                        cat={dummyCat}
                        weekKey={weekKey}
                        layout={layout}
                        photos={base64Photos.length > 0 ? base64Photos : weeklyPhotos}
                        forExport={isExporting}
                        aiCaption={aiCaption}
                        dateRange={dateRangeDisplay}
                        ambientColor={ambientColor}
                    />
                </motion.div>
            </div>

            {/* Ghost Tactile Button: Floating Corner (Bottom-Right + Safe Area) */}
            <AnimatePresence>
                {showControls && !isExporting && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 pointer-events-none"
                        style={{
                            bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                            right: 'calc(1.5rem + env(safe-area-inset-right, 0px))'
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); handleShare(); }}
                            disabled={isSharing || (weeklyPhotos.length > 0 && base64Photos.length === 0)}
                            className="pointer-events-auto group bg-[#4E342E] hover:bg-[#5D4037] px-8 h-11 rounded-full shadow-[0_20px_40px_rgba(78,52,46,0.2)] active:scale-[0.96] transition-all flex items-center gap-4 disabled:opacity-30 border border-white/10"
                        >
                            {isSharing ? (
                                <Loader2 className="w-4 h-4 animate-spin text-brand-peach" />
                            ) : (
                                <Share2 className="w-4 h-4 text-brand-peach group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-[13px] font-black tracking-[0.2em] text-white/95 group-hover:text-white transition-colors uppercase font-sans">
                                {isSharing ? "Processing..." : "Save & Share"}
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
