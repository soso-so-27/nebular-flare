/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    updateProfile: (displayName: string, avatarUrl?: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient() as any;

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }: any) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: any, session: any) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName }
            }
        });

        // NOTE: User profile in public.users is now created automatically via DB trigger
        // (see supabase/migrations/20260109_user_sync_trigger.sql)
        // This ensures atomic user creation and prevents auth/db inconsistencies

        return { error };
    };

    const updateProfile = async (displayName: string, avatarUrl?: string) => {
        const updates: { data: { display_name: string; avatar_url?: string } } = {
            data: { display_name: displayName }
        };
        if (avatarUrl !== undefined) {
            updates.data.avatar_url = avatarUrl;
        }

        // 1. Update Auth User
        const { data: { user }, error } = await supabase.auth.updateUser(updates);

        if (error) return { error };

        // 2. Update Public Users Table
        if (user) {
            const publicUpdates: { display_name: string; avatar_url?: string } = {
                display_name: displayName,
            };
            if (avatarUrl !== undefined) {
                publicUpdates.avatar_url = avatarUrl;
            }

            const { error: dbError } = await supabase
                .from('users')
                .update(publicUpdates)
                .eq('id', user.id);

            if (dbError) {
                console.error("Failed to update public user profile", dbError);
                // We don't fail the whole operation if just the public sync fails, but it's bad.
            }

            // Manually update local state if needed (auth listener usually handles it)
            setUser(user);
        }

        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            updateProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
