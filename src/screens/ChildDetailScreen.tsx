import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ChildBadge } from "@/components/ChildBadge";
import { useApp } from "@/state/AppContext";
import { ChildColor } from "@/domain/enums";
import type { Child, Event } from "@/domain/models";
import { expandActivity } from "@/domain/activityExpander";
import { todayStart, endOfMonthsAhead, endOfMonth } from "@/domain/timeWindow";
import { getEveryDayLabel, getDayOfWeekLabel, localeFor } from "@/lib/i18n";
import type { DayOfWeek } from "@/domain/enums";

function eventFingerprint(e: Event): string {
  const d = new Date(e.startDateTime);
  return `${e.eventType}|${d.getFullYear()}-${d.getMonth()}-${d.getDate()}@${d.getHours()}:${d.getMinutes()}`;
}

type DeleteStep = "idle" | "confirm1" | "confirm2";
type RegenStep = "idle" | "confirm";

interface MonthOption {
  offset: number;       // 0 = current month, 1 = next, …
  label: string;        // "April 2026" or "April 2026 (current)"
}

function buildMonthOptions(locale: string | undefined, now: number = Date.now()): MonthOption[] {
  const out: MonthOption[] = [];
  const base = new Date(now);
  for (let i = 0; i <= 12; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    out.push({ offset: i, label: i === 0 ? `${label} (current)` : label });
  }
  return out;
}

