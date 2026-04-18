import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { useLiveQuery } from "@/lib/useLiveQuery";
import { childrenRepo, eventsRepo } from "@/storage/repository";
import { ChildDot } from "@/components/ChildDot";
import { ChildColor } from "@/domain/enums";
import { fmtDateTime } from "@/lib/format";
import { expandRecurrence } from "@/domain/recurrence";

export function EventsScreen() {
  const events = useLiveQuery(() => eventsRepo.observeAll(), []);
  const children = useLiveQuery(() => childrenRepo.observeAll(), []);

  const windowStart = Date.now();
  const windowEnd = windowStart + 30 * 24 * 60 * 60 * 1000;
  const expanded = events.flatMap((e) => expandRecurrence(e, windowStart, windowEnd));
  expanded.sort((a, b) => a.startDateTime - b.startDateTime);

  return (
    <>
      <Header title="Events" />
      <main className="app-main">
        {expanded.length === 0 && (
          <div className="card empty">No events in the next 30 days.</div>
        )}
        {expanded.map((e) => {
          const child = children.find((c) => c.childId === e.childId);
          return (
            <Link to={`/events/${e.eventId.split(":")[0]}`} key={e.eventId}>
              <div className="card">
                <div className="row row--between">
                  <div>
                    <div className="row">
                      <ChildDot color={child?.colorTag ?? ChildColor.BLUE} />
                      <strong>{e.title}</strong>
                    </div>
                    <p>{fmtDateTime(e.startDateTime)}</p>
                    {e.locationName && <p>{e.locationName}</p>}
                  </div>
                  {e.needsRide && <span className="chip">Ride</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </main>
      <Link to="/events/new" className="fab" aria-label="Add event">＋</Link>
    </>
  );
}
