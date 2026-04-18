package i.drive.kids.data.remote

interface DriveAdapter {
    /**
     * Reads the parent's private JSON file from Google Drive.
     * Returns null if the file does not exist yet.
     */
    suspend fun readPrivateData(parentId: String): PrivateDriveData?

    /**
     * Writes (overwrites) the parent's private JSON file on Google Drive.
     */
    suspend fun writePrivateData(parentId: String, data: PrivateDriveData)

    /**
     * Ensures the private JSON file exists for the given parent.
     * Creates an empty file if absent.
     * @return the Google Drive fileId of the file.
     */
    suspend fun ensureFileExists(parentId: String): String
}
