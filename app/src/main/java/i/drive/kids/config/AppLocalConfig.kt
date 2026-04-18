package i.drive.kids.config

import i.drive.kids.domain.model.AppLanguage
import i.drive.kids.domain.model.LandingScreen
import i.drive.kids.domain.model.ThemeMode
import kotlinx.serialization.Serializable

@Serializable
data class AppLocalConfig(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val language: AppLanguage = AppLanguage.SYSTEM,
    val defaultLandingScreen: LandingScreen = LandingScreen.DASHBOARD,
    val syncOnAppOpen: Boolean = true,
    val backgroundSyncEnabled: Boolean = true,
    val backgroundSyncIntervalMinutes: Long = 30,
    val showCompletedRidesByDefault: Boolean = false,
    val compactCardMode: Boolean = false,
    val vibrateOnReminder: Boolean = true,
    val soundOnReminder: Boolean = true,
    val notificationLeadTimeMinutesDefault: Int = 60,
    val allowMobileDataSync: Boolean = true,
    val debugLoggingEnabled: Boolean = false,
    val lastSelectedGroupId: String? = null
)
