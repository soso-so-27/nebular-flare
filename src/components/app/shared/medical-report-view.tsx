"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toPng } from "html-to-image";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Cat, Incident, ReportConfigData, TodayStatusLevel } from "@/types";
import { WeightChart } from "./weight-chart";
import { getFullImageUrl } from "@/lib/utils";

interface MedicalReportViewProps {
    cat: Cat;
    config: ReportConfigData;
    incidents: Incident[];
    onExport?: () => void;
}

const MEDICAL_INCIDENT_TYPES = ['hospital', 'medicine', 'care', 'condition'];

const STATUS_DISPLAY: Record<TodayStatusLevel, { label: string; symbol: string; color: string }> = {
    normal: { label: '正常', symbol: '○', color: 'text-slate-800' },
    slightly_bad: { label: '軽異', symbol: '△', color: 'text-slate-600' },
    bad: { label: '異常', symbol: '×', color: 'text-slate-900' },
    unknown: { label: '不明', symbol: '-', color: 'text-slate-400' },
};

const SectionHeader = ({ title, subTitle }: { title: string; subTitle?: string }) => (
    <div className="border-b border-slate-900 pb-1 mb-3">
        <h3 className="text-[12pt] font-black uppercase tracking-tight leading-none text-slate-900">{title}</h3>
        {subTitle && <p className="text-[7pt] font-black text-slate-400 mt-1 uppercase tracking-widest">{subTitle}</p>}
    </div>
);

const STOOL_TYPE_MAP: Record<string, string> = {
    'normal': '正常',
    'soft': '軟便',
    'diarrhea': '下痢',
    'hard': '硬便',
    'constipation': '便秘',
};

const INCIDENT_TYPE_MAP: Record<string, string> = {
    'hospital': '通院',
    'medicine': '投薬',
    'care': 'ケア',
    'condition': '体調',
};

const MetaLabel = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col">
        <span className="text-[8pt] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">{label}</span>
        <span className="text-[10pt] font-bold text-slate-800 leading-tight border-l-2 border-slate-100 pl-2">{value}</span>
    </div>
);

const VitalRow = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
    <tr className="border-b border-slate-100 last:border-0">
        <td className="py-2.5 text-[9pt] font-black text-slate-400 w-24 uppercase tracking-tighter">{label}</td>
        <td className="py-2.5 text-[10pt] font-black text-slate-800 text-right">
            {value}
            {unit && <span className="text-[8pt] ml-0.5 text-slate-400 font-bold">{unit}</span>}
        </td>
    </tr>
);

