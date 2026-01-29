"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { X, Plus, Pencil, Trash2, Cat, Calendar, Camera, Upload, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MedicationLogModal } from "./medication-log-modal";
import { Pill } from "lucide-react";
import { useCatForm } from "@/hooks/use-cat-form";

interface CatSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CatSettingsModal({ isOpen, onClose }: CatSettingsModalProps) {
    const { cats, householdId, isDemo, medicationLogs } = useAppState();
    const [isMedModalOpen, setIsMedModalOpen] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const {
        viewMode, setViewMode, editingCatId, isLoading,
        form: {
            name, setName, birthday, setBirthday, sex, setSex, weight, setWeight, avatar, setAvatar,
            selectedFiles, setSelectedFiles, previewUrls, setPreviewUrls,
            backgroundMode, setBackgroundMode, backgroundMedia, setBackgroundMedia,
            bgFile, setBgFile, bgPreview, setBgPreview,
            neuteredStatus, setNeuteredStatus, livingEnvironment, setLivingEnvironment,
            fleaTickDate, setFleaTickDate, fleaTickProduct, setFleaTickProduct,
            dewormingDate, setDewormingDate, dewormingProduct, setDewormingProduct,
            heartwormDate, setHeartwormDate, heartwormProduct, setHeartwormProduct,
            lastVaccineDate, setLastVaccineDate, vaccineType, setVaccineType
        },
        resetForm, handleSubmit, handleDelete, startEdit, startAdd: hookStartAdd
    } = useCatForm();

    const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        setSelectedFiles(prev => [...prev, ...newFiles]);

