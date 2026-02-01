"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toPng } from "html-to-image";
import { Download, Camera, Pill, Hospital, AlertTriangle, AlertCircle, MessageSquare, Bug, Droplet, Waves, Thermometer, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Cat, Incident, ReportConfigData, TodayStatusLevel } from "@/types";
import { WeightChart } from "./weight-chart";

interface MedicalReportViewProps {
    cat: Cat;
    config: ReportConfigData;
    incidents: Incident[];
    medicationLogs?: any[];
    onExport?: () => void;
}

const STATUS_DISPLAY: Record<TodayStatusLevel, { label: string; emoji: string; color: string; border: string }> = {
    normal: { label: '正常', emoji: '●', color: 'text-green-600', border: 'border-green-100 bg-green-50/30' },
    slightly_bad: { label: '軽度の異常', emoji: '▲', color: 'text-yellow-600', border: 'border-yellow-100 bg-yellow-50/30' },
    bad: { label: '異常あり', emoji: '✕', color: 'text-red-600', border: 'border-red-100 bg-red-50/30' },
    unknown: { label: '不明', emoji: '-', color: 'text-gray-400', border: 'border-gray-50 bg-gray-50/30' },
};

const MEDICAL_CATEGORIES = ['vomit', 'diarrhea', 'injury', 'no_energy', 'sneeze', 'other'];

