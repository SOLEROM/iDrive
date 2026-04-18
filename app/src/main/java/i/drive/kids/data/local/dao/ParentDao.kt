package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.ParentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ParentDao {

    @Query("SELECT * FROM parents WHERE parentId = :id")
    fun getParent(id: String): Flow<ParentEntity?>

    @Query("SELECT * FROM parents")
    fun getAllParents(): Flow<List<ParentEntity>>

    @Query("SELECT * FROM parents WHERE parentId = :id")
    suspend fun getParentOnce(id: String): ParentEntity?

    @Upsert
    suspend fun upsert(entity: ParentEntity)

    @Upsert
    suspend fun upsertAll(entities: List<ParentEntity>)

    @Delete
    suspend fun delete(entity: ParentEntity)

    @Query("DELETE FROM parents WHERE parentId = :parentId")
    suspend fun deleteById(parentId: String)
}
