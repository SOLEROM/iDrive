package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class ChildColor {
    RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, PINK, TEAL
}

@Serializable
enum class EventType {
    CLASS, SCHOOL, SPORTS, MUSIC, THERAPY, MEETING, CUSTOM
}

@Serializable
enum class RideDirection {
    TO, FROM, BOTH
}

@Serializable
enum class RideLeg {
    TO, FROM
}

@Serializable
enum class AssignmentStatus {
    UNASSIGNED, VOLUNTEERED, CONFIRMED, COMPLETED, CONFLICT, CANCELLED
}

@Serializable
enum class VisibilityScope {
    PRIVATE, GROUP
}

@Serializable
enum class EventStatus {
    ACTIVE, CANCELLED, ARCHIVED
}

@Serializable
enum class GroupRole {
    ADMIN, MEMBER
}

@Serializable
enum class ReminderType {
    UPCOMING_EVENT, RIDE_UNASSIGNED, VOLUNTEERED_RIDE, COMPLETION_UPDATE,
    ASSIGNMENT_CHANGED, SYNC_ERROR
}

@Serializable
enum class DeliveryChannel {
    LOCAL_NOTIFICATION, IN_APP
}

@Serializable
enum class NotificationCategory {
    RIDE_CLAIMED, RIDE_COMPLETED, RIDE_CONFLICT, EVENT_CHANGED, SYNC_ERROR
}

@Serializable
enum class RecurrenceFrequency {
    WEEKLY
}

@Serializable
enum class ThemeMode {
    SYSTEM, LIGHT, DARK
}

@Serializable
enum class AppLanguage {
    SYSTEM, ENGLISH, HEBREW
}

@Serializable
enum class LandingScreen {
    DASHBOARD, CALENDAR, EVENTS, RIDES, CHILDREN
}

@Serializable
enum class MapApp {
    GOOGLE_MAPS, WAZE, APPLE_MAPS, DEFAULT
}

@Serializable
enum class DashboardDensity {
    COMPACT, COMFORTABLE, SPACIOUS
}

@Serializable
enum class HomeCard {
    UPCOMING_EVENTS,
    RIDE_REQUESTS,
    MY_CHILDREN,
    GROUP_ACTIVITY,
    RECENT_NOTIFICATIONS,
    QUICK_ADD;

    companion object {
        fun defaultOrder(): List<HomeCard> = listOf(
            UPCOMING_EVENTS,
            RIDE_REQUESTS,
            MY_CHILDREN,
            GROUP_ACTIVITY,
            RECENT_NOTIFICATIONS,
            QUICK_ADD
        )
    }
}

@Serializable
enum class ConflictPolicy {
    MANUAL, FIRST_COME_FIRST_SERVED, ADMIN_DECIDES
}

@Serializable
enum class InviteMode {
    OPEN, CODE_REQUIRED, ADMIN_APPROVAL
}
