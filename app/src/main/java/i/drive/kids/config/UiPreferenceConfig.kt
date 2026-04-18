package i.drive.kids.config

import i.drive.kids.domain.model.DashboardDensity
import i.drive.kids.domain.model.HomeCard
import kotlinx.serialization.Serializable

@Serializable
data class UiPreferenceConfig(
    val showChildColorBadges: Boolean = true,
    val showLargeDateHeaders: Boolean = true,
    val dashboardDensity: DashboardDensity = DashboardDensity.COMFORTABLE,
    val homeCardOrder: List<HomeCard> = HomeCard.defaultOrder(),
    val hideEmptySections: Boolean = true,
    val showRecentActivityFeed: Boolean = true,
    val showConflictBanner: Boolean = true,
    val showSyncBanner: Boolean = true,
    val use24HourClock: Boolean = false
)
