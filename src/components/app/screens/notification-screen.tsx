"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { NoticeLog, NoticeDef } from "@/types";

interface NotificationScreenProps {
    noticeLogs: any[]; // Flattened notice logs
    noticeDefs: NoticeDef[];
    onMarkAsDone?: (id: string) => void;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({
    noticeLogs,
    noticeDefs,
    onMarkAsDone
}) => {
    return (
        <div className="min-h-full bg-[#FAF9F7] pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
            <header className="px-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-6">
                <h1 className="text-2xl font-bold text-slate-800">通知</h1>
                <p className="text-sm text-slate-500 mt-1">猫ちゃんに関するお知らせ</p>
            </header>

            <div className="px-6 space-y-4">
                {noticeLogs.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 opacity-20" />
                        </div>
                        <p>新しい通知はありません</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {noticeLogs.map((log) => {
                            const def = noticeDefs.find(d => d.id === log.noticeId);
                            const isNew = !log.done;

                            return (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-4 bg-white rounded-2xl border ${isNew ? 'border-brand-peach/20 bg-brand-peach/5' : 'border-slate-100'} shadow-sm flex gap-4 items-start`}
                                >
                                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xl ${isNew ? 'bg-brand-peach/10' : 'bg-slate-50'}`}>
                                        {def?.category === 'eating' ? '🍚' : def?.category === 'toilet' ? '🚽' : '🔔'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-bold text-slate-800 truncate">{def?.title || 'お知らせ'}</div>
                                            {isNew && (
                                                <span className="w-2 h-2 bg-brand-peach rounded-full shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-600 mt-0.5">{log.value}</div>
                                        <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                            <span>{new Date(log.at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    {isNew && onMarkAsDone && (
                                        <button
                                            onClick={() => onMarkAsDone(log.id)}
                                            className="p-1 text-slate-300 hover:text-brand-peach transition-colors"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Notification Settings Entry */}
            <div className="px-6 mt-10">
                <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                    <SettingsIcon className="w-4 h-4" />
                    通知設定を変更する
                </button>
            </div>
        </div>
    );
};

const SettingsIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
