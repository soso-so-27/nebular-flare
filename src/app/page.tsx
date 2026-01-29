"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppProvider } from "@/store/app-store";
import { useAuth } from "@/providers/auth-provider";
import { useUserProfile } from "@/hooks/use-supabase-data";
import { TopBar } from "@/components/app/top-bar";
import { HomeScreen } from "@/components/app/home-screen";
import { toast } from "sonner";
import { Home as HomeIcon, Heart, Cat, Image, Activity, Calendar, MoreHorizontal, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { TwinFAB } from "@/components/app/twin-fab";
import { useAppState } from "@/store/app-store";
import { getCatchUpItems } from "@/lib/utils-catchup";
import { haptics } from "@/lib/haptics";
import { SplashScreen } from "@/components/app/splash-screen";
import { SidebarMenu } from "@/components/app/sidebar-menu";
import { ImmersiveHome } from "@/components/app/immersive-home";
import { FootprintProvider } from "@/providers/footprint-provider";
import { CatsProvider } from "@/store/cats-context";

// Lazy load heavy components
const WidgetHomeScreen = dynamic(() => import("@/components/app/widget-home-screen").then(m => ({ default: m.WidgetHomeScreen })), { ssr: false });
const FullscreenHeroHomeScreen = dynamic(() => import("@/components/app/fullscreen-hero-home").then(m => ({ default: m.FullscreenHeroHomeScreen })), { ssr: false });
const CareScreen = dynamic(() => import("@/components/app/care-screen").then(m => ({ default: m.CareScreen })), { ssr: false });
const CatScreen = dynamic(() => import("@/components/app/cat-screen").then(m => ({ default: m.CatScreen })), { ssr: false });
const GalleryScreen = dynamic(() => import("@/components/app/gallery-screen").then(m => ({ default: m.GalleryScreen })), { ssr: false });

const LoginScreen = dynamic(() => import("@/components/app/login-screen").then(m => ({ default: m.LoginScreen })), { ssr: false });
const OnboardingScreen = dynamic(() => import("@/components/app/onboarding-screen").then(m => ({ default: m.OnboardingScreen })), { ssr: false });

const CalendarModal = dynamic(() => import("@/components/app/calendar-modal").then(m => ({ default: m.CalendarModal })), { ssr: false });


/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */

function AppContent() {
  const [tab, setTab] = useState("home");
  const [careSwipeMode, setCareSwipeMode] = useState(false);
  const [catSwipeMode, setCatSwipeMode] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [openSection, setOpenSection] = useState<'care' | 'cat' | 'inventory' | null>(null);
  const [galleryCatId, setGalleryCatId] = useState<string | null>(null);

  // Get data and functions for quick actions
  const {
    tasks, noticeLogs, inventory, lastSeenAt, settings, cats, catsLoading,
    careTaskDefs, careLogs, noticeDefs, activeCatId,
    addCareLog, addObservation, setInventory, isDemo
  } = useAppState();

  const [showSplashOverlay, setShowSplashOverlay] = useState(true);

  // Perfect Load Logic: Wait for data + 0.8s safety buffer
  useEffect(() => {
    if (!catsLoading && cats.length > 0) {
      const timer = setTimeout(() => {
        setShowSplashOverlay(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [catsLoading, cats]);

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
    dayStartHour: settings.dayStartHour,
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
    } else if (section === 'gallery') {
      setGalleryCatId(null); // Reset filter when opening from sidebar
      setTab("gallery");
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

  // Force layout re-calculation for mobile viewport height hack - REMOVED (using dvh)

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

      <main className="relative w-full h-full flex flex-col">
        <div className="flex-1 w-full max-w-md mx-auto relative flex flex-col">

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

          {/* Smart Splash Overlay - "Perfect Load" */}
          <AnimatePresence mode="wait">
            {showSplashOverlay && (
              <motion.div
                key="smart-splash"
                className="fixed inset-0 z-[10005] flex items-center justify-center bg-[#FAF9F7]"
                exit={{
                  opacity: 0,
                  scale: 1.1,
                  filter: "blur(20px)",
                  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
                }}
              >
                <SplashScreen />
              </motion.div>
            )}
          </AnimatePresence>

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
                  <CatScreen
                    onOpenGallery={() => {
                      setGalleryCatId(activeCatId); // Use current active cat
                      setTab("gallery");
                    }}
                  />
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
                <GalleryScreen
                  onClose={() => {
                    setGalleryCatId(null);
                    setTab("home");
                  }}
                  initialCatId={galleryCatId}
                />
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



function AuthenticatedAppWithProfile({ user }: { user: any }) {
  const { profile, loading: profileLoading, refetch } = useUserProfile(user);
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
    <FootprintProvider
      userId={user?.id}
      householdId={profile?.householdId ?? undefined}
      isDemo={false}
    >
      <AppProvider householdId={profile?.householdId ?? null} currentUserId={profile?.userId ?? null} isDemo={false}>
        <CatsProvider householdId={profile?.householdId ?? null} isDemo={false}>
          <AppContent />
        </CatsProvider>
      </AppProvider>
    </FootprintProvider>
  );
}



function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  // Latch user to prevent flickering on auth state changes
  const userRef = React.useRef<any>(null);
  if (user) {
    userRef.current = user;
  }
  const effectiveUser = user || userRef.current;

  // Show loading state only if we don't have a user yet
  if (loading && !effectiveUser) {
    return <SplashScreen />;
  }

  // Show login if not authenticated and not demo mode (and not loading)
  if (!effectiveUser && !isDemo && !loading) {
    return <LoginScreen />;
  }

  // Demo mode: skip profile check
  if (isDemo) {
    return (
      <FootprintProvider isDemo={true}>
        <AppProvider householdId={null} isDemo={true}>
          <CatsProvider householdId={null} isDemo={true}>
            <AppContent />
          </CatsProvider>
        </AppProvider>
      </FootprintProvider>
    );
  }

  // Authenticated: check for onboarding
  return <AuthenticatedAppWithProfile user={effectiveUser} />;
}

export default function Home() {
  return (
    <React.Suspense fallback={<SplashScreen />}>
      <AuthenticatedApp />
    </React.Suspense>
  );
}
