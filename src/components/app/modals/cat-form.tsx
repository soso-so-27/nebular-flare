"use client";

import React from "react";
import { X, Camera, Upload, Scale, Pill, Plus, Cat } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatFormProps {
    editingCatId: string | null;
    isLoading: boolean;
    form: {
        name: string;
        setName: (v: string) => void;
        birthday: string;
        setBirthday: (v: string) => void;
        sex: string;
        setSex: (v: string) => void;
        weight: string;
        setWeight: (v: string) => void;
        avatar: string;
        setAvatar: (v: string) => void;
        previewUrls: string[];
        setPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
        backgroundMode: 'random' | 'media' | 'avatar';
        setBackgroundMode: (v: 'random' | 'media' | 'avatar') => void;
        bgPreview: string | null;
        bgFile: File | null;
        neuteredStatus: 'neutered' | 'intact' | 'unknown' | 'not_neutered';
        setNeuteredStatus: (v: 'neutered' | 'intact' | 'unknown' | 'not_neutered') => void;
        livingEnvironment: 'indoor' | 'outdoor' | 'both';
        setLivingEnvironment: (v: 'indoor' | 'outdoor' | 'both') => void;
        fleaTickDate: string;
        setFleaTickDate: (v: string) => void;
        fleaTickProduct: string;
        setFleaTickProduct: (v: string) => void;
        dewormingDate: string;
        setDewormingDate: (v: string) => void;
        dewormingProduct: string;
        setDewormingProduct: (v: string) => void;
        heartwormDate: string;
        setHeartwormDate: (v: string) => void;
        heartwormProduct: string;
        setHeartwormProduct: (v: string) => void;
        lastVaccineDate: string;
        setLastVaccineDate: (v: string) => void;
        vaccineType: string;
        setVaccineType: (v: string) => void;
    };
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFilesSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeFile: (index: number) => void;
    handleBgFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    onCancel: () => void;
    onOpenMedModal: () => void;
    medCount: number;
}

export const CatForm = ({
    editingCatId,
    isLoading,
    form,
    fileInputRef,
    handleFilesSelect,
    removeFile,
    handleBgFileSelect,
    onSubmit,
    onCancel,
    onOpenMedModal,
    medCount
}: CatFormProps) => {
    return (
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
                {form.previewUrls.length > 0 ? (
                    form.previewUrls.map((url, idx) => (
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
                    form.avatar !== "cat-fallback" && (
                        <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                            {form.avatar.startsWith('http') ? (
                                <img src={form.avatar} alt="current" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#1c1c1e]/20">
                                    {form.avatar && form.avatar !== 'cat-fallback' ? (
                                        <span className="text-3xl">{form.avatar}</span>
                                    ) : (
                                        <Cat className="w-8 h-8" />
                                    )}
                                </div>
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
                        value={form.name}
                        onChange={(e) => form.setName(e.target.value)}
                        placeholder="例：タマ"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">性別</label>
                        <select
                            value={form.sex}
                            onChange={(e) => form.setSex(e.target.value)}
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
                            value={form.birthday}
                            onChange={(e) => form.setBirthday(e.target.value)}
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
                            value={form.weight}
                            onChange={(e) => form.setWeight(e.target.value)}
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
                                onClick={() => form.setBackgroundMode(mode)}
                                className={cn(
                                    "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                                    form.backgroundMode === mode
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

                    {form.backgroundMode === 'random' && (
                        <div className="text-xs text-slate-400 px-1">
                            アルバムの写真がランダムで背景になります
                        </div>
                    )}

                    {form.backgroundMode === 'media' && (
                        <div className="space-y-2">
                            <div
                                onClick={() => document.getElementById('bg-file-input')?.click()}
                                className="relative w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 hover:border-primary hover:text-primary transition-colors cursor-pointer overflow-hidden"
                            >
                                {form.bgPreview ? (
                                    form.bgFile?.type.startsWith('video') || form.bgPreview.match(/\.(mp4|webm|mov)$/i) ? (
                                        <video src={form.bgPreview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                    ) : (
                                        <img src={form.bgPreview} alt="bg" className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Upload className="h-6 w-6 mx-auto mb-1" />
                                        <span className="text-xs">動画または画像を選択</span>
                                    </div>
                                )}

                                {form.bgPreview && (
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

                    {form.backgroundMode === 'avatar' && (
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
                                    onClick={() => form.setNeuteredStatus(status)}
                                    className={cn(
                                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                        form.neuteredStatus === status
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
                                    onClick={() => form.setLivingEnvironment(env)}
                                    className={cn(
                                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                        form.livingEnvironment === env
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
                                    value={form.lastVaccineDate}
                                    onChange={(e) => form.setLastVaccineDate(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">種類</label>
                                <input
                                    type="text"
                                    value={form.vaccineType}
                                    onChange={(e) => form.setVaccineType(e.target.value)}
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
                                    value={form.fleaTickDate}
                                    onChange={(e) => form.setFleaTickDate(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">製品名</label>
                                <input
                                    type="text"
                                    value={form.fleaTickProduct}
                                    onChange={(e) => form.setFleaTickProduct(e.target.value)}
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
                                    value={form.heartwormDate}
                                    onChange={(e) => form.setHeartwormDate(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">製品名</label>
                                <input
                                    type="text"
                                    value={form.heartwormProduct}
                                    onChange={(e) => form.setHeartwormProduct(e.target.value)}
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
                                    value={form.dewormingDate}
                                    onChange={(e) => form.setDewormingDate(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">製品名</label>
                                <input
                                    type="text"
                                    value={form.dewormingProduct}
                                    onChange={(e) => form.setDewormingProduct(e.target.value)}
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
                                onClick={onOpenMedModal}
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
                                        {medCount}件
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

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-background/95 pb-2 -mx-4 px-4 border-t border-slate-200 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onCancel}
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
    );
};
