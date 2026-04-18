package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.ChildEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ChildDao {

    @Query("SELECT * FROM children WHERE parentOwnerId = :parentId AND isArchived = 0")
    fun getChildrenForParent(parentId: String): Flow<List<ChildEntity>>

    @Query("SELECT * FROM children WHERE childId = :childId")
    suspend fun getChild(childId: String): ChildEntity?

    @Query("SELECT * FROM children")
    fun getAllChildren(): Flow<List<ChildEntity>>

    @Upsert
    suspend fun upsert(entity: ChildEntity)

    @Upsert
    suspend fun upsertAll(entities: List<ChildEntity>)

    @Delete
    suspend fun delete(entity: ChildEntity)

    @Query("DELETE FROM children WHERE childId = :childId")
    suspend fun deleteById(childId: String)

    @Query("UPDATE children SET isArchived = 1 WHERE childId = :childId")
    suspend fun archiveChild(childId: String)
}
