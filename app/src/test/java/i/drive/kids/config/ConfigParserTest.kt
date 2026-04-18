package i.drive.kids.config

import i.drive.kids.domain.model.AppLanguage
import i.drive.kids.domain.model.LandingScreen
import i.drive.kids.domain.model.ThemeMode
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Round-trip serialization tests for all four config scopes.
 * Ensures no field is lost when a config survives write→read cycle (which is how
 * it's persisted to Drive JSON / Sheet / DataStore).
 */
class ConfigParserTest {

    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = false
        encodeDefaults = true
    }

    @Test
    fun `AppLocalConfig round-trips`() {
        val original = AppLocalConfig(
            themeMode = ThemeMode.DARK,
            language = AppLanguage.HEBREW,
            defaultLandingScreen = LandingScreen.RIDES,
            syncOnAppOpen = false,
            backgroundSyncEnabled = false,
            backgroundSyncIntervalMinutes = 60,
            showCompletedRidesByDefault = true,
            compactCardMode = true,
            vibrateOnReminder = false,
            soundOnReminder = false,
            notificationLeadTimeMinutesDefault = 30,
            allowMobileDataSync = false,
            debugLoggingEnabled = true,
            lastSelectedGroupId = "group-123"
        )
        val text = json.encodeToString(original)
        val restored = json.decodeFromString<AppLocalConfig>(text)
        assertEquals(original, restored)
    }

    @Test
    fun `ParentPrivateConfig round-trips with defaults`() {
        val original = ParentPrivateConfig()
        val text = json.encodeToString(original)
        val restored = json.decodeFromString<ParentPrivateConfig>(text)
        assertEquals(original, restored)
    }

    @Test
    fun `GroupSharedConfig round-trips with custom values`() {
        val original = GroupSharedConfig(
            groupName = "Soccer Parents",
            groupDescription = "Test group",
            timezone = "America/New_York",
            enableRideSharing = true,
            allowMultipleVolunteersPerRideLeg = false,
            maxFutureEventMonths = 6
        )
        val text = json.encodeToString(original)
        val restored = json.decodeFromString<GroupSharedConfig>(text)
        assertEquals(original, restored)
    }

    @Test
    fun `SyncConfig round-trips`() {
        val original = SyncConfig()
        val text = json.encodeToString(original)
        val restored = json.decodeFromString<SyncConfig>(text)
        assertEquals(original, restored)
    }

    @Test
    fun `UiPreferenceConfig round-trips`() {
        val original = UiPreferenceConfig()
        val text = json.encodeToString(original)
        val restored = json.decodeFromString<UiPreferenceConfig>(text)
        assertEquals(original, restored)
    }

    @Test
    fun `AppLocalConfig ignores unknown keys for forward-compat`() {
        val payload = """{"themeMode":"DARK","futureField":"ignored"}"""
        val restored = json.decodeFromString<AppLocalConfig>(payload)
        assertEquals(ThemeMode.DARK, restored.themeMode)
    }
}
