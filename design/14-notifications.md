# Notifications (roadmap — not implemented in this rewrite)

## Current state
- `/notifications` route renders a stub empty card.
- Settings has `vibrateOnReminder`, `soundOnReminder`, lead time — none
  wired to anything.
- No FCM / Web Push / local Notification API usage anywhere.

## Rewrite scope
**Scaffold only.** Concretely:
1. `domain/notifications.ts` — `buildNotification({ kind, event, actor })` →
   `NotificationEntry` (we already have the interface). No side effects.
2. `data/notificationsRepo.ts` — create/listen, group-scoped (new
   sub-collection `groups/{gid}/notifications`). Thin layer; no trigger yet.
3. `state/useNotifications.ts` — listen + expose unread count.
4. `NotificationsScreen` renders the list, grouped by day, with
   dismiss-all. Still no push delivery.
5. Event-side: when ride claimed / released / confirmed / completed,
   screens call `notificationsRepo.add(...)`. Everyone in the group sees it.

## Explicitly out of scope
- Web Push / FCM registration.
- Cloud Functions to fan out push.
- Local `Notification` API requests.
- Quiet-hours / sound / vibrate settings effects.

## Why scaffold now
The data layout affects the rewrite: if we skip it, refactoring later means
re-touching every mutation site. Thin scaffold keeps write sites consistent
with future push delivery.

## Spec stub for later

```
Notification
  notificationId, groupId, eventId?, assignmentId?,
  triggeredByParentId, message, category, createdAt
  readBy: { [parentId]: timestamp }
```

`category` reuses existing `NotificationCategory` enum.
