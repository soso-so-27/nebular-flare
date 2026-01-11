"use client";

import React from 'react';
import { motion } from 'framer-motion';

// =====================================================
// FootprintStatsCard - Display footprint statistics
// =====================================================

interface FootprintStatsCardProps {
    userTotal: number;
    householdTotal: number;
    breakdown: Array<{
        user_id: string;
        display_name: string;
        total_points: number;
    }>;
    currentUserId?: string;
    loading?: boolean;
}

export function FootprintStatsCard({
    userTotal,
    householdTotal,
    breakdown,
    currentUserId,
    loading = false,
}: FootprintStatsCardProps) {
    if (loading) {
        return (
            <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--card)' }}>
                <div className="h-6 w-32 bg-muted rounded mb-4" />
                <div className="h-12 w-20 bg-muted rounded mb-4" />
                <div className="space-y-2">
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="rounded-2xl p-5 shadow-sm"
            style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🐾</span>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
                    猫たちからの足あと
                </h3>
            </div>

            {/* Household Total */}
            <div className="mb-5">
                <div className="flex items-baseline gap-1">
                    <motion.span
                        className="text-4xl font-bold"
                        style={{ color: 'var(--sage)' }}
                        key={householdTotal}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        {householdTotal.toLocaleString()}
                    </motion.span>
                    <span className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
                        pt
                    </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    家族の合計
                </p>
            </div>

            {/* Breakdown by family member */}
            {breakdown.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                        メンバー別
                    </p>
                    {breakdown.map((member, index) => {
                        const isCurrentUser = member.user_id === currentUserId;
                        const percentage = householdTotal > 0
                            ? Math.round((member.total_points / householdTotal) * 100)
                            : 0;

                        return (
                            <div key={member.user_id} className="flex items-center gap-3">
                                {/* Avatar placeholder */}
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                                    style={{
                                        background: isCurrentUser ? 'var(--sage)' : 'var(--muted)',
                                        color: isCurrentUser ? '#fff' : 'var(--foreground)',
                                    }}
                                >
                                    {member.display_name?.charAt(0) || '?'}
                                </div>

                                {/* Name and points */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="text-sm font-medium truncate"
                                            style={{ color: 'var(--foreground)' }}
                                        >
                                            {member.display_name || '不明'}
                                            {isCurrentUser && (
                                                <span className="ml-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                                    (あなた)
                                                </span>
                                            )}
                                        </span>
                                        <span
                                            className="text-sm font-semibold ml-2"
                                            style={{ color: 'var(--sage)' }}
                                        >
                                            {member.total_points.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div
                                        className="h-1.5 rounded-full mt-1.5 overflow-hidden"
                                        style={{ background: 'var(--muted)' }}
                                    >
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{
                                                background: isCurrentUser
                                                    ? 'var(--sage)'
                                                    : 'var(--peach)',
                                            }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                        />
                                    </div>
                                </div>

                                {/* Percentage */}
                                <span
                                    className="text-xs tabular-nums"
                                    style={{ color: 'var(--muted-foreground)' }}
                                >
                                    {percentage}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty state */}
            {breakdown.length === 0 && (
                <div className="text-center py-4">
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        まだ足あとがありません
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        お世話や写真投稿で足あとが溜まります
                    </p>
                </div>
            )}
        </motion.div>
    );
}
