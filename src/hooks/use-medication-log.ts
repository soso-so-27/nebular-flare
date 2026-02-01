import { useState, useEffect } from "react";
import { useMedicationContext, useCatContext } from "@/store/app-store";
import { toast } from "sonner";
import { MedicationLog } from "@/types";

export function useMedicationLog(catId: string, isOpen: boolean) {
    const { medicationLogs, addMedicationLog, updateMedicationLog, deleteMedicationLog } = useMedicationContext();
    const { cats } = useCatContext();
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [editingLogId, setEditingLogId] = useState<string | null>(null);

    // Form state
    const [productName, setProductName] = useState("");
    const [dosage, setDosage] = useState("");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState("");
    const [frequency, setFrequency] = useState<'once' | 'daily' | 'twice_daily' | 'weekly' | 'as_needed'>('daily');
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const cat = cats.find((c: any) => c.id === catId);
    const catLogs = medicationLogs.filter((log: any) => log.cat_id === catId);

    const resetForm = () => {
        setProductName("");
        setDosage("");
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate("");
        setFrequency('daily');
        setNotes("");
        setEditingLogId(null);
        setIsLoading(false);
        setViewMode('list');
    };

    const startEdit = (log: MedicationLog) => {
        setEditingLogId(log.id);
        setProductName(log.product_name);
        setDosage(log.dosage || "");
        setStartDate(log.starts_at.split('T')[0]);
        setEndDate(log.end_date ? log.end_date.split('T')[0] : "");
        setFrequency(log.frequency || 'daily');
        setNotes(log.notes || "");
        setViewMode('form');
    };

    const handleSubmit = async () => {
        if (!productName.trim()) {
            toast.error("お薬の名前を入力してください");
            return;
        }

        setIsLoading(true);
        try {
            const logData = {
                cat_id: catId,
                product_name: productName.trim(),
                dosage: dosage.trim() || null,
                starts_at: new Date(startDate).toISOString(),
                end_date: endDate ? new Date(endDate).toISOString() : null,
                frequency,
                notes: notes.trim() || null,
            };

            if (editingLogId) {
                const { error } = await updateMedicationLog(editingLogId, logData as any);
                if (error) throw error;
                toast.success("投薬情報を更新しました");
            } else {
                const { error } = await addMedicationLog(logData as any);
                if (error) throw error;
                toast.success("投薬情報を追加しました");
            }

            resetForm();
        } catch (err: any) {
            console.error("Error saving medication log:", err);
            toast.error("保存に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この投薬記録を削除しますか？")) return;

        try {
            const { error } = await deleteMedicationLog(id);
            if (error) throw error;
            toast.success("削除しました");
        } catch (err: any) {
            toast.error("削除に失敗しました");
        }
    };

    return {
        cat,
        catLogs,
        viewMode,
        setViewMode,
        editingLogId,
        productName,
        setProductName,
        dosage,
        setDosage,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        frequency,
        setFrequency,
        notes,
        setNotes,
        isLoading,
        resetForm,
        startEdit,
        handleSubmit,
        handleDelete
    };
}
