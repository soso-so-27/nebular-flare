"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { useUserProfile } from "@/hooks/use-supabase-data";
import { Camera } from "lucide-react";
import {
    AppProvider,
    useCatContext,
    useCareContext,
    useSettingsContext,
    useCoreContext,
    useIncidentContext,
} from "@/store/app-store";
import { format } from "date-fns";
import { SplashScreen } from "@/components/app/screens/splash-screen";
import { ZukanScreen } from "@/components/app/screens/zukan-screen";
import { OmoideScreen } from "@/components/app/screens/omoide-screen";
import { CollectionHome } from "@/components/collection/collection-home";
import { CaptureWorkflowSheet } from "@/components/app/shared/capture-workflow-sheet";
import { BottomNavigationBar } from "@/components/app/shared/bottom-navigation-bar";
import { PhotoImportWizard } from "@/components/collection/photo-import-wizard";
import { NotificationItem } from "@/components/app/home/notification-sheet";
import { FootprintProvider } from "@/providers/footprint-provider";
import {
    CheckCircle2, Pill, AlertTriangle, Stethoscope, FileText, Heart
} from "lucide-react";

const LoginScreen = dynamic(
    () => import("@/components/app/screens/login-screen").then(m => ({ default: m.LoginScreen })),
    { ssr: false }
);
const OnboardingScreen = dynamic(
    () => import("@/components/app/screens/onboarding-screen").then(m => ({ default: m.OnboardingScreen })),
    { ssr: false }
);
const IncidentDetailModal = dynamic(
    () => import("@/components/app/modals/incident-detail-modal").then(m => ({ default: m.IncidentDetailModal })),
    { ssr: false }
);


