package i.drive.kids.config

import i.drive.kids.domain.model.AppLanguage
import i.drive.kids.domain.model.ConflictPolicy
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.InviteMode
import i.drive.kids.domain.model.RideDirection
import i.drive.kids.domain.model.VisibilityScope
import kotlinx.serialization.Serializable
import java.time.DayOfWeek

@Serializable
data class GroupSharedConfig(
    val groupName: String = "",
    val groupDescription: String = "",
    val timezone: String = "UTC",
    val defaultLanguage: AppLanguage = AppLanguage.ENGLISH,
    @Serializable(with = i.drive.kids.domain.model.DayOfWeekSerializer::class)
    val weekStartDay: DayOfWeek = DayOfWeek.SUNDAY,
    val enableRideSharing: Boolean = true,
    val allowParentsToClaimOtherChildrenRides: Boolean = true,
    val allowMultipleVolunteersPerRideLeg: Boolean = false,
    val requireAdminApprovalForAssignments: Boolean = false,
    val defaultReminderLeadTimeMinutes: Int = 60,
    val urgentRideWindowHours: Int = 24,
    val showCompletedAssignmentsToAll: Boolean = true,
    val allowPrivateEventsInSharedTimeline: Boolean = false,
    val defaultEventVisibility: VisibilityScope = VisibilityScope.GROUP,
    val supportedEventTypes: List<EventType> = EventType.values().toList(),
    val supportedRideDirections: List<RideDirection> = RideDirection.values().toList(),
    val maxFutureEventMonths: Int = 12,
    val enableAuditLog: Boolean = true,
    val enableNotificationsFeed: Boolean = true,
    val enableConflictFlagging: Boolean = true,
    val conflictResolutionPolicy: ConflictPolicy = ConflictPolicy.MANUAL,
    val groupColorTheme: String = "default",
    val groupInviteMode: InviteMode = InviteMode.OPEN,
    val groupJoinCode: String? = null,
    val sharedSheetVersion: Int = 1,
    val dataSchemaVersion: Int = 1
)
