package i.drive.kids.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import i.drive.kids.data.repository.ChildRepositoryImpl
import i.drive.kids.data.repository.EventRepositoryImpl
import i.drive.kids.data.repository.GroupRepositoryImpl
import i.drive.kids.data.repository.NotificationRepositoryImpl
import i.drive.kids.data.repository.ParentRepositoryImpl
import i.drive.kids.data.repository.ReminderRepositoryImpl
import i.drive.kids.data.repository.RideAssignmentRepositoryImpl
import i.drive.kids.domain.repository.ChildRepository
import i.drive.kids.domain.repository.EventRepository
import i.drive.kids.domain.repository.GroupRepository
import i.drive.kids.domain.repository.NotificationRepository
import i.drive.kids.domain.repository.ParentRepository
import i.drive.kids.domain.repository.ReminderRepository
import i.drive.kids.domain.repository.RideAssignmentRepository
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindChildRepository(impl: ChildRepositoryImpl): ChildRepository

    @Binds
    @Singleton
    abstract fun bindEventRepository(impl: EventRepositoryImpl): EventRepository

    @Binds
    @Singleton
    abstract fun bindRideAssignmentRepository(impl: RideAssignmentRepositoryImpl): RideAssignmentRepository

    @Binds
    @Singleton
    abstract fun bindGroupRepository(impl: GroupRepositoryImpl): GroupRepository

    @Binds
    @Singleton
    abstract fun bindNotificationRepository(impl: NotificationRepositoryImpl): NotificationRepository

    @Binds
    @Singleton
    abstract fun bindParentRepository(impl: ParentRepositoryImpl): ParentRepository

    @Binds
    @Singleton
    abstract fun bindReminderRepository(impl: ReminderRepositoryImpl): ReminderRepository
}
