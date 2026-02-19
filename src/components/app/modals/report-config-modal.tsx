"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, AlertTriangle, Utensils, Activity, Droplets, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ReportConfigData, TodayStatusLevel, TodayStatus, EmergencyFlags, AbdominalSigns, VitalSummary, IngestionDetails } from "@/types";

interface ReportConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: ReportConfigData & { cat_id: string }) => void;
    cats: any[];
}

const STATUS_LEVELS: { value: TodayStatusLevel; label: string; symbol: string }[] = [
    { value: 'normal', label: 'いつも通り', symbol: '●' },
    { value: 'slightly_bad', label: '少し悪い', symbol: '▲' },
    { value: 'bad', label: '悪い', symbol: '✕' },
    { value: 'unknown', label: '不明', symbol: '？' },
];

const SYMPTOM_PRESETS = [
    "食欲不振", "嘔吐", "下痢", "元気がない", "怪我", "震えている", "鳴き方が変"
];

const VOMIT_CONTENTS = [
    { value: 'hairball', label: '毛玉' },
    { value: 'food', label: '食餌' },
    { value: 'transparent', label: '透明' },
    { value: 'yellow', label: '黄色' },
    { value: 'blood', label: '血' },
    { value: 'foreign', label: '異物' },
    { value: 'unknown', label: '不明' },
];

const FOOD_RATIOS = [0, 25, 50, 75, 100];

const STATUS_ITEMS: { key: keyof TodayStatus; label: string }[] = [
    { key: 'appetite', label: '食欲' },
    { key: 'energy', label: '元気' },
    { key: 'excretion', label: '排泄' },
    { key: 'hydration', label: '飲水' },
];