export function MedicalReportView({ cat, config, incidents, medicationLogs = [], onExport }: MedicalReportViewProps) {
    const reportRef = useRef<HTMLDivElement>(null);

    const medicalIncidents = incidents.filter(inc =>
        MEDICAL_CATEGORIES.includes(inc.type) || inc.status === 'hospital'
    );

    const sortedIncidents = [...medicalIncidents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const now = new Date();
    const acuteCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const acuteIncidents = sortedIncidents.filter(inc => new Date(inc.created_at) >= acuteCutoff);
    const historyIncidents = sortedIncidents.filter(inc => new Date(inc.created_at) < acuteCutoff);

    const handleExport = async () => {
        if (!reportRef.current) return;
        try {
            const dataUrl = await toPng(reportRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
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

    return (
        <div className="space-y-6">
            <div className="flex justify-end pt-2">
                <Button onClick={handleExport} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full px-6 shadow-lg shadow-black/10">
                    <Download className="w-4 h-4" />
                    レポートを画像として保存
                </Button>
            </div>

            <div
                ref={reportRef}
                className="bg-white text-slate-900 p-8 shadow-sm print:shadow-none min-h-[1414px] w-full max-w-[800px] mx-auto border border-slate-100"
                style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
            >
                {/* 1. Technical Header */}
                <div className="flex justify-between items-end mb-8 border-b-2 border-slate-900 pb-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Medical Report</h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">VETERINARY CONSULTATION RECORD / OWNER LOG</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400">作成日時</p>
                        <p className="text-sm font-mono font-bold tracking-tight">{format(new Date(), 'yyyy/MM/dd HH:mm', { locale: ja })}</p>
                    </div>
                </div>

                {/* 2. Patient Profile */}
                <div className="flex gap-6 mb-10 items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="w-20 h-20 rounded-2xl bg-slate-200 overflow-hidden shadow-inner border-[3px] border-white shrink-0">
                        {cat.avatar?.startsWith('http') ? (
                            <img src={cat.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="flex items-center justify-center h-full text-4xl">
                                {cat.avatar || '🐈'}
                            </span>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-3 mb-1">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{cat.name}</h2>
                            <span className="text-sm font-bold text-slate-500">
                                {cat.sex === 'male' ? 'オス' : cat.sex === 'female' ? 'メス' : '性別不明'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                            <p className="text-slate-500 font-medium">生年月日: <span className="text-slate-800 font-bold">{cat.birthday ? format(new Date(cat.birthday), 'yyyy/MM/dd') : '未登録'}</span></p>
                            <p className="text-slate-500 font-medium">避妊去勢: <span className="text-slate-800 font-bold">{cat.neutered_status === 'neutered' ? '実施' : '未実施'}</span></p>
                            <p className="text-slate-500 font-medium">飼育環境: <span className="text-slate-800 font-bold">{cat.living_environment === 'indoor' ? '完全室内' : '室外あり'}</span></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-12 space-y-8">
                        {/* 3. Clinical Summary (Primary Focus) */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-l-4 border-slate-800 pl-3">
                                <h3 className="font-black text-lg text-slate-800">受診サマリー</h3>
                                <Activity className="w-4 h-4 text-slate-400" />
                            </div>

                            {/* EMERGENCY ALERTS */}
                            {config.has_ingestion_suspicion && (
                                <div className="p-4 bg-red-600 border-l-[12px] border-red-800 rounded-xl shadow-md animate-pulse-subtle">
                                    <div className="flex items-center gap-2 text-white font-black mb-2 text-lg">
                                        <AlertTriangle className="w-6 h-6" />
                                        緊急警告：誤食の疑い
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-white/90 text-[13px] font-bold">
                                        {config.ingestion_details?.object && <div className="bg-red-800/30 p-2 rounded-lg">対象: {config.ingestion_details.object}</div>}
                                        {config.ingestion_details?.amount && <div className="bg-red-800/30 p-2 rounded-lg">量: {config.ingestion_details.amount}</div>}
                                        {config.ingestion_details?.time && <div className="bg-red-800/30 p-2 rounded-lg">推定時刻: {config.ingestion_details.time}</div>}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 border-2 border-slate-100 rounded-2xl space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chief Complaint / 主訴</p>
                                        <p className="text-lg font-bold leading-snug">{config.chief_complaint || '記載なし'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Onset / 発症</p>
                                            <p className="text-sm font-bold">{config.onset ? format(new Date(config.onset), 'MM/dd HH:mm', { locale: ja }) : '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Normal / 平時</p>
                                            <p className="text-sm font-bold">{config.last_normal ? format(new Date(config.last_normal), 'MM/dd HH:mm', { locale: ja }) : '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 border-2 border-slate-100 rounded-2xl bg-slate-50/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Today's Vitals / 本日のバイタル</p>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                        <div className="flex justify-between items-end border-b border-slate-200 pb-1">
                                            <span className="text-xs text-slate-500 font-bold">便</span>
                                            <span className={`text-sm font-black ${config.vital_summary.stool ? 'text-slate-800' : 'text-slate-300'}`}>{config.vital_summary.stool ? '排出あり' : 'なし'}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-slate-200 pb-1">
                                            <span className="text-xs text-slate-500 font-bold">尿</span>
                                            <span className={`text-sm font-black ${config.vital_summary.urine ? 'text-slate-800' : 'text-slate-300'}`}>{config.vital_summary.urine ? '排出あり' : 'なし'}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-slate-200 pb-1">
                                            <span className="text-xs text-slate-500 font-bold">嘔吐回数</span>
                                            <span className={`text-sm font-black ${config.vital_summary.vomit_count > 0 ? 'text-red-600' : 'text-slate-800'}`}>{config.vital_summary.vomit_count} 回</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-slate-200 pb-1">
                                            <span className="text-xs text-slate-500 font-bold">最終摂食</span>
                                            <span className="text-sm font-black text-slate-800">{config.vital_summary.last_meal || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. Today's Physical Status */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-l-4 border-slate-800 pl-3">
                                <h3 className="font-black text-lg text-slate-800">各詳細ステータス</h3>
                                <Thermometer className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(['appetite', 'energy', 'excretion', 'hydration'] as const).map(key => {
                                    const labels = { appetite: '食欲', energy: '元気', excretion: '排泄', hydration: '飲水' };
                                    const status = STATUS_DISPLAY[config.today_status[key]];
                                    return (
                                        <div key={key} className={`p-4 rounded-xl border-2 ${status.border} flex flex-col gap-1 items-center text-center`}>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels[key]}</span>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-xs ${status.color}`}>{status.emoji}</span>
                                                <span className="text-sm font-black text-slate-800">{status.label}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 5. Weight Trend Integration */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-l-4 border-slate-800 pl-3">
                                <h3 className="font-black text-lg text-slate-800">体重推移グラフ</h3>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 h-[220px]">
                                <WeightChart
                                    catId={cat.id}
                                    currentWeight={cat.weight || undefined}
                                    weightHistory={cat.weightHistory || []}
                                    onAddWeight={async () => { }}
                                    isDemo={false}
                                    variant="default"
                                    hideControls={true}
                                />
                            </div>
                        </section>

                        {/* 6. Important Clinical Events */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between border-l-4 border-slate-800 pl-3">
                                <h3 className="font-black text-lg text-slate-800">特記すべき医療イベント</h3>
                                {acuteIncidents.length > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-black tracking-widest">URGENT</span>}
                            </div>
                            <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
                                {sortedIncidents.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 italic text-sm">医療イベントの記録はありません</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                <th className="px-4 py-3 w-20">日付</th>
                                                <th className="px-4 py-3 w-24">分類</th>
                                                <th className="px-4 py-3">内容 / 症状詳細</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {sortedIncidents.slice(0, 8).map((inc, i) => (
                                                <tr key={inc.id} className={`border-b border-slate-50 ${i < acuteIncidents.length ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-4 py-4 font-mono font-bold text-xs">{format(new Date(inc.created_at), 'MM/dd')}</td>
                                                    <td className="px-4 py-4 shrink-0">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm ${inc.status === 'hospital' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white text-[10px]'}`}>
                                                            {inc.status === 'hospital' ? '通院' : inc.type === 'vomit' ? '嘔吐' : inc.type === 'diarrhea' ? '下痢' : 'メモ'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="font-bold text-slate-800 leading-relaxed mb-1">{inc.note || inc.type}</p>
                                                        {inc.symptom_details && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {(inc.symptom_details as any).vomit && (
                                                                    <span className="text-[9px] bg-white border border-slate-200 px-1.5 rounded-sm text-slate-500">
                                                                        嘔吐: {(inc.symptom_details as any).vomit.count}回
                                                                    </span>
                                                                )}
                                                                {(inc.symptom_details as any).emergency?.prayerPose && (
                                                                    <span className="text-[9px] bg-red-600 text-white px-1.5 rounded-sm font-bold">祈りポーズ</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="mt-16 pt-6 border-t border-slate-100 flex justify-between items-center opacity-40">
                    <p className="text-[10px] font-black tracking-widest uppercase">System: Nyaruhodo Veterinary Engine v2.0</p>
                    <p className="text-[10px] font-bold italic">にゃるほど - ねこの足あとアプリ</p>
                </div>
            </div>
        </div>
    );
}
