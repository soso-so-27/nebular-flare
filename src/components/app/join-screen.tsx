// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Cat, Home, Loader2, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { translateAuthError } from "@/lib/error-utils";

export function JoinScreen() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Get code from URL
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setInviteCode(code);
        } else {
            setStatus('invalid');
            setErrorMsg("招待コードが見つかりません");
        }
    }, [searchParams]);

    // Check code validity (only if user is logged in, or just check code existence?)
    // Logic:
    // 1. If not logged in -> Show Login.
    // 2. If logged in -> Verify code and show "Join?"

    // However, we want to verify the code *before* login if possible to show "You are invited to X". 
    // But our RLS/RPC might restrict this.
    // Let's assume we need auth first for simplicity and security.

    useEffect(() => {
        if (authLoading) return;
        if (!user) return; // Wait for login
        if (!inviteCode) return;

        checkInviteStatus();
    }, [user, authLoading, inviteCode]);

    const checkInviteStatus = async () => {
        if (!inviteCode || !user) return;

        // We can't easily check "validity" without "joining" using the current RPC?
        // Wait, the RPC `join_household_by_code` does everything.
        // We might want a "dry run" or just try to join? 
        // Trying to join immediately is aggressive. 
        // Let's try to fetch the INVITE first (HouseholdInvites table is public readable by code).

        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('household_invites')
                .select('household_id, expires_at')
                .eq('code', inviteCode)
                .single();

            if (error || !data) {
                setStatus('invalid');
                setErrorMsg("招待コードが無効か、期限切れです");
                return;
            }

            if (new Date(data.expires_at) < new Date()) {
                setStatus('invalid');
                setErrorMsg("招待コードの有効期限が切れています");
                return;
            }

            // Valid code. Ideally we fetch household name, but `households` table might be RLS protected.
            // We'll proceed to 'valid' state.
            setHouseholdId(data.household_id);
            setStatus('valid');

        } catch (e) {
            setStatus('invalid');
            setErrorMsg("エラーが発生しました");
        }
    };

    const handleJoin = async () => {
        if (!inviteCode) return;
        setStatus('loading');

        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc('join_household_by_code', {
                invite_code: inviteCode
            });

            if (error) throw error;

            if (data && data.success) {
                setStatus('success');
                toast.success("家族に参加しました！");
                setTimeout(() => {
                    router.push('/');
                }, 1500);
            } else {
                throw new Error(data?.message || 'Failed to join');
            }
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('Already a member')) {
                setStatus('success');
                toast.info("既に参加済みです");
                setTimeout(() => {
                    router.push('/');
                }, 1000);
            } else {
                setStatus('invalid');
                setErrorMsg(translateAuthError(e.message || "参加に失敗しました"));
            }
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-sm text-slate-500 mt-4">読み込み中...</p>
            </div>
        );
    }

    // If not logged in, show Login Screen with a wrapper message
    if (!user) {
        return (
            <div className="relative">
                {/* Overlay Message */}
                <div className="absolute top-0 left-0 right-0 z-10 bg-amber-500 text-white p-4 text-center text-sm font-bold shadow-md">
                    招待を受け取るにはログイン（または登録）してください
                </div>
                <div className="pt-10">
                    <LoginScreen />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 space-y-6 text-center">

                {status === 'loading' && (
                    <div className="py-10">
                        <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
                        <p className="mt-4 text-slate-500 font-medium">招待を確認しています...</p>
                    </div>
                )}

                {status === 'invalid' && (
                    <div className="py-6 space-y-4">
                        <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="h-8 w-8 text-rose-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">招待が無効です</h2>
                            <p className="text-slate-500 mt-2 text-sm">{errorMsg}</p>
                        </div>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            ホームへ戻る
                        </Button>
                    </div>
                )}

                {status === 'valid' && (
                    <div className="space-y-6">
                        <div className="h-20 w-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-200">
                            <Home className="h-10 w-10 text-white" />
                        </div>

                        <div>
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">INVITATION</p>
                            <h2 className="text-2xl font-bold text-slate-900 mt-2">家族に参加しますか？</h2>
                            <p className="text-slate-500 mt-2 text-sm">
                                招待コード: <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{inviteCode}</span>
                            </p>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-left">
                            <div className="flex items-start gap-3">
                                <Cat className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800">
                                    <p className="font-bold mb-1">参加するとできること:</p>
                                    <ul className="list-disc pl-4 space-y-1 opacity-80">
                                        <li>この家の猫ちゃんのお世話記録</li>
                                        <li>記録のリアルタイム共有</li>
                                        <li>思い出の写真の閲覧</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Button
                                onClick={handleJoin}
                                className="w-full h-14 text-lg rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-orange-200"
                            >
                                参加する
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/')}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                キャンセル
                            </Button>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-10 space-y-4">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">参加しました！</h2>
                            <p className="text-slate-500 mt-2 text-sm">ホーム画面へ移動します...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
