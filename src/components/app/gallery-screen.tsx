"use client";

import React, { useState } from "react";
import { useAppState } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Plus, Grid, List, Sparkles } from "lucide-react";

export function GalleryScreen() {
    const { cats } = useAppState();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    return (
        <div className="space-y-4">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">ギャラリー</h2>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Grid className="h-4 w-4 text-slate-600" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <List className="h-4 w-4 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Cat Albums */}
            <div className="space-y-4">
                {cats.map((cat) => (
                    <Card key={cat.id} className="rounded-3xl shadow-sm border-none bg-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <span className="text-lg">{cat.avatar || "🐈"}</span>
                                {cat.name}のアルバム
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            {/* Placeholder for photos */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center">
                                    <Image className="h-8 w-8 text-slate-300" />
                                </div>
                                <div className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center">
                                    <Image className="h-8 w-8 text-slate-300" />
                                </div>
                                <div className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
                                    <Plus className="h-6 w-6 text-slate-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Card Skins Promo */}
            <Card className="rounded-3xl shadow-sm border-none bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-900">カードスキン</h3>
                            <p className="text-xs text-slate-500">お世話カードをカスタマイズ</p>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full">
                            見る
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Empty State */}
            {cats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Image className="h-8 w-8 text-slate-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">写真がありません</h2>
                    <p className="text-sm text-slate-500">猫の写真を追加してアルバムを作りましょう</p>
                </div>
            )}
        </div>
    );
}
