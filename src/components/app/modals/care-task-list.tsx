"use client";

import React from "react";
import { Edit2, Trash2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icon-utils";
import { CareTaskDef } from "@/types";
import { CareTaskForm } from "./care-task-form";

interface CareTaskListProps {
    careTaskDefs: CareTaskDef[];
    editingId: string | null;
    isAdding: boolean;
    onEdit: (task: CareTaskDef) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
    onCancelAdd: () => void;
    onSave: () => void;
    isSaving: boolean;
    activeTab: "basic" | "schedule" | "advanced";
    setActiveTab: (tab: "basic" | "schedule" | "advanced") => void;
    timingStyle: "fixed" | "goal" | "interval" | "anytime";
    setTimingStyle: (style: "fixed" | "goal" | "interval" | "anytime") => void;
    form: any;
    cats: any[];
}

export const CareTaskList = ({
    careTaskDefs,
    editingId,
    isAdding,
    onEdit,
    onDelete,
    onAdd,
    onCancelAdd,
    onSave,
    isSaving,
    activeTab,
    setActiveTab,
    timingStyle,
    setTimingStyle,
    form,
    cats
}: CareTaskListProps) => {
    return (
        <div className="space-y-4">
            {careTaskDefs.map(task => (
                <div key={task.id} className="p-3 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-2xl space-y-3">
                    {editingId === task.id ? (
                        <CareTaskForm
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            timingStyle={timingStyle}
                            setTimingStyle={setTimingStyle}
                            form={form}
                            cats={cats}
                            onSave={onSave}
                            onCancel={onCancelAdd}
                            isSaving={isSaving}
                            taskInfo={{ title: task.title, icon: task.icon, priority: task.priority || 'normal' }}
                        />
                    ) : (
                        <div className={cn("flex items-center justify-between", task.enabled === false && "opacity-50")}>
                            <div className="flex items-center gap-3">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary')}>
                                    {(() => { const Icon = getIcon(task.icon); return <Icon className="w-6 h-6" />; })()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-900 dark:text-white">{task.title}</p>
                                        {task.priority === 'high' && <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-red-500 text-white rounded-full">High</span>}
                                        {task.enabled === false && <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded">無効</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {task.frequencyType === 'interval' ? `${task.intervalHours}h毎` : task.frequency}
                                        <span className="mx-1">•</span>
                                        {task.perCat ? '猫ごと' : '共通'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => onEdit(task)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                                <button onClick={() => onDelete(task.id)} className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="h-4 w-4 text-red-400" /></button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {!isAdding && !editingId && (
                <button onClick={onAdd} className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm font-black flex items-center justify-center gap-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                    <Plus className="h-5 w-5" />
                    新しいおねがいを定義
                </button>
            )}

            {isAdding && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /><p className="text-sm font-black text-primary">新規おねがい</p></div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-primary/60 uppercase">名前</label>
                        <input type="text" value={form.title} onChange={(e) => form.setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-primary/30 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-primary/40" placeholder="例：ちゅ〜る、ブラッシング" autoFocus />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onSave} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            定義する
                        </button>
                        <button onClick={onCancelAdd} className="px-4 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-500 text-sm font-bold border border-slate-200 dark:border-slate-700">やめる</button>
                    </div>
                </div>
            )}
        </div>
    );
};
