import { Header } from "@/components/Header";
import { useLiveQuery } from "@/lib/useLiveQuery";
import { notificationsRepo } from "@/storage/repository";
import { fmtDateTime } from "@/lib/format";

export function NotificationsScreen() {
  const entries = useLiveQuery(() => notificationsRepo.observeRecent(), []);
  return (
    <>
      <Header title="Notifications" back />
      <main className="app-main">
        {entries.length === 0 && <div className="card empty">No notifications yet.</div>}
        {entries.map((n) => (
          <div className="card" key={n.notificationId}>
            <div className="row row--between">
              <strong>{n.category}</strong>
              <span className="chip chip--muted">{fmtDateTime(n.createdAt)}</span>
            </div>
            <p>{n.message}</p>
          </div>
        ))}
      </main>
    </>
  );
}