// ─────────────────────────────────
// Collection App Content (コレクション軸)
// ─────────────────────────────────
function CollectionAppContent({ showImportInitially = false }: { showImportInitially?: boolean }) {
    const [tab, setTab] = useState("home"); // HOMEがデフォルト
    const [showZukanDetail, setShowZukanDetail] = useState(false);
    const [isCaptureWorkflowOpen, setIsCaptureWorkflowOpen] = useState(false);
    const [isImportWizardOpen, setIsImportWizardOpen] = useState(showImportInitially);
    const [initialPhotos, setInitialPhotos] = useState<File[]>([]);
    const hiddenFileInputRef = React.useRef<HTMLInputElement>(null);

    const { cats, catsLoading } = useCatContext();
    const { careLogs, careTaskDefs } = useCareContext();
    const { incidents } = useIncidentContext();
    const { householdUsers } = useCoreContext();
    const { user: currentUser } = useAuth();

    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [lastViewedAt, setLastViewedAt] = useState<Date>(() => new Date(Date.now() - 3600000));
    const { updateSettings } = useSettingsContext();

    // Splash
    const [showSplash, setShowSplash] = useState(true);
    useEffect(() => {
        if (!catsLoading) {
            const timer = setTimeout(() => setShowSplash(false), 600);
            return () => clearTimeout(timer);
        }
        const fallback = setTimeout(() => setShowSplash(false), 3000);
        return () => clearTimeout(fallback);
    }, [catsLoading]);

    // ─── Notifications (reuse same logic) ───
    const realNotifications = useMemo(() => {
        const items: NotificationItem[] = [];
        const careGroups: Record<string, any> = {};
        careLogs?.forEach(log => {
            const timestamp = new Date(log.done_at);
            const user = householdUsers?.find((m: any) => m.id === log.done_by);
            let userName = user?.display_name || "家族";
            if (currentUser && log.done_by === currentUser.id) {
                userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || userName;
            }
            const taskDef = careTaskDefs?.find((d: any) => d.id === log.type.split(':')[0]);
            const taskTitle = taskDef?.title || log.type;
            const hourMinute = format(timestamp, "yyyy-MM-dd HH:mm");
            const groupKey = `${log.done_by}_${log.cat_id}_${hourMinute}`;
            if (!careGroups[groupKey]) {
                careGroups[groupKey] = { userName, catId: log.cat_id, tasks: [], timestamp, ids: [] };
            }
            careGroups[groupKey].tasks.push(taskTitle);
            careGroups[groupKey].ids.push(log.id);
        });
        Object.values(careGroups).forEach(group => {
            const uniqueTasks = Array.from(new Set(group.tasks)) as string[];
            const tasksLabel = uniqueTasks.length > 1 ? `${uniqueTasks[0]}ほか${uniqueTasks.length - 1}件` : uniqueTasks[0];
            const catName = group.catId ? cats?.find(c => c.id === group.catId)?.name : null;
            items.push({
                id: group.ids[0], type: 'care',
                title: catName ? `${catName}のお世話完了` : `お世話完了`,
                message: `${group.userName}さんが${tasksLabel}をしました。`,
                timestamp: group.timestamp, isUnread: group.timestamp > lastViewedAt,
                targetDate: group.timestamp,
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            });
        });
        incidents?.forEach(inc => {
            const timestamp = new Date(inc.created_at);
            const user = householdUsers?.find((m: any) => m.id === inc.created_by);
            let userName = user?.display_name || "家族";
            if (currentUser && inc.created_by === currentUser.id) {
                userName = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || userName;
            }
            const cat = cats?.find((c: any) => c.id === inc.cat_id);
            const catName = cat?.name || "猫ちゃん";
            let iconNode = <FileText className="w-5 h-5 text-slate-500" />;
            if (['worried', 'troubled'].includes(inc.type)) iconNode = <AlertTriangle className="w-5 h-5 text-amber-500" />;
            else if (inc.type === 'hospital') iconNode = <Stethoscope className="w-5 h-5 text-rose-500" />;
            else if (inc.type === 'medicine') iconNode = <Pill className="w-5 h-5 text-blue-500" />;
            const typeLabels: Record<string, string> = {
                'worried': '気になる様子', 'troubled': '困りごと', 'hospital': '通院記録',
                'medicine': 'おくすり記録', 'vomit': '吐き戻し', 'diarrhea': '下痢',
                'injury': 'けが', 'appetite': '食欲の変化', 'energy': '元気の変化',
            };
            const typeLabel = typeLabels[inc.type] || 'できごと';
            items.push({
                id: inc.id, type: (['worried', 'troubled'].includes(inc.type) ? 'alert' : 'care'),
                title: `${catName}の${typeLabel}`,
                message: `${userName}さんが記録しました。${inc.note ? `\n"${inc.note}"` : ''}`,
                timestamp, isUnread: timestamp > lastViewedAt, incidentId: inc.id, icon: iconNode
            });
        });
        cats?.forEach(cat => {
            cat.images?.forEach((img: any) => {
                const timestamp = new Date(img.createdAt);
                const uploaderName = img.uploaded_by
                    ? (householdUsers?.find((m: any) => m.id === img.uploaded_by)?.display_name || '家族')
                    : 'あなた';
                items.push({
                    id: img.id, type: 'photo',
                    title: `${cat.name}の新しい写真`,
                    message: `${uploaderName}さんが写真を追加しました。${img.memo ? ` 「${img.memo}」` : ''}`,
                    timestamp, isUnread: timestamp > lastViewedAt, targetDate: timestamp,
                    icon: <Camera className="w-5 h-5 text-brand-sea" />
                });
            });
        });

        // ─── Flashback Notifications (Memories) ───
        cats?.forEach(cat => {
            const now = new Date();
            const intervals = [
                { label: '昨日の思い出', days: 1 },
                { label: '1週間前の思い出', days: 7 },
                { label: '1年前の思い出', days: 365 }
            ];
            intervals.forEach(interval => {
                const targetDate = new Date(now.getTime() - interval.days * 24 * 60 * 60 * 1000);
                const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

                const photoAtTime = cat.images?.find((img: any) => {
                    const d = new Date(img.createdAt);
                    return d >= startOfDay && d <= endOfDay;
                });

                // In demo mode, force show if no real image found for that date
                const isDemo = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('demo') === 'true';

                if (photoAtTime || (isDemo && (interval.days === 1 || interval.days === 365))) {
                    items.push({
                        id: `flashback-${cat.id}-${interval.days}`,
                        type: 'photo',
                        title: interval.label,
                        message: `${interval.days === 1 ? '昨日' : interval.days + '日前'}も、${cat.name}はこんなに可愛かったですよ。振り返ってみませんか？`,
                        timestamp: new Date(now.getTime() - 500), // Near top
                        isUnread: true,
                        targetDate: photoAtTime ? new Date(photoAtTime.createdAt) : targetDate,
                        link: 'zukan',
                        icon: <Heart className="w-5 h-5 text-rose-400" />
                    });
                }
            });
        });

        return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 30);
    }, [careLogs, incidents, cats, householdUsers, careTaskDefs, currentUser, lastViewedAt]);

    const hasUnreadNotifications = useMemo(() => realNotifications.some(n => n.isUnread), [realNotifications]);

    return (
        <>
            {/* Splash */}
            <AnimatePresence mode="wait">
                {showSplash && (
                    <motion.div
                        key="collection-splash"
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF9F7]"
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)", transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
                    >
                        <SplashScreen />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Tab Screens ─── */}
            <AnimatePresence mode="popLayout" initial={false}>
                {tab === "home" && !showZukanDetail && (
                    <motion.div
                        key="collection-home-layer"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
                        className="relative z-0"
                    >
                        <CollectionHome
                            onOpenCollection={() => setTab("cat")}
                            onOpenImport={() => setIsImportWizardOpen(true)}
                        />
                    </motion.div>
                )}

                {(tab === "cat" || showZukanDetail) && (
                    <motion.div
                        key="zukan-detail-layer"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        className="relative z-[1]"
                    >
                        <ZukanScreen onClose={() => setShowZukanDetail(false)} />
                    </motion.div>
                )}

                {tab === "memories" && (
                    <motion.div
                        key="memories-layer"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        className="fixed inset-0 z-[10001]"
                    >
                        <OmoideScreen />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Global Bottom Nav ─── */}
            {!showSplash && (
                <BottomNavigationBar
                    activeTab={tab}
                    onTabChange={(newTab) => {
                        if (newTab === "camera") {
                            setShowZukanDetail(false);
                            setIsCaptureWorkflowOpen(true);
                        } else {
                            setTab(newTab);
                            setShowZukanDetail(false);
                        }
                    }}
                    hasNewNotifications={hasUnreadNotifications}
                />
            )}

            {/* Capture Workflow */}
            <PhotoImportWizard
                isOpen={isImportWizardOpen}
                onClose={() => setIsImportWizardOpen(false)}
                onComplete={() => {
                    setTab("home");
                    setIsImportWizardOpen(false);
                }}
            />
            <CaptureWorkflowSheet
                isOpen={isCaptureWorkflowOpen}
                initialPhotos={initialPhotos}
                onClose={() => {
                    setIsCaptureWorkflowOpen(false);
                    setInitialPhotos([]);
                }}
            />
            <input
                type="file"
                ref={hiddenFileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        setInitialPhotos(Array.from(e.target.files));
                        setIsCaptureWorkflowOpen(true);
                        e.target.value = '';
                    }
                }}
            />

            {/* Incident Detail Modal */}
            {selectedIncidentId && (
                <React.Suspense fallback={null}>
                    <IncidentDetailModal
                        isOpen={!!selectedIncidentId}
                        onClose={() => setSelectedIncidentId(null)}
                        incidentId={selectedIncidentId}
                    />
                </React.Suspense>
            )}
        </>
    );
}

