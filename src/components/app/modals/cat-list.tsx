"use client";

import React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Cat } from "@/types";

interface CatListProps {
    cats: Cat[];
    isDemo: boolean;
    onEdit: (cat: Cat) => void;
    onDelete: (id: string, name: string) => void;
    onAdd: () => void;
}

export const CatList = ({ cats, isDemo, onEdit, onDelete, onAdd }: CatListProps) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {cats.map(cat => (
                    <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                                {cat.avatar?.startsWith('http') ? (
                                    <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl">{cat.avatar || "🐈"}</span>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{cat.name}</p>
                                <p className="text-xs text-slate-500">{cat.age} • {cat.sex}</p>
                            </div>
                        </div>
                        {!isDemo && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onEdit(cat)}
                                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    <Pencil className="h-4 w-4 text-slate-500" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(cat.id, cat.name)}
                                    className="p-2 rounded-lg hover:bg-brand-lavender/10 dark:hover:bg-brand-lavender/20"
                                >
                                    <Trash2 className="h-4 w-4 text-brand-lavender" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!isDemo && (
                <button
                    type="button"
                    onClick={onAdd}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    猫を追加
                </button>
            )}
            {isDemo && (
                <p className="text-xs text-slate-400 text-center">
                    デモモードでは編集できません
                </p>
            )}
        </div>
    );
};
