package i.drive.kids.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import i.drive.kids.BuildConfig
import i.drive.kids.data.remote.DriveAdapter
import i.drive.kids.data.remote.SheetsAdapter
import i.drive.kids.data.remote.mock.MockDriveAdapter
import i.drive.kids.data.remote.mock.MockSheetsAdapter
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RemoteModule {

    @Provides
    @Singleton
    fun provideDriveAdapter(): DriveAdapter {
        return if (BuildConfig.USE_MOCK_GOOGLE) {
            MockDriveAdapter()
        } else {
            throw NotImplementedError("Real Google Drive adapter not yet implemented")
        }
    }

    @Provides
    @Singleton
    fun provideSheetsAdapter(): SheetsAdapter {
        return if (BuildConfig.USE_MOCK_GOOGLE) {
            MockSheetsAdapter()
        } else {
            throw NotImplementedError("Real Google Sheets adapter not yet implemented")
        }
    }
}
