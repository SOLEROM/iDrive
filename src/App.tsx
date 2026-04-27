import { useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppProvider, useApp } from "@/state/AppContext";
import { TabBar } from "@/components/TabBar";
import { UpdateBanner } from "@/components/UpdateBanner";
import { OpenFileScreen } from "@/screens/OpenFileScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ChildrenScreen } from "@/screens/ChildrenScreen";
import { ChildDetailScreen } from "@/screens/ChildDetailScreen";
import { EventsScreen } from "@/screens/EventsScreen";
import { EventEditorScreen } from "@/screens/EventEditorScreen";
import { RidesBoardScreen } from "@/screens/RidesBoardScreen";
import { MyRidesScreen } from "@/screens/MyRidesScreen";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ActivityEditorScreen } from "@/screens/ActivityEditorScreen";
import { landingScreenPath } from "@/domain/enums";

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { isLoading, authUser, parent } = useApp();
  if (isLoading) return <div className="splash"><p>Loading…</p></div>;
  if (!authUser || !parent) return <OpenFileScreen />;
  return (
    <div className="app">
      <UpdateBanner />
      <LandingRedirector />
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/children" element={<ChildrenScreen />} />
        <Route path="/children/:childId" element={<ChildDetailScreen />} />
        <Route path="/children/:childId/activities/:activityIndex" element={<ActivityEditorScreen />} />
        <Route path="/events" element={<EventsScreen />} />
        <Route path="/events/new" element={<EventEditorScreen />} />
        <Route path="/events/:eventId" element={<EventEditorScreen />} />
        <Route path="/rides" element={<RidesBoardScreen />} />
        <Route path="/my-rides" element={<MyRidesScreen />} />
        <Route path="/notifications" element={<NotificationsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar />
    </div>
  );
}

/** On first sign-in this session, jump to the user's preferred landing screen. */
function LandingRedirector() {
  const { config } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const target = landingScreenPath(config.defaultLandingScreen);
    if (loc.pathname === "/" && target !== "/") nav(target, { replace: true });
  }, [config.defaultLandingScreen, loc.pathname, nav]);
  return null;
}
