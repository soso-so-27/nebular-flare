"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { Cat, Mail, Lock, User, Loader2 } from "lucide-react";
import { translateAuthError } from "@/lib/error-utils";

export function LoginScreen() {
    const { signInWithEmail, signUpWithEmail, loading } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                const { error } = await signUpWithEmail(email, password, displayName);
                if (error) setError(translateAuthError(error.message));
            } else {
                const { error } = await signInWithEmail(email, password);
                if (error) setError(translateAuthError(error.message));
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FAF9F7] via-[#F5F3F0] to-[#F0EDE8] flex flex-col items-center justify-center p-6">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#7CAA8E] to-[#6B9B7A] flex items-center justify-center shadow-lg">
                    <Cat className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">にゃるほど</h1>
                    <p className="text-xs text-slate-500">猫のいる暮らしに、余裕と楽しさを</p>
                </div>
            </div>

            {/* Form Card */}
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-6">
                <div className="text-center">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isSignUp ? "アカウント作成" : "ログイン"}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {isSignUp ? "新しいアカウントを作成します" : "アカウントにログインします"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ニックネーム（例: パパ）"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-[#7CAA8E] placeholder:text-slate-400"
                                required
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="email"
                            placeholder="メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-[#7CAA8E] placeholder:text-slate-400"
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="password"
                            placeholder="パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-[#7CAA8E] placeholder:text-slate-400"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-rose-500 bg-rose-50 rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7CAA8E] to-[#6B9B7A] hover:from-[#6B9B7A] hover:to-[#5A8A6A] text-white font-bold"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : isSignUp ? (
                            "アカウント作成"
                        ) : (
                            "ログイン"
                        )}
                    </Button>
                </form>

                <div className="text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-[#5A8A6A] hover:underline"
                    >
                        {isSignUp
                            ? "すでにアカウントをお持ちですか？ログイン"
                            : "アカウントをお持ちでないですか？新規登録"}
                    </button>
                </div>
            </div>

            {/* Demo Mode */}
            <button
                onClick={() => {
                    // Skip auth for demo
                    window.location.href = "/?demo=true";
                }}
                className="mt-6 text-sm text-slate-400 hover:text-slate-600"
            >
                デモモードで試す →
            </button>
        </div>
    );
}