export function ChildDetailScreen() {
  const { childId = "" } = useParams();
  const navigate = useNavigate();
  const { parent, children, events, assignments, upsertChild, upsertEvents, deleteEvents, deleteChildCascade, config } = useApp();

  const stored = children.find((c) => c.childId === childId) ?? null;
  const [draft, setDraft] = useState<Child | null>(stored);
  const [step, setStep] = useState<DeleteStep>("idle");
  const [busy, setBusy] = useState(false);
  const monthOptions = useMemo(() => buildMonthOptions(localeFor(config.language)), [config.language]);
  const [targetOffset, setTargetOffset] = useState<number>(2); // default: 2 months from current
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [regenStep, setRegenStep] = useState<RegenStep>("idle");

  if (!stored) return (
    <><Header title="Child" back /><main className="app-main"><div className="card empty">Not found.</div></main></>
  );

  const save = async (patch: Partial<Child>) => {
    const updated = { ...stored, ...patch };
    setDraft(updated);
    await upsertChild(updated);
  };

  const current = draft ?? stored;
  const eventCount = events.filter((e) => e.childId === childId).length;
  const assignmentCount = assignments.filter((a) =>
    events.some((e) => e.childId === childId && e.eventId === a.eventId),
  ).length;

  const targetLabel = monthOptions.find((o) => o.offset === targetOffset)?.label ?? "";

  const isCurrentMonth = targetOffset === 0;

  const projection = useMemo(() => {
    if (!stored) return { newCount: 0, totalCount: 0, deleteCount: 0 };
    const now = todayStart();

    if (isCurrentMonth) {
      // Past events are never touched. Operate strictly on [today, endOfMonth].
      const monthEnd = endOfMonth(now);
      const deleteCount = events.filter((e) =>
        e.childId === childId &&
        e.startDateTime >= now && e.startDateTime <= monthEnd,
      ).length;
      const candidates: Event[] = [];
      for (const a of stored.activities) {
        candidates.push(...expandActivity(a, {
          childId, createdByParentId: parent?.parentId ?? "anon",
          windowStart: now, windowEnd: monthEnd,
        }));
      }
      const dedup = new Map<string, Event>();
      for (const e of candidates) dedup.set(e.eventId, e);
      return { newCount: dedup.size, totalCount: dedup.size, deleteCount };
    }

    const target = endOfMonthsAhead(targetOffset, now);
    const existingFps = new Set(
      events.filter((e) => e.childId === childId).map(eventFingerprint),
    );
    const candidates: Event[] = [];
    for (const a of stored.activities) {
      candidates.push(...expandActivity(a, {
        childId, createdByParentId: parent?.parentId ?? "anon",
        windowStart: now, windowEnd: target,
      }));
    }
    const dedup = new Map<string, Event>();
    for (const e of candidates) dedup.set(e.eventId, e);
    const total = dedup.size;
    let fresh = 0;
    for (const e of dedup.values()) if (!existingFps.has(eventFingerprint(e))) fresh++;
    return { newCount: fresh, totalCount: total, deleteCount: 0 };
  }, [stored, targetOffset, events, childId, parent, isCurrentMonth]);

  const runAdditiveGenerate = async () => {
    if (!stored) return;
    setGenBusy(true);
    setGenResult(null);
    try {
      const now = todayStart();
      const target = endOfMonthsAhead(targetOffset, now);
      const candidates: Event[] = [];
      for (const a of stored.activities) {
        candidates.push(...expandActivity(a, {
          childId, createdByParentId: parent?.parentId ?? "anon",
          windowStart: now, windowEnd: target,
        }));
      }
      const dedup = new Map<string, Event>();
      for (const e of candidates) dedup.set(e.eventId, e);
      const existingFps = new Set(
        events.filter((e) => e.childId === childId).map(eventFingerprint),
      );
      const toUpsert = [...dedup.values()].filter((e) => !existingFps.has(eventFingerprint(e)));
      if (toUpsert.length > 0) await upsertEvents(toUpsert);
      setGenResult(
        toUpsert.length === 0
          ? "Calendar already covers that month — nothing new to add."
          : `Added ${toUpsert.length} event${toUpsert.length === 1 ? "" : "s"} through ${targetLabel}.`,
      );
    } finally {
      setGenBusy(false);
    }
  };

  const runResetCurrentMonth = async () => {
    if (!stored) return;
    setGenBusy(true);
    setGenResult(null);
    try {
      // Past events are never touched. Operate strictly on [today, endOfMonth].
      const now = todayStart();
      const monthEnd = endOfMonth(now);
      const idsToDelete = events
        .filter((e) =>
          e.childId === childId &&
          e.startDateTime >= now && e.startDateTime <= monthEnd,
        )
        .map((e) => e.eventId);
      if (idsToDelete.length > 0) await deleteEvents(idsToDelete);

      const candidates: Event[] = [];
      for (const a of stored.activities) {
        candidates.push(...expandActivity(a, {
          childId, createdByParentId: parent?.parentId ?? "anon",
          windowStart: now, windowEnd: monthEnd,
        }));
      }
      const dedup = new Map<string, Event>();
      for (const e of candidates) dedup.set(e.eventId, e);
      const toUpsert = [...dedup.values()];
      if (toUpsert.length > 0) await upsertEvents(toUpsert);

      setGenResult(
        `Reset ${targetLabel} (today onward): removed ${idsToDelete.length} old event${idsToDelete.length === 1 ? "" : "s"}, regenerated ${toUpsert.length}.`,
      );
    } finally {
      setGenBusy(false);
      setRegenStep("idle");
    }
  };

  const handleGenerate = () => {
    if (isCurrentMonth) {
      setRegenStep("confirm");
    } else {
      void runAdditiveGenerate();
    }
  };

  const performDelete = async () => {
    setBusy(true);
    try {
      await deleteChildCascade(childId);
      navigate("/children", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header title={current.name} back />
      <main className="app-main">
        <div className="card">
          <div style={{ marginBottom: 8 }}>
            <ChildBadge name={current.name} color={current.colorTag} archived={current.isArchived} />
          </div>
          <label>Name
            <input className="input" value={current.name}
              onChange={(e) => setDraft({ ...current, name: e.target.value })}
              onBlur={(e) => save({ name: e.target.value })} />
          </label>
          <label>Color
            <select className="select" value={current.colorTag}
              onChange={(e) => save({ colorTag: e.target.value as ChildColor })}>
              {Object.values(ChildColor).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Notes
            <textarea className="textarea" value={current.notes ?? ""}
              onChange={(e) => setDraft({ ...current, notes: e.target.value })}
              onBlur={(e) => save({ notes: e.target.value })} />
          </label>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Activities</h2>
            <button className="btn" onClick={() => navigate(`/children/${childId}/activities/new`)}>Add</button>
          </div>
          {current.activities.length === 0 && (
            <span className="chip chip--muted">No activities</span>
          )}
          {current.activities.map((activity, idx) => {
            // Derive the canonical day list from whichever shape the activity uses.
            // Older activities have `dayTimes` populated and `days` empty; the
            // chips must reflect the dayTimes keys, not fall back to "Every day".
            const dayTimeKeys = activity.dayTimes ? Object.keys(activity.dayTimes) : [];
            const sourceDays = activity.days?.length ? activity.days : dayTimeKeys;
            return (
              <div key={idx} className="row"
                style={{ justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--border)", cursor: "pointer" }}
                onClick={() => navigate(`/children/${childId}/activities/${idx}`)}>
                <div className="row" style={{ gap: 8 }}>
                  <span>{activity.name}</span>
                  {sourceDays.length === 0
                    ? <span className="chip">{getEveryDayLabel(config.language)}</span>
                    : sourceDays.map((d) => (
                        <span className="chip" key={d}>
                          {getDayOfWeekLabel(d as DayOfWeek, config.language)}
                        </span>
                      ))}
                </div>
                <span style={{ fontSize: 18, color: "var(--muted)", paddingRight: 4 }}>›</span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Generate future events</h2>
          <p style={{ margin: "0 0 8px" }}>
            Pick the month to fill events through. By default the app keeps
            roughly the next month filled — use this to extend further.
          </p>
          <label>Through month
            <select className="select" value={targetOffset}
              disabled={genBusy || stored.activities.length === 0}
              onChange={(e) => { setTargetOffset(Number(e.target.value)); setGenResult(null); }}>
              {monthOptions.map((o) => (
                <option key={o.offset} value={o.offset}>{o.label}</option>
              ))}
            </select>
          </label>
          <p style={{ margin: "8px 0", fontSize: 13, color: "var(--muted)" }}>
            {stored.activities.length === 0
              ? "Add an activity first."
              : isCurrentMonth
                ? `Reset ${targetLabel} from today onward: deletes ${projection.deleteCount} existing event${projection.deleteCount === 1 ? "" : "s"} and regenerates ${projection.totalCount}. Past days are never changed.`
                : `${projection.newCount} new event${projection.newCount === 1 ? "" : "s"} would be added (${projection.totalCount} total through ${targetLabel}).`}
          </p>
          <button
            className={isCurrentMonth ? "btn btn--danger btn--full" : "btn btn--full"}
            disabled={genBusy || stored.activities.length === 0}
            onClick={handleGenerate}
          >
            {genBusy
              ? (isCurrentMonth ? "Regenerating…" : "Generating…")
              : (isCurrentMonth ? "Reset & regenerate" : "Generate")}
          </button>
          {genResult && (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ok, var(--primary))" }}>
              {genResult}
            </p>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Danger zone</h2>
          <p style={{ margin: "0 0 10px" }}>
            Delete this child and remove all their activities, events and ride assignments.
          </p>
          <button
            className="btn btn--danger btn--full"
            onClick={() => setStep("confirm1")}
            disabled={busy}
          >
            Delete child
          </button>
        </div>
      </main>

      {regenStep === "confirm" && (
        <ConfirmModal
          title={`Reset ${targetLabel}?`}
          body={
            <>
              <p>
                This deletes <strong>{projection.deleteCount}</strong>{" "}
                event{projection.deleteCount === 1 ? "" : "s"} for{" "}
                <strong>{stored.name}</strong> from <strong>today</strong>{" "}
                through the end of {targetLabel} (including any ride
                assignments on them) and regenerates{" "}
                <strong>{projection.totalCount}</strong> event{projection.totalCount === 1 ? "" : "s"}{" "}
                from current activities.
              </p>
              <p>Past days are never touched.</p>
            </>
          }
          confirmLabel="Reset & regenerate"
          danger
          busy={genBusy}
          onCancel={() => setRegenStep("idle")}
          onConfirm={() => void runResetCurrentMonth()}
        />
      )}

      {step === "confirm1" && (
        <ConfirmModal
          title="Delete this child?"
          body={
            <>
              <p>
                This will permanently delete <strong>{current.name}</strong>,
                their <strong>{current.activities.length}</strong> activit{current.activities.length === 1 ? "y" : "ies"}
                , <strong>{eventCount}</strong> event{eventCount === 1 ? "" : "s"} and
                {" "}<strong>{assignmentCount}</strong> ride assignment{assignmentCount === 1 ? "" : "s"} for everyone in the group.
              </p>
              <p>This cannot be undone.</p>
            </>
          }
          confirmLabel="Continue"
          danger
          busy={busy}
          onCancel={() => setStep("idle")}
          onConfirm={() => setStep("confirm2")}
        />
      )}

      {step === "confirm2" && (
        <ConfirmModal
          title="Are you absolutely sure?"
          body={
            <p>
              Tap <strong>Yes, delete forever</strong> to permanently remove
              {" "}<strong>{current.name}</strong> and all related data.
            </p>
          }
          confirmLabel="Yes, delete forever"
          danger
          busy={busy}
          onCancel={() => setStep("idle")}
          onConfirm={() => void performDelete()}
        />
      )}
    </>
  );
}

function ConfirmModal({
  title, body, confirmLabel, danger, busy, onCancel, onConfirm,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 16,
      }}
      onClick={busy ? undefined : onCancel}
    >
      <div className="card" style={{ maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {body}
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn btn--ghost" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={danger ? "btn btn--danger" : "btn"}
            style={{ flex: 1 }}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
