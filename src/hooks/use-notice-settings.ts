import { useState } from "react";
import { useCareContext } from "@/store/app-store";
import { toast } from "sonner";
import { NoticeDef, ObservationCategory, ObservationInputType } from "@/types";

export function useNoticeSettings(isOpen: boolean) {
    const { noticeDefs, addNoticeDef, updateNoticeDef, deleteNoticeDef } = useCareContext();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<ObservationCategory>("health");
    const [inputType, setInputType] = useState<ObservationInputType>("ok-notice");
    const [required, setRequired] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [choices, setChoices] = useState<string[]>([]);
    const [newChoice, setNewChoice] = useState("");

    const resetForm = () => {
        setTitle("");
        setCategory("health");
        setInputType("ok-notice");
        setRequired(false);
        setEnabled(true);
        setChoices([]);
        setNewChoice("");
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSave = () => {
        if (!title.trim()) {
            toast.error("タイトルを入力してください");
            return;
        }

        if (editingId) {
            updateNoticeDef(editingId, {
                title,
                category,
                inputType,
                required,
                enabled,
                choices
            });
            toast.success("変更しました");
        } else {
            addNoticeDef(title, {
                category,
                inputType,
                required,
                enabled,
                choices
            });
            toast.success("追加しました");
        }
        resetForm();
    };

    const startEdit = (def: NoticeDef) => {
        setEditingId(def.id);
        setTitle(def.title);
        setCategory(def.category);
        setInputType(def.inputType);
        setRequired(def.required);
        setEnabled(def.enabled !== false);
        setChoices(def.choices || []);
        setIsAdding(false);
    };

    return {
        noticeDefs,
        deleteNoticeDef,
        isAdding,
        setIsAdding,
        editingId,
        title,
        setTitle,
        category,
        setCategory,
        inputType,
        setInputType,
        required,
        setRequired,
        enabled,
        setEnabled,
        choices,
        setChoices,
        newChoice,
        setNewChoice,
        resetForm,
        handleSave,
        startEdit
    };
}
