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
        resetForm, handleSave, startEdit
    } = useCareTaskForm();

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
                        className="bg-[#FAF9F7]/95 dark:bg-[#1E1E23]/95 backdrop-blur-xl border border-white/40 dark:border-white/10 w-full max-w-md max-h-full sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        <div className="px-4 py-3 border-b border-white/20 dark:border-white/5 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary" />
                                ONEGAIの設定
                            </h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <CareTaskList
                                careTaskDefs={careTaskDefs}
                                editingId={editingId}
                                isAdding={isAdding}
                                onEdit={startEdit}
                                onDelete={deleteCareTask}
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
