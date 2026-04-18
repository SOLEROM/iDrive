package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class NotificationEntry(
    val notificationId: String,
    val groupId: String,
    val eventId: String? = null,
    val assignmentId: String? = null,
    val triggeredByParentId: String,
    val message: String,
    val category: NotificationCategory,
    val createdAt: Long = 0L,
    val readByParentIds: List<String> = emptyList()
)
