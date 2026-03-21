"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Cat as CatIcon, Home, Users, Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { onboardingLogger } from "@/lib/logger";

interface OnboardingScreenProps {
    onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<'welcome' | 'household' | 'cats'>('welcome');
    const [householdName, setHouseholdName] = useState("");
    const [cats, setCats] = useState<{ name: string; avatar: string }[]>([
        { name: "", avatar: "" }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient() as any;

    const catAvatars = ["cat-default", "cat-black", "cat-orange", "cat-gray"];

    async function handleCreateHousehold() {
        if (!householdName.trim() || !user) {
            onboardingLogger.debug('Early return: missing data');
            return;
        }
        setIsSubmitting(true);
        onboardingLogger.debug('Starting setup');

        try {
            // Create household
            onboardingLogger.debug('Creating household...');
            const householdId = crypto.randomUUID();
            const { error: householdError } = await supabase
                .from('households')
                .insert({ id: householdId, name: householdName });
            const household = { id: householdId };

            if (householdError) {
                onboardingLogger.error('Household creation failed:', householdError);
                toast.error("世帯の作成に失敗しました: " + (householdError?.message || 'Unknown error'));
                setIsSubmitting(false);
                return;
            }

            // Ensure user record exists (upsert) before updating household_id
            onboardingLogger.debug('Ensuring user exists...');
            const { error: upsertError } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    household_id: householdId,
                    display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
                }, {
                    onConflict: 'id'
                });

            if (upsertError) {
                onboardingLogger.error('User upsert failed:', upsertError);
                toast.error("ユーザー情報の更新に失敗しました: " + upsertError.message);
                setIsSubmitting(false);
                return;
            }

            onboardingLogger.debug('Creating household membership...');
            const { error: membershipError } = await supabase
                .from('household_members')
                .upsert({
                    household_id: householdId,
                    user_id: user.id,
                    role: 'owner'
                }, {
                    onConflict: 'household_id,user_id'
                });

            if (membershipError) {
                onboardingLogger.error('Household membership failed:', membershipError);
                toast.error("世帯メンバーの作成に失敗しました: " + membershipError.message);
                setIsSubmitting(false);
                return;
            }

            // Create cats (without created_by to avoid FK issues, or use null)
            const validCats = cats.filter(c => c.name.trim());
            onboardingLogger.debug('Creating cats:', validCats.length);
            if (validCats.length > 0) {
                const { error: catsError } = await supabase.from('cats').insert(
                    validCats.map(c => ({
                        household_id: householdId,
                        name: c.name,
                        avatar: c.avatar
                        // Removed created_by to avoid FK constraint issues
                    }))
                );
                if (catsError) onboardingLogger.error('Cats creation error:', catsError);
            }

            // Create default inventory
            onboardingLogger.debug('Creating inventory...');
            await supabase.from('inventory').insert([

                { household_id: household.id, label: '猫砂', range_min: 30, range_max: 45 },
                { household_id: household.id, label: 'フード', range_min: 14, range_max: 21 },
            ]);

            onboardingLogger.debug('Complete!');
            toast.success("セットアップ完了！");

            // Small delay to ensure toast is visible
            setTimeout(() => {
                onComplete();
            }, 500);
        } catch (error) {
            onboardingLogger.error('Unexpected error:', error);
            toast.error("エラーが発生しました");
            setIsSubmitting(false);
        }
    }




    function addCat() {
        setCats([...cats, { name: "", avatar: "" }]);
    }

    function updateCat(index: number, field: 'name' | 'avatar', value: string) {
        const newCats = [...cats];
        newCats[index][field] = value;
        setCats(newCats);
    }

    function removeCat(index: number) {
        if (cats.length > 1) {
            setCats(cats.filter((_, i) => i !== index));
        }
    }

    return (
        <div className="min-h-full bg-gradient-to-br from-background via-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
            {step === 'welcome' && (
                <div className="text-center space-y-6 max-w-sm">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-sage to-emerald-600 flex items-center justify-center shadow-lg">
                            <CatIcon className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">ようこそ！</h1>
                    <p className="text-slate-600">
                        にゃるほどで、ねこのいる暮らしを<br />
                        ためて、とどけて、ふりかえりましょう
                    </p>
                    <Button
                        onClick={() => setStep('household')}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-sage to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold"
                    >
                        はじめる <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            )}

            {step === 'household' && (
                <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-brand-sage/10 flex items-center justify-center">
                            <Home className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">世帯を作成</h2>
                            <p className="text-xs text-slate-500">家族で共有する名前を決めましょう</p>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="例: 中村家"
                        value={householdName}
                        onChange={(e) => setHouseholdName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-brand-sage placeholder:text-slate-400"
                    />

                    <Button
                        onClick={() => setStep('cats')}
                        disabled={!householdName.trim()}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-sage to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold"
                    >
                        次へ <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            )}

            {step === 'cats' && (
                <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-brand-sage/10 flex items-center justify-center">
                            <CatIcon className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">猫を登録</h2>
                            <p className="text-xs text-slate-500">お世話する猫を追加しましょう</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {cats.map((cat, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                        <CatIcon className="w-6 h-6" />
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="猫の名前"
                                    value={cat.name}
                                    onChange={(e) => updateCat(index, 'name', e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-brand-sage placeholder:text-slate-400"
                                />
                                {cats.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeCat(index)}
                                        className="text-slate-400 hover:text-rose-500 text-xl"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addCat}
                        className="w-full py-2 text-sm text-emerald-700 font-medium flex items-center justify-center gap-1"
                    >
                        <Plus className="h-4 w-4" /> 猫ちゃんを追加
                    </button>

                    <Button
                        onClick={handleCreateHousehold}
                        disabled={isSubmitting || cats.every(c => !c.name.trim())}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-sage to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "完了"
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
