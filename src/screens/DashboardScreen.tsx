import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppContext";
import { fmtDateTime } from "@/lib/format";
import { localeFor, t } from "@/lib/i18n";
import { ChildBadge } from "@/components/ChildBadge";
import { AssignmentStatus, ChildColor, ChildColorHex, EventStatus, RideDirection, isExternalDriver } from "@/domain/enums";
import { todayStart, endOfDay, endOfWeek, endOfMonth } from "@/domain/timeWindow";
const _endOfToday = () => endOfDay(todayStart());
import { RideStatusChip } from "@/components/RideStatusChip";

type UpcomingRange = "1d" | "7d";

export function DashboardScreen() {
  const navigate = useNavigate();
  const { parent, children, events, assignments, upsertAssignment, config } = useApp();
  const childColorMap = new Map(children.map((c) => [c.childId, ChildColorHex[c.colorTag]]));
  const [range, setRange] = useState<UpcomingRange>("1d");

  const startOfToday = todayStart();
  const endOfToday = _endOfToday();
  const upcomingWindowEnd = range === "1d"
    ? endOfDay(startOfToday)
    : endOfDay(startOfToday + 6 * 86_400_000);

  const upcoming = events
    .filter((e) =>
      e.startDateTime >= startOfToday &&
      e.startDateTime <= upcomingWindowEnd &&
      e.status !== EventStatus.CANCELLED,
    )
    .sort((a, b) => a.startDateTime - b.startDateTime);

  const markRideDone = async (e: React.MouseEvent, assignmentId: string) => {
    e.stopPropagation();
    const a = assignments.find((x) => x.assignmentId === assignmentId);
    if (!a) return;
    await upsertAssignment({
      ...a,
      assignmentStatus: AssignmentStatus.COMPLETED,
      completedAt: Date.now(),
    });
  };

  // My rides on the dashboard include:
  //   - rides I drive (or claimed for someone else),
  //   - rides assigned to an external (non-member) driver — visible to
  //     everyone in the family so they can verify out-of-group coverage.
  const myOpenRides = assignments.filter((a) => {
    if (a.assignmentStatus === AssignmentStatus.UNASSIGNED) return false;
    if (a.assignmentStatus === AssignmentStatus.COMPLETED) return false;
    if (a.driverParentId === parent?.parentId) return true;
    if (a.claimedByParentId === parent?.parentId) return true;
    if (isExternalDriver(a.driverParentId)) return true;
    return false;
  });

  const weekEnd = endOfWeek();
  const monthEnd = endOfMonth();

  const countOpenLegs = (evts: typeof events) =>
    evts.reduce((count, e) => {
      const legCount = e.rideDirection === RideDirection.BOTH ? 2 : 1;
      const claimed = assignments.filter(
        (a) => a.eventId === e.eventId && a.assignmentStatus !== AssignmentStatus.UNASSIGNED,
      ).length;
      return count + Math.max(0, legCount - claimed);
    }, 0);

  const rideEvents = events.filter((e) => e.needsRide && e.startDateTime >= startOfToday);
  const weekOpenLegs = countOpenLegs(rideEvents.filter((e) => e.startDateTime <= weekEnd));
  const monthOpenLegs = countOpenLegs(rideEvents.filter((e) => e.startDateTime > weekEnd && e.startDateTime <= monthEnd));

  return (
    <>
      <Header
        title={`${t("hi", config.language)} ${parent?.displayName ?? t("there", config.language)}`.trim()}
        right={(() => {
          const locale = localeFor(config.language);
          const now = new Date();
          const weekday = now.toLocaleDateString(locale, { weekday: "long" });
          const datePart = now.toLocaleDateString(locale, { month: "short", day: "numeric" });
          return (
            <div style={{ textAlign: "right", lineHeight: 1.15, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{weekday}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{datePart}</div>
            </div>
          );
        })()}
      />
      <main className="app-main">
        <section>
          <h2 style={sH}>{t("myRides", config.language)}</h2>
          {myOpenRides.length === 0 && <div className="card empty">{t("nothingOnYourPlate", config.language)}</div>}
          {myOpenRides.map((a) => {
            const evt = events.find((e) => e.eventId === a.eventId);
            const hex = evt ? childColorMap.get(evt.childId) : undefined;
            const external = isExternalDriver(a.driverParentId);
            const hasNote = !!evt?.description;
            const preview = hasNote
              ? (evt!.description.length > 15 ? evt!.description.slice(0, 15) + "…" : evt!.description)
              : null;
            const cardStyle: React.CSSProperties = {
              cursor: "pointer",
              ...(hex ? { borderLeft: `4px solid ${hex}` } : {}),
              ...(external ? { background: "#ef444422", borderColor: "#ef4444" } : {}),
            };
            return (
              <div className="card" key={a.assignmentId}
                style={cardStyle}
                onClick={() => evt && navigate(`/events/${evt.eventId}`)}>
                <div className="row row--between" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {(() => {
                        const c = evt ? children.find((c) => c.childId === evt.childId) : null;
                        return c ? <ChildBadge name={c.name} color={c.colorTag} archived={c.isArchived} /> : null;
                      })()}
                      <strong>{evt?.title ?? a.eventId} · {a.rideLeg}</strong>
                    </div>
                    {evt && <p style={{ margin: "2px 0 0" }}>{fmtDateTime(evt.startDateTime, config.language)}</p>}
                    {external && (
                      <p style={{ margin: "2px 0 0", color: "#ef4444", fontWeight: 600, fontSize: 13 }}>
                        {t("externalDriver", config.language)}: {a.driverName || "?"}
                      </p>
                    )}
                  </div>
                  <div className="row" style={{ gap: 8, flexShrink: 0, alignItems: "center" }}>
                    {(hasNote || !evt) && (
                      <span style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "3px 7px", fontSize: 11,
                        color: "var(--fg)", maxWidth: 110, lineHeight: 1.3,
                      }} title={evt?.description}>
                        {preview}
                      </span>
                    )}
                    {external && (
                      <span className="chip" style={{ background: "#ef4444", color: "#fff" }}>
                        {t("externalDriver", config.language)}
                      </span>
                    )}
                    <RideStatusChip status={a.assignmentStatus} />
                    {evt && evt.startDateTime <= endOfToday && (
                      <button
                        className="btn"
                        style={{ padding: "4px 10px", minHeight: "auto", fontSize: 12 }}
                        onClick={(ev) => markRideDone(ev, a.assignmentId)}
                      >
                        {t("done", config.language)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section>
          <div className="row row--between" style={{ margin: "20px 4px 8px" }}>
            <h2 style={{ ...sH, margin: 0 }}>{t("upcomingEvents", config.language)}</h2>
            <div className="row" style={{ gap: 4 }}>
              <button
                onClick={() => setRange("1d")}
                style={rangeBtn(range === "1d")}
                aria-pressed={range === "1d"}
              >{t("today", config.language)}</button>
              <button
                onClick={() => setRange("7d")}
                style={rangeBtn(range === "7d")}
                aria-pressed={range === "7d"}
              >{t("sevenDays", config.language)}</button>
            </div>
          </div>
          {upcoming.length === 0 && (
            <div className="card empty">
              {range === "1d" ? t("nothingScheduledToday", config.language) + " " : t("nothingNext7Days", config.language) + " "}
              <Link to="/events">{t("addOne", config.language)}</Link>
            </div>
          )}
          {upcoming.map((e) => {
            const child = children.find((c) => c.childId === e.childId);
            const hex = childColorMap.get(e.childId);
            return (
              <Link to={`/events/${e.eventId}`} key={e.eventId}>
                <div className="card" style={hex ? { borderLeft: `4px solid ${hex}` } : undefined}>
                  <div className="row row--between">
                    <div>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <ChildBadge name={child?.name ?? ""} color={child?.colorTag ?? ChildColor.BLUE} archived={child?.isArchived} />
                        <strong>{e.title}</strong>
                      </div>
                      <p>{fmtDateTime(e.startDateTime, config.language)} · {e.locationName || e.eventType}</p>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      {e.needsRide && <span className="chip">Ride</span>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section>
          <h2 style={sH}>{t("weekOpenRideRequests", config.language)}</h2>
          {weekOpenLegs === 0 ? (
            <div className="card empty">{t("allLegsClaimedWeek", config.language)}</div>
          ) : (
            <div className="card">
              <p>
                {weekOpenLegs} {t(weekOpenLegs === 1 ? "rideLeg" : "rideLegs", config.language)}{" "}
                {t("needVolunteersWeek", config.language)}
              </p>
              <Link to="/rides" className="btn btn--ghost" style={{ display: "inline-block", marginTop: 8 }}>
                {t("viewBoard", config.language)}
              </Link>
            </div>
          )}
        </section>

        <section>
          <h2 style={sH}>{t("monthOpenRideRequests", config.language)}</h2>
          {monthOpenLegs === 0 ? (
            <div className="card empty">{t("allLegsClaimedMonth", config.language)}</div>
          ) : (
            <div className="card">
              <p>
                {monthOpenLegs} {t(monthOpenLegs === 1 ? "rideLeg" : "rideLegs", config.language)}{" "}
                {t("needVolunteersMonth", config.language)}
              </p>
              <Link to="/rides" className="btn btn--ghost" style={{ display: "inline-block", marginTop: 8 }}>
                {t("viewBoard", config.language)}
              </Link>
            </div>
          )}
        </section>

      </main>
    </>
  );
}

const sH: React.CSSProperties = {
  margin: "20px 4px 8px", fontSize: 13,
  textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)",
};

function rangeBtn(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    minHeight: "auto",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: active ? "var(--primary)" : "transparent",
    color: active ? "#fff" : "var(--fg)",
    cursor: "pointer",
  };
}
