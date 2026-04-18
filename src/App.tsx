import { Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/state/AppContext";
import { TabBar } from "@/components/TabBar";
import { SignInScreen } from "@/screens/SignInScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ChildrenScreen } from "@/screens/ChildrenScreen";
import { ChildDetailScreen } from "@/screens/ChildDetailScreen";
import { EventsScreen } from "@/screens/EventsScreen";
import { EventEditorScreen } from "@/screens/EventEditorScreen";
import { RidesBoardScreen } from "@/screens/RidesBoardScreen";
import { MyRidesScreen } from "@/screens/MyRidesScreen";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { parent } = useApp();
  if (!parent) return <SignInScreen />;
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/children" element={<ChildrenScreen />} />
        <Route path="/children/:childId" element={<ChildDetailScreen />} />
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
