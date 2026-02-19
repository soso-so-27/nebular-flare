"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { useUserProfile } from "@/hooks/use-supabase-data";
import { toast } from "sonner";
import { Home as HomeIcon, Heart, Cat, Image, Activity, Calendar, MoreHorizontal, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  AppProvider,
  useCatContext,
  useCareContext,
  useInventoryContext,
  useSettingsContext,
  useCoreContext
} from "@/store/app-store";
import { getCatchUpItems } from "@/lib/utils-catchup";
import { haptics } from "@/lib/haptics";
import { SplashScreen } from "@/components/app/screens/splash-screen";
import { SidebarMenu } from "@/components/app/shared/sidebar-menu";
import { ImmersiveHome } from "@/components/app/home/immersive-home";
import { WeeklyHome } from "@/components/app/home/weekly-home";
import { DekigotoScreen } from "@/components/app/screens/dekigoto-screen";
import { FootprintProvider } from "@/providers/footprint-provider";
import { BackdropSurface } from "@/components/ui/backdrop-surface";


// Lazy load heavy components
const CatScreen = dynamic(() => import("@/components/app/screens/cat-screen").then(m => ({ default: m.CatScreen })), { ssr: false });
const GalleryScreen = dynamic(() => import("@/components/app/screens/gallery-screen").then(m => ({ default: m.GalleryScreen })), { ssr: false });
const ZukanScreen = dynamic(() => import("@/components/app/screens/zukan-screen").then(m => ({ default: m.ZukanScreen })), { ssr: false });

const LoginScreen = dynamic(() => import("@/components/app/screens/login-screen").then(m => ({ default: m.LoginScreen })), { ssr: false });
const OnboardingScreen = dynamic(() => import("@/components/app/screens/onboarding-screen").then(m => ({ default: m.OnboardingScreen })), { ssr: false });

const CalendarModal = dynamic(() => import("@/components/app/modals/calendar-modal").then(m => ({ default: m.CalendarModal })), { ssr: false });
const IncidentDetailModal = dynamic(() => import("@/components/app/modals/incident-detail-modal").then(m => ({ default: m.IncidentDetailModal })), { ssr: false });
const ImmersivePhotoView = dynamic(() => import("@/components/app/immersive/ImmersivePhotoView").then(m => ({ default: m.ImmersivePhotoView })), { ssr: false });

// New Modals Lifted from ImmersiveHome
const ThemeExchangeModal = dynamic(() => import("@/components/app/modals/theme-exchange-modal").then(m => ({ default: m.ThemeExchangeModal })), { ssr: false });
const PhotoModal = dynamic(() => import("@/components/app/modals/photo-modal").then(m => ({ default: m.PhotoModal })), { ssr: false });
const IncidentModal = dynamic(() => import("@/components/app/modals/incident-modal").then(m => ({ default: m.IncidentModal })), { ssr: false });
const PhotoListSheet = dynamic(() => import("@/components/app/modals/photo-list-sheet").then(m => ({ default: m.PhotoListSheet })), { ssr: false });
const IncidentListSheet = dynamic(() => import("@/components/app/modals/incident-list-sheet").then(m => ({ default: m.IncidentListSheet })), { ssr: false });
const NyannlogSheet = dynamic(() => import("@/components/app/modals/nyannlog-sheet").then(m => ({ default: m.NyannlogSheet })), { ssr: false });


/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */

