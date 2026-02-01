"use client";

import { useState } from "react";
import { useCareContext, useCatContext, useCoreContext } from "@/store/app-store";
import { toast } from "sonner";
import { CareTaskDef, Frequency, MealSlot } from "@/types";

export function useCareTaskForm() {
    const { careTaskDefs, addCareTask, updateCareTask, deleteCareTask } = useCareContext();
    const { cats } = useCatContext();
    const { isDemo } = useCoreContext();

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"basic" | "schedule" | "advanced">("basic");
    const [timingStyle, setTimingStyle] = useState<"fixed" | "goal" | "interval" | "anytime">("anytime");

    const [title, setTitle] = useState("");
    const [icon, setIcon] = useState("📋");
    const [frequency, setFrequency] = useState<Frequency>("daily");
    const [frequencyType, setFrequencyType] = useState<"fixed" | "interval">("fixed");
    const [intervalHours, setIntervalHours] = useState<number | "">(24);
    const [frequencyCount, setFrequencyCount] = useState<number | "">(1);
    const [perCat, setPerCat] = useState(false);
    const [targetCatIds, setTargetCatIds] = useState<string[]>([]);
    const [enabled, setEnabled] = useState(true);
    const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
    const [startOffsetMinutes, setStartOffsetMinutes] = useState<number | "">(0);
    const [userNotes, setUserNotes] = useState("");
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | "">(15);
    const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const resetForm = () => {
        setTitle("");
        setIcon("📋");
        setFrequency("daily");
        setFrequencyType("fixed");
        setIntervalHours(24);
        setFrequencyCount(1);
        setPerCat(false);
        setTargetCatIds([]);
        setEnabled(true);
        setPriority("normal");
        setStartOffsetMinutes(0);
        setUserNotes("");
        setReminderEnabled(false);
        setReminderOffsetMinutes(15);
        setMealSlots([]);
        setTimingStyle("anytime");
        setIsAdding(false);
        setEditingId(null);
        setActiveTab("basic");
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("タイトルを入力してください");
            return;
        }

        let finalFrequency: Frequency = frequency;
        let finalFrequencyType: "fixed" | "interval" = "fixed";
        let finalMealSlots = mealSlots;
        let finalCount = frequencyCount;
        let finalInterval = intervalHours;

        if (timingStyle === "fixed") {
            finalFrequency = "daily";
            finalFrequencyType = "fixed";
            finalCount = mealSlots.length || 1;
        } else if (timingStyle === "goal") {
            finalFrequencyType = "fixed";
            finalMealSlots = [];
        } else if (timingStyle === "interval") {
            finalFrequency = "as-needed";
            finalFrequencyType = "interval";
            finalMealSlots = [];
        } else if (timingStyle === "anytime") {
            finalFrequency = "daily";
            finalFrequencyType = "fixed";
            finalMealSlots = [];
            finalCount = 1;
        }

        const settings = {
            title,
            icon,
            frequency: finalFrequency,
            frequencyType: finalFrequencyType,
            intervalHours: finalFrequencyType === "interval" ? (Number(finalInterval) || 24) : undefined,
            frequencyCount: finalFrequency !== "as-needed" ? (Number(finalCount) || 1) : undefined,
            perCat,
            targetCatIds: perCat ? targetCatIds : undefined,
            enabled,
            priority,
            startOffsetMinutes: Number(startOffsetMinutes) || 0,
            userNotes,
            reminderEnabled,
            reminderOffsetMinutes: Number(reminderOffsetMinutes) || 15,
            mealSlots: finalMealSlots
        };

        setIsSaving(true);
        try {
            if (editingId) {
                await updateCareTask(editingId, settings);
                toast.success("変更しました");
            } else {
                await addCareTask(title, settings);
                toast.success("追加しました");
                resetForm();
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("保存に失敗しました。もう一度お試しください。");
        } finally {
            setIsSaving(false);
        }
    };

    const startEdit = (task: CareTaskDef) => {
        setEditingId(task.id);
        setTitle(task.title);
        setIcon(task.icon);

        let style: "fixed" | "goal" | "interval" | "anytime" = "anytime";
        if (task.frequencyType === "interval") {
            style = "interval";
        } else if (task.mealSlots && task.mealSlots.length > 0) {
            style = "fixed";
        } else if (task.frequency === "weekly" || task.frequency === "monthly" || (task.frequencyCount && task.frequencyCount > 1)) {
            style = "goal";
        }

        setTimingStyle(style);
        setFrequency(task.frequency || "daily");
        setFrequencyType(task.frequencyType || "fixed");
        setIntervalHours(task.intervalHours || 24);
        setFrequencyCount(task.frequencyCount || 1);
        setPerCat(task.perCat);
        setTargetCatIds(task.targetCatIds || cats.map((c: any) => c.id));
        setEnabled(task.enabled !== false);
        setPriority(task.priority || "normal");
        setStartOffsetMinutes(task.startOffsetMinutes || 0);
        setUserNotes(task.userNotes || "");
        setReminderEnabled(task.reminderEnabled || false);
        setReminderOffsetMinutes(task.reminderOffsetMinutes || 15);
        setMealSlots(task.mealSlots || []);
        setIsAdding(false);
        setActiveTab("basic");
    };

    return {
        careTaskDefs, deleteCareTask, cats,
        isAdding, setIsAdding,
        editingId, setEditingId,
        activeTab, setActiveTab,
        timingStyle, setTimingStyle,
        isSaving,
        form: {
            title, setTitle,
            icon, setIcon,
            frequency, setFrequency,
            frequencyType, setFrequencyType,
            intervalHours, setIntervalHours,
            frequencyCount, setFrequencyCount,
            perCat, setPerCat,
            targetCatIds, setTargetCatIds,
            enabled, setEnabled,
            priority, setPriority,
            startOffsetMinutes, setStartOffsetMinutes,
            userNotes, setUserNotes,
            reminderEnabled, setReminderEnabled,
            reminderOffsetMinutes, setReminderOffsetMinutes,
            mealSlots, setMealSlots
        },
        resetForm, handleSave, startEdit
    };
}
