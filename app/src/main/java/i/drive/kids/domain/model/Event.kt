package i.drive.kids.domain.model

import kotlinx.serialization.Serializable
import java.time.DayOfWeek

@Serializable
data class Event(
    val eventId: String,
    val groupId: String? = null,
    val childId: String,
    val title: String,
    val eventType: EventType = EventType.CLASS,
    val description: String = "",
    val locationName: String = "",
    val locationAddress: String = "",
    val startDateTime: Long = 0L,
    val endDateTime: Long = 0L,
    val isRecurring: Boolean = false,
    val recurrenceRule: RecurrenceRule? = null,
    val needsRide: Boolean = false,
    val rideDirection: RideDirection = RideDirection.BOTH,
    val createdByParentId: String,
    val visibilityScope: VisibilityScope = VisibilityScope.GROUP,
    val status: EventStatus = EventStatus.ACTIVE,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)

@Serializable
data class RecurrenceRule(
    val frequency: RecurrenceFrequency = RecurrenceFrequency.WEEKLY,
    val daysOfWeek: List<@Serializable(with = DayOfWeekSerializer::class) DayOfWeek>? = null,
    val intervalWeeks: Int = 1,
    val endDate: Long? = null // epoch ms, null = no end
)

/** Serializer to store DayOfWeek as its name string. */
object DayOfWeekSerializer : kotlinx.serialization.KSerializer<DayOfWeek> {
    override val descriptor = kotlinx.serialization.descriptors.PrimitiveSerialDescriptor(
        "DayOfWeek", kotlinx.serialization.descriptors.PrimitiveKind.STRING
    )
    override fun serialize(encoder: kotlinx.serialization.encoding.Encoder, value: DayOfWeek) =
        encoder.encodeString(value.name)
    override fun deserialize(decoder: kotlinx.serialization.encoding.Decoder): DayOfWeek =
        DayOfWeek.valueOf(decoder.decodeString())
}
