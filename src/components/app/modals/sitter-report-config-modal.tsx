"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Utensils, Heart, PawPrint, Home, Info, ShieldAlert, Phone, Cat as CatIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SitterReportData, Cat } from "@/types";

interface SitterReportConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: SitterReportData) => void;
    cats: Cat[];
    initialCatId?: string | null;
}

export function SitterReportConfigModal({ isOpen, onClose, onComplete, cats, initialCatId }: SitterReportConfigModalProps) {
    const [step, setStep] = useState(0); // 0: Cat, 1: Care, 2: Habits, 3: Safety/Contact
    const [selectedCatId, setSelectedCatId] = useState<string | null>(initialCatId || cats[0]?.id || null);

    // Form State
    const [meals, setMeals] = useState({ type: '', amount: '', frequency: '', notes: '' });
    const [snacks, setSnacks] = useState({ allowed: true, types: [] as string[], limit: '' });
    const [toilet, setToilet] = useState({ habit_note: '', cleaning_instructions: '' });

    // Personality & Habits (Smart Suggestions)
    const [highlightHabits, setHighlightHabits] = useState<string[]>([]);
    const [personalityNote, setPersonalityNote] = useState('');
    const [favoriteSpots, setFavoriteSpots] = useState<string[]>([]);
    const [favoriteToys, setFavoriteToys] = useState<string[]>([]);
    const [scaryThings, setScaryThings] = useState<string[]>([]);

    // Health & Safety
    const [healthConcerns, setHealthConcerns] = useState('');
    const [prohibitedItems, setProhibitedItems] = useState<string[]>([]);
    const [emergencyContacts, setEmergencyContacts] = useState({
        vet_name: '',
        vet_phone: '',
        owner_emergency_phone: ''
    });
    const [specialInstructions, setSpecialInstructions] = useState('');

    const selectedCat = useMemo(() => cats.find(c => c.id === selectedCatId), [cats, selectedCatId]);

    // Simple Habit Extraction from Zukan Metadata
    useEffect(() => {
        if (!selectedCat) return;

        const metadataList = selectedCat.images
            ?.map(img => img.aiAnalysis?.metadata)
            .filter(Boolean) || [];

        // Extract common locations
        const locations = metadataList.map(m => m?.location).filter((loc): loc is string => !!loc);
        const uniqueLocations = Array.from(new Set(locations)).slice(0, 3);
        setFavoriteSpots(prev => prev.length === 0 ? uniqueLocations : prev);

        // Extract habits from activity/pose
        const activities = metadataList.map(m => m?.activity).filter((act): act is string => !!act);
        const uniqueActs = Array.from(new Set(activities)).slice(0, 3);
        const suggestedHabits = uniqueActs.map(a => `${a}の様子がよく見られます`);
        setHighlightHabits(prev => prev.length === 0 ? suggestedHabits : prev);

        // Extract items
        const items = metadataList.map(m => m?.items).filter((ite): ite is string => !!ite);
        const uniqueItems = Array.from(new Set(items)).slice(0, 3);
        setFavoriteToys(prev => prev.length === 0 ? uniqueItems : prev);

    }, [selectedCat]);

    const handleComplete = () => {
        if (!selectedCatId) return;
        const data: SitterReportData = {
            cat_id: selectedCatId,
            generated_at: new Date().toISOString(),
            meals,
            snacks,
            toilet,
            highlight_habits: highlightHabits,
            personality_note: personalityNote,
            favorite_spots: favoriteSpots,
            favorite_toys: favoriteToys,
            scary_things: scaryThings,
            health_concerns: healthConcerns,
            prohibited_items: prohibitedItems,
            emergency_contacts: emergencyContacts,
            special_instructions: specialInstructions
        };
        onComplete(data);
    };

    const addTag = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
        if (!val.trim()) return;
        setter(prev => Array.from(new Set([...prev, val.trim()])));
    };

    const removeTag = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
        setter(prev => prev.filter(v => v !== val));
    };

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
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#fafafa] dark:bg-[#1c1c1e] rounded-[32px] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-900 bg-[#fafafa]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">TRANSFER REPORT</h2>
                                <h1 className="text-lg font-black italic">引継ぎレポート設定</h1>
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
                                    className={`w-10 h-0.5 transition-all duration-500 rounded-full ${s === step ? 'bg-black dark:bg-white w-14' : s < step ? 'bg-black/20 dark:bg-white/20' : 'bg-black/5 dark:bg-white/5'}`}
                                />
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 flex-1">
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
                                                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5">
                                                        <CatIcon className="w-full h-full p-4 text-[#1c1c1e]/10" />
                                                        {/* Avatar display logic same as Profile */}
                                                    </div>
                                                    <span className={`font-black text-sm tracking-tight ${selectedCatId === cat.id ? 'text-white dark:text-black' : 'text-slate-500 dark:text-slate-400'}`}>
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
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
                                                <Utensils className="w-3 h-3" /> ごはんとおやつ
                                            </Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-slate-500">フードの種類</Label>
                                                    <Input placeholder="例：カリカリ、パウチ" value={meals.type} onChange={e => setMeals(prev => ({ ...prev, type: e.target.value }))} className="rounded-xl" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-slate-500">1回の量</Label>
                                                    <Input placeholder="例：40g、半分" value={meals.amount} onChange={e => setMeals(prev => ({ ...prev, amount: e.target.value }))} className="rounded-xl" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500">あげるタイミング・回数</Label>
                                                <Input placeholder="例：朝夕2回、10時と18時" value={meals.frequency} onChange={e => setMeals(prev => ({ ...prev, frequency: e.target.value }))} className="rounded-xl" />
                                            </div>
                                            <div className="pt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={snacks.allowed} onChange={e => setSnacks(prev => ({ ...prev, allowed: e.target.checked }))} className="rounded" />
                                                    <span className="text-xs font-bold">おやつをあげても良い</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
                                                <PawPrint className="w-3 h-3" /> トイレ
                                            </Label>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500">トイレの癖・注意点</Label>
                                                <Input placeholder="例：端っこでする、砂をかけない" value={toilet.habit_note} onChange={e => setToilet(prev => ({ ...prev, habit_note: e.target.value }))} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500">掃除の手順</Label>
                                                <Textarea placeholder="例：固まった部分を捨てて、減った分を足す" value={toilet.cleaning_instructions} onChange={e => setToilet(prev => ({ ...prev, cleaning_instructions: e.target.value }))} className="rounded-2xl min-h-[60px]" />
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
                                        className="space-y-6"
                                    >
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex gap-3 border border-amber-100 dark:border-amber-900/20">
                                            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                                            <p className="text-[11px] leading-relaxed text-amber-900/70 dark:text-amber-200/70">
                                                図鑑の記録から、猫ちゃんの「好き」や「癖」をAIが抽出しました。必要に応じて編集してください。
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                                <Heart className="w-3 h-3" /> 性格と好きなこと
                                            </Label>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-slate-500">注目の癖（図鑑から自動抽出）</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {highlightHabits.map(h => (
                                                        <span key={h} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-full text-[10px] font-bold">
                                                            {h} <button onClick={() => removeTag(setHighlightHabits, h)}><X className="w-3 h-3" /></button>
                                                        </span>
                                                    ))}
                                                    <Input
                                                        placeholder="+ 癖を追加"
                                                        className="h-7 text-[10px] w-24 bg-transparent border-dashed"
                                                        onKeyDown={e => { if (e.key === 'Enter') { addTag(setHighlightHabits, e.currentTarget.value); e.currentTarget.value = ''; } }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-slate-500">お気に入りの場所</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {favoriteSpots.map(s => (
                                                        <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-bold">
                                                            {s} <button onClick={() => removeTag(setFavoriteSpots, s)}><X className="w-3 h-3" /></button>
                                                        </span>
                                                    ))}
                                                    <Input
                                                        placeholder="+ 場所を追加"
                                                        className="h-7 text-[10px] w-24 bg-transparent border-dashed"
                                                        onKeyDown={e => { if (e.key === 'Enter') { addTag(setFavoriteSpots, e.currentTarget.value); e.currentTarget.value = ''; } }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">苦手なこと・怖いもの</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {scaryThings.map(s => (
                                                    <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-full text-[10px] font-bold border border-red-100 dark:border-red-900/20">
                                                        {s} <button onClick={() => removeTag(setScaryThings, s)}><X className="w-3 h-3" /></button>
                                                    </span>
                                                ))}
                                                <Input
                                                    placeholder="+ 苦手を追加"
                                                    className="h-7 text-[10px] w-24 bg-transparent border-dashed"
                                                    onKeyDown={e => { if (e.key === 'Enter') { addTag(setScaryThings, e.currentTarget.value); e.currentTarget.value = ''; } }}
                                                />
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
                                        className="space-y-6"
                                    >
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                                                <ShieldAlert className="w-3 h-3" /> 健康と安全
                                            </Label>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500">健康上の懸念・既往歴</Label>
                                                <Textarea placeholder="例：心臓が少し弱いです、アレルギーあり" value={healthConcerns} onChange={e => setHealthConcerns(e.target.value)} className="rounded-2xl" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500">絶対にダメなこと</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {prohibitedItems.map(p => (
                                                        <span key={p} className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white dark:bg-white dark:text-black rounded-full text-[10px] font-bold">
                                                            {p} <button onClick={() => removeTag(setProhibitedItems, p)}><X className="w-3 h-3" /></button>
                                                        </span>
                                                    ))}
                                                    <Input
                                                        placeholder="+ 項目を追加"
                                                        className="h-7 text-[10px] w-24 bg-transparent border-dashed"
                                                        onKeyDown={e => { if (e.key === 'Enter') { addTag(setProhibitedItems, e.currentTarget.value); e.currentTarget.value = ''; } }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                                                <Phone className="w-3 h-3" /> 緊急連絡先
                                            </Label>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500">かかりつけ医</Label>
                                                <Input placeholder="病院名" value={emergencyContacts.vet_name} onChange={e => setEmergencyContacts(prev => ({ ...prev, vet_name: e.target.value }))} className="rounded-xl" />
                                                <Input placeholder="電話番号" value={emergencyContacts.vet_phone} onChange={e => setEmergencyContacts(prev => ({ ...prev, vet_phone: e.target.value }))} className="rounded-xl mt-1" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500">飼い主の緊急連絡先</Label>
                                                <Input placeholder="電話番号" value={emergencyContacts.owner_emergency_phone} onChange={e => setEmergencyContacts(prev => ({ ...prev, owner_emergency_phone: e.target.value }))} className="rounded-xl" />
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
                                    disabled={!selectedCatId}
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
