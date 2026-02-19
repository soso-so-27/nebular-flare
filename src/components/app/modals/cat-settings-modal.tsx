"use client";

import React, { useState } from "react";
import { useCatContext, useMedicationContext, useCoreContext } from "@/store/app-store";
import { createClient } from "@/lib/supabase";
import { X, Plus, Pencil, Trash2, Cat, Calendar, Camera, Upload, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MedicationLogModal } from "./medication-log-modal";
import { Pill } from "lucide-react";
import { useCatForm } from "@/hooks/use-cat-form";

import { CatList } from "./cat-list";
import { CatForm } from "./cat-form";

interface CatSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CatSettingsModal({ isOpen, onClose }: CatSettingsModalProps) {
    const { cats } = useCatContext();
    const { medicationLogs } = useMedicationContext();
    const { householdId, isDemo } = useCoreContext();

    const [isMedModalOpen, setIsMedModalOpen] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const {
        viewMode, setViewMode, editingCatId, isLoading,
        form,
        handleSubmit, handleDelete, startEdit, startAdd
    } = useCatForm();

    const onSubmit = async () => {
        await handleSubmit(() => {
            if (editingCatId) {
                onClose();
            }
        });
    };

    if (!portalTarget) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center bg-[#4E342E]/10 backdrop-blur-sm"
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
                        <div className="px-4 py-3 border-b border-white/20 dark:border-white/5 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Cat className="h-5 w-5 text-primary" />
                                {viewMode === 'list' ? '猫を管理' : (editingCatId ? '猫を編集' : '猫を追加')}
                            </h2>
                            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {viewMode === 'list' ? (
                                <CatList
                                    cats={cats}
                                    isDemo={isDemo}
                                    onEdit={startEdit}
                                    onDelete={handleDelete}
                                    onAdd={startAdd}
                                />
                            ) : (
                                <CatForm
                                    editingCatId={editingCatId}
                                    isLoading={isLoading}
                                    form={form}
                                    fileInputRef={fileInputRef}
                                    handleFilesSelect={form.handleFilesSelect}
                                    removeFile={form.removeFile}
                                    handleBgFileSelect={form.handleBgFileSelect}
                                    onSubmit={onSubmit}
                                    onCancel={() => setViewMode('list')}
                                    onOpenMedModal={() => setIsMedModalOpen(true)}
                                    medCount={editingCatId ? medicationLogs.filter((l: any) => l.cat_id === editingCatId).length : 0}
                                />
                            )}
                        </div>

                        {editingCatId && (
                            <MedicationLogModal
                                isOpen={isMedModalOpen}
                                onClose={() => setIsMedModalOpen(false)}
                                catId={editingCatId}
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portalTarget
    );
}
