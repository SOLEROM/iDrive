import { Header } from "@/components/Header";

export function NotificationsScreen() {
  return (
    <>
      <Header title="Notifications" back />
      <main className="app-main">
        <div className="card empty">No notifications yet.</div>
      </main>
    </>
  );
}
