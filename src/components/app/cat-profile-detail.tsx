"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    X,
    Calendar,
    Scale,
    Cpu,
    FileText,
    Edit,
    Save,
    Cake,
    Camera,
    Trash2,
    Syringe,
    ChevronRight,
    ArrowLeft
} from "lucide-react";
import { format, differenceInYears, differenceInMonths, addYears } from "date-fns";
import { ja } from "date-fns/locale";
import { WeightChart } from "./weight-chart";

interface CatProfileDetailProps {
    isOpen: boolean;
    onClose: () => void;
    catId: string;
}

export function CatProfileDetail({ isOpen, onClose, catId }: CatProfileDetailProps) {
    const { cats, updateCat, addCatWeightRecord, isDemo, settings } = useAppState();
    const cat = cats.find(c => c.id === catId);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        weight: cat?.weight?.toString() || "",
        microchip_id: cat?.microchip_id || "",
        notes: cat?.notes || "",
        birthday: cat?.birthday || "",
        last_vaccine_date: cat?.last_vaccine_date || "",
        vaccine_type: cat?.vaccine_type || ""
    });

    // Reset edit data when cat changes or edit starts
    useEffect(() => {
        if (cat) {
            setEditData({
                weight: cat.weight?.toString() || "",
                microchip_id: cat.microchip_id || "",
                notes: cat.notes || "",
                birthday: cat.birthday || "",
                last_vaccine_date: cat.last_vaccine_date || "",
                vaccine_type: cat.vaccine_type || ""
            });
        }
    }, [cat, isEditing]);

    if (!cat) return null;

    const hasImageAvatar = cat.avatar?.startsWith('http') || cat.avatar?.startsWith('/');
    const isIsland = settings.layoutType === 'v2-island';

    // Safe date formatter
    const safeFormat = (dateStr: string | undefined | null, formatStr: string) => {
        if (!dateStr) return null;
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;
            return format(date, formatStr, { locale: ja });
        } catch (e) {
            return null;
        }
    };

    const getAgeText = () => {
        if (!cat.birthday) return cat.age;
        try {
            const birthDate = new Date(cat.birthday);
            if (isNaN(birthDate.getTime())) return cat.age;
            const now = new Date();
            const years = differenceInYears(now, birthDate);
            const months = differenceInMonths(now, birthDate) % 12;

            if (years === 0) return `${months}ヶ月`;
            if (months === 0) return `${years}歳`;
            return `${years}歳${months}ヶ月`;
        } catch (e) {
            return cat.age;
        }
    };

    const handleSave = async () => {
        const updates = {
            microchip_id: editData.microchip_id || undefined,
            notes: editData.notes || undefined,
            birthday: editData.birthday || undefined,
            last_vaccine_date: editData.last_vaccine_date || undefined,
            vaccine_type: editData.vaccine_type || undefined
        };

        if (isDemo) {
            toast.success("プロフィールを更新しました（デモ）");
        } else {
            const result = await updateCat(catId, updates);
            if (result?.error) {
                toast.error("更新に失敗しました");
                return;
            }
            toast.success("プロフィールを更新しました");
        }
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (!confirm("本当にこの猫を削除しますか？\n※データはアーカイブされます")) return;
        if (isDemo) {
            toast.success("猫を削除しました（デモ）");
            onClose();
            return;
        }
        const result = await updateCat(catId, { deleted_at: new Date().toISOString() } as any);
        if (result?.error) {
            toast.error("削除に失敗しました");
            return;
        }
        toast.success("猫を削除しました");
        onClose();
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    key={catId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
                >
                    {/* Immersive Glass Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xl"
                        onClick={onClose}
                    />

                    {/* Background Content (Large blurred avatar) */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                        {hasImageAvatar ? (
                            <img src={cat.avatar} className="w-full h-full object-cover scale-110 blur-3xl" alt="" />
                        ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[40vh] blur-3xl grayscale opacity-30">
                                {cat.avatar || "🐈"}
                            </div>
                        )}
                    </div>

                    {/* Main Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                            "relative w-full h-full sm:w-[500px] sm:h-[85vh] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col",
                            isIsland ? "bg-white/5 border border-white/10" : "bg-slate-900",
                            "backdrop-blur-md"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Navigation */}
                        <div className="absolute top-0 inset-x-0 z-10 flex justify-between items-center p-4">
                            <button
                                onClick={isEditing ? () => setIsEditing(false) : onClose}
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all active:scale-90"
                            >
                                {isEditing ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </button>

                            <h2 className="text-white font-bold text-lg opacity-80">
                                {isEditing ? "プロフィール編集" : "ねこプロフィール"}
                            </h2>

                            <button
                                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                                className={cn(
                                    "p-2.5 rounded-full transition-all active:scale-90",
                                    isEditing
                                        ? "bg-sage text-white shadow-[0_0_20px_rgba(168,187,148,0.4)]"
                                        : "bg-white/10 text-white hover:bg-white/20"
                                )}
                            >
                                {isEditing ? <Save className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Top Hero Section */}
                        <div className="relative pt-20 pb-8 flex flex-col items-center shrink-0">
                            {/* Avatar Ring */}
                            <div className="relative group">
                                <motion.div
                                    className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl relative z-0"
                                    layoutId={`cat-avatar-${catId}`}
                                >
                                    {hasImageAvatar ? (
                                        <img src={cat.avatar} className="w-full h-full object-cover" alt={cat.name} />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-6xl">
                                            {cat.avatar || "🐈"}
                                        </div>
                                    )}
                                </motion.div>
                                {!isEditing && (
                                    <div className="absolute -bottom-1 -right-1 bg-sage p-2.5 rounded-full border-4 border-slate-900 text-white shadow-lg">
                                        <Camera className="w-4 h-4" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 text-center">
                                <h1 className="text-3xl font-black text-white tracking-tight">{cat.name}</h1>
                                <div className="mt-2 flex items-center justify-center gap-2">
                                    <span className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-xs font-bold backdrop-blur-md">
                                        {cat.sex === "オス" ? "♂ 男の子" : "♀ 女の子"}
                                    </span>
                                    <span className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-xs font-bold backdrop-blur-md text-slate-300">
                                        {getAgeText()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Scrolling Content Area */}
                        <div
                            className="flex-1 overflow-y-auto px-6 pb-32 space-y-6 scroll-smooth scrollbar-hide"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            <style jsx>{`
                                div::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>

                            {isEditing ? (
                                <div className="space-y-4 animate-in fade-in duration-500">
                                    <EditSection title="基本情報" icon={<FileText className="w-4 h-4" />}>
                                        <InputField
                                            label="誕生日"
                                            type="date"
                                            value={editData.birthday}
                                            onChange={(v) => setEditData({ ...editData, birthday: v })}
                                        />
                                        <InputField
                                            label="マイクロチップID"
                                            type="text"
                                            placeholder="15桁の数字"
                                            value={editData.microchip_id}
                                            onChange={(v) => setEditData({ ...editData, microchip_id: v })}
                                        />
                                    </EditSection>

                                    <EditSection title="ワクチン情報" icon={<Syringe className="w-4 h-4" />}>
                                        <InputField
                                            label="直近の接種日"
                                            type="date"
                                            value={editData.last_vaccine_date}
                                            onChange={(v) => setEditData({ ...editData, last_vaccine_date: v })}
                                        />
                                        <InputField
                                            label="ワクチンの種類"
                                            type="text"
                                            placeholder="3種、5種、エイズなど"
                                            value={editData.vaccine_type}
                                            onChange={(v) => setEditData({ ...editData, vaccine_type: v })}
                                        />
                                    </EditSection>

                                    <EditSection title="メモ" icon={<FileText className="w-4 h-4" />}>
                                        <textarea
                                            value={editData.notes}
                                            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                            className="w-full text-sm bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-sage outline-none min-h-[100px] resize-none"
                                            placeholder="猫の性格や特徴、気をつけていること..."
                                        />
                                    </EditSection>

                                    <div className="pt-6">
                                        <button
                                            onClick={handleDelete}
                                            className="w-full py-4 text-sm font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-2xl border border-red-400/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            この猫を削除する
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {/* Stats Summary */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <GlassStat
                                            label="現在の体重"
                                            value={cat.weight ? `${cat.weight}kg` : "---"}
                                            icon={<Scale className="w-4 h-4" />}
                                        />
                                        <GlassStat
                                            label="誕生日"
                                            value={cat.birthday ? format(new Date(cat.birthday), 'M月d日') : "未設定"}
                                            icon={<Cake className="w-4 h-4" />}
                                        />
                                    </div>

                                    {/* Vaccine Status Card */}
                                    <GlassCard className="p-5 flex items-center justify-between group cursor-pointer active:scale-95 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-sage/20 border border-sage/40 flex items-center justify-center">
                                                <Syringe className="w-6 h-6 text-sage" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-white/50 font-bold uppercase tracking-wider">最新のワクチン</div>
                                                <div className="text-lg font-bold text-white">
                                                    {safeFormat(cat.last_vaccine_date, 'yyyy/MM/dd') || "未接種"}
                                                </div>
                                                {cat.vaccine_type && (
                                                    <div className="text-xs text-white/30 font-medium">種類: {cat.vaccine_type}</div>
                                                )}
                                            </div>
                                        </div>
                                        {cat.last_vaccine_date && (
                                            <div className="text-right">
                                                <div className="text-[10px] text-white/30 font-bold uppercase">次回の目安</div>
                                                <div className="text-sm font-black text-white/60">
                                                    {safeFormat(addYears(new Date(cat.last_vaccine_date), 1).toISOString(), 'yyyy/MM')}
                                                </div>
                                            </div>
                                        )}
                                    </GlassCard>

                                    {/* Medical & Chips */}
                                    <GlassCard className="overflow-hidden">
                                        <InfoRow
                                            label="マイクロチップID"
                                            value={cat.microchip_id || "未登録"}
                                            icon={<Cpu className="w-4 h-4" />}
                                        />
                                        <div className="h-px bg-white/5" />
                                        <div className="p-4 space-y-2">
                                            <div className="flex items-center gap-2 text-white/40">
                                                <FileText className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">メモ</span>
                                            </div>
                                            <p className="text-sm text-white/80 leading-relaxed italic">
                                                {cat.notes || "性格や特徴の記録はまだありません。右上のアイコンから編集できます。"}
                                            </p>
                                        </div>
                                    </GlassCard>

                                    {/* Weight History Chart */}
                                    <GlassCard className="p-5">
                                        <WeightChart
                                            variant="glass"
                                            catId={catId}
                                            currentWeight={cat.weight || undefined}
                                            weightHistory={cat.weightHistory || []}
                                            onAddWeight={(w, n) => addCatWeightRecord(catId, w, n)}
                                            isDemo={isDemo}
                                        />
                                    </GlassCard>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// --- Internal Components for Immersive UI ---

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("bg-white/5 border border-white/10 rounded-[2rem] shadow-xl backdrop-blur-md", className)}>
            {children}
        </div>
    );
}

function GlassStat({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <GlassCard className="p-4 border-white/5 bg-white/[0.03]">
            <div className="flex items-center gap-2 text-white/40 mb-1">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-lg font-black text-white">{value}</div>
        </GlassCard>
    );
}

function InfoRow({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between p-4 bg-white/[0.02]">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                    {icon}
                </div>
                <div className="text-xs font-bold text-white/40 uppercase tracking-wider">{label}</div>
            </div>
            <div className="text-sm font-mono font-bold text-white/80">{value}</div>
        </div>
    );
}

function EditSection({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-white/30 px-2">
                {icon}
                <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
                {children}
            </div>
        </div>
    );
}

function InputField({ label, type, placeholder, value, onChange }: {
    label: string,
    type: string,
    placeholder?: string,
    value: string,
    onChange: (v: string) => void
}) {
    return (
        <div className="space-y-2">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">{label}</div>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-sage outline-none transition-all placeholder:text-white/20"
            />
        </div>
    );
}
