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
    onComplete: (data: ReportConfigData) => void;
    catName: string;
}

const STATUS_LEVELS: { value: TodayStatusLevel; label: string; color: string }[] = [
    { value: 'normal', label: 'いつも通り', color: 'bg-green-500' },
    { value: 'slightly_bad', label: '少し悪い', color: 'bg-yellow-500' },
    { value: 'bad', label: '悪い', color: 'bg-red-500' },
    { value: 'unknown', label: '不明', color: 'bg-gray-400' },
];

const STATUS_ITEMS: { key: keyof TodayStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'appetite', label: '食欲', icon: <Utensils className="w-4 h-4" /> },
    { key: 'energy', label: '元気', icon: <Activity className="w-4 h-4" /> },
    { key: 'excretion', label: '排泄', icon: <Droplets className="w-4 h-4" /> },
    { key: 'hydration', label: '飲水', icon: <Heart className="w-4 h-4" /> },
];

export function ReportConfigModal({ isOpen, onClose, onComplete, catName }: ReportConfigModalProps) {
    const [step, setStep] = useState(1);

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

    // Step 3: Vitals
    const [vitalSummary, setVitalSummary] = useState<VitalSummary>({
        stool: false,
        urine: false,
        vomit_count: 0,
        last_meal: '',
    });

    const handleStatusChange = (key: keyof TodayStatus, value: TodayStatusLevel) => {
        setTodayStatus(prev => ({ ...prev, [key]: value }));
    };

    const handleComplete = () => {
        const data: ReportConfigData = {
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

    const canProceed = step === 1 ? chiefComplaint.trim().length > 0 : true;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
                            <div>
                                <h2 className="text-lg font-bold">受診レポート設定</h2>
                                <p className="text-sm text-slate-500">{catName} のレポート</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex justify-center gap-2 p-4">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`w-8 h-1 rounded-full transition-colors ${s === step ? 'bg-sage-500' : s < step ? 'bg-sage-300' : 'bg-slate-200'
                                        }`}
                                    style={{ backgroundColor: s === step ? 'var(--sage)' : undefined }}
                                />
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Step 1: 基本情報</h3>

                                        <div className="space-y-2">
                                            <Label htmlFor="chief">主訴（何が心配？）*</Label>
                                            <Textarea
                                                id="chief"
                                                placeholder="例：昨日から食欲がなく、ぐったりしている"
                                                value={chiefComplaint}
                                                onChange={(e) => setChiefComplaint(e.target.value)}
                                                className="min-h-[80px]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="onset">いつから？</Label>
                                                <Input
                                                    id="onset"
                                                    type="datetime-local"
                                                    value={onset}
                                                    onChange={(e) => setOnset(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastNormal">最後に普通だったのは？</Label>
                                                <Input
                                                    id="lastNormal"
                                                    type="datetime-local"
                                                    value={lastNormal}
                                                    onChange={(e) => setLastNormal(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label>今日の状態</Label>
                                            <div className="space-y-2">
                                                {STATUS_ITEMS.map(item => (
                                                    <div key={item.key} className="flex items-center gap-2">
                                                        <span className="flex items-center gap-1.5 w-16 text-sm">
                                                            {item.icon}
                                                            {item.label}
                                                        </span>
                                                        <div className="flex gap-1.5 flex-1">
                                                            {STATUS_LEVELS.map(level => (
                                                                <button
                                                                    key={level.value}
                                                                    onClick={() => handleStatusChange(item.key, level.value)}
                                                                    className={`flex-1 py-1.5 px-2 text-xs rounded-lg transition-all ${todayStatus[item.key] === level.value
                                                                        ? `${level.color} text-white`
                                                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                                                                        }`}
                                                                >
                                                                    {level.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
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
                                        className="space-y-4"
                                    >
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Step 2: 緊急度チェック</h3>

                                        {/* Ingestion */}
                                        <div className="p-3 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hasIngestion}
                                                    onChange={(e) => setHasIngestion(e.target.checked)}
                                                    className="w-4 h-4 accent-orange-500"
                                                />
                                                <span className="font-medium text-orange-700 dark:text-orange-300">誤食・誤飲の疑いあり</span>
                                            </label>

                                            {hasIngestion && (
                                                <div className="mt-3 space-y-2 pl-6">
                                                    <Input
                                                        placeholder="何を？（例：紐、おもちゃ）"
                                                        value={ingestionDetails.object || ''}
                                                        onChange={(e) => setIngestionDetails(prev => ({ ...prev, object: e.target.value }))}
                                                    />
                                                    <Input
                                                        placeholder="量・長さ（例：5cm、1個）"
                                                        value={ingestionDetails.amount || ''}
                                                        onChange={(e) => setIngestionDetails(prev => ({ ...prev, amount: e.target.value }))}
                                                    />
                                                    <Input
                                                        placeholder="いつ頃？（例：今朝10時頃）"
                                                        value={ingestionDetails.time || ''}
                                                        onChange={(e) => setIngestionDetails(prev => ({ ...prev, time: e.target.value }))}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Emergency Flags */}
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1.5 text-red-600">
                                                <AlertTriangle className="w-4 h-4" />
                                                緊急フラグ
                                            </Label>
                                            {[
                                                { key: 'persistent_vomiting', label: '嘔吐が続いている' },
                                                { key: 'lethargy', label: 'ぐったりしている' },
                                                { key: 'abdominal_pain', label: '腹痛がありそう' },
                                                { key: 'no_excretion', label: '便/尿が出ていない' },
                                            ].map(item => (
                                                <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!emergencyFlags[item.key as keyof EmergencyFlags]}
                                                        onChange={(e) => setEmergencyFlags(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                        className="w-4 h-4 accent-red-500"
                                                    />
                                                    <span className="text-sm">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {/* Abdominal Signs */}
                                        <div className="space-y-2">
                                            <Label>腹痛サイン</Label>
                                            {[
                                                { key: 'refusing_touch', label: '触ると嫌がる' },
                                                { key: 'prayer_pose', label: '祈りのポーズ（前足を伸ばす）' },
                                                { key: 'crouching', label: 'うずくまっている' },
                                            ].map(item => (
                                                <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!abdominalSigns[item.key as keyof AbdominalSigns]}
                                                        onChange={(e) => setAbdominalSigns(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-sm">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Step 3: バイタル情報</h3>

                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                                                <input
                                                    type="checkbox"
                                                    checked={vitalSummary.stool}
                                                    onChange={(e) => setVitalSummary(prev => ({ ...prev, stool: e.target.checked }))}
                                                    className="w-5 h-5"
                                                />
                                                <span>便：あり</span>
                                            </label>
                                            <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                                                <input
                                                    type="checkbox"
                                                    checked={vitalSummary.urine}
                                                    onChange={(e) => setVitalSummary(prev => ({ ...prev, urine: e.target.checked }))}
                                                    className="w-5 h-5"
                                                />
                                                <span>尿：あり</span>
                                            </label>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="vomit">24時間以内の嘔吐回数</Label>
                                            <Input
                                                id="vomit"
                                                type="number"
                                                min="0"
                                                value={vitalSummary.vomit_count}
                                                onChange={(e) => setVitalSummary(prev => ({ ...prev, vomit_count: parseInt(e.target.value) || 0 }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="meal">最終摂食</Label>
                                            <Input
                                                id="meal"
                                                placeholder="例：今朝6時、ドライフード半分"
                                                value={vitalSummary.last_meal || ''}
                                                onChange={(e) => setVitalSummary(prev => ({ ...prev, last_meal: e.target.value }))}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 flex gap-2 p-4 border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                            {step > 1 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(step - 1)}
                                    className="flex-1"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    戻る
                                </Button>
                            )}
                            {step < 3 ? (
                                <Button
                                    onClick={() => setStep(step + 1)}
                                    disabled={!canProceed}
                                    className="flex-1"
                                    style={{ backgroundColor: 'var(--sage)' }}
                                >
                                    次へ
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleComplete}
                                    className="flex-1"
                                    style={{ backgroundColor: 'var(--sage)' }}
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
