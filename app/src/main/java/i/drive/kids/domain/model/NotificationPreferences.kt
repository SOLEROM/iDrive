package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class NotificationPreferences(
    val enableLocalNotifications: Boolean = true,
    val enableInAppNotifications: Boolean = true,
    val notifyOnRideClaimed: Boolean = true,
    val notifyOnRideCompleted: Boolean = true,
    val notifyOnRideConflict: Boolean = true,
    val notifyOnEventChanged: Boolean = true,
    val reminderLeadTimes: List<Int> = listOf(60, 1440), // minutes
    val completionNotificationsEnabled: Boolean = true,
    val quietHoursStart: Int? = null,   // hour 0-23
    val quietHoursEnd: Int? = null,
    val suppressDuplicateNotificationsWithinMinutes: Int = 30
)
