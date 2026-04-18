package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Reminder(
    val reminderId: String,
    val parentId: String,
    val eventId: String,
    val type: ReminderType,
    val scheduledAt: Long,        // epoch ms
    val isDelivered: Boolean = false,
    val deliveryChannel: DeliveryChannel = DeliveryChannel.LOCAL_NOTIFICATION,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