function AppContent() {
  const [tab, setTab] = useState("home");
  const [useWeeklyHome, setUseWeeklyHome] = useState(true);
  const [careSwipeMode, setCareSwipeMode] = useState(false);
  const [catSwipeMode, setCatSwipeMode] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [openSection, setOpenSection] = useState<'care' | 'cat' | 'inventory' | null>(null);
  const [galleryCatId, setGalleryCatId] = useState<string | null>(null);

  // Get data and functions for quick actions
  const { cats, catsLoading, activeCatId, isHeroImageLoaded } = useCatContext();
  const { tasks, noticeLogs, careTaskDefs, careLogs, noticeDefs, addCareLog, addObservation } = useCareContext();
  const { inventory, setInventory } = useInventoryContext();
  const { settings, lastSeenAt } = useSettingsContext();
  const { isDemo } = useCoreContext();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  // Lifted Navigation State
  const [showThemeExchange, setShowThemeExchange] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showPhotoListSheet, setShowPhotoListSheet] = useState(false);
  const [showIncidentListSheet, setShowIncidentListSheet] = useState(false);
  const [showNyannlogSheet, setShowNyannlogSheet] = useState(false);
  const [nyannlogTab, setNyannlogTab] = useState<'events' | 'requests' | 'input'>('events');
  const [inputExpansion, setInputExpansion] = useState<'none' | 'tags' | 'health'>('none');
  const [inputHeight, setInputHeight] = useState(300); // Default placeholder
  const [calendarDate, setCalendarDate] = useState(new Date());

  const handleOpenNyannlog = React.useCallback((tab: 'events' | 'requests' | 'input' = 'events', date?: Date) => {
    if (date) {
      setCalendarDate(date);
    }

    if (tab === 'events') {
      setTab('dekigoto');
    } else {
      setNyannlogTab(tab);
      if (tab !== 'input') setInputExpansion('none');
      setShowNyannlogSheet(true);
    }
  }, []);

  const handleOpenIncidentDetail = React.useCallback((id: string) => {
    setSelectedIncidentId(id);
  }, []);

  const [showSplashOverlay, setShowSplashOverlay] = useState(true);

  // Splash Screen Logic: Dismiss when data is ready (+ 0.8s buffer)
  useEffect(() => {
    if (!catsLoading) {
      const timer = setTimeout(() => setShowSplashOverlay(false), 800);
      return () => clearTimeout(timer);
    }
    // Fallback security timer
    const fallbackTimer = setTimeout(() => setShowSplashOverlay(false), 3000);
    return () => clearTimeout(fallbackTimer);
  }, [catsLoading]);

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

  const handleSelectItem = React.useCallback((id: string, type: string, photos?: string[]) => {
    if (photos && photos.length > 0) {
      const cat = cats.find(c => {
        const hasIncident = tasks?.some(t => t.id === id && t.catId === c.id);
        const hasImage = c.images?.some(img => img.id === id);
        return hasIncident || hasImage;
      });
      setSelectedPhoto({
        id,
        url: photos[0].startsWith('http')
          ? photos[0]
          : `https://zfuuzgazbdzyclwnqkqm.supabase.co/storage/v1/object/public/avatars/${photos[0]}`,
        storagePath: photos[0],
        catName: cat?.name || '',
        catAvatar: cat?.avatar || '',
        allPhotos: photos
      });
    } else {
      setSelectedIncidentId(id);
    }
  }, [cats, tasks]);

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
    } else if (section === 'zukan') {
      setTab("zukan");
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

  return (
    <>
      {/* Smart Splash Screen - Temporarily bypassed for testing WeeklyHome */}
      {false && !isHeroImageLoaded && (
        <div className="fixed inset-0 z-[9999]">
          <SplashScreen />
        </div>
      )}

      <SidebarMenu
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onNavigate={handleSidebarNavigate}
      />

      <BackdropSurface
        isRevealed={showNyannlogSheet}
        onConceal={() => setShowNyannlogSheet(false)}
        revealOffset={
          nyannlogTab === 'requests'
            ? '-38%'
            : nyannlogTab === 'input'
              ? `-${inputHeight + 44}px`
              : '-92%'
        }
        backLayer={
          <React.Suspense fallback={null}>
            <NyannlogSheet
              onTabChange={setNyannlogTab}
              isOpen={showNyannlogSheet}
              initialTab={nyannlogTab}
              onClose={() => setShowNyannlogSheet(false)}
              onOpenCalendar={() => setShowCalendar(true)}
              onOpenNew={() => { }}
              onSelectItem={handleSelectItem}
              usePortal={false}
              onExpandChange={setInputExpansion}
              onHeightChange={setInputHeight}
              initialDate={calendarDate}
            />
          </React.Suspense>
        }
        frontLayer={
          <>
            <CalendarModal
              isOpen={showCalendar}
              onClose={() => setShowCalendar(false)}
              selectedDate={calendarDate}
              onDateChange={setCalendarDate}
            />

            {/* Main Application Layers: Managed with coordinated Depth Zoom */}
            <AnimatePresence mode="popLayout" initial={false}>
              {/* Home View - Switch between Immersive and Weekly */}
              {tab === "home" && (
                <motion.div
                  key="home-layer"
                  initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    filter: "blur(10px)",
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                  }}
                  className="fixed inset-0 z-0"
                >
                  {useWeeklyHome ? (
                    <WeeklyHome
                      onOpenSidebar={() => setShowSidebar(true)}
                      onOpenNewEvent={() => handleOpenNyannlog('input')}
                      onNavigate={(t) => setTab(t)}
                      onToggleView={() => setUseWeeklyHome(!useWeeklyHome)}
                      selectedCatIds={[]}
                      // Lifted Props for Dock
                      onOpenCalendar={() => setShowCalendar(true)}
                      onOpenExchange={() => setShowThemeExchange(true)}
                      onOpenPhoto={() => setShowPhotoListSheet(true)}
                      onOpenGallery={() => setTab("gallery")}
                      onOpenIncident={() => setShowIncidentListSheet(true)}
                      onOpenIncidentDetail={handleOpenIncidentDetail}
                      onOpenNyannlogSheet={(tab, date?) => handleOpenNyannlog(tab as any || 'events', date)}
                      selectedDate={calendarDate}
                      onDateChange={setCalendarDate}
                    />
                  ) : (
                    <ImmersiveHome
                      onOpenSidebar={() => setShowSidebar(true)}
                      onNavigate={(t) => setTab(t)}
                      onOpenCalendar={() => setShowCalendar(true)}
                      onCatClick={() => setTab("cat")}
                      onSelectItem={handleSelectItem}
                      // Lifted Props
                      onOpenExchange={() => setShowThemeExchange(true)}
                      onOpenPhoto={() => setShowPhotoListSheet(true)}
                      onOpenGallery={() => setTab("gallery")}
                      onOpenIncident={() => setShowIncidentListSheet(true)}
                      onOpenIncidentDetail={handleOpenIncidentDetail}
                      onOpenNyannlogSheet={(tab, date?) => handleOpenNyannlog(tab as any || 'events', date)}
                      isNyannlogOpen={showNyannlogSheet}
                      onToggleView={() => setUseWeeklyHome(true)}
                    />
                  )}
                </motion.div>
              )}

              {tab === "dekigoto" && (
                <motion.div
                  key="dekigoto-layer"
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }
                  }}
                  exit={{
                    opacity: 0,
                    scale: 1.1,
                    filter: "blur(20px)",
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                  }}
                  className="fixed inset-0 z-[10001]"
                >
                  <DekigotoScreen
                    onClose={() => setTab("home")}
                    onOpenCalendar={() => setShowCalendar(true)}
                    onOpenSidebar={handleSidebarNavigate}
                    onSelectItem={handleSelectItem}
                    onNavigate={setTab}
                    // Lifted Props
                    onOpenExchange={() => setShowThemeExchange(true)}
                    onOpenPhoto={() => setShowPhotoListSheet(true)}
                    onOpenIncident={() => setShowIncidentListSheet(true)}
                    onOpenIncidentDetail={handleOpenIncidentDetail}
                    onOpenNyannlogSheet={handleOpenNyannlog}
                    isNyannlogOpen={showNyannlogSheet}
                    activeNyannlogTab={nyannlogTab}
                    onCloseNyannlog={() => setShowNyannlogSheet(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Secondary Overlays (Cat, Gallery) */}
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

              {tab === "zukan" && (
                <motion.div
                  key="zukan-screen"
                  className="fixed inset-0 z-[10002] bg-white/60 dark:bg-slate-950/60 backdrop-blur-md overflow-y-auto"
                  initial={{ opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "100%" }}
                  transition={{ duration: 0.3, ease: "circOut" }}
                >
                  <ZukanScreen
                    onClose={() => setTab("home")}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shared Modals - Unified across screens */}
            {selectedIncidentId && (
              <React.Suspense fallback={null}>
                <IncidentDetailModal
                  isOpen={!!selectedIncidentId}
                  onClose={() => setSelectedIncidentId(null)}
                  incidentId={selectedIncidentId}
                />
              </React.Suspense>
            )}

            <ImmersivePhotoView
              isOpen={!!selectedPhoto}
              onClose={() => setSelectedPhoto(null)}
              image={selectedPhoto}
            />

            {/* Lifted Modals */}
            {showThemeExchange && (
              <React.Suspense fallback={null}>
                <ThemeExchangeModal
                  isOpen={showThemeExchange}
                  onClose={() => setShowThemeExchange(false)}
                />
              </React.Suspense>
            )}

            {showPhotoModal && (
              <React.Suspense fallback={null}>
                <PhotoModal
                  isOpen={showPhotoModal}
                  onClose={() => setShowPhotoModal(false)}
                />
              </React.Suspense>
            )}

            {showIncidentModal && (
              <React.Suspense fallback={null}>
                <IncidentModal
                  isOpen={showIncidentModal}
                  onClose={() => setShowIncidentModal(false)}
                  defaultCatId={activeCatId}
                />
              </React.Suspense>
            )}

            {showPhotoListSheet && (
              <React.Suspense fallback={null}>
                <PhotoListSheet
                  isOpen={showPhotoListSheet}
                  onClose={() => setShowPhotoListSheet(false)}
                />
              </React.Suspense>
            )}

            {showIncidentListSheet && (
              <React.Suspense fallback={null}>
                <IncidentListSheet
                  isOpen={showIncidentListSheet}
                  onClose={() => setShowIncidentListSheet(false)}
                />
              </React.Suspense>
            )}
          </>
        }
      />
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
        <AppContent />
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
          <AppContent />
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
