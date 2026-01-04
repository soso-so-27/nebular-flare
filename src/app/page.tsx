"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppProvider } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { useUserProfile } from "@/hooks/use-supabase-data";
import { TopBar } from "@/components/app/top-bar";
import { HomeScreen } from "@/components/app/home-screen";
import { WidgetHomeScreen } from "@/components/app/widget-home-screen";
import { FullscreenHeroHomeScreen } from "@/components/app/fullscreen-hero-home";
import { CareScreen } from "@/components/app/care-screen";
import { CatScreen } from "@/components/app/cat-screen";
import { GalleryScreen } from "@/components/app/gallery-screen";
import { MoreScreen } from "@/components/app/more-screen";
import { LoginScreen } from "@/components/app/login-screen";
import { OnboardingScreen } from "@/components/app/onboarding-screen";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Home as HomeIcon, Heart, Cat, Image, Activity, Calendar, MoreHorizontal, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { TwinFAB } from "@/components/app/twin-fab";
import { useAppState } from "@/store/app-store";
import { getCatchUpItems } from "@/lib/utils-catchup";

import { NotificationModal } from "@/components/app/notification-modal";
import { CalendarModal } from "@/components/app/calendar-modal";

import { haptics } from "@/lib/haptics";
import { SplashScreen } from "@/components/app/splash-screen";
import { SidebarMenu } from "@/components/app/sidebar-menu";
import { ImmersiveHome } from "@/components/app/immersive-home";

function AppContent() {
  const [tab, setTab] = useState("home");
  const [careSwipeMode, setCareSwipeMode] = useState(false);
  const [catSwipeMode, setCatSwipeMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openSection, setOpenSection] = useState<'care' | 'cat' | 'inventory' | null>(null);

  // Get data and functions for quick actions
  const {
    tasks, noticeLogs, inventory, lastSeenAt, settings, cats,
    careTaskDefs, careLogs, noticeDefs, activeCatId,
    addCareLog, addObservation, setInventory, isDemo
  } = useAppState();

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
  const totalCount = careCount + catCount;

  // Quick action handler for sidebar - immediate completion
  const handleQuickAction = async (section: string, itemId: string) => {
    haptics.impactLight();

    if (section === 'care') {
      // Map sidebar items to care task types
      const careTypeMap: Record<string, string> = {
        'morning-food': 'food:morning',
        'evening-food': 'food:evening',
        'water': 'water',
        'toilet': 'toilet',
        'medicine': 'medicine'
      };
      const careType = careTypeMap[itemId];
      if (careType) {
        const result = await addCareLog(careType);
        if (!result?.error) {
          toast.success(`完了しました！`);
        } else {
          toast.error('記録に失敗しました');
        }
      }
    } else if (section === 'observation') {
      // Map sidebar items to observation types
      const obsTypeMap: Record<string, string> = {
        'appetite': 'appetite',
        'energy': 'energy',
        'toilet-check': 'toilet',
        'weight': 'weight'
      };
      const obsType = obsTypeMap[itemId];
      if (obsType && activeCatId) {
        // For observations, default to "いつも通り" for quick action
        const result = await addObservation(activeCatId, obsType, 'いつも通り');
        if (!result?.error) {
          toast.success(`記録しました！`);
        } else {
          toast.error('記録に失敗しました');
        }
      }
    } else if (section === 'inventory') {
      // For inventory, open the overlay for detailed input
      setTab("home");
      setOpenSection('inventory');
    }
  };

  // Handle sidebar navigation
  const handleSidebarNavigate = (section: string, item?: string) => {
    if (section === 'calendar') {
      setShowCalendar(true);
    } else if (section === 'notifications') {
      setShowNotifications(true);
    } else if (section === 'gallery') {
      setTab("gallery");
    } else if (section === 'settings') {
      setShowSettings(true);
      setTab("settings");
    } else if (item) {
      // Quick action for specific item
      handleQuickAction(section, item);
    } else {
      // Open overlay for category header
      if (section === 'care') {
        setTab("home");
        setOpenSection('care');
      } else if (section === 'observation') {
        setTab("home");
        setOpenSection('cat');
      } else if (section === 'inventory') {
        setTab("home");
        setOpenSection('inventory');
      }
    }
  };

  // Combined swipe mode handler
  const handleSwipeClick = () => {
    haptics.impactLight();
    if (careCount > 0) {
      setCareSwipeMode(true);
    } else if (catCount > 0) {
      setCatSwipeMode(true);
    } else {
      // Open care swipe anyway if nothing pending
      setCareSwipeMode(true);
    }
  };

  // Force layout re-calculation for mobile viewport height hack
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  // Use isHeroImageLoaded to control Splash Screen
  const { isHeroImageLoaded } = useAppState();

  return (
    <>
      {/* Smart Splash Screen - Waits for Hero Image */}
      {!isHeroImageLoaded && (
        <div className="fixed inset-0 z-[9999]">
          <SplashScreen />
        </div>
      )}

      <SidebarMenu
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onNavigate={handleSidebarNavigate}
      />

      <main className="min-h-dvh overflow-hidden">
        <div className="max-w-md mx-auto space-y-4">
          <NotificationModal
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
          <CalendarModal
            isOpen={showCalendar}
            onClose={() => setShowCalendar(false)}
          />

          {/* Immersive Home - Always mounted for background context */}
          <ImmersiveHome
            onOpenSidebar={() => setShowSidebar(true)}
            onNavigate={(t) => setTab(t)}
            onOpenCalendar={() => setShowCalendar(true)}
            onCatClick={() => setTab("cat")}
          />

          {/* Overlays */}
          <AnimatePresence>
            {tab === "cat" && (
              <motion.div
                key="cat-screen"
                className="fixed inset-0 z-[10002] bg-white/60 dark:bg-slate-950/60 backdrop-blur-md"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.4, type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className="absolute top-4 right-4 z-[10003]">
                  <button
                    onClick={() => setTab("home")}
                    className="p-2 rounded-full bg-white/40 backdrop-blur-md shadow-sm border border-white/20 text-slate-800 dark:text-white hover:bg-white/60"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="h-full overflow-y-auto pt-16 px-4 pb-24">
                  <CatScreen />
                </div>
              </motion.div>
            )}

            {tab === "gallery" && (
              <motion.div
                key="gallery-screen"
                className="fixed inset-0 z-[10002] bg-white/60 dark:bg-slate-950/60 backdrop-blur-md overflow-y-auto"
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ duration: 0.3, ease: "circOut" }}
              >
                <GalleryScreen onClose={() => setTab("home")} />
              </motion.div>
            )}

            {tab === "settings" && (
              <motion.div
                key="settings-screen"
                className="fixed inset-0 z-[10002] bg-white/60 dark:bg-slate-950/60 backdrop-blur-md overflow-y-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MoreScreen onClose={() => setTab("home")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation - hidden on immersive home */}
      {/* Footer navigation has been removed for full immersive experience */}
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
    return <SplashScreen />;
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
      <Toaster />
    </AppProvider>
  );
}



function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  // Show loading state
  if (loading) {
    return <SplashScreen />;
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
        <Toaster />
      </AppProvider>
    );
  }

  // Authenticated: check for onboarding
  return <AuthenticatedAppWithProfile />;
}

export default function Home() {
  return (
    <React.Suspense fallback={<SplashScreen />}>
      <AuthenticatedApp />
    </React.Suspense>
  );
}
