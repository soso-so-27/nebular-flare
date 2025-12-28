"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppProvider } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { useUserProfile } from "@/hooks/use-supabase-data";
import { TopBar } from "@/components/app/top-bar";
import { HomeScreen } from "@/components/app/home-screen";
import { CareScreen } from "@/components/app/care-screen";
import { CatScreen } from "@/components/app/cat-screen";
import { GalleryScreen } from "@/components/app/gallery-screen";
import { MoreScreen } from "@/components/app/more-screen";
import { LoginScreen } from "@/components/app/login-screen";
import { OnboardingScreen } from "@/components/app/onboarding-screen";
import { Toaster } from "@/components/ui/sonner";
import { Home as HomeIcon, Heart, Cat, Image, Activity } from "lucide-react";
import { Loader2 } from "lucide-react";
import { TwinFAB } from "@/components/app/twin-fab";
import { useAppState } from "@/store/app-store";
import { getCatchUpItems } from "@/lib/utils-catchup";

import { NotificationModal } from "@/components/app/notification-modal";
import { CalendarModal } from "@/components/app/calendar-modal";

function AppContent() {
  const [tab, setTab] = useState("home");
  const [careSwipeMode, setCareSwipeMode] = useState(false);
  const [catSwipeMode, setCatSwipeMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Get catchup items for FAB badges
  const { tasks, noticeLogs, inventory, lastSeenAt, settings, cats, careTaskDefs, careLogs, noticeDefs } = useAppState();
  const catchup = React.useMemo(() => getCatchUpItems({
    tasks,
    noticeLogs,
    inventory,

    lastSeenAt,
    settings,
    cats,
    careTaskDefs,
    careLogs,
    noticeDefs,
  }), [tasks, noticeLogs, inventory, lastSeenAt, settings, cats, careTaskDefs, careLogs, noticeDefs]);

  const careCount = catchup.allItems.filter(item => item.type === 'task' || item.type === 'inventory').length;
  const catCount = catchup.allItems.filter(item => item.type === 'notice' || item.type === 'unrecorded').length;

  const tabItems = [
    { id: "home", label: "ホーム", Icon: HomeIcon },
    { id: "gallery", label: "猫", Icon: Cat },
  ];

  // Handle FAB clicks - show swipe overlay on home
  const handleCareFABClick = () => {
    setTab("home");
    setCareSwipeMode(true);
  };

  const handleCatFABClick = () => {
    setTab("home");
    setCatSwipeMode(true);
  };

  return (
    <>
      <main className="min-h-dvh bg-background dark:bg-slate-950 pb-32 pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <TopBar
            onSettingsClick={() => setTab("settings")}
            onNotificationClick={() => setShowNotifications(true)}
            onHistoryClick={() => setShowCalendar(true)}
          />
          <NotificationModal
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
          <CalendarModal
            isOpen={showCalendar}
            onClose={() => setShowCalendar(false)}
          />

          {tab === "home" && (
            <>
              <HomeScreen />
              {/* Care Swipe Overlay */}
              {careSwipeMode && (
                <CareScreen externalSwipeMode={careSwipeMode} onSwipeModeChange={setCareSwipeMode} />
              )}
              {/* Cat Swipe Overlay */}
              {catSwipeMode && (
                <CatScreen externalSwipeMode={catSwipeMode} onSwipeModeChange={setCatSwipeMode} />
              )}
            </>
          )}
          {tab === "gallery" && <GalleryScreen />}
          {tab === "settings" && <MoreScreen />}
        </div>
      </main>

      {/* Navigation - fixed at very bottom */}
      <nav
        className="fixed bottom-0 inset-x-0 backdrop-blur-xl border-t border-black/5 flex items-center justify-around z-50"
        style={{
          backgroundColor: 'rgba(245, 240, 230, 0.95)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
          paddingTop: '12px',
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* Home */}
        <button
          onClick={() => {
            setTab("home");
            setCareSwipeMode(false);
            setCatSwipeMode(false);
          }}
          className={`relative flex flex-col items-center gap-1 transition-all duration-200 ${tab === "home" && !careSwipeMode && !catSwipeMode ? "text-primary scale-105" : "text-muted-foreground opacity-70 hover:opacity-100"}`}
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-[10px] font-bold">ホーム</span>
        </button>

        {/* Care (Overlay) */}
        <button
          onClick={() => {
            setTab("home");
            setCatSwipeMode(false);
            setCareSwipeMode(true);
          }}
          className={`relative flex flex-col items-center gap-1 transition-all duration-200 ${careSwipeMode ? "text-amber-500 scale-105" : "text-muted-foreground opacity-70 hover:opacity-100"}`}
        >
          <div className="relative">
            <Heart className="h-6 w-6" />
            {careCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-white">
                {careCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">お世話</span>
        </button>

        {/* Health (Overlay) - renamed from "Record" */}
        <button
          onClick={() => {
            setTab("home");
            setCareSwipeMode(false);
            setCatSwipeMode(true);
          }}
          className={`relative flex flex-col items-center gap-1 transition-all duration-200 ${catSwipeMode ? "text-amber-500 scale-105" : "text-muted-foreground opacity-70 hover:opacity-100"}`}
        >
          <div className="relative">
            <Activity className="h-6 w-6" />
            {catCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-white">
                {catCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">体調</span>
        </button>

        {/* Album (Gallery) - renamed from "Cat" */}
        <button
          onClick={() => {
            setTab("gallery");
            setCareSwipeMode(false);
            setCatSwipeMode(false);
          }}
          className={`relative flex flex-col items-center gap-1 transition-all duration-200 ${tab === "gallery" ? "text-primary scale-105" : "text-muted-foreground opacity-70 hover:opacity-100"}`}
        >
          <Cat className="h-6 w-6" />
          <span className="text-[10px] font-bold">猫</span>
        </button>
      </nav>
    </>
  );
}


function AuthenticatedAppWithProfile() {
  const { profile, loading: profileLoading, refetch } = useUserProfile();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!profileLoading) {
      // If onboarding was just completed, don't reset needsOnboarding
      if (onboardingDone && profile?.householdId) {
        setNeedsOnboarding(false);
        setCheckComplete(true);
      } else if (!onboardingDone) {
        // Initial check - if user has no household, they need onboarding
        setNeedsOnboarding(!profile?.householdId);
        setCheckComplete(true);
      }
    }
  }, [profile, profileLoading, onboardingDone]);

  if (profileLoading || !checkComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (needsOnboarding && !onboardingDone) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setOnboardingDone(true);
          setNeedsOnboarding(false);
          // Refetch profile after a delay to get updated household_id
          setTimeout(() => {
            refetch();
          }, 800);
        }}
      />
    );
  }

  return (
    <AppProvider householdId={profile?.householdId ?? null} isDemo={false}>
      <AppContent />
      <Toaster position="top-center" richColors />
    </AppProvider>
  );
}



function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Show login if not authenticated and not demo mode
  if (!user && !isDemo) {
    return <LoginScreen />;
  }

  // Demo mode: skip profile check
  if (isDemo) {
    return (
      <AppProvider householdId={null} isDemo={true}>
        <AppContent />
        <Toaster position="top-center" richColors />
      </AppProvider>
    );
  }

  // Authenticated: check for onboarding
  return <AuthenticatedAppWithProfile />;
}

export default function Home() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <AuthenticatedApp />
    </React.Suspense>
  );
}