        // Create previews
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviews]);

        // If no avatar set yet (or it's default emoji), set first format as avatar
        if (avatar === "🐈" && newPreviews.length > 0) {
            setAvatar(newPreviews[0]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => {
            const newUrls = prev.filter((_, i) => i !== index);
            if (avatar === prev[index]) {
                if (newUrls.length > 0) setAvatar(newUrls[0]);
                else setAvatar("🐈");
            }
            return newUrls;
        });
    };

    const handleBgFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setBgFile(file);
        setBgPreview(URL.createObjectURL(file));
        setBackgroundMode('media'); // Auto switch to media mode
    };

    const onSubmit = async () => {
        await handleSubmit(() => {
            // On success (editing), we might want to close, or just reset form if adding
            if (editingCatId) {
                onClose();
            }
        });
    };

    // Wrapper for Hook's startAdd to match expected signature if needed or just use directly
    const startAdd = () => {
        hookStartAdd();
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-[2px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background/85 backdrop-blur-xl border border-white/40 dark:border-white/10 w-full max-w-md max-h-[90vh] sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/20 dark:border-white/5 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Cat className="h-5 w-5 text-primary" />
                                {viewMode === 'list' ? '猫を管理' : (editingCatId ? '猫を編集' : '猫を追加')}
                            </h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto flex-1">
                            {viewMode === 'list' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        {cats.map(cat => (
                                            <div
                                                key={cat.id}
                                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                                                        {cat.avatar?.startsWith('http') ? (
                                                            <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-2xl">{cat.avatar || "🐈"}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{cat.name}</p>
                                                        <p className="text-xs text-slate-500">{cat.age} • {cat.sex}</p>
                                                    </div>
                                                </div>
                                                {!isDemo && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(cat)}
                                                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        >
                                                            <Pencil className="h-4 w-4 text-slate-500" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(cat.id, cat.name)}
                                                            className="p-2 rounded-lg hover:bg-brand-lavender/10 dark:hover:bg-brand-lavender/20"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-brand-lavender" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {!isDemo && (
                                        <button
                                            type="button"
                                            onClick={startAdd}
                                            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            猫を追加
                                        </button>
                                    )}
                                    {isDemo && (
                                        <p className="text-xs text-slate-400 text-center">
                                            デモモードでは編集できません
                                        </p>
                                    )}
                                </div>
                            ) : (
                                // Form View
                                <div className="space-y-4">
                                    {/* Photo Upload Area */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary hover:text-primary transition-colors bg-slate-50 dark:bg-slate-800"
                                        >
                                            <Camera className="h-6 w-6" />
                                            <span className="text-[10px] font-bold">写真を追加</span>
                                        </button>
                                        {previewUrls.length > 0 ? (
                                            previewUrls.map((url, idx) => (
                                                <div key={idx} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeFile(idx)}
                                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                    {idx === 0 && (
                                                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                                                            メイン
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            // Show current avatar if no new files selected
                                            avatar !== "🐈" && (
                                                <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                    {avatar.startsWith('http') ? (
                                                        <img src={avatar} alt="current" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-3xl">{avatar}</div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFilesSelect}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500">名前</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="例：タマ"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">性別</label>
                                                <select
                                                    value={sex}
                                                    onChange={(e) => setSex(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                >
                                                    <option value="オス">オス ♂</option>
                                                    <option value="メス">メス ♀</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">誕生日（推定）</label>
                                                <input
                                                    type="date"
                                                    value={birthday}
                                                    onChange={(e) => setBirthday(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {!editingCatId && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <Scale className="h-3 w-3" />
                                                    現在の体重 (kg)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={weight}
                                                    onChange={(e) => setWeight(e.target.value)}
                                                    placeholder="例：4.5"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Background Settings Section */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-xs font-bold text-slate-500 block mb-2">ホーム背景</label>
                                        <div className="space-y-3">
                                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                                {(['random', 'media', 'avatar'] as const).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setBackgroundMode(mode)}
                                                        className={cn(
                                                            "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                                                            backgroundMode === mode
                                                                ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                        )}
                                                    >
                                                        {mode === 'random' && "ランダム"}
                                                        {mode === 'media' && "固定 (動画OK)"}
                                                        {mode === 'avatar' && "アバター"}
                                                    </button>
                                                ))}
                                            </div>

                                            {backgroundMode === 'random' && (
                                                <div className="text-xs text-slate-400 px-1">
                                                    アルバムの写真がランダムで背景になります
                                                </div>
                                            )}

                                            {backgroundMode === 'media' && (
                                                <div className="space-y-2">
                                                    <div
                                                        onClick={() => document.getElementById('bg-file-input')?.click()}
                                                        className="relative w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 hover:border-primary hover:text-primary transition-colors cursor-pointer overflow-hidden"
                                                    >
                                                        {bgPreview ? (
                                                            bgFile?.type.startsWith('video') || bgPreview.match(/\.(mp4|webm|mov)$/i) ? (
                                                                <video src={bgPreview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                                            ) : (
                                                                <img src={bgPreview} alt="bg" className="w-full h-full object-cover" />
                                                            )
                                                        ) : (
                                                            <div className="text-center text-slate-400">
                                                                <Upload className="h-6 w-6 mx-auto mb-1" />
                                                                <span className="text-xs">動画または画像を選択</span>
                                                            </div>
                                                        )}

                                                        {/* Label overlay if preview exists */}
                                                        {bgPreview && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                                                                <span className="text-white text-xs font-bold">変更する</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="bg-file-input"
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*,video/*"
                                                        onChange={handleBgFileSelect}
                                                    />

                                                    {/* Upload Guidelines */}
                                                    <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg space-y-1 mt-2">
                                                        <p className="font-bold flex items-center gap-1">
                                                            <Upload className="h-3 w-3" />
                                                            動画アップロードのヒント
                                                        </p>
                                                        <ul className="list-disc list-inside space-y-0.5 ml-1 opacity-80">
                                                            <li>推奨サイズ: 50MB以下（Wi-Fi推奨）</li>
                                                            <li>推奨長さ: 10〜15秒のループ素材</li>
                                                            <li>スマホ全画面向けに<strong>縦型動画</strong>がおすすめです</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}

                                            {backgroundMode === 'avatar' && (
                                                <div className="text-xs text-slate-400 px-1">
                                                    現在のアバター写真が常に背景になります
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Medical & Prevention Section */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-xs font-bold text-slate-500 block mb-2">医療・予防情報</label>
                                        <div className="space-y-4">
                                            {/* Neutered Status */}
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-500">避妊・去勢</label>
                                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                                    {(['neutered', 'intact', 'unknown'] as const).map((status) => (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            onClick={() => setNeuteredStatus(status)}
                                                            className={cn(
                                                                "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                                                neuteredStatus === status
                                                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                            )}
                                                        >
                                                            {status === 'neutered' ? '済み' : (status === 'intact' ? '未' : '不明')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Living Environment */}
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-500">生活環境</label>
                                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                                    {(['indoor', 'outdoor', 'both'] as const).map((env) => (
                                                        <button
                                                            key={env}
                                                            type="button"
                                                            onClick={() => setLivingEnvironment(env)}
                                                            className={cn(
                                                                "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                                                livingEnvironment === env
                                                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                            )}
                                                        >
                                                            {env === 'indoor' ? '室内のみ' : (env === 'outdoor' ? '室外のみ' : '内外両方')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Prevention History */}
                                            <div className="space-y-3">
                                                {/* Vaccine */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">最終ワクチン日</label>
                                                        <input
                                                            type="date"
                                                            value={lastVaccineDate}
                                                            onChange={(e) => setLastVaccineDate(e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">種類</label>
                                                        <input
                                                            type="text"
                                                            value={vaccineType}
                                                            onChange={(e) => setVaccineType(e.target.value)}
                                                            placeholder="3種等"
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Flea & Tick */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">ノミダニ予防</label>
                                                        <input
                                                            type="date"
                                                            value={fleaTickDate}
                                                            onChange={(e) => setFleaTickDate(e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">製品名</label>
                                                        <input
                                                            type="text"
                                                            value={fleaTickProduct}
                                                            onChange={(e) => setFleaTickProduct(e.target.value)}
                                                            placeholder="レボリューション等"
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Heartworm */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">フィラリア予防</label>
                                                        <input
                                                            type="date"
                                                            value={heartwormDate}
                                                            onChange={(e) => setHeartwormDate(e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">製品名</label>
                                                        <input
                                                            type="text"
                                                            value={heartwormProduct}
                                                            onChange={(e) => setHeartwormProduct(e.target.value)}
                                                            placeholder="ミルベマックス等"
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Deworming */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">お腹の虫/駆虫</label>
                                                        <input
                                                            type="date"
                                                            value={dewormingDate}
                                                            onChange={(e) => setDewormingDate(e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">製品名</label>
                                                        <input
                                                            type="text"
                                                            value={dewormingProduct}
                                                            onChange={(e) => setDewormingProduct(e.target.value)}
                                                            placeholder="ドロンタール等"
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Medications Section */}
                                            {editingCatId && (
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-500">継続的な投薬（治療中）</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsMedModalOpen(true)}
                                                        className="w-full p-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                                                                <Pill className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">投薬スケジュール管理</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                                                {medicationLogs.filter(l => l.cat_id === editingCatId).length}件
                                                            </span>
                                                            <Plus className="h-4 w-4 text-slate-400" />
                                                        </div>
                                                    </button>
                                                </div>
                                            )}

                                            <p className="text-[10px] text-slate-400 leading-tight">
                                                💉 これらは直近の記録です。詳細な履歴や将来の予定は、各「できごと」として記録・管理することをおすすめします。
                                            </p>
                                        </div>
                                    </div>

                                    {editingCatId && (
                                        <MedicationLogModal
                                            isOpen={isMedModalOpen}
                                            onClose={() => setIsMedModalOpen(false)}
                                            catId={editingCatId}
                                        />
                                    )}

                                    {/* Action Buttons */}
                                    <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-background/95 pb-2 -mx-4 px-4 border-t border-slate-200 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            disabled={isLoading}
                                            className="px-4 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onSubmit}
                                            disabled={isLoading}
                                            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            {editingCatId ? "更新する" : "追加する"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
