package i.drive.kids.data.local.entity

import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.ChildColor
import i.drive.kids.domain.model.DeliveryChannel
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.EventStatus
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.Group
import i.drive.kids.domain.model.GroupMember
import i.drive.kids.domain.model.NotificationCategory
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.model.NotificationPreferences
import i.drive.kids.domain.model.Parent
import i.drive.kids.domain.model.RecurrenceRule
import i.drive.kids.domain.model.Reminder
import i.drive.kids.domain.model.ReminderType
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.model.RideDirection
import i.drive.kids.domain.model.RideLeg
import i.drive.kids.domain.model.VisibilityScope
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private val mappersJson = Json { ignoreUnknownKeys = true; isLenient = true }

// ── Parent ────────────────────────────────────────────────────────────────────

fun ParentEntity.toDomain(): Parent = Parent(
    parentId = parentId,
    displayName = displayName,
    email = email,
    phone = phone,
    groupIds = groupIds,
    notificationPreferences = if (notificationPreferencesJson.isBlank() || notificationPreferencesJson == "{}")
        NotificationPreferences()
    else
        mappersJson.decodeFromString(NotificationPreferences.serializer(), notificationPreferencesJson),
    isAdminByGroup = isAdminByGroup,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Parent.toEntity(): ParentEntity = ParentEntity(
    parentId = parentId,
    displayName = displayName,
    email = email,
    phone = phone,
    groupIds = groupIds,
    notificationPreferencesJson = mappersJson.encodeToString(
        NotificationPreferences.serializer(), notificationPreferences
    ),
    isAdminByGroup = isAdminByGroup,
    createdAt = createdAt,
    updatedAt = updatedAt
)

// ── Child ─────────────────────────────────────────────────────────────────────

fun ChildEntity.toDomain(): Child = Child(
    childId = childId,
    parentOwnerId = parentOwnerId,
    name = name,
    colorTag = ChildColor.valueOf(colorTag),
    notes = notes,
    isArchived = isArchived,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Child.toEntity(): ChildEntity = ChildEntity(
    childId = childId,
    parentOwnerId = parentOwnerId,
    name = name,
    colorTag = colorTag.name,
    notes = notes,
    isArchived = isArchived,
    createdAt = createdAt,
    updatedAt = updatedAt
)

// ── Group ─────────────────────────────────────────────────────────────────────

fun GroupEntity.toDomain(): Group = Group(
    groupId = groupId,
    groupName = groupName,
    sharedSheetId = sharedSheetId,
    members = if (membersJson.isBlank() || membersJson == "[]") emptyList()
    else mappersJson.decodeFromString(ListSerializer(GroupMember.serializer()), membersJson),
    createdByParentId = createdByParentId,
    defaultConfigVersion = defaultConfigVersion,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Group.toEntity(): GroupEntity = GroupEntity(
    groupId = groupId,
    groupName = groupName,
    sharedSheetId = sharedSheetId,
    membersJson = mappersJson.encodeToString(ListSerializer(GroupMember.serializer()), members),
    createdByParentId = createdByParentId,
    defaultConfigVersion = defaultConfigVersion,
    createdAt = createdAt,
    updatedAt = updatedAt
)

// ── Event ─────────────────────────────────────────────────────────────────────

fun EventEntity.toDomain(): Event = Event(
    eventId = eventId,
    groupId = groupId,
    childId = childId,
    title = title,
    eventType = EventType.valueOf(eventType),
    description = description,
    locationName = locationName,
    locationAddress = locationAddress,
    startDateTime = startDateTime,
    endDateTime = endDateTime,
    isRecurring = isRecurring,
    recurrenceRule = if (recurrenceRuleJson.isNullOrBlank()) null
    else mappersJson.decodeFromString(RecurrenceRule.serializer(), recurrenceRuleJson),
    needsRide = needsRide,
    rideDirection = RideDirection.valueOf(rideDirection),
    createdByParentId = createdByParentId,
    visibilityScope = VisibilityScope.valueOf(visibilityScope),
    status = EventStatus.valueOf(status),
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Event.toEntity(): EventEntity = EventEntity(
    eventId = eventId,
    groupId = groupId,
    childId = childId,
    title = title,
    eventType = eventType.name,
    description = description,
    locationName = locationName,
    locationAddress = locationAddress,
    startDateTime = startDateTime,
    endDateTime = endDateTime,
    isRecurring = isRecurring,
    recurrenceRuleJson = if (recurrenceRule == null) null
    else mappersJson.encodeToString(RecurrenceRule.serializer(), recurrenceRule),
    needsRide = needsRide,
    rideDirection = rideDirection.name,
    createdByParentId = createdByParentId,
    visibilityScope = visibilityScope.name,
    status = status.name,
    createdAt = createdAt,
    updatedAt = updatedAt
)

// ── RideAssignment ────────────────────────────────────────────────────────────

fun RideAssignmentEntity.toDomain(): RideAssignment = RideAssignment(
    assignmentId = assignmentId,
    eventId = eventId,
    driverParentId = driverParentId,
    rideLeg = RideLeg.valueOf(rideLeg),
    assignmentStatus = AssignmentStatus.valueOf(assignmentStatus),
    notes = notes,
    claimedAt = claimedAt,
    completedAt = completedAt,
    updatedAt = updatedAt
)

fun RideAssignment.toEntity(isConflict: Boolean = false): RideAssignmentEntity = RideAssignmentEntity(
    assignmentId = assignmentId,
    eventId = eventId,
    driverParentId = driverParentId,
    rideLeg = rideLeg.name,
    assignmentStatus = assignmentStatus.name,
    notes = notes,
    claimedAt = claimedAt,
    completedAt = completedAt,
    updatedAt = updatedAt,
    isConflict = isConflict
)

// ── Reminder ──────────────────────────────────────────────────────────────────

fun ReminderEntity.toDomain(): Reminder = Reminder(
    reminderId = reminderId,
    parentId = parentId,
    eventId = eventId,
    type = ReminderType.valueOf(type),
    scheduledAt = scheduledAt,
    isDelivered = isDelivered,
    deliveryChannel = DeliveryChannel.valueOf(deliveryChannel),
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Reminder.toEntity(): ReminderEntity = ReminderEntity(
    reminderId = reminderId,
    parentId = parentId,
    eventId = eventId,
    type = type.name,
    scheduledAt = scheduledAt,
    isDelivered = isDelivered,
    deliveryChannel = deliveryChannel.name,
    createdAt = createdAt,
    updatedAt = updatedAt
)

// ── NotificationEntry ─────────────────────────────────────────────────────────

fun NotificationEntryEntity.toDomain(): NotificationEntry = NotificationEntry(
    notificationId = notificationId,
    groupId = groupId,
    eventId = eventId,
    assignmentId = assignmentId,
    triggeredByParentId = triggeredByParentId,
    message = message,
    category = NotificationCategory.valueOf(category),
    createdAt = createdAt,
    readByParentIds = readByParentIds
)

fun NotificationEntry.toEntity(): NotificationEntryEntity = NotificationEntryEntity(
    notificationId = notificationId,
    groupId = groupId,
    eventId = eventId,
    assignmentId = assignmentId,
    triggeredByParentId = triggeredByParentId,
    message = message,
    category = category.name,
    createdAt = createdAt,
    readByParentIds = readByParentIds
)
