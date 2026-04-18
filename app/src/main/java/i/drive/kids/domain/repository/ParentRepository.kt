package i.drive.kids.domain.repository

import i.drive.kids.domain.model.Parent
import kotlinx.coroutines.flow.Flow

interface ParentRepository {
    /** Observe the local parent record for the currently signed-in user. */
    fun observeCurrentParent(): Flow<Parent?>

    /** Observe all parents that share at least one group with the current user. */
    fun observeAllParents(): Flow<List<Parent>>

    suspend fun getParent(parentId: String): Parent?

    suspend fun upsertParent(parent: Parent)

    suspend fun deleteParent(parentId: String)
}