export function MedicalReportView({ cat, config, incidents, onExport }: MedicalReportViewProps) {
    const reportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const availableWidth = width - 32;
            const a4Width = 794; // 210mm @ 96dpi
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
            link.download = `medical-report-${cat.name}-${format(new Date(), 'yyyyMMdd')}.png`;
            link.href = dataUrl;
            link.click();
            onExport?.();
        } catch (error) {
            console.error('Failed to export report:', error);
        }
    };

    // --- Helper Logic for Content ---

    // 1. History (Max 3 items, Vitals excluded usually? No, "Medical Events")
    // Filter out simple "check-ins" if needed, or keep all.
    const historyItems = [...incidents]
        .filter(i => MEDICAL_INCIDENT_TYPES.includes(i.type))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3); // Max 3

    // 2. Abnormal Media (Max 2)
    // Priority: Ingestion/Foreign > Blood > Diarrhea > Respiratory > Injury
    const mediaIncidents = [...incidents]
        .filter(i => i.photos && i.photos.length > 0)
        .sort((a, b) => {
            // Severity Check
            const score = (inc: Incident) => {
                let s = 0;
                if (inc.severity === 'high') s += 10;
                if (inc.type === 'vomit' && inc.note.includes('異物')) s += 5;
                if (inc.note.includes('血')) s += 4;
                if (inc.type === 'diarrhea') s += 3;
                return s;
            };
            return score(b) - score(a);
        })
        .slice(0, 2); // Max 2

    // 3. Ongoing Meds (Max 2)
    const medIncidents = incidents.filter(i => i.type === 'medicine').slice(0, 2);

    return (
        <div className="space-y-6">
            <div className="flex justify-end pt-2">
                <Button onClick={handleExport} className="gap-2 bg-black hover:bg-slate-900 text-white rounded-full px-6 shadow-xl shadow-black/20 text-xs font-black italic">
                    <Download className="w-3.5 h-3.5" />
                    A4レポートを出力 (.PNG)
                </Button>
            </div>

            {/* A4 Report Wrapper - Scaled for Mobile Preview */}
            <div className="overflow-hidden pb-8 flex justify-center w-full">
                {/* 1. Outer Frame: Holds the SCALED space in the DOM flow */}
                <div
                    style={{
                        height: `${297 * scale}mm`,
                        width: `${210 * scale}mm`,
                        position: 'relative',
                    }}
                >
                    {/* 2. Visual Scaler: Applies the scale transform */}
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                        }}
                    >
                        {/* 3. Export Target: Clean A4 size, NO transform on this element */}
                        <div
                            ref={reportRef}
                            className="bg-white text-slate-900 flex flex-col shrink-0 leading-normal"
                            style={{
                                width: '210mm',
                                height: '297mm',
                                padding: '15mm 12mm',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* --- HEADER (16mm) --- */}
                            <div className="h-[16mm] flex justify-between items-end border-b border-slate-900 pb-2 mb-[4mm]">
                                <div>
                                    <h1 className="text-[13pt] font-black tracking-tighter leading-none mb-1 text-slate-900">診療情報提供書</h1>
                                    <p className="text-[9pt] font-medium text-slate-400">獣医療向け記録 | 生成ログ</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9pt] font-bold text-slate-700">発行: {format(new Date(), 'yyyy/MM/dd HH:mm')}</span>
                                </div>
                            </div>

                            {/* --- MAIN GRID (2 Columns) --- */}
                            <div className="grid grid-cols-[64mm_116mm] gap-[6mm] flex-1 min-h-0">

                                {/* === LEFT COLUMN (64mm) === */}
                                <div className="flex flex-col gap-[4mm]">

                                    {/* 1. Profile (Mini Table) */}
                                    <div className="border-b border-slate-200 pb-2">
                                        <div className="flex gap-3 mb-2">
                                            {/* Photo 28mm */}
                                            <div className="w-[28mm] h-[28mm] bg-slate-100 border border-slate-200 shrink-0 overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                {cat.avatar ? (
                                                    <img
                                                        src={getFullImageUrl(cat.avatar)}
                                                        alt=""
                                                        crossOrigin="anonymous"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">🐈</div>
                                                )}
                                            </div>
                                            {/* Basic Info */}
                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="text-[14pt] font-black leading-tight mb-1">{cat.name}</div>
                                                <div className="text-[9pt] font-bold text-slate-600">
                                                    {cat.birthday ? `${format(new Date(cat.birthday), 'yyyy/MM/dd')}` : ''}
                                                    {/* Age Calc could go here */}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Profile Table */}
                                        <table className="w-full text-[9pt] border-collapse">
                                            <tbody>
                                                <tr className="border-b border-slate-100">
                                                    <th className="text-left font-normal text-slate-400 py-1 w-12">性別</th>
                                                    <td className="font-bold py-1">
                                                        {cat.sex === 'male' ? 'オス' : cat.sex === 'female' ? 'メス' : '不明'}
                                                        <span className="ml-2 text-[8pt] font-normal text-slate-400">
                                                            ({cat.neutered_status === 'neutered' ? '去勢済' : '未去勢'})
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr className="border-b border-slate-100">
                                                    <th className="text-left font-normal text-slate-400 py-1">環境</th>
                                                    <td className="font-bold py-1">
                                                        {cat.living_environment === 'indoor' ? '完全室内' : '室外あり'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <th className="text-left font-normal text-slate-400 py-1">体重</th>
                                                    <td className="font-bold py-1 text-[11pt]">
                                                        {cat.weight}kg
                                                        <span className="ml-2 text-[8pt] font-normal text-slate-400">
                                                            ({format(new Date(), 'MM/dd')})
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* 2. Vitals (Table Order: Time -> Details) */}
                                    <div className="border-b border-slate-200 pb-2">
                                        <h3 className="text-[10pt] font-black mb-1">バイタルサイン</h3>
                                        <table className="w-full text-[9pt] border-collapse">
                                            <tbody>
                                                <VitalRow label="体温" value={config.vital_summary.temperature_c || '-'} unit="℃" />
                                                <VitalRow label="最終排尿" value={config.vital_summary.last_urination_at || '不明'} />
                                                <VitalRow label="排尿状態" value={config.vital_summary.urination_flags?.length ? config.vital_summary.urination_flags.join(', ') : (config.vital_summary.urine ? '特記なし' : 'なし')} />
                                                <VitalRow label="最終排便" value={config.vital_summary.last_defecation_at || '不明'} />
                                                <VitalRow label="便性状" value={STOOL_TYPE_MAP[config.vital_summary.stool_type || ''] || '-'} />
                                                <VitalRow label="最終摂食" value={`${config.vital_summary.last_meal_at || '不明'} (${config.vital_summary.food_intake_ratio}%)`} />
                                                <VitalRow label="嘔吐" value={`${config.vital_summary.vomit_count}回`} unit={config.vital_summary.vomit_content ? `(${VOMIT_CONTENTS.find(v => v.value === config.vital_summary.vomit_content)?.label})` : ''} />
                                                <VitalRow label="飲水" value={config.vital_summary.water_intake_level === 'high' ? '多飲' : config.vital_summary.water_intake_level === 'low' ? '減少' : '普通'} />
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* 3. General Status (Compressed) */}
                                    <div>
                                        <h3 className="text-[10pt] font-black mb-1">全身状態</h3>
                                        <div className="text-[9pt] leading-relaxed border border-slate-200 p-2 bg-slate-50">
                                            {/* One line if possible */}
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                <span>食欲: {config.today_status.appetite === 'normal' ? '●正常' : '▲低下'}</span>
                                                <span>元気: {config.today_status.energy === 'normal' ? '●正常' : '▲低下'}</span>
                                                <span>排泄: {config.today_status.excretion === 'normal' ? '●正常' : '▲異常'}</span>
                                                <span>飲水: {config.today_status.hydration === 'normal' ? '●正常' : '▲異常'}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* === RIGHT COLUMN (116mm) === */}
                                <div className="flex flex-col h-full relative">

                                    {/* 1. Chief Complaint (Max 55mm) */}
                                    <div className="border border-slate-900 p-4 mb-[4mm] min-h-[40mm] max-h-[55mm] overflow-hidden relative">
                                        <h3 className="text-[11pt] font-black mb-2">主訴・特記事項</h3>
                                        <p className="text-[10.5pt] font-bold leading-relaxed line-clamp-3">
                                            {config.chief_complaint || '特記事項なし'}
                                        </p>
                                        <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[8pt] text-slate-500 border-t border-slate-100 pt-2 mt-4">
                                            <span>発症: {config.onset ? format(new Date(config.onset), 'MM/dd HH:mm') : '不明'}</span>
                                            <span>最終正常: {config.last_normal ? format(new Date(config.last_normal), 'MM/dd HH:mm') : '不明'}</span>
                                        </div>
                                    </div>

                                    {/* 2. History (Variable, Shrink if empty) */}
                                    <div className="mb-[4mm]">
                                        <h3 className="text-[10pt] font-black mb-1 bg-slate-100 px-2 py-0.5 inline-block">経過記録</h3>
                                        {historyItems.length > 0 ? (
                                            <table className="w-full text-left border-collapse mt-1">
                                                <thead className="border-b border-slate-200">
                                                    <tr className="text-[8pt] text-slate-500">
                                                        <th className="py-1 w-14 font-normal">日付</th>
                                                        <th className="py-1 w-16 font-normal">種別</th>
                                                        <th className="py-1 font-normal">内容</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historyItems.map(item => (
                                                        <tr key={item.id} className="border-b border-slate-100 text-[9pt]">
                                                            <td className="py-1.5 font-mono">{format(new Date(item.created_at), 'MM/dd')}</td>
                                                            <td className="py-1.5 text-[8pt]">{INCIDENT_TYPE_MAP[item.type] || item.type}</td>
                                                            <td className="py-1.5 font-bold truncate max-w-[50mm]">{item.note}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-[9pt] text-slate-400 py-1">記録なし</p>
                                        )}
                                    </div>

                                    {/* 3. Bottom Variable Area (Fills remaining) */}
                                    <div className="flex-1 min-h-0 flex flex-col justify-end gap-[4mm]">

                                        {/* Media (If High Priority) */}
                                        {(config.has_ingestion_suspicion || mediaIncidents.length > 0) && (
                                            <div className="flex gap-4">
                                                {mediaIncidents.map((inc, i) => (
                                                    <div key={inc.id} className="w-[45mm] flex flex-col gap-1">
                                                        <div className="w-[45mm] h-[45mm] bg-black/5 border border-slate-200 overflow-hidden relative">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={getFullImageUrl(inc.photos[0])}
                                                                className="w-full h-full object-cover"
                                                                alt=""
                                                                crossOrigin="anonymous"
                                                            />
                                                            {inc.type === 'vomit' && <span className="absolute top-1 left-1 bg-red-600 text-white text-[7pt] px-1 font-bold">嘔吐</span>}
                                                        </div>
                                                        <p className="text-[8pt] leading-tight line-clamp-2 text-slate-600">
                                                            {format(new Date(inc.created_at), 'MM/dd HH:mm')} {inc.note}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Medication */}
                                        {medIncidents.length > 0 && (
                                            <div className="border border-slate-200 p-2 bg-slate-50">
                                                <h4 className="text-[8pt] font-black text-slate-500 uppercase mb-1">投薬中</h4>
                                                {medIncidents.map(m => (
                                                    <div key={m.id} className="text-[9pt] font-bold">・{m.note}</div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Weight Chart (Bottom Right, Fixed Height 38mm) */}
                                        <div className="h-[38mm] w-full border border-slate-100 relative">
                                            <div className="absolute top-1 left-2 z-10 text-[8pt] font-bold text-slate-400">体重推移</div>
                                            <WeightChart
                                                catId={cat.id}
                                                currentWeight={cat.weight || undefined}
                                                weightHistory={cat.weightHistory || []}
                                                onAddWeight={async () => { }}
                                                isDemo={false}
                                                variant="default"
                                                hideControls={true}
                                                hideHeader={true}
                                                className="h-full w-full"
                                            />
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* --- FOOTER (8mm) --- */}
                            <div className="h-[8mm] mt-auto border-t border-slate-200 flex justify-between items-center text-[7pt] text-slate-400">
                                <span>Powered by Nyaruhodo AI</span>
                                <span>Page 1/1</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden definitions for VOMIT_CONTENTS only if needed by TS in view, 
                actually they are in config modal usually but mapped here if used.
                I added VOMIT_CONTENTS array to this file to support the lookup in lines above.
            */}
        </div>
    );
}

const VOMIT_CONTENTS = [
    { value: 'hairball', label: '毛玉' },
    { value: 'food', label: '食餌' },
    { value: 'transparent', label: '透明' },
    { value: 'yellow', label: '黄色' },
    { value: 'blood', label: '血' },
    { value: 'foreign', label: '異物' },
    { value: 'unknown', label: '不明' },
];
