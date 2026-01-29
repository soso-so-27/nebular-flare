"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toPng } from "html-to-image";
import { Download, Camera, Pill, Hospital, AlertTriangle, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Cat, Incident, ReportConfigData, TodayStatusLevel } from "@/types";
import { WeightChart } from "./weight-chart";

interface MedicalReportViewProps {
    cat: Cat;
    config: ReportConfigData;
    incidents: Incident[];
    medicationLogs?: any[]; // Added medicationLogs
    onExport?: () => void;
}

const STATUS_DISPLAY: Record<TodayStatusLevel, { label: string; emoji: string; color: string }> = {
    normal: { label: 'いつも通り', emoji: '🟢', color: 'bg-green-100 text-green-800' },
    slightly_bad: { label: '少し悪い', emoji: '🟡', color: 'bg-yellow-100 text-yellow-800' },
    bad: { label: '悪い', emoji: '🔴', color: 'bg-red-100 text-red-800' },
    unknown: { label: '不明', emoji: '⚪', color: 'bg-gray-100 text-gray-600' },
};

// Medical categories for filtering (based on actual IncidentType)
const MEDICAL_CATEGORIES = ['vomit', 'diarrhea', 'injury', 'no_energy', 'sneeze', 'other'];

export function MedicalReportView({ cat, config, incidents, medicationLogs = [], onExport }: MedicalReportViewProps) {
    const reportRef = useRef<HTMLDivElement>(null);

    // Filter to medical incidents only
    const medicalIncidents = incidents.filter(inc =>
        MEDICAL_CATEGORIES.includes(inc.type) || inc.status === 'hospital'
    );

    // Sort by date, most recent first
    const sortedIncidents = [...medicalIncidents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Split into acute (last 72h) and history
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

    const getIncidentTag = (incident: Incident) => {
        if (incident.status === 'hospital') return { label: '通院', color: 'bg-blue-100 text-blue-700' };
        if (incident.severity === 'high') return { label: '要注意', color: 'bg-red-100 text-red-700' };
        if (incident.severity === 'medium') return { label: '心配', color: 'bg-yellow-100 text-yellow-700' };
        return { label: 'メモ', color: 'bg-gray-100 text-gray-600' };
    };

    const getEvidenceIcons = (incident: Incident) => {
        const icons = [];
        if (incident.photos && incident.photos.length > 0) icons.push(<Camera key="photo" className="w-3 h-3" />);
        // Check if note contains medication-related keywords
        if (incident.note?.toLowerCase().includes('投薬') || incident.note?.toLowerCase().includes('薬')) {
            icons.push(<Pill key="med" className="w-3 h-3" />);
        }
        if (incident.status === 'hospital') icons.push(<Hospital key="hosp" className="w-3 h-3" />);
        return icons;
    };

    return (
        <div className="space-y-4">
            {/* Export Button */}
            <div className="flex justify-end">
                <Button onClick={handleExport} className="gap-2" style={{ backgroundColor: 'var(--sage)' }}>
                    <Download className="w-4 h-4" />
                    画像として保存
                </Button>
            </div>

            {/* Report Card */}
            <div
                ref={reportRef}
                className="p-6 bg-white rounded-xl shadow-lg"
                style={{ fontFamily: 'system-ui, sans-serif' }}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-4 pb-4 border-b">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-800">受診用プロフィール</h1>
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                精度向上版
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">飼い主記録</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                        <p>作成日: {format(new Date(), 'yyyy/MM/dd', { locale: ja })}</p>
                    </div>
                </div>

                {/* Cat Basic Profile */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 shrink-0">
                            {cat.avatar?.startsWith('http') ? (
                                <img src={cat.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="flex items-center justify-center h-full text-3xl">
                                    {cat.avatar || '🐈'}
                                </span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">{cat.name}</h2>
                            <p className="text-xs text-slate-500">
                                {cat.sex === 'male' ? 'オス' : cat.sex === 'female' ? 'メス' : '不明・未登録'}
                                {cat.birthday ? ` / ${format(new Date(cat.birthday), 'yyyy/MM/dd')} 生まれ` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-400 block uppercase scale-[0.8] origin-left">去勢・避妊</span>
                            <span className="font-medium">
                                {cat.neutered_status === 'neutered' ? '実施済み' : cat.neutered_status === 'intact' ? '未実施' : '不明'}
                            </span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-400 block uppercase scale-[0.8] origin-left">飼育環境</span>
                            <span className="font-medium">
                                {cat.living_environment === 'indoor' ? '完全室内' : cat.living_environment === 'outdoor' ? '室外' : cat.living_environment === 'both' ? '内外' : '不明'}
                            </span>
                        </div>
                        {cat.family_composition && (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                                <span className="text-slate-400 block uppercase scale-[0.8] origin-left">家族構成・他頭飼い</span>
                                <span className="font-medium">{cat.family_composition}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Weight Chart (Restored Feature for Medical Report) */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-600 mb-3">体重の推移</h2>
                    <div className="h-40">
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
                </div>

                {/* Summary Card */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                    <h2 className="text-sm font-semibold text-slate-600 mb-3">受診サマリー</h2>

                    <div className="space-y-2 text-sm">
                        <div className="flex">
                            <span className="w-24 text-slate-500">主訴:</span>
                            <span className="flex-1 font-medium">{config.chief_complaint}</span>
                        </div>
                        {config.onset && (
                            <div className="flex">
                                <span className="w-24 text-slate-500">発症:</span>
                                <span className="flex-1">{format(new Date(config.onset), 'M/d HH:mm', { locale: ja })}</span>
                            </div>
                        )}
                        {config.last_normal && (
                            <div className="flex">
                                <span className="w-24 text-slate-500">Last Normal:</span>
                                <span className="flex-1">{format(new Date(config.last_normal), 'M/d HH:mm', { locale: ja })}</span>
                            </div>
                        )}
                    </div>

                    {/* Ingestion Alert */}
                    {config.has_ingestion_suspicion && config.ingestion_details && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                誤食疑い
                            </div>
                            <div className="text-sm text-orange-800 space-x-2">
                                {config.ingestion_details.object && <span>対象: {config.ingestion_details.object}</span>}
                                {config.ingestion_details.amount && <span>量: {config.ingestion_details.amount}</span>}
                                {config.ingestion_details.time && <span>時刻: {config.ingestion_details.time}</span>}
                            </div>
                        </div>
                    )}

                    {/* Emergency Flags */}
                    {Object.values(config.emergency_flags).some(v => v) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {config.emergency_flags.persistent_vomiting && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">嘔吐継続</span>
                            )}
                            {config.emergency_flags.lethargy && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">ぐったり</span>
                            )}
                            {config.emergency_flags.abdominal_pain && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">腹痛疑い</span>
                            )}
                            {config.emergency_flags.no_excretion && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">排泄なし</span>
                            )}
                        </div>
                    )}

                    {/* Abdominal Signs */}
                    {Object.values(config.abdominal_signs).some(v => v) && (
                        <div className="mt-2 text-sm text-slate-600">
                            腹痛サイン:
                            {config.abdominal_signs.refusing_touch && ' 触拒否'}
                            {config.abdominal_signs.prayer_pose && ' 祈りポーズ'}
                            {config.abdominal_signs.crouching && ' うずくまり'}
                        </div>
                    )}

                    {/* Vital Summary Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-200 text-sm grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <span className="text-slate-500">便</span>
                            <span className="block font-medium">{config.vital_summary.stool ? 'あり' : 'なし'}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-slate-500">尿</span>
                            <span className="block font-medium">{config.vital_summary.urine ? 'あり' : 'なし'}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-slate-500">嘔吐</span>
                            <span className="block font-medium">{config.vital_summary.vomit_count}回</span>
                        </div>
                        <div className="text-center">
                            <span className="text-slate-500">最終摂食</span>
                            <span className="block font-medium text-xs">{config.vital_summary.last_meal || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Today's Status */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-slate-600 mb-3">今日の状態</h2>
                    <div className="flex gap-2 flex-wrap">
                        {(['appetite', 'energy', 'excretion', 'hydration'] as const).map(key => {
                            const labels = { appetite: '食欲', energy: '元気', excretion: '排泄', hydration: '飲水' };
                            const status = STATUS_DISPLAY[config.today_status[key]];
                            return (
                                <div key={key} className={`px-3 py-1.5 rounded-full text-xs font-medium ${status.color}`}>
                                    {status.emoji} {labels[key]}: {status.label}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 text-xs text-slate-400 flex gap-3">
                        <span>🟢 正常</span>
                        <span>🟡 少し悪い</span>
                        <span>🔴 悪い</span>
                        <span>⚪ 不明</span>
                    </div>
                </div>

                {/* Important Events */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-slate-600 mb-3">重要イベント（医療関連）</h2>

                    {sortedIncidents.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">医療イベント記録なし（生活ログは省略）</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Acute Phase */}
                            {acuteIncidents.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        急性期（直近72時間）
                                    </h3>
                                    <div className="space-y-2">
                                        {acuteIncidents.map(inc => {
                                            const tag = getIncidentTag(inc);
                                            return (
                                                <div key={inc.id} className="flex flex-col gap-1 p-2 bg-red-50 rounded-lg text-sm">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-slate-500 text-xs w-12 shrink-0">
                                                            {format(new Date(inc.created_at), 'M/d')}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 text-xs rounded shrink-0 ${tag.label === '通院' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{tag.label}</span>
                                                        <span className="flex-1 font-medium">{inc.note || inc.type}</span>
                                                        <div className="flex gap-1 text-slate-400">{getEvidenceIcons(inc)}</div>
                                                    </div>
                                                    {/* Symptom Details Rendering */}
                                                    {inc.symptom_details && (
                                                        <div className="ml-14 flex flex-wrap gap-2 text-[10px] text-slate-500 italic">
                                                            {(inc.symptom_details as any).vomit && (
                                                                <span className="bg-orange-50 text-orange-700 px-1 rounded border border-orange-100">
                                                                    嘔吐: {(inc.symptom_details as any).vomit.type} ({(inc.symptom_details as any).vomit.count}回)
                                                                    {(inc.symptom_details as any).vomit.hasBlood && ' ⚠️血混じり'}
                                                                </span>
                                                            )}
                                                            {(inc.symptom_details as any).stool && (
                                                                <span className="bg-amber-50 text-amber-800 px-1 rounded border border-amber-100">
                                                                    便スコア: {(inc.symptom_details as any).stool.score}
                                                                    {(inc.symptom_details as any).stool.hasBlood && ' ⚠️血便'}
                                                                    {(inc.symptom_details as any).stool.hasMucus && ' ⚠️粘膜便'}
                                                                </span>
                                                            )}
                                                            {(inc.symptom_details as any).ingestion?.active && (
                                                                <span className="bg-red-50 text-red-700 px-1 rounded border border-red-200">
                                                                    誤食疑い: {(inc.symptom_details as any).ingestion.object} ({(inc.symptom_details as any).ingestion.amount})
                                                                </span>
                                                            )}
                                                            {(inc.symptom_details as any).emergency && (
                                                                <span className="bg-red-600 text-white px-1 rounded">
                                                                    🚨 {(inc.symptom_details as any).emergency.prayerPose && '祈りポーズ '}
                                                                    {(inc.symptom_details as any).emergency.lethargy && 'ぐったり '}
                                                                    {(inc.symptom_details as any).emergency.rapidBreathing && '呼吸荒い'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* History */}
                            {historyIncidents.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        過去の履歴（参考）
                                    </h3>
                                    <div className="space-y-1.5">
                                        {historyIncidents.slice(0, 5).map(inc => {
                                            const tag = getIncidentTag(inc);
                                            return (
                                                <div key={inc.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                                                    <span className="text-slate-400 text-xs w-12">
                                                        {format(new Date(inc.created_at), 'M/d')}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 text-xs rounded ${tag.color}`}>{tag.label}</span>
                                                    <span className="flex-1 text-slate-600">{inc.note || inc.type}</span>
                                                    <div className="flex gap-1 text-slate-300">{getEvidenceIcons(inc)}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Prevention History */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-slate-600 mb-3">予防履歴</h2>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                            <span className="text-slate-500">ワクチン</span>
                            <div className="text-right">
                                <span className="block font-medium">{cat.last_vaccine_date ? format(new Date(cat.last_vaccine_date), 'yyyy/M/d') : '未登録'}</span>
                                {cat.vaccine_type && <span className="text-[9px] text-slate-400">{cat.vaccine_type}</span>}
                            </div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                            <span className="text-slate-500">ノミダニ</span>
                            <div className="text-right">
                                <span className="block font-medium">{cat.flea_tick_date ? format(new Date(cat.flea_tick_date), 'yyyy/M/d') : '未登録'}</span>
                                {cat.flea_tick_product && <span className="text-[9px] text-slate-400">{cat.flea_tick_product}</span>}
                            </div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                            <span className="text-slate-500">駆虫</span>
                            <div className="text-right">
                                <span className="block font-medium">{cat.deworming_date ? format(new Date(cat.deworming_date), 'yyyy/M/d') : '未登録'}</span>
                                {cat.deworming_product && <span className="text-[9px] text-slate-400">{cat.deworming_product}</span>}
                            </div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                            <span className="text-slate-500">フィラリア</span>
                            <div className="text-right">
                                <span className="block font-medium">{cat.heartworm_date ? format(new Date(cat.heartworm_date), 'yyyy/M/d') : '未登録'}</span>
                                {cat.heartworm_product && <span className="text-[9px] text-slate-400">{cat.heartworm_product}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Medications (New) */}
                {medicationLogs.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1">
                            <Pill className="w-3.5 h-3.5 text-blue-500" />
                            現在のお薬・治療
                        </h2>
                        <div className="space-y-1.5">
                            {medicationLogs.map((log: any) => (
                                <div key={log.id} className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-[12px] flex items-start gap-2">
                                    <div className="font-bold text-slate-700 min-w-[100px]">{log.product_name}</div>
                                    <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
                                        {log.dosage && <span>量: {log.dosage}</span>}
                                        <span>頻度: {
                                            log.frequency === 'daily' ? '1日1回' :
                                                log.frequency === 'twice_daily' ? '1日2回' :
                                                    log.frequency === 'weekly' ? '週1回' :
                                                        log.frequency === 'once' ? '1回のみ' : '頓服'
                                        }</span>
                                        <span className="text-[10px] text-slate-400">
                                            {format(new Date(log.start_date), 'M/d')} 〜 {log.end_date ? format(new Date(log.end_date), 'M/d') : '継続中'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Branding */}
                <div className="pt-4 border-t text-center text-xs text-slate-400">
                    <p>にゃるほど - ねこの足あとアプリ</p>
                </div>
            </div>
        </div>
    );
}
