"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Camera,
    Cat,
    CheckCircle2,
    Images,
    Loader2,
    Plus,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PhotoImportWizard } from "@/components/collection/photo-import-wizard";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { AppProvider } from "@/store/app-store";
import { onboardingLogger } from "@/lib/logger";

interface OnboardingScreenProps {
    onComplete: (householdId?: string) => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type CatMode = "single" | "multi";

type CreatedCat = {
    id: string;
    name: string;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    className?: string;
};

const TOTAL_STEPS = 6;

const previewCards = [
    {
        title: "おすわり図鑑",
        description: "くつろいだ時間や、ふとこちらを見た瞬間が集まっていきます。",
        accent: "#E8946A",
    },
    {
        title: "おうち時間図鑑",
        description: "いつもの場所で過ごす姿が、この子らしい記録になっていきます。",
        accent: "#7EB5A6",
    },
];

function PrimaryButton({ children, className = "", ...props }: ButtonProps) {
    return (
        <button
            {...props}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#E8946A] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(232,148,106,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
}

function SecondaryButton({ children, className = "", ...props }: ButtonProps) {
    return (
        <button
            {...props}
            className={`flex h-12 items-center justify-center gap-2 rounded-full border border-[#E4DBD1] bg-white px-5 text-[14px] font-medium text-[#6B6560] transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { user } = useAuth();
    const supabase = createClient() as any;

    const [step, setStep] = useState<Step>(1);
    const [catMode, setCatMode] = useState<CatMode>("single");
    const [catNames, setCatNames] = useState<string[]>([""]);
    const [isPreparing, setIsPreparing] = useState(false);
    const [createdHouseholdId, setCreatedHouseholdId] = useState<string | null>(null);
    const [createdCats, setCreatedCats] = useState<CreatedCat[]>([]);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importedPhotoCount, setImportedPhotoCount] = useState(0);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [analysisDone, setAnalysisDone] = useState(false);

    const validCatNames = useMemo(
        () => catNames.map((name) => name.trim()).filter(Boolean),
        [catNames]
    );

    const primaryCatName = createdCats[0]?.name || validCatNames[0] || "この子";

    const estimatedCatCounts = useMemo(() => {
        if (createdCats.length === 0) return [];
        if (createdCats.length === 1) {
            return [{ name: createdCats[0].name, count: Math.max(importedPhotoCount, 1) }];
        }

        return createdCats.map((cat, index) => {
            const photoTotal = Math.max(importedPhotoCount, createdCats.length);
            const base = Math.floor(photoTotal / createdCats.length);
            const remainder = photoTotal % createdCats.length;

            return {
                name: cat.name,
                count: base + (index < remainder ? 1 : 0),
            };
        });
    }, [createdCats, importedPhotoCount]);

    useEffect(() => {
        if (step !== 4) return;

        setAnalysisProgress(10);
        setAnalysisDone(false);

        const timers = [
            window.setTimeout(() => setAnalysisProgress(34), 500),
            window.setTimeout(() => setAnalysisProgress(61), 1200),
            window.setTimeout(() => setAnalysisProgress(83), 1900),
            window.setTimeout(() => {
                setAnalysisProgress(100);
                setAnalysisDone(true);
            }, 2700),
        ];

        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [step]);

    useEffect(() => {
        if (step !== 6) return;

        const timer = window.setTimeout(() => {
            onComplete(createdHouseholdId ?? undefined);
        }, 900);

        return () => window.clearTimeout(timer);
    }, [createdHouseholdId, onComplete, step]);

    function updateCatName(index: number, value: string) {
        setCatNames((prev) => prev.map((item, i) => (i === index ? value : item)));
    }

    function addCatField() {
        setCatNames((prev) => [...prev, ""]);
    }

    function removeCatField(index: number) {
        setCatNames((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    }

    async function prepareHouseholdAndCats() {
        if (!user) {
            toast.error("ログイン情報を確認できませんでした");
            return false;
        }

        if (createdHouseholdId) {
            return true;
        }

        if (validCatNames.length === 0) {
            toast.error("猫の名前を入力してください");
            return false;
        }

        setIsPreparing(true);
        onboardingLogger.debug("Preparing onboarding household");

        try {
            const householdId = crypto.randomUUID();
            const householdName =
                validCatNames.length === 1
                    ? `${validCatNames[0]}のおうち`
                    : `${validCatNames[0]}たちのおうち`;

            const { error: householdError } = await supabase
                .from("households")
                .insert({ id: householdId, name: householdName });

            if (householdError) throw householdError;

            const { error: userError } = await supabase.from("users").upsert(
                {
                    id: user.id,
                    household_id: householdId,
                    display_name:
                        user.user_metadata?.display_name ||
                        user.user_metadata?.full_name ||
                        user.email?.split("@")[0] ||
                        "User",
                },
                { onConflict: "id" }
            );

            if (userError) throw userError;

            const { error: memberError } = await supabase.from("household_members").upsert(
                {
                    household_id: householdId,
                    user_id: user.id,
                    role: "owner",
                },
                { onConflict: "household_id,user_id" }
            );

            if (memberError) throw memberError;

            const { data: insertedCats, error: catsError } = await supabase
                .from("cats")
                .insert(
                    validCatNames.map((name) => ({
                        household_id: householdId,
                        name,
                        avatar: "",
                    }))
                )
                .select("id, name");

            if (catsError) throw catsError;

            setCreatedHouseholdId(householdId);
            setCreatedCats((insertedCats || []) as CreatedCat[]);
            return true;
        } catch (error: any) {
            onboardingLogger.error("Onboarding setup failed", error);
            toast.error("準備に失敗しました。もう一度お試しください");
            return false;
        } finally {
            setIsPreparing(false);
        }
    }

    function handleNextFromStep1() {
        if (validCatNames.length === 0) {
            toast.error("猫の名前を入力してください");
            return;
        }

        if (catMode === "single") {
            setCatNames([validCatNames[0]]);
        }

        setStep(2);
    }

    async function handleGoToPhotoStep() {
        const ok = await prepareHouseholdAndCats();
        if (ok) {
            setStep(3);
        }
    }

    function handleSkipImport() {
        toast("ホームから、いつでも写真を追加できます");
        setStep(6);
    }

    const analysisSummary =
        estimatedCatCounts.length <= 1
            ? `見つけました！ ${primaryCatName}が${Math.max(importedPhotoCount, 1)}枚`
            : "見つけました！ 写真ごとの候補を確認しましょう";

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#FAF9F7] px-5 pb-8 pt-[max(env(safe-area-inset-top),24px)] text-[#1A1A1A]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(232,148,106,0.18),_transparent_60%)]" />

            <div className="relative mx-auto flex min-h-[calc(100vh-56px)] max-w-md flex-col">
                <div className="mb-6 flex items-center justify-between">
                    <div className="text-[12px] font-medium tracking-[0.12em] text-[#9B9590]">
                        STEP {step} / {TOTAL_STEPS}
                    </div>
                    {step > 1 && step < 6 ? (
                        <button
                            type="button"
                            onClick={() => setStep((current) => Math.max(1, (current - 1) as Step))}
                            className="flex items-center gap-1 text-[13px] font-medium text-[#6B6560]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            戻る
                        </button>
                    ) : (
                        <div className="w-12" />
                    )}
                </div>

                <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-[#E8E5E1]">
                    <motion.div
                        className="h-full rounded-full bg-[#E8946A]"
                        animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    />
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.section
                            key="step-1"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex flex-1 flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="inline-flex rounded-full bg-[#F5D5C3] px-3 py-1 text-[12px] font-medium text-[#A6623E]">
                                        はじめに
                                    </div>
                                    <h1 className="text-[30px] font-bold leading-tight text-[#2E2622]">
                                        あなたの猫のことを
                                        <br />
                                        教えてください
                                    </h1>
                                    <p className="text-[15px] leading-7 text-[#6B6560]">
                                        最初に名前だけ教えてもらえれば大丈夫です。ここから、この子の毎日が少しずつ物語になっていきます。
                                    </p>
                                </div>

                                <div className="space-y-4 rounded-[24px] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                                    <div className="space-y-2">
                                        <div className="text-[13px] font-medium text-[#6B6560]">頭数</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCatMode("single");
                                                    setCatNames((prev) => [prev[0] || ""]);
                                                }}
                                                className={`rounded-2xl border px-4 py-4 text-left transition ${catMode === "single" ? "border-[#E8946A] bg-[#FFF5F0]" : "border-[#E8E0D7] bg-[#FAF9F7]"}`}
                                            >
                                                <div className="text-[15px] font-semibold text-[#2E2622]">1匹</div>
                                                <div className="mt-1 text-[12px] text-[#8A837D]">まずはこの子から始めます</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCatMode("multi");
                                                    if (catNames.length === 1) {
                                                        setCatNames((prev) => [...prev, ""]);
                                                    }
                                                }}
                                                className={`rounded-2xl border px-4 py-4 text-left transition ${catMode === "multi" ? "border-[#E8946A] bg-[#FFF5F0]" : "border-[#E8E0D7] bg-[#FAF9F7]"}`}
                                            >
                                                <div className="text-[15px] font-semibold text-[#2E2622]">複数</div>
                                                <div className="mt-1 text-[12px] text-[#8A837D]">あとから1匹ずつ整えていけます</div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {catNames.map((name, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3F1EE] text-[#E8946A]">
                                                    <Cat className="h-5 w-5" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(event) => updateCatName(index, event.target.value)}
                                                    placeholder={index === 0 ? "猫の名前" : `猫の名前 ${index + 1}`}
                                                    className="h-12 flex-1 rounded-2xl border border-[#E8E0D7] bg-[#FAF9F7] px-4 text-[15px] outline-none placeholder:text-[#B0A8A1] focus:border-[#E8946A]"
                                                />
                                                {catMode === "multi" && catNames.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCatField(index)}
                                                        className="text-[13px] font-medium text-[#8A837D]"
                                                    >
                                                        削除
                                                    </button>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>

                                    {catMode === "multi" ? (
                                        <SecondaryButton type="button" onClick={addCatField} className="w-full">
                                            <Plus className="h-4 w-4" />
                                            名前を追加
                                        </SecondaryButton>
                                    ) : null}
                                </div>
                            </div>

                            <div className="pt-8">
                                <PrimaryButton type="button" onClick={handleNextFromStep1}>
                                    次へ
                                    <ArrowRight className="h-4 w-4" />
                                </PrimaryButton>
                            </div>
                        </motion.section>
                    )}

                    {step === 2 && (
                        <motion.section
                            key="step-2"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex flex-1 flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="inline-flex rounded-full bg-[#F3F1EE] px-3 py-1 text-[12px] font-medium text-[#8A837D]">
                                        最初のアルバム
                                    </div>
                                    <h1 className="text-[30px] font-bold leading-tight text-[#2E2622]">
                                        猫の写真を見つけて
                                        <br />
                                        最初のアルバムを作ります
                                    </h1>
                                    <p className="text-[15px] leading-7 text-[#6B6560]">
                                        写真を選ぶだけで大丈夫です。この子らしい瞬間を集めて、図鑑や発見カードにやさしく整えていきます。
                                    </p>
                                </div>

                                <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_12px_28px_rgba(26,26,26,0.06)]">
                                    <div className="bg-[linear-gradient(135deg,rgba(232,148,106,0.22),rgba(126,181,166,0.12))] px-6 py-7">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/80 text-[#E8946A] shadow-sm">
                                                <Images className="h-7 w-7" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[17px] font-semibold text-[#2E2622]">写真を選ぶと、この子の記録が育ちます</div>
                                                <div className="text-[13px] leading-6 text-[#6B6560]">
                                                    権限は写真を探して最初のアルバムを作るためだけに使います。
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 px-6 py-5 text-[14px] leading-7 text-[#6B6560]">
                                        <div className="flex items-start gap-3">
                                            <Sparkles className="mt-1 h-4 w-4 text-[#E8946A]" />
                                            <p>写っている猫の雰囲気や場所を静かに整理して、あとで見返しやすくします。</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <BookOpen className="mt-1 h-4 w-4 text-[#7EB5A6]" />
                                            <p>積み重なった写真が、図鑑や発見として少しずつ形になります。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-8">
                                <PrimaryButton type="button" onClick={handleGoToPhotoStep} disabled={isPreparing}>
                                    {isPreparing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            準備しています...
                                        </>
                                    ) : (
                                        <>
                                            写真を選ぶ
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </PrimaryButton>
                            </div>
                        </motion.section>
                    )}

                    {step === 3 && (
                        <motion.section
                            key="step-3"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex flex-1 flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="inline-flex rounded-full bg-[#F5D5C3] px-3 py-1 text-[12px] font-medium text-[#A6623E]">
                                        写真を追加
                                    </div>
                                    <h1 className="text-[30px] font-bold leading-tight text-[#2E2622]">
                                        10〜30枚ほど選ぶと
                                        <br />
                                        より豊かな図鑑が作れます
                                    </h1>
                                    <p className="text-[15px] leading-7 text-[#6B6560]">
                                        まずは最近の写真やお気に入りの写真からで十分です。あとから追加していけます。
                                    </p>
                                </div>

                                <div className="rounded-[28px] bg-white p-6 shadow-[0_12px_28px_rgba(26,26,26,0.06)]">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#FFF5F0] text-[#E8946A]">
                                            <Camera className="h-7 w-7" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[18px] font-semibold text-[#2E2622]">写真を選んで、この子の最初のアルバムを作ります</div>
                                            <p className="text-[14px] leading-7 text-[#6B6560]">
                                                写真はホームや図鑑に自然につながっていきます。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-2xl bg-[#FAF7F3] px-4 py-3 text-[13px] leading-6 text-[#8A837D]">
                                        ヒント: 10枚以上選ぶと、より豊かな図鑑が作れます。
                                    </div>

                                    {importedPhotoCount > 0 ? (
                                        <div className="mt-5 rounded-2xl border border-[#E8E0D7] bg-[#FFFCF9] px-4 py-4">
                                            <div className="text-[13px] font-medium text-[#A6623E]">追加済み</div>
                                            <div className="mt-1 text-[20px] font-semibold text-[#2E2622]">
                                                {importedPhotoCount}枚の写真を受け取りました
                                            </div>
                                            <p className="mt-2 text-[13px] leading-6 text-[#6B6560]">
                                                そのまま次へ進むと、この子らしい写真を整えて最初の図鑑を作ります。
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="space-y-3 pt-8">
                                <PrimaryButton type="button" onClick={() => setIsImportOpen(true)}>
                                    写真を選ぶ
                                    <ArrowRight className="h-4 w-4" />
                                </PrimaryButton>

                                {importedPhotoCount > 0 ? (
                                    <SecondaryButton type="button" onClick={() => setStep(4)} className="w-full">
                                        この写真で進む
                                    </SecondaryButton>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={handleSkipImport}
                                    className="w-full text-center text-[13px] font-medium text-[#8A837D]"
                                >
                                    いまはスキップする
                                </button>
                            </div>
                        </motion.section>
                    )}

                    {step === 4 && (
                        <motion.section
                            key="step-4"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex flex-1 flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="inline-flex rounded-full bg-[#EAF3F0] px-3 py-1 text-[12px] font-medium text-[#5F8F82]">
                                        ひもづけ確認
                                    </div>
                                    <h1 className="text-[30px] font-bold leading-tight text-[#2E2622]">
                                        猫を見つけています...
                                    </h1>
                                    <p className="text-[15px] leading-7 text-[#6B6560]">
                                        写真の中から、この子らしい瞬間を集めています。
                                    </p>
                                </div>

                                <div className="rounded-[28px] bg-white p-6 shadow-[0_12px_28px_rgba(26,26,26,0.06)]">
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5F0] text-[#E8946A]">
                                            {analysisDone ? (
                                                <CheckCircle2 className="h-6 w-6" />
                                            ) : (
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-[18px] font-semibold text-[#2E2622]">
                                                {analysisDone ? analysisSummary : "猫を見つけています..."}
                                            </div>
                                            <div className="text-[13px] text-[#8A837D]">
                                                {analysisDone
                                                    ? "必要なところは、あとからやさしく整えていけます。"
                                                    : "写真ごとの候補を静かにまとめています。"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-[#EEE8E2]">
                                        <motion.div
                                            className="h-full rounded-full bg-[#E8946A]"
                                            animate={{ width: `${analysisProgress}%` }}
                                        />
                                    </div>

                                    {analysisDone && estimatedCatCounts.length > 0 ? (
                                        <div className="mt-5 space-y-3">
                                            {estimatedCatCounts.map((item) => (
                                                <div
                                                    key={item.name}
                                                    className="flex items-center justify-between rounded-2xl bg-[#FAF7F3] px-4 py-3"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#E8946A]">
                                                            <Cat className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[15px] font-semibold text-[#2E2622]">{item.name}</div>
                                                            <div className="text-[12px] text-[#8A837D]">あとから調整できます</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[14px] font-semibold text-[#6B6560]">{item.count}枚</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="pt-8">
                                <PrimaryButton type="button" onClick={() => setStep(5)} disabled={!analysisDone}>
                                    次へ
                                    <ArrowRight className="h-4 w-4" />
                                </PrimaryButton>
                            </div>
                        </motion.section>
                    )}

                    {step === 5 && (
                        <motion.section
                            key="step-5"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex flex-1 flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="inline-flex rounded-full bg-[#F3EBDD] px-3 py-1 text-[12px] font-medium text-[#9A7A52]">
                                        最初のアウトプット
                                    </div>
                                    <h1 className="text-[30px] font-bold leading-tight text-[#2E2622]">
                                        この子の物語、
                                        <br />
                                        はじまります
                                    </h1>
                                    <p className="text-[15px] leading-7 text-[#6B6560]">
                                        まずはこんなふうに、この子らしいコレクションが少しずつ育っていきます。
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {previewCards.map((card, index) => (
                                        <div
                                            key={card.title}
                                            className="overflow-hidden rounded-[28px] bg-white shadow-[0_12px_28px_rgba(26,26,26,0.06)]"
                                        >
                                            <div
                                                className="h-2 w-full"
                                                style={{ backgroundColor: card.accent }}
                                            />
                                            <div className="space-y-3 px-5 py-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9B9590]">
                                                            collection
                                                        </div>
                                                        <div className="mt-1 text-[20px] font-semibold text-[#2E2622]">
                                                            {card.title}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-full bg-[#FAF7F3] px-3 py-1 text-[12px] font-medium text-[#6B6560]">
                                                        {Math.min(importedPhotoCount || 1, index + 2)}枚
                                                    </div>
                                                </div>
                                                <p className="text-[14px] leading-7 text-[#6B6560]">
                                                    {card.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-8">
                                <PrimaryButton type="button" onClick={() => setStep(6)}>
                                    ホームへ
                                    <ArrowRight className="h-4 w-4" />
                                </PrimaryButton>
                            </div>
                        </motion.section>
                    )}

                    {step === 6 && (
                        <motion.section
                            key="step-6"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="flex flex-1 flex-col items-center justify-center text-center"
                        >
                            <div className="space-y-6">
                                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#FFF5F0] text-[#E8946A] shadow-[0_8px_24px_rgba(232,148,106,0.18)]">
                                    <CheckCircle2 className="h-12 w-12" />
                                </div>
                                <div className="space-y-3">
                                    <h1 className="text-[30px] font-bold leading-tight text-[#2E2622]">
                                        ホームへ向かっています
                                    </h1>
                                    <p className="text-[15px] leading-7 text-[#6B6560]">
                                        あとからでも、写真を追加しながらこの子の物語を育てていけます。
                                    </p>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>

            {createdHouseholdId && user ? (
                <AppProvider householdId={createdHouseholdId} currentUserId={user.id} isDemo={false}>
                    <PhotoImportWizard
                        isOpen={isImportOpen}
                        onClose={() => setIsImportOpen(false)}
                        onImported={(count) => setImportedPhotoCount(count)}
                        onComplete={() => {
                            setIsImportOpen(false);
                            setStep(4);
                        }}
                    />
                </AppProvider>
            ) : null}
        </div>
    );
}
