"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotebookPen, Image as ImageIcon, Camera, Tag, Search, Plus, Sparkles } from "lucide-react";
import { useAppState } from "@/store/app-store";
import { Input } from "@/components/ui/input";

export function NotesScreen() {
    const { memos, isPro } = useAppState();
    const [search, setSearch] = useState("");

    return (
        <div className="space-y-6 pb-20">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="メモや写真を検索..."
                    className="rounded-2xl pl-10 bg-white border-none shadow-sm focus-visible:ring-primary/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Album Section (Pro) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-purple-500" />
                        アルバム
                    </h2>
                    <Button variant="link" size="sm" className="text-[11px] text-purple-600 font-bold p-0 h-4">
                        すべて見る
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square rounded-2xl bg-slate-200 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 active:scale-95 transition-transform">
                        <Camera className="h-5 w-5 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold">追加</span>
                    </div>
                    {[1, 2].map((i) => (
                        <div key={i} className="aspect-square rounded-2xl bg-slate-300 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Badge className="absolute bottom-2 right-2 text-[8px] h-3 px-1 bg-white/20 backdrop-blur-md border-none text-white font-bold">
                                {i === 1 ? '寝姿' : 'ごはん'}
                            </Badge>
                        </div>
                    ))}
                </div>
                {!isPro && (
                    <p className="text-[10px] text-muted-foreground text-center italic">
                        Proプランで写真の自動タグ付けが利用できます
                    </p>
                )}
            </div>

            {/* Memos Section */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold flex items-center gap-2 px-1">
                    <NotebookPen className="h-4 w-4 text-blue-500" />
                    すべてのメモ
                </h2>

                <div className="space-y-2">
                    {memos.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-10 text-center italic">メモはまだありません</p>
                    ) : (
                        memos.items.map((m, idx) => (
                            <Card key={idx} className="rounded-2xl shadow-sm border-none bg-white p-3 border border-border/50">
                                <div className="text-[10px] text-muted-foreground mb-1 uppercase font-bold tracking-wider">
                                    {new Date(m.at).toLocaleDateString()}
                                </div>
                                <div className="text-xs">{m.text}</div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
