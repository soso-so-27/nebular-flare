"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { toPng } from "html-to-image";
import { Download, Heart, Utensils, PawPrint, Info, ShieldAlert, Phone, Cat as CatIcon, Sparkles, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SitterReportData, Cat } from "@/types";
import { getFullImageUrl } from "@/lib/utils";

interface SitterReportViewProps {
    cat: Cat;
    data: SitterReportData;
    onExport?: () => void;
}

const SectionHeader = ({ icon: Icon, title, color = "text-slate-900" }: { icon: any; title: string; color?: string }) => (
    <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-1.5 mb-3 mt-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className={`text-[11pt] font-black uppercase tracking-tight leading-none ${color}`}>{title}</h3>
    </div>
);

const HabitItem = ({ label }: { label: string }) => (
    <div className="flex items-start gap-2 mb-2">
        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
        <span className="text-[9.5pt] font-bold text-slate-700 leading-snug">{label}</span>
    </div>
);

export function SitterReportView({ cat, data, onExport }: SitterReportViewProps) {
    const reportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const availableWidth = width - 32;
            const a4Width = 794;
            if (availableWidth < a4Width) {
                setScale(availableWidth / a4Width);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleExport = async () => {
        if (!reportRef.current) return;
        try {
            const dataUrl = await toPng(reportRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                height: 1123,
                width: 794,
            });
            const link = document.createElement('a');
            link.download = `sitter-report-${cat.name}-${format(new Date(), 'yyyyMMdd')}.png`;
            link.href = dataUrl;
            link.click();
            onExport?.();
        } catch (error) {
            console.error('Failed to export report:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end pt-2">
                <Button onClick={handleExport} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-xl shadow-indigo-200 text-xs font-black italic">
                    <Download className="w-3.5 h-3.5" />
                    引継ぎシートを出力 (.PNG)
                </Button>
            </div>

            <div className="overflow-hidden pb-8 flex justify-center w-full">
                <div
                    style={{
                        height: `${297 * scale}mm`,
                        width: `${210 * scale}mm`,
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                        }}
                    >
                        <div
                            ref={reportRef}
                            className="bg-white text-slate-900 flex flex-col shrink-0 leading-normal"
                            style={{
                                width: '210mm',
                                height: '297mm',
                                padding: '15mm 15mm',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* --- HEADER --- */}
                            <div className="flex justify-between items-start mb-8 relative">
                                <div className="space-y-1">
                                    <h1 className="text-[22pt] font-black tracking-tighter leading-tight text-indigo-600 italic">CAT SITTING<br />TRANSFER SHEET</h1>
                                    <p className="text-[10pt] font-bold text-slate-400">猫ちゃんお世話引継ぎシート</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="w-[35mm] h-[35mm] rounded-full bg-slate-50 border-4 border-indigo-50 overflow-hidden shadow-inner">
                                        {cat.avatar ? (
                                            <img
                                                src={getFullImageUrl(cat.avatar)}
                                                alt=""
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                <CatIcon className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[16pt] font-black text-slate-900">{cat.name} 様</div>
                                        <div className="text-[9pt] font-bold text-slate-400">
                                            {cat.sex === 'male' ? 'オス' : 'メス'} / {cat.age}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -top-4 -left-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -z-10" />
                            </div>

                            <div className="grid grid-cols-2 gap-10 flex-1">
                                {/* LEFT COLUMN: CARE */}
                                <div className="space-y-8">
                                    {/* 1. Meals */}
                                    <section>
                                        <SectionHeader icon={Utensils} title="ごはんとおやつ" color="text-orange-500" />
                                        <div className="bg-orange-50/50 p-4 rounded-2xl space-y-3">
                                            <div>
                                                <label className="text-[8pt] font-black text-orange-400 uppercase tracking-widest">種類・量</label>
                                                <p className="text-[11pt] font-bold text-slate-800">{data.meals.type || '記載なし'} / {data.meals.amount || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-[8pt] font-black text-orange-400 uppercase tracking-widest">タイミング</label>
                                                <p className="text-[11pt] font-bold text-slate-800">{data.meals.frequency || '適宜'}</p>
                                            </div>
                                            {data.meals.notes && (
                                                <div className="border-t border-orange-100 pt-2">
                                                    <p className="text-[9pt] text-slate-600 italic">「{data.meals.notes}」</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* 2. Toilet */}
                                    <section>
                                        <SectionHeader icon={PawPrint} title="トイレ" color="text-blue-500" />
                                        <div className="space-y-3 pl-1">
                                            <div>
                                                <label className="text-[8pt] font-black text-slate-400 uppercase tracking-widest">癖・注意点</label>
                                                <p className="text-[10pt] font-bold text-slate-700">{data.toilet.habit_note || '特記なし'}</p>
                                            </div>
                                            <div>
                                                <label className="text-[8pt] font-black text-slate-400 uppercase tracking-widest">お掃除</label>
                                                <p className="text-[10pt] text-slate-600 leading-relaxed">{data.toilet.cleaning_instructions || 'いつも通りでOKです'}</p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* 3. Favorite Sports & Toys */}
                                    <section>
                                        <SectionHeader icon={Home} title="お気に入りの場所・遊び" color="text-emerald-500" />
                                        <div className="space-y-4 shadow-sm border border-slate-100 p-4 rounded-2xl">
                                            <div className="flex flex-wrap gap-2">
                                                {data.favorite_spots.map(s => (
                                                    <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9pt] font-black"># {s}</span>
                                                ))}
                                            </div>
                                            {data.favorite_toys.length > 0 && (
                                                <div className="pt-2">
                                                    <label className="text-[8pt] font-black text-slate-400 uppercase tracking-widest block mb-1">好きなおもちゃ</label>
                                                    <p className="text-[9pt] font-bold text-slate-700">{data.favorite_toys.join('、')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* RIGHT COLUMN: PERSONALITY & SAFETY */}
                                <div className="space-y-8">
                                    {/* 1. Personality extracted from Zukan */}
                                    <section className="bg-indigo-50/30 p-5 rounded-[32px] border border-indigo-100/50">
                                        <SectionHeader icon={Sparkles} title="AIが分析した性格と癖" color="text-indigo-600" />
                                        {data.highlight_habits.length > 0 ? (
                                            <div className="mt-2">
                                                {data.highlight_habits.map((h, i) => (
                                                    <HabitItem key={i} label={h} />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[9pt] text-slate-400 italic">データ収集中...</p>
                                        )}
                                        {data.personality_note && (
                                            <p className="text-[9pt] font-medium text-slate-600 leading-relaxed mt-4 pt-4 border-t border-indigo-100">
                                                {data.personality_note}
                                            </p>
                                        )}
                                    </section>

                                    {/* 2. Safety & Scary things */}
                                    <section>
                                        <SectionHeader icon={ShieldAlert} title="健康・安全上の注意" color="text-red-500" />
                                        <div className="space-y-4">
                                            {data.scary_things.length > 0 && (
                                                <div className="bg-red-50/50 p-4 rounded-2xl">
                                                    <label className="text-[8pt] font-black text-red-400 uppercase tracking-widest mb-1 block">苦手なもの</label>
                                                    <p className="text-[9.5pt] font-bold text-red-700">{data.scary_things.join('、')}</p>
                                                </div>
                                            )}
                                            {data.prohibited_items.length > 0 && (
                                                <div className="border-2 border-slate-900 p-4 rounded-2xl relative overflow-hidden">
                                                    <label className="text-[8pt] font-black text-white bg-slate-900 px-2 absolute top-0 left-0 rounded-br-lg uppercase tracking-widest">絶対ダメ！</label>
                                                    <p className="text-[10pt] font-black text-slate-900 mt-2">{data.prohibited_items.join('、')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* 3. Emergency Contact */}
                                    <section className="mt-auto">
                                        <SectionHeader icon={Phone} title="緊急連絡先" color="text-blue-600" />
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-4 border-2 border-blue-50 rounded-2xl bg-blue-50/10">
                                                <div className="text-[8pt] font-black text-blue-400 uppercase tracking-widest mb-1">かかりつけ動物病院</div>
                                                <div className="text-[11pt] font-black text-slate-800">{data.emergency_contacts.vet_name || '未記入'}</div>
                                                <div className="text-[10pt] font-bold text-blue-600 mt-1">{data.emergency_contacts.vet_phone || '-'}</div>
                                            </div>
                                            <div className="p-4 border-2 border-slate-50 rounded-2xl">
                                                <div className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">飼い主の連絡先</div>
                                                <div className="text-[10pt] font-black text-slate-800">{data.emergency_contacts.owner_emergency_phone || '-'}</div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="h-[12mm] mt-8 border-t border-slate-100 flex justify-between items-center text-[8pt] text-slate-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white font-black text-[10px] italic">N</div>
                                    <span>Nyaruhodo Transfer Report</span>
                                </div>
                                <span>Powered by AI Analysis</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
