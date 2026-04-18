package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Parent(
    val parentId: String,
    val displayName: String,
    val email: String,
    val phone: String? = null,
    val groupIds: List<String> = emptyList(),
    val notificationPreferences: NotificationPreferences = NotificationPreferences(),
    val isAdminByGroup: Map<String, Boolean> = emptyMap(),
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