export function ReportConfigModal({ isOpen, onClose, onComplete, cats }: ReportConfigModalProps) {
    const [step, setStep] = useState(0); // 0: Cat selection, 1: Basic info, 2: Emergency, 3: Vitals
    const [selectedCatId, setSelectedCatId] = useState<string | null>(cats[0]?.id || null);

    // Step 1: Basic Summary
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [onset, setOnset] = useState('');
    const [lastNormal, setLastNormal] = useState('');
    const [todayStatus, setTodayStatus] = useState<TodayStatus>({
        appetite: 'unknown',
        energy: 'unknown',
        excretion: 'unknown',
        hydration: 'unknown',
    });

    // Step 2: Emergency/Ingestion
    const [hasIngestion, setHasIngestion] = useState(false);
    const [ingestionDetails, setIngestionDetails] = useState<IngestionDetails>({});
    const [emergencyFlags, setEmergencyFlags] = useState<EmergencyFlags>({});
    const [abdominalSigns, setAbdominalSigns] = useState<AbdominalSigns>({});

    // Step 3: Vitals (P0/P1)
    const [vitalSummary, setVitalSummary] = useState<VitalSummary>({
        stool: false,
        urine: false,
        vomit_count: 0,
        last_meal: '',
        food_intake_ratio: 100,
        water_intake_level: 'normal',
    });

    const handleStatusChange = (key: keyof TodayStatus, value: TodayStatusLevel) => {
        setTodayStatus(prev => ({ ...prev, [key]: value }));
    };

    const handleComplete = () => {
        if (!selectedCatId) return;
        const data: ReportConfigData & { cat_id: string } = {
            cat_id: selectedCatId,
            chief_complaint: chiefComplaint,
            onset,
            last_normal: lastNormal,
            today_status: todayStatus,
            has_ingestion_suspicion: hasIngestion,
            ingestion_details: hasIngestion ? ingestionDetails : undefined,
            emergency_flags: emergencyFlags,
            abdominal_signs: abdominalSigns,
            vital_summary: vitalSummary,
        };
        onComplete(data);
    };

    const canProceed = step === 0 ? !!selectedCatId : step === 1 ? chiefComplaint.trim().length > 0 : true;
    const selectedCat = cats.find(c => c.id === selectedCatId);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[11000] flex items-center justify-center bg-[#4E342E]/10 backdrop-blur-sm px-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-[#fafafa] dark:bg-[#1c1c1e] rounded-[32px] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-900 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">REPORT CONFIG</h2>
                                <h1 className="text-lg font-black italic">受診レポート設定</h1>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex justify-center gap-1 p-3">
                            {[0, 1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`w-10 h-0.5 transition-all duration-500 rounded-full ${s === step ? 'bg-black dark:bg-white w-14' : s < step ? 'bg-black/20 dark:bg-white/20' : 'bg-black/5 dark:bg-white/5'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4 min-h-[400px]">
                            <AnimatePresence mode="wait">
                                {step === 0 && (
                                    <motion.div
                                        key="step0"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 italic">対象の猫を選択</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {cats.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedCatId(cat.id)}
                                                    className={`p-4 rounded-[32px] flex flex-col items-center gap-3 transition-all border ${selectedCatId === cat.id
                                                        ? 'bg-black dark:bg-white border-transparent ring-4 ring-black/5 dark:ring-white/5'
                                                        : 'bg-white dark:bg-black/20 border-slate-100 dark:border-slate-800 hover:border-black/10'
                                                        }`}
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5">
                                                        {cat.avatar?.startsWith('http') ? (
                                                            <img src={cat.avatar} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="flex items-center justify-center h-full text-2xl">
                                                                {cat.avatar || '🐈'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`font-black text-xs tracking-tight ${selectedCatId === cat.id ? 'text-white dark:text-black' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {cat.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1: 症状サマリー</Label>

                                            <div className="space-y-4 pt-2">
                                                <Label htmlFor="chief" className="text-sm font-bold text-slate-700 dark:text-slate-300">主訴（何かお困りですか？）*</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {SYMPTOM_PRESETS.map(symptom => (
                                                        <button
                                                            key={symptom}
                                                            type="button"
                                                            onClick={() => setChiefComplaint(prev => prev ? `${prev}、${symptom}` : symptom)}
                                                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-[11px] font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                                                        >
                                                            + {symptom}
                                                        </button>
                                                    ))}
                                                </div>
                                                <Textarea
                                                    id="chief"
                                                    placeholder="例：昨日から食欲がなく、ぐったりしている"
                                                    value={chiefComplaint}
                                                    onChange={(e) => setChiefComplaint(e.target.value)}
                                                    className="min-h-[100px] bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-2xl resize-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="onset" className="text-[10px] font-black uppercase tracking-widest text-slate-400">いつから？</Label>
                                                    <Input
                                                        id="onset"
                                                        type="datetime-local"
                                                        value={onset}
                                                        onChange={(e) => setOnset(e.target.value)}
                                                        className="rounded-xl border-slate-200 dark:border-slate-800"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="lastNormal" className="text-[10px] font-black uppercase tracking-widest text-slate-400">最後に普通だったのは？</Label>
                                                    <Input
                                                        id="lastNormal"
                                                        type="datetime-local"
                                                        value={lastNormal}
                                                        onChange={(e) => setLastNormal(e.target.value)}
                                                        className="rounded-xl border-slate-200 dark:border-slate-800"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">本日の各ステータス</Label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {STATUS_ITEMS.map(item => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-black/10">
                                                            <span className="text-xs font-black text-slate-600 dark:text-slate-400">{item.label}</span>
                                                            <div className="flex gap-1.5">
                                                                {STATUS_LEVELS.map(level => (
                                                                    <button
                                                                        key={level.value}
                                                                        type="button"
                                                                        onClick={() => handleStatusChange(item.key, level.value)}
                                                                        className={`w-10 h-10 rounded-xl transition-all flex flex-col items-center justify-center border ${todayStatus[item.key] === level.value
                                                                            ? 'bg-black dark:bg-white border-transparent text-white dark:text-black shadow-lg shadow-black/5'
                                                                            : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'
                                                                            }`}
                                                                    >
                                                                        <span className="text-xs font-black leading-none">{level.symbol}</span>
                                                                        <span className="text-[7px] mt-1 font-bold">{level.label}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2: 緊急度チェック</Label>

                                        {/* Ingestion */}
                                        <div className="space-y-4">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${hasIngestion ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-slate-200 dark:border-slate-800'}`}>
                                                    {hasIngestion && <div className="w-2 h-2 rounded-full bg-white dark:bg-black" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={hasIngestion}
                                                    onChange={(e) => setHasIngestion(e.target.checked)}
                                                    className="hidden"
                                                />
                                                <span className="font-black text-slate-800 dark:text-slate-100 italic">誤食・誤飲の疑いあり</span>
                                            </label>

                                            <AnimatePresence>
                                                {hasIngestion && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden space-y-3 pl-9 border-l-2 border-slate-100 dark:border-slate-900"
                                                    >
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400">何を？</Label>
                                                            <Input
                                                                placeholder="例：紐、おもちゃ"
                                                                value={ingestionDetails.object || ''}
                                                                onChange={(e) => setIngestionDetails(prev => ({ ...prev, object: e.target.value }))}
                                                                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400">量・長さ</Label>
                                                            <Input
                                                                placeholder="例：5cm、1個"
                                                                value={ingestionDetails.amount || ''}
                                                                onChange={(e) => setIngestionDetails(prev => ({ ...prev, amount: e.target.value }))}
                                                                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400">いつ頃？</Label>
                                                            <Input
                                                                placeholder="例：今朝10時頃"
                                                                value={ingestionDetails.time || ''}
                                                                onChange={(e) => setIngestionDetails(prev => ({ ...prev, time: e.target.value }))}
                                                                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Emergency Flags */}
                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                緊急フラグ
                                            </Label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { key: 'persistent_vomiting', label: '嘔吐が続いている' },
                                                    { key: 'lethargy', label: 'ぐったりしている' },
                                                    { key: 'abdominal_pain', label: '腹痛がありそう' },
                                                    { key: 'no_excretion', label: '便/尿が出ていない' },
                                                ].map(item => (
                                                    <label key={item.key} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-black/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${emergencyFlags[item.key as keyof EmergencyFlags] ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-slate-300 dark:border-slate-700'}`}>
                                                            {emergencyFlags[item.key as keyof EmergencyFlags] && <div className="w-1.5 h-1.5 bg-white dark:bg-black rounded-sm" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!emergencyFlags[item.key as keyof EmergencyFlags]}
                                                            onChange={(e) => setEmergencyFlags(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                            className="hidden"
                                                        />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Abdominal Signs */}
                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">腹痛サイン</Label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { key: 'refusing_touch', label: '触ると嫌がる' },
                                                    { key: 'prayer_pose', label: '祈りのポーズ（前足を伸ばす）' },
                                                    { key: 'crouching', label: 'うずくまっている' },
                                                ].map(item => (
                                                    <label key={item.key} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-black/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${abdominalSigns[item.key as keyof AbdominalSigns] ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-slate-300 dark:border-slate-700'}`}>
                                                            {abdominalSigns[item.key as keyof AbdominalSigns] && <div className="w-1.5 h-1.5 bg-white dark:bg-black rounded-full" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!abdominalSigns[item.key as keyof AbdominalSigns]}
                                                            onChange={(e) => setAbdominalSigns(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                            className="hidden"
                                                        />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 3: バイタル詳細</Label>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setVitalSummary(prev => ({ ...prev, stool: !prev.stool }))}
                                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 text-sm font-bold ${vitalSummary.stool ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-black/10 border-slate-100 dark:border-slate-900 text-slate-400'}`}
                                                >
                                                    便：{vitalSummary.stool ? 'あり' : 'なし'}
                                                </button>
                                                <button
                                                    onClick={() => setVitalSummary(prev => ({ ...prev, urine: !prev.urine }))}
                                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 text-sm font-bold ${vitalSummary.urine ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-black/10 border-slate-100 dark:border-slate-900 text-slate-400'}`}
                                                >
                                                    尿：{vitalSummary.urine ? 'あり' : 'なし'}
                                                </button>
                                            </div>

                                            {vitalSummary.stool && (
                                                <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">便の状態</Label>
                                                    <div className="flex gap-2">
                                                        {(['normal', 'soft', 'diarrhea', 'bloody'] as const).map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => setVitalSummary(prev => ({ ...prev, stool_type: type }))}
                                                                className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${vitalSummary.stool_type === type ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                                            >
                                                                {type === 'normal' ? '正常' : type === 'soft' ? '軟便' : type === 'diarrhea' ? '下痢' : '血便'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">24時間以内の嘔吐回数</Label>
                                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{vitalSummary.vomit_count} 回</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {[0, 1, 2, 3, 4, 5].map(cnt => (
                                                    <button
                                                        key={cnt}
                                                        onClick={() => setVitalSummary(prev => ({ ...prev, vomit_count: cnt }))}
                                                        className={`flex-1 h-12 rounded-xl border font-black transition-all ${vitalSummary.vomit_count === cnt ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-black/10 border-slate-100 dark:border-slate-900 text-slate-300'}`}
                                                    >
                                                        {cnt}{cnt === 5 ? '+' : ''}
                                                    </button>
                                                ))}
                                            </div>
                                            {vitalSummary.vomit_count > 0 && (
                                                <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400">内容</Label>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {VOMIT_CONTENTS.map(item => (
                                                            <button
                                                                key={item.value}
                                                                onClick={() => setVitalSummary(prev => ({ ...prev, vomit_content: item.value as any }))}
                                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${vitalSummary.vomit_content === item.value ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                                            >
                                                                {item.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">排泄・その他</Label>

                                            {/* Stool */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">便</span>
                                                    <input
                                                        type="time"
                                                        value={vitalSummary.last_defecation_at || ''}
                                                        onChange={(e) => setVitalSummary(prev => ({ ...prev, last_defecation_at: e.target.value }))}
                                                        className="text-xs bg-slate-100 dark:bg-slate-800 rounded px-2 py-1"
                                                    />
                                                </div>
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                    {(['normal', 'soft', 'diarrhea', 'bloody', 'constipation', 'tarry'] as const).map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => setVitalSummary(prev => ({ ...prev, stool_type: type, stool: true }))}
                                                            className={`flex-shrink-0 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${vitalSummary.stool_type === type ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                                        >
                                                            {{ normal: '正常', soft: '軟便', diarrhea: '下痢', bloody: '血便', constipation: '便秘', tarry: '黒色便' }[type]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Urine */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">尿</span>
                                                    <input
                                                        type="time"
                                                        value={vitalSummary.last_urination_at || ''}
                                                        onChange={(e) => setVitalSummary(prev => ({ ...prev, last_urination_at: e.target.value }))}
                                                        className="text-xs bg-slate-100 dark:bg-slate-800 rounded px-2 py-1"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { key: 'pain', label: '痛がる' },
                                                        { key: 'hematuria', label: '血尿' },
                                                        { key: 'frequent', label: '頻尿' },
                                                        { key: 'scanty', label: '少量' },
                                                        { key: 'none', label: '出ていない' },
                                                    ].map(flag => {
                                                        const isSelected = vitalSummary.urination_flags?.includes(flag.key);
                                                        return (
                                                            <button
                                                                key={flag.key}
                                                                onClick={() => {
                                                                    setVitalSummary(prev => {
                                                                        const current = prev.urination_flags || [];
                                                                        return {
                                                                            ...prev,
                                                                            urine: true,
                                                                            urination_flags: isSelected
                                                                                ? current.filter(f => f !== flag.key)
                                                                                : [...current, flag.key]
                                                                        };
                                                                    });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${isSelected ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                                            >
                                                                {flag.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Food */}
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">最終摂食</span>
                                                    <input
                                                        type="time"
                                                        value={vitalSummary.last_meal_at || ''}
                                                        onChange={(e) => setVitalSummary(prev => ({ ...prev, last_meal_at: e.target.value }))}
                                                        className="text-xs bg-slate-100 dark:bg-slate-800 rounded px-2 py-1"
                                                    />
                                                </div>
                                                <div className="flex gap-1">
                                                    {FOOD_RATIOS.map(ratio => (
                                                        <button
                                                            key={ratio}
                                                            onClick={() => setVitalSummary(prev => ({ ...prev, food_intake_ratio: ratio as any }))}
                                                            className={`flex-1 h-10 rounded-lg text-[10px] font-bold border transition-all ${vitalSummary.food_intake_ratio === ratio ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-black/10 border-slate-100 dark:border-slate-900 text-slate-400'}`}
                                                        >
                                                            {ratio}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Temperature (Optional) */}
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">体温 (℃) <span className="text-[9px] font-normal text-slate-400">※任意</span></span>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        placeholder="38.5"
                                                        value={vitalSummary.temperature_c || ''}
                                                        onChange={(e) => setVitalSummary(prev => ({ ...prev, temperature_c: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                                        className="w-20 text-right h-8 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 flex gap-2 p-6 border-t border-slate-100 dark:border-slate-900 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-sm pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                            {step > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(step - 1)}
                                    className="flex-1 h-14 rounded-full border-slate-200 dark:border-slate-800 text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                >
                                    戻る
                                </Button>
                            )}
                            {step < 3 ? (
                                <Button
                                    onClick={() => setStep(step + 1)}
                                    disabled={!canProceed}
                                    className="flex-1 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black font-black text-sm shadow-xl shadow-black/10 transition-all active:scale-95"
                                >
                                    次へ
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleComplete}
                                    className="flex-1 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black font-black text-sm shadow-xl shadow-black/10 transition-all active:scale-95"
                                >
                                    レポートを作成
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