// ─────────────────────────────────
// Auth wrappers (reuse existing pattern)
// ─────────────────────────────────
function CollectionWithProfile({ user }: { user: any }) {
    const { profile, loading: profileLoading, refetch } = useUserProfile(user);
    const [onboardingDone, setOnboardingDone] = useState(false);
    const [pendingHouseholdId, setPendingHouseholdId] = useState<string | null>(null);
    const checkComplete = !profileLoading;
    const effectiveHouseholdId = profile?.householdId ?? pendingHouseholdId ?? null;
    const effectiveUserId = profile?.userId ?? user?.id ?? null;
    const needsOnboarding = !effectiveHouseholdId && !onboardingDone;

    if (profileLoading || !checkComplete) return <SplashScreen />;

    if (needsOnboarding && !onboardingDone) {
        return (
            <OnboardingScreen
                onComplete={(householdId) => {
                    if (householdId) {
                        setPendingHouseholdId(householdId);
                    }
                    setOnboardingDone(true);
                    refetch();
                }}
            />
        );
    }

    return (
        <FootprintProvider userId={user?.id} householdId={effectiveHouseholdId ?? undefined} isDemo={false}>
            <AppProvider householdId={effectiveHouseholdId} currentUserId={effectiveUserId} isDemo={false}>
                <CollectionAppContent />
            </AppProvider>
        </FootprintProvider>
    );
}

function CollectionAuth() {
    const { user, loading } = useAuth();
    const searchParams = useSearchParams();
    const isDemo = searchParams.get('demo') === 'true';

    if (loading && !user && !isDemo) return <SplashScreen />;
    if (!user && !isDemo && !loading) return <LoginScreen />;

    if (isDemo) {
        return (
            <FootprintProvider isDemo={true}>
                <AppProvider householdId={null} isDemo={true}>
                    <CollectionAppContent />
                </AppProvider>
            </FootprintProvider>
        );
    }

    return <CollectionWithProfile user={user} />;
}

export default function CollectionPage() {
    return (
        <React.Suspense fallback={<SplashScreen />}>
            <CollectionAuth />
        </React.Suspense>
    );
}
