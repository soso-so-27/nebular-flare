"use client";

import React, { useState } from "react";
import { useCoreContext } from "@/store/app-store";
import { X, Plus, Trash2, Calendar, Clock, Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CareTaskDef, Frequency, MealSlot } from "@/types";
import { getIcon, getIconList } from "@/lib/icon-utils";

import { useCareTaskForm } from "@/hooks/use-care-task-form";
import { CareTaskList } from "./care-task-list";

interface CareSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CareSettingsModal({ isOpen, onClose }: CareSettingsModalProps) {
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const {
        careTaskDefs, deleteCareTask, cats,
        isAdding, setIsAdding,
        editingId, setEditingId,
        activeTab, setActiveTab,
        timingStyle, setTimingStyle,
        isSaving,
        form,
        resetForm, handleSave, startEdit, updateCareTask
    } = useCareTaskForm();

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10020] flex items-end justify-center sm:items-center bg-[#4E342E]/20 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#FDF8F1] w-full max-w-md max-h-[85vh] sm:rounded-[32px] rounded-t-[32px] overflow-hidden shadow-2xl flex flex-col"
                    >
                        <div className="px-5 py-4 border-b border-[#4E342E]/5 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-[#4E342E] flex items-center gap-2">
                                <Check className="h-5 w-5 text-emerald-500" />
                                ONEGAIの設定
                            </h2>
                            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#4E342E]/5 transition-colors">
                                <X className="h-5 w-5 text-[#4E342E]/40" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <CareTaskList
                                careTaskDefs={careTaskDefs}
                                editingId={editingId}
                                isAdding={isAdding}
                                onEdit={startEdit}
                                onDelete={(id, title) => {
                                    if (window.confirm(`「${title}」をごみ箱に移動しますか？\n※ 後で再開する可能性がある場合は「無効化」ボタンをおすすめします。`)) {
                                        deleteCareTask(id);
                                    }
                                }}
                                onToggleEnable={(task) => {
                                    updateCareTask(task.id, { enabled: task.enabled === false });
                                    toast.success(task.enabled === false ? `「${task.title}」を有効にしました` : `「${task.title}」を無効にしました`);
                                }}
                                onAdd={() => setIsAdding(true)}
                                onCancelAdd={resetForm}
                                onSave={handleSave}
                                isSaving={isSaving}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                timingStyle={timingStyle}
                                setTimingStyle={setTimingStyle}
                                form={form}
                                cats={cats}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
