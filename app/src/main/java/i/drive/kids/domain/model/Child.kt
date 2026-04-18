package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Child(
    val childId: String,
    val parentOwnerId: String,
    val name: String,
    val colorTag: ChildColor = ChildColor.BLUE,
    val notes: String = "",
    val isArchived: Boolean = false,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
