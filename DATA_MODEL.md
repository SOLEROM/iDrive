# Data Model — Kids Rides & Classes Manager

> Domain classes live in `app/src/main/java/i/drive/kids/domain/model/`. Room entities in `data/local/entity/` with `EntityMappers.kt` bridging to domain. The Drive JSON root type is `data/remote/PrivateDriveData.kt` (see `PrivateDriveDataJsonTest` for the canonical shape).

---

## 1. Domain Entities

### 1.1 Parent
```
parentId: String (UUID)
displayName: String
email: String
phone: String?
groupIds: List<String>
notificationPreferences: NotificationPreferences
isAdminByGroup: Map<String, Boolean>
createdAt: Long (epoch ms)
updatedAt: Long (epoch ms)
```

### 1.2 Child
```
childId: String (UUID)
parentOwnerId: String
name: String
colorTag: ChildColor (enum: RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, PINK, TEAL)
notes: String
isArchived: Boolean
createdAt: Long
updatedAt: Long
```

### 1.3 Group
```
groupId: String (UUID)
groupName: String
sharedSheetId: String
members: List<GroupMember>
createdByParentId: String
defaultConfigVersion: Int
createdAt: Long
updatedAt: Long
```

GroupMember:
```
parentId: String
displayName: String
email: String
role: GroupRole (ADMIN | MEMBER)
isActive: Boolean
```

### 1.4 Event
```
eventId: String (UUID)
groupId: String?
childId: String
title: String
eventType: EventType (CLASS | SCHOOL | SPORTS | MUSIC | THERAPY | MEETING | CUSTOM)
description: String
locationName: String
locationAddress: String
startDateTime: Long (epoch ms)
endDateTime: Long (epoch ms)
isRecurring: Boolean
recurrenceRule: RecurrenceRule?
needsRide: Boolean
rideDirection: RideDirection (TO | FROM | BOTH)
createdByParentId: String
visibilityScope: VisibilityScope (PRIVATE | GROUP)
status: EventStatus (ACTIVE | CANCELLED | ARCHIVED)
createdAt: Long
updatedAt: Long
```

RecurrenceRule:
```
frequency: RecurrenceFrequency (WEEKLY)
daysOfWeek: List<DayOfWeek>?
intervalWeeks: Int (default 1)
endDate: Long? (epoch ms, null = no end)
```

### 1.5 RideAssignment
```
assignmentId: String (UUID)
eventId: String
driverParentId: String
rideLeg: RideLeg (TO | FROM)
assignmentStatus: AssignmentStatus (UNASSIGNED | VOLUNTEERED | CONFIRMED | COMPLETED | CONFLICT | CANCELLED)
notes: String
claimedAt: Long?
completedAt: Long?
updatedAt: Long
```

### 1.6 Reminder
```
reminderId: String (UUID)
parentId: String
eventId: String
type: ReminderType (UPCOMING_EVENT | RIDE_UNASSIGNED | VOLUNTEERED_RIDE | COMPLETION_UPDATE | ASSIGNMENT_CHANGED | SYNC_ERROR)
scheduledAt: Long (epoch ms)
isDelivered: Boolean
deliveryChannel: DeliveryChannel (LOCAL_NOTIFICATION | IN_APP)
createdAt: Long
updatedAt: Long
```

### 1.7 NotificationEntry
```
notificationId: String (UUID)
groupId: String
eventId: String?
assignmentId: String?
triggeredByParentId: String
message: String
category: NotificationCategory (RIDE_CLAIMED | RIDE_COMPLETED | RIDE_CONFLICT | EVENT_CHANGED | SYNC_ERROR)
createdAt: Long
readByParentIds: List<String>
```

---

## 2. Private Drive JSON Schema

Filename: `kids_rides_private_data.json`

```json
{
  "schemaVersion": 1,
  "parent": { ... Parent fields ... },
  "children": [ ... Child[] ... ],
  "privateEvents": [ ... Event[] where visibilityScope=PRIVATE ... ],
  "preferences": { ... ParentPrivateConfig ... },
  "knownGroups": [
    {
      "groupId": "...",
      "groupName": "...",
      "sharedSheetId": "...",
      "role": "MEMBER"
    }
  ],
  "cachedRemoteIds": {
    "driveFileId": "...",
    "sheetIds": { "groupId": "sheetId", ... }
  },
  "updatedAt": 1700000000000
}
```

---

## 3. Shared Google Sheet Schema

One sheet per group. Six tabs:

### Tab: Events
| Column | Type |
|---|---|
| eventId | String |
| groupId | String |
| childId | String |
| childName | String |
| title | String |
| type | String (EventType) |
| description | String |
| locationName | String |
| locationAddress | String |
| startDateTime | ISO-8601 |
| endDateTime | ISO-8601 |
| isRecurring | Boolean |
| recurrenceRule | JSON string |
| needsRide | Boolean |
| rideDirection | String |
| createdByParentId | String |
| visibilityScope | String |
| status | String |
| updatedAt | ISO-8601 |

### Tab: Assignments
| Column | Type |
|---|---|
| assignmentId | String |
| eventId | String |
| rideLeg | String |
| driverParentId | String |
| driverName | String |
| status | String (AssignmentStatus) |
| notes | String |
| claimedAt | ISO-8601 |
| completedAt | ISO-8601 |
| updatedAt | ISO-8601 |

### Tab: Parents
| Column | Type |
|---|---|
| parentId | String |
| displayName | String |
| email | String |
| role | String (GroupRole) |
| isActive | Boolean |
| updatedAt | ISO-8601 |

### Tab: GroupConfig
| Column | Type |
|---|---|
| key | String |
| value | String |
| scope | String |
| updatedAt | ISO-8601 |
| updatedByParentId | String |

### Tab: Notifications
| Column | Type |
|---|---|
| notificationId | String |
| category | String |
| message | String |
| groupId | String |
| eventId | String |
| assignmentId | String |
| createdAt | ISO-8601 |
| createdByParentId | String |

### Tab: AuditLog
| Column | Type |
|---|---|
| logId | String |
| timestamp | ISO-8601 |
| actorParentId | String |
| actionType | String |
| entityType | String |
| entityId | String |
| summary | String |

---

## 4. Room Entity Mapping

Each domain model has a corresponding Room entity (`*Entity`) in `data/local/entity/`. Converters handle:
- `List<String>` ↔ JSON string
- `Long` timestamps (stored as ms)
- Enums ↔ String

---

## 5. Enums Summary

| Enum | Values |
|---|---|
| ChildColor | RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, PINK, TEAL |
| EventType | CLASS, SCHOOL, SPORTS, MUSIC, THERAPY, MEETING, CUSTOM |
| RideDirection | TO, FROM, BOTH |
| RideLeg | TO, FROM |
| AssignmentStatus | UNASSIGNED, VOLUNTEERED, CONFIRMED, COMPLETED, CONFLICT, CANCELLED |
| VisibilityScope | PRIVATE, GROUP |
| EventStatus | ACTIVE, CANCELLED, ARCHIVED |
| GroupRole | ADMIN, MEMBER |
| ReminderType | UPCOMING_EVENT, RIDE_UNASSIGNED, VOLUNTEERED_RIDE, COMPLETION_UPDATE, ASSIGNMENT_CHANGED, SYNC_ERROR |
| DeliveryChannel | LOCAL_NOTIFICATION, IN_APP |
| NotificationCategory | RIDE_CLAIMED, RIDE_COMPLETED, RIDE_CONFLICT, EVENT_CHANGED, SYNC_ERROR |
| RecurrenceFrequency | WEEKLY |
