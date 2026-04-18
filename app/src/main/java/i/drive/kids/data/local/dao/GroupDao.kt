package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.GroupEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GroupDao {

    @Query("SELECT * FROM groups")
    fun getAllGroups(): Flow<List<GroupEntity>>

    @Query("SELECT * FROM groups WHERE groupId = :groupId")
    fun getGroupFlow(groupId: String): Flow<GroupEntity?>

    @Query("SELECT * FROM groups WHERE groupId = :groupId")
    suspend fun getGroup(groupId: String): GroupEntity?

    @Upsert
    suspend fun upsert(entity: GroupEntity)

    @Upsert
    suspend fun upsertAll(entities: List<GroupEntity>)

    @Delete
    suspend fun delete(entity: GroupEntity)

    @Query("DELETE FROM groups WHERE groupId = :groupId")
    suspend fun deleteById(groupId: String)

    @Query("UPDATE groups SET sharedSheetId = :sheetId WHERE groupId = :groupId")
    suspend fun updateSheetId(groupId: String, sheetId: String)
}
