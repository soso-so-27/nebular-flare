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
                <div key={task.id} className="p-3 pr-4 bg-white/80 backdrop-blur-md border border-[#4E342E]/5 shadow-[0_2px_16px_-4px_rgba(78,52,46,0.04)] hover:shadow-[0_4px_20px_-4px_rgba(78,52,46,0.06)] hover:border-[#4E342E]/10 transition-all rounded-[24px] group">
                    {editingId === task.id ? (
                        <div className="p-1">
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
                        </div>
                    ) : (
                        <div className={cn("flex items-center justify-between", task.enabled === false && "opacity-50 grayscale")}>
                            <div className="flex items-center gap-3.5 min-w-0 pr-2">
                                <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors", task.priority === 'high' ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-100' : 'bg-[#F2EFEA] text-emerald-600 group-hover:bg-[#EAE5DC]')}>
                                    {(() => { const Icon = getIcon(task.icon); return <Icon className="w-5 h-5" />; })()}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-[13px] text-[#4E342E] leading-snug truncate">{task.title}</p>
                                        {task.priority === 'high' && <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-rose-500 text-white rounded-[6px] shrink-0">High</span>}
                                        {task.enabled === false && <span className="text-[9px] px-1.5 py-0.5 bg-[#4E342E]/10 text-[#4E342E]/50 rounded-[6px] font-bold shrink-0">無効</span>}
                                    </div>
                                    <p className="text-[11px] text-[#4E342E]/40 font-bold truncate mt-0.5">
                                        {task.frequencyType === 'interval' ? `${task.intervalHours}h毎` : task.frequency}
                                        <span className="mx-1 opacity-50 font-normal">•</span>
                                        {task.perCat ? '猫ごと' : '共通'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 pl-3 border-l border-[#4E342E]/10 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(task)} className="p-2 rounded-full hover:bg-[#4E342E]/5 text-[#4E342E]/30 hover:text-[#4E342E]/70 transition-colors bg-white shadow-[0_2px_8px_-2px_rgba(78,52,46,0.05)] border border-[#4E342E]/5">
                                    <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => onDelete(task.id)} className="p-2 rounded-full hover:bg-rose-500/10 text-[#4E342E]/20 hover:text-rose-500 transition-colors bg-white shadow-[0_2px_8px_-2px_rgba(78,52,46,0.05)] border border-[#4E342E]/5">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {!isAdding && !editingId && (
                <button onClick={onAdd} className="w-full mt-4 py-4 rounded-[24px] border-2 border-dashed border-[#4E342E]/10 text-[#4E342E]/40 text-sm font-black flex items-center justify-center gap-2 hover:border-amber-600 hover:text-amber-600 hover:bg-amber-600/5 transition-all">
                    <Plus className="h-5 w-5" />
                    新しいおねがいを定義
                </button>
            )}

            {isAdding && (
                <div className="p-4 bg-white/80 border border-[#4E342E]/10 rounded-[24px] space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" /><p className="text-sm font-black text-amber-600">新規おねがい</p></div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-[#4E342E]/40 uppercase">名前</label>
                        <input type="text" value={form.title} onChange={(e) => form.setTitle(e.target.value)} className="w-full px-4 py-3 rounded-[16px] border border-[#4E342E]/10 bg-white/80 text-[#4E342E] outline-none focus:ring-2 focus:ring-amber-600/20" placeholder="例：ちゅ〜る、ブラッシング" autoFocus />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={onSave} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-black shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-colors">
                            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            定義する
                        </button>
                        <button onClick={onCancelAdd} className="px-6 py-3 rounded-xl bg-[#4E342E]/5 hover:bg-[#4E342E]/10 text-[#4E342E]/60 text-sm font-bold transition-colors">やめる</button>
                    </div>
                </div>
            )}
        </div>
    );
};
