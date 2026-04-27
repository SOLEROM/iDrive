---
noteId: "e930c5303fa411f1a7bf15b8f7b87558"
tags: []

---

# Design folder

Short topic-based notes used as the spec for the full `src/` rewrite.

Plans are intent; code is the current state. These docs describe both — what
the app does today (so we preserve every feature) and how the rewrite will
be structured.

## Index

| # | Topic | What it covers |
|---|---|---|
| [00](./00-overview.md) | Overview | Mission, stack, why rewrite, goals & non-goals |
| [01](./01-architecture.md) | Architecture | Layered `domain · data · state · ui` structure + file budgets |
| [02](./02-domain-model.md) | Domain model | Entities, invariants, what to delete |
| [03](./03-data-flow.md) | Data flow | Read/write paths, cascades, offline |
| [04](./04-firestore.md) | Firestore | Collection tree, rules, hardening |
| [05](./05-auth-and-membership.md) | Auth & membership | Sign-in flow, `families.yaml` |
| [06](./06-activities-and-events.md) | Activities → Events | Template expansion, ids, cascades |
| [07](./07-rides-and-assignments.md) | Rides | Legs, state machine, override-confirm UX |
| [08](./08-recurrence.md) | Recurrence | Keep flat-events + `RecurrenceRule` — why both |
| [09](./09-config-and-settings.md) | Config | Local / Shared / Session split |
| [10](./10-ui-navigation.md) | UI & nav | Routes, tabbar, components, a11y |
| [11](./11-theming-and-i18n.md) | Theming & i18n | CSS vars, dark mode, HE/EN plumbing |
| [12](./12-pwa.md) | PWA | Manifest, service worker, install, offline |
| [13](./13-backup-export.md) | XLSX backup | Export-only, dynamic import |
| [14](./14-notifications.md) | Notifications | Scaffold only (no push this round) |
| [15](./15-testing.md) | Testing | Four layers + coverage targets |
| [16](./16-build-and-deploy.md) | Build & deploy | Scripts, env, release checklist |
| [17](./17-features-inventory.md) | Feature inventory | **Mandatory list** to preserve |
| [18](./18-rewrite-plan.md) | Rewrite plan | Phase 0 → 6, rollback |
| [19](./19-known-issues.md) | Known issues | Bugs & smells to fix along the way |
| [⚠](./pitfalls.md) | Pitfalls | Self-critical review: where this design can still fail |
| [✅](./IMPLEMENTATION_STATUS.md) | Status | What actually shipped on 2026-04-25, deviations from the design, fixed bugs, deferred work |

## Workflow

1. Read these in order.
2. Push back on anything wrong — it's cheap to change here, expensive to
   change in code.
3. When you say "go", the rewrite starts on Phase 1 of
   [`18-rewrite-plan.md`](./18-rewrite-plan.md).
