"use client";

import { useState } from "react";
import { useInventoryContext } from "@/store/app-store";
import { toast } from "sonner";
import { InventoryItem } from "@/types";

export function useInventorySettings() {
    const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventoryContext();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [label, setLabel] = useState("");
    const [rangeMax, setRangeMax] = useState(30);
    const [lastBought, setLastBought] = useState("");

    const resetForm = () => {
        setLabel("");
        setRangeMax(30);
        setLastBought(new Date().toISOString().split('T')[0]);
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!label.trim()) {
            toast.error("アイテム名を入力してください");
            return;
        }

        try {
            if (editingId) {
                await updateInventoryItem(editingId, {
                    label,
                    range_max: rangeMax,
                    last_bought: lastBought || null
                } as any);
                toast.success("更新しました");
            } else {
                await addInventoryItem(label, Math.floor(rangeMax * 0.7), rangeMax, {
                    last_bought: lastBought || null
                } as any);
                toast.success("追加しました");
            }
            resetForm();
        } catch (err) {
            toast.error("保存に失敗しました");
        }
    };

    const startEdit = (item: any) => {
        setEditingId(item.id);
        setLabel(item.label);
        setRangeMax(item.range_max || 30);
        setLastBought(item.last_bought ? item.last_bought.split('T')[0] : "");
        setIsAdding(false);
    };

    return {
        inventory,
        editingId,
        isAdding,
        setIsAdding,
        label,
        setLabel,
        rangeMax,
        setRangeMax,
        lastBought,
        setLastBought,
        handleSave,
        handleDelete: deleteInventoryItem,
        startEdit,
        resetForm
    };
}
