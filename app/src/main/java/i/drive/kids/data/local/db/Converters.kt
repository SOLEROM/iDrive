package i.drive.kids.data.local.db

import androidx.room.TypeConverter
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.ChildColor
import i.drive.kids.domain.model.DeliveryChannel
import i.drive.kids.domain.model.EventStatus
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.NotificationCategory
import i.drive.kids.domain.model.RecurrenceRule
import i.drive.kids.domain.model.RideDirection
import i.drive.kids.domain.model.RideLeg
import i.drive.kids.domain.model.ReminderType
import i.drive.kids.domain.model.VisibilityScope
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

private val converterJson = Json { ignoreUnknownKeys = true; isLenient = true }

class Converters {

    // ── List<String> ↔ JSON ───────────────────────────────────────────────────

    @TypeConverter
    fun fromStringList(value: List<String>?): String =
        if (value == null) "[]"
        else converterJson.encodeToString(ListSerializer(String.serializer()), value)

    @TypeConverter
    fun toStringList(value: String?): List<String> =
        if (value.isNullOrBlank()) emptyList()
        else converterJson.decodeFromString(ListSerializer(String.serializer()), value)

    // ── Map<String, Boolean> ↔ JSON ───────────────────────────────────────────

    @TypeConverter
    fun fromStringBooleanMap(value: Map<String, Boolean>?): String =
        if (value == null) "{}"
        else converterJson.encodeToString(
            MapSerializer(String.serializer(), Boolean.serializer()), value
        )

    @TypeConverter
    fun toStringBooleanMap(value: String?): Map<String, Boolean> =
        if (value.isNullOrBlank()) emptyMap()
        else converterJson.decodeFromString(
            MapSerializer(String.serializer(), Boolean.serializer()), value
        )

    // ── RecurrenceRule? ↔ JSON ────────────────────────────────────────────────

    @TypeConverter
    fun fromRecurrenceRule(value: RecurrenceRule?): String? =
        if (value == null) null
        else converterJson.encodeToString(RecurrenceRule.serializer(), value)

    @TypeConverter
    fun toRecurrenceRule(value: String?): RecurrenceRule? =
        if (value.isNullOrBlank()) null
        else converterJson.decodeFromString(RecurrenceRule.serializer(), value)

    // ── ChildColor ↔ String ───────────────────────────────────────────────────

    @TypeConverter
    fun fromChildColor(value: ChildColor?): String? = value?.name

    @TypeConverter
    fun toChildColor(value: String?): ChildColor? =
        if (value.isNullOrBlank()) null else ChildColor.valueOf(value)

    // ── EventType ↔ String ────────────────────────────────────────────────────

    @TypeConverter
    fun fromEventType(value: EventType?): String? = value?.name

    @TypeConverter
    fun toEventType(value: String?): EventType? =
        if (value.isNullOrBlank()) null else EventType.valueOf(value)

    // ── RideDirection ↔ String ────────────────────────────────────────────────

    @TypeConverter
    fun fromRideDirection(value: RideDirection?): String? = value?.name

    @TypeConverter
    fun toRideDirection(value: String?): RideDirection? =
        if (value.isNullOrBlank()) null else RideDirection.valueOf(value)

    // ── RideLeg ↔ String ──────────────────────────────────────────────────────

    @TypeConverter
    fun fromRideLeg(value: RideLeg?): String? = value?.name

    @TypeConverter
    fun toRideLeg(value: String?): RideLeg? =
        if (value.isNullOrBlank()) null else RideLeg.valueOf(value)

    // ── AssignmentStatus ↔ String ─────────────────────────────────────────────

    @TypeConverter
    fun fromAssignmentStatus(value: AssignmentStatus?): String? = value?.name

    @TypeConverter
    fun toAssignmentStatus(value: String?): AssignmentStatus? =
        if (value.isNullOrBlank()) null else AssignmentStatus.valueOf(value)

    // ── VisibilityScope ↔ String ──────────────────────────────────────────────

    @TypeConverter
    fun fromVisibilityScope(value: VisibilityScope?): String? = value?.name

    @TypeConverter
    fun toVisibilityScope(value: String?): VisibilityScope? =
        if (value.isNullOrBlank()) null else VisibilityScope.valueOf(value)

    // ── EventStatus ↔ String ──────────────────────────────────────────────────

    @TypeConverter
    fun fromEventStatus(value: EventStatus?): String? = value?.name

    @TypeConverter
    fun toEventStatus(value: String?): EventStatus? =
        if (value.isNullOrBlank()) null else EventStatus.valueOf(value)

    // ── ReminderType ↔ String ─────────────────────────────────────────────────

    @TypeConverter
    fun fromReminderType(value: ReminderType?): String? = value?.name

    @TypeConverter
    fun toReminderType(value: String?): ReminderType? =
        if (value.isNullOrBlank()) null else ReminderType.valueOf(value)

    // ── DeliveryChannel ↔ String ──────────────────────────────────────────────

    @TypeConverter
    fun fromDeliveryChannel(value: DeliveryChannel?): String? = value?.name

    @TypeConverter
    fun toDeliveryChannel(value: String?): DeliveryChannel? =
        if (value.isNullOrBlank()) null else DeliveryChannel.valueOf(value)

    // ── NotificationCategory ↔ String ────────────────────────────────────────

    @TypeConverter
    fun fromNotificationCategory(value: NotificationCategory?): String? = value?.name

    @TypeConverter
    fun toNotificationCategory(value: String?): NotificationCategory? =
        if (value.isNullOrBlank()) null else NotificationCategory.valueOf(value)
}
