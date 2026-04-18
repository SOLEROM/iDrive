package i.drive.kids.domain.repository

import i.drive.kids.domain.model.Child
import kotlinx.coroutines.flow.Flow

interface ChildRepository {
    fun getChildrenForParent(parentId: String): Flow<List<Child>>

    fun observeAllChildren(): Flow<List<Child>>

    suspend fun getChild(childId: String): Child?

    suspend fun upsertChild(child: Child)

    suspend fun archiveChild(childId: String)

    suspend fun deleteChild(childId: String)
}
