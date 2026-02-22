"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Camera, X, Clock, Star, Send, ChevronDown, Cat } from "lucide-react";
import { ReactionBar } from '../shared/reaction-bar';
import { cn, getFullImageUrl } from "@/lib/utils";
import { useSettingsContext } from "@/store/app-store";
import { useIncidentDetail, STATUS_OPTIONS } from '@/hooks/use-incident-detail';

type IncidentDetailModalProps = {
    isOpen: boolean;
    onClose: () => void;
    incidentId: string;
};

export function IncidentDetailModal({ isOpen, onClose, incidentId }: IncidentDetailModalProps) {
    const { settings } = useSettingsContext();
    const {
        incident,
        cat,
        typeLabel,
        statusOption,
        loading,
        updateNote,
        setUpdateNote,
        statusChange,
        setStatusChange,
        previewUrls,
        fileInputRef,
        handleFileChange,
        removePhoto,
        handleAddUpdate,
        handleResolve,
        addReaction,
        removeReaction,
        toggleBookmark,
        currentUserId,
    } = useIncidentDetail(incidentId, onClose);

    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const isIsland = settings.layoutType === 'v2-island';

    if (!incident) return null;

    const sheetVariants = {
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring" as const, damping: 30, stiffness: 250 } },
        exit: { y: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 250 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[10000] bg-[#4E342E]/10 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed bottom-0 inset-x-0 z-[10001] pointer-events-auto"
                    >
                        <div className="bg-[#fefefe] rounded-t-[40px] flex flex-col w-full max-h-[90vh] border-t border-black/5 shadow-[0_-8px_40px_rgba(78,52,46,0.1)] overflow-hidden">
                            {/* Handle */}
                            <div className="w-full flex justify-center pt-4 pb-2">
                                <div className="w-10 h-1.5 rounded-full bg-black/5" />
                            </div>

                            {/* Header */}
                            {/* Header */}
                            <div className="px-8 py-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#f0f0f0] overflow-hidden border border-black/5 shadow-sm">
                                        {cat?.avatar ? (
                                            <img src={getFullImageUrl(cat.avatar)} alt={cat?.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#1c1c1e]/20">
                                                <Cat className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-[22px] font-black text-[#1c1c1e] tracking-tight">{typeLabel}</h1>
                                        <p className="text-xs text-[#1c1c1e]/40 font-bold">
                                            {cat?.name} · {new Date(incident.created_at).toLocaleDateString('ja-JP')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleBookmark(incidentId)}
                                        className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                                            incident.is_bookmarked
                                                ? "bg-brand-peach/20 text-brand-peach"
                                                : "bg-black/5 text-[#1c1c1e]/40 hover:text-[#1c1c1e]/60"
                                        )}
                                    >
                                        <Star size={16} fill={incident.is_bookmarked ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center active:bg-black/10 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-[#1c1c1e]/40" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 pb-[env(safe-area-inset-bottom,24px)] space-y-4">
                                {/* Status + Reaction Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border",
                                            statusOption?.color === 'bg-slate-400'
                                                ? 'bg-black/5 text-[#1c1c1e]/50 border-black/5'
                                                : statusOption?.color === 'bg-brand-peach'
                                                    ? 'bg-brand-peach/15 text-brand-peach border-brand-peach/20'
                                                    : 'bg-teal-500/15 text-teal-600 border-teal-500/20'
                                        )}>
                                            {statusOption?.label}
                                        </span>
                                        {incident.status !== 'resolved' && (
                                            <button
                                                onClick={handleResolve}
                                                disabled={loading}
                                                className="px-3 py-1 rounded-full text-[10px] font-black text-teal-600 bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-all active:scale-95"
                                            >
                                                解決済みにする
                                            </button>
                                        )}
                                    </div>
                                    <ReactionBar
                                        incidentId={incidentId}
                                        reactions={incident.reactions || []}
                                        currentUserId={currentUserId || ''}
                                        onAddReaction={(emoji) => addReaction(incidentId, emoji)}
                                        onRemoveReaction={(emoji) => removeReaction(incidentId, emoji)}
                                    />
                                </div>

                                {/* Initial Note */}
                                {incident.note && (
                                    <div className="bg-black/[0.02] rounded-[20px] p-4 border border-[#f0f0f0]">
                                        <p className="text-[10px] font-black text-[#1c1c1e]/30 uppercase tracking-widest mb-2">メモ</p>
                                        <p className="text-sm text-[#1c1c1e]/80 whitespace-pre-wrap leading-relaxed">{incident.note}</p>

                                        {/* Main Incident Photos */}
                                        {incident.photos && incident.photos.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {incident.photos.map((photo: string, index: number) => (
                                                    <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/5">
                                                        <img
                                                            src={getFullImageUrl(photo)}
                                                            alt={`Photo ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Updates Timeline */}
                                {incident.updates && incident.updates.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-[#1c1c1e]/30 uppercase tracking-widest px-1">更新履歴</p>
                                        {incident.updates.map((update: any) => (
                                            <div
                                                key={update.id}
                                                className="bg-black/[0.02] rounded-[20px] p-3.5 border border-[#f0f0f0] space-y-2"
                                            >
                                                <div className="flex items-center gap-2 text-[10px] text-[#1c1c1e]/30 font-bold">
                                                    {update.user_avatar ? (
                                                        <img src={getFullImageUrl(update.user_avatar)} alt="" className="w-5 h-5 rounded-full object-cover border border-black/5" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center text-[8px]">👤</div>
                                                    )}
                                                    <span className="text-[#1c1c1e]/60 font-bold">{update.user_name || '家族'}</span>
                                                    <span className="text-[#1c1c1e]/20">·</span>
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(update.created_at).toLocaleString('ja-JP')}
                                                </div>
                                                {update.status_change && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-[#1c1c1e]/40">ステータス →</span>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[9px] font-black border",
                                                            STATUS_OPTIONS.find(s => s.id === update.status_change)?.color === 'bg-brand-peach'
                                                                ? 'bg-brand-peach/15 text-brand-peach border-brand-peach/20'
                                                                : STATUS_OPTIONS.find(s => s.id === update.status_change)?.color === 'bg-teal-500'
                                                                    ? 'bg-teal-500/15 text-teal-600 border-teal-500/20'
                                                                    : 'bg-black/5 text-[#1c1c1e]/50 border-black/5'
                                                        )}>
                                                            {STATUS_OPTIONS.find(s => s.id === update.status_change)?.label}
                                                        </span>
                                                    </div>
                                                )}
                                                {update.note && (
                                                    <p className="text-sm text-[#1c1c1e]/80 whitespace-pre-wrap">{update.note}</p>
                                                )}

                                                {/* Update Photos */}
                                                {update.photos && update.photos.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {update.photos.map((photo: string, index: number) => (
                                                            <div key={index} className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/5">
                                                                <img
                                                                    src={getFullImageUrl(photo)}
                                                                    alt={`Update Photo ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Update Form */}
                                <div className="space-y-3 pt-2">
                                    <p className="text-[10px] font-black text-[#1c1c1e]/30 uppercase tracking-widest px-1">気づき・経過を記録</p>

                                    <textarea
                                        placeholder="経過や変化を記録..."
                                        value={updateNote}
                                        onChange={(e) => setUpdateNote(e.target.value)}
                                        className="w-full bg-black/[0.02] border border-[#f0f0f0] rounded-[20px] px-4 py-3 text-sm text-[#1c1c1e] placeholder:text-[#1c1c1e]/30 resize-none focus:outline-none focus:ring-1 focus:ring-brand-peach/30 min-h-[70px]"
                                    />

                                    {/* Controls Row */}
                                    <div className="flex items-center gap-2">
                                        {/* Status Picker */}
                                        <div className="relative flex-1">
                                            <button
                                                onClick={() => setShowStatusPicker(prev => !prev)}
                                                className={cn(
                                                    "w-full h-10 rounded-xl flex items-center justify-between px-3 text-[12px] font-bold transition-all border",
                                                    statusChange && statusChange !== 'no_change'
                                                        ? "bg-brand-peach/15 text-brand-peach border-brand-peach/20"
                                                        : "bg-black/[0.02] text-[#1c1c1e]/40 border-[#f0f0f0]"
                                                )}
                                            >
                                                <span>
                                                    {statusChange && statusChange !== 'no_change'
                                                        ? STATUS_OPTIONS.find(s => s.id === statusChange)?.label
                                                        : "ステータス変更"
                                                    }
                                                </span>
                                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showStatusPicker && "rotate-180")} />
                                            </button>
                                            <AnimatePresence>
                                                {showStatusPicker && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[#f0f0f0] rounded-xl overflow-hidden shadow-xl z-10"
                                                    >
                                                        <button
                                                            onClick={() => { setStatusChange('no_change'); setShowStatusPicker(false); }}
                                                            className="w-full px-3 py-2 text-left text-[12px] font-bold text-[#1c1c1e]/40 hover:bg-black/5 transition-colors"
                                                        >
                                                            変更なし
                                                        </button>
                                                        {STATUS_OPTIONS.filter(s => s.id !== incident.status).map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => { setStatusChange(opt.id); setShowStatusPicker(false); }}
                                                                className={cn(
                                                                    "w-full px-3 py-2 text-left text-[12px] font-bold hover:bg-black/5 transition-colors",
                                                                    statusChange === opt.id ? "text-brand-peach" : "text-[#1c1c1e]/60"
                                                                )}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Photo Button */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-10 w-10 rounded-xl bg-black/5 border border-[#f0f0f0] flex items-center justify-center text-[#1c1c1e]/40 hover:text-[#1c1c1e]/60 hover:bg-black/10 transition-all active:scale-95 shrink-0"
                                        >
                                            <Camera size={16} />
                                        </button>

                                        {/* Submit Button */}
                                        <button
                                            onClick={handleAddUpdate}
                                            disabled={loading}
                                            className="h-10 w-10 rounded-xl bg-brand-peach flex items-center justify-center text-white shadow-lg shadow-brand-peach/20 active:scale-90 transition-all shrink-0 disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Photo Previews */}
                                    {previewUrls.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {previewUrls.map((url, i) => (
                                                <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/5">
                                                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removePhoto(i)}
                                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white backdrop-blur-sm"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
