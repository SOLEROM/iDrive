package i.drive.kids.config

import i.drive.kids.domain.model.ChildColor
import i.drive.kids.domain.model.MapApp
import i.drive.kids.domain.model.RideDirection
import i.drive.kids.domain.model.VisibilityScope
import kotlinx.serialization.Serializable
import java.time.DayOfWeek

@Serializable
data class ParentPrivateConfig(
    val parentDisplayName: String = "",
    val phoneNumber: String? = null,
    val defaultReminderLeadTimeMinutes: Int = 60,
    val notifyOnRideClaimed: Boolean = true,
    val notifyOnRideCompleted: Boolean = true,
    val notifyOnRideConflict: Boolean = true,
    val notifyOnEventChanged: Boolean = true,
    val shareMyPhoneWithGroup: Boolean = false,
    val shareMyEmailWithGroup: Boolean = true,
    val preferredColorPalette: String = "default",
    val defaultChildColor: ChildColor = ChildColor.BLUE,
    val defaultEventDurationMinutes: Int = 60,
    val defaultEventShareMode: VisibilityScope = VisibilityScope.GROUP,
    val defaultRideDirection: RideDirection = RideDirection.BOTH,
    val showPrivateEventsOnDashboard: Boolean = true,
    val autoArchivePastEventsAfterDays: Int = 30,
    val timezone: String = "system",
    @Serializable(with = i.drive.kids.domain.model.DayOfWeekSerializer::class)
    val weekStartDay: DayOfWeek = DayOfWeek.SUNDAY,
    val preferredMapApp: MapApp = MapApp.GOOGLE_MAPS,
    val notes: String = ""
)
