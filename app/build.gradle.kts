import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.ksp)
}

// ── Read local.properties (optional) ──────────────────────────────────────────
val localProps = Properties().also { props ->
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { props.load(it) }
}

fun localProp(key: String, fallback: String) =
    localProps.getProperty(key, fallback)

// ── Signing from env-vars or signing.local.properties ─────────────────────────
val signingLocalProps = Properties().also { props ->
    val f = rootProject.file("signing.local.properties")
    if (f.exists()) f.inputStream().use { props.load(it) }
}

fun signingProp(key: String): String? =
    System.getenv(key) ?: signingLocalProps.getProperty(key)

android {
    namespace = "i.drive.kids"
    compileSdk = localProp("compileSdk", "35").toInt()

    defaultConfig {
        applicationId = "i.drive.kids"
        minSdk = localProp("minSdk", "26").toInt()
        targetSdk = localProp("targetSdk", "35").toInt()
        versionCode = localProp("versionCode", "1").toInt()
        versionName = localProp("versionName", "1.0.0")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    // ── Signing configs (graceful — won't fail if keys are missing) ───────────
    signingConfigs {
        val keystorePath = signingProp("KEYSTORE_PATH")
        val keystorePassword = signingProp("KEYSTORE_PASSWORD")
        val keyAlias = signingProp("KEY_ALIAS")
        val keyPassword = signingProp("KEY_PASSWORD")

        if (keystorePath != null && keystorePassword != null &&
            keyAlias != null && keyPassword != null
        ) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = keystorePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
            buildConfigField("boolean", "USE_MOCK_GOOGLE", "true")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("boolean", "USE_MOCK_GOOGLE", "false")
            val releaseSigning = signingConfigs.findByName("release")
            if (releaseSigning != null) signingConfig = releaseSigning
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            // Google API client ships duplicate license/index files
            excludes += "/META-INF/DEPENDENCIES"
            excludes += "/META-INF/LICENSE*"
            excludes += "/META-INF/NOTICE*"
            excludes += "/META-INF/INDEX.LIST"
            excludes += "/META-INF/*.kotlin_module"
            pickFirsts += "/META-INF/io.netty.versions.properties"
        }
    }
}

dependencies {
    // ── Core desugaring (java.time on minSdk 26) ──────────────────────────────
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")

    // ── Compose ───────────────────────────────────────────────────────────────
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.activity.compose)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)

    // ── Navigation ────────────────────────────────────────────────────────────
    implementation(libs.navigation.compose)
    implementation(libs.hilt.navigation.compose)

    // ── Room ──────────────────────────────────────────────────────────────────
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // ── Hilt ──────────────────────────────────────────────────────────────────
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    // ── WorkManager + Hilt integration ────────────────────────────────────────
    implementation(libs.workmanager.ktx)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    // ── Kotlin / Coroutines ───────────────────────────────────────────────────
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    // ── DataStore ─────────────────────────────────────────────────────────────
    implementation(libs.datastore.preferences)

    // ── Google APIs ───────────────────────────────────────────────────────────
    implementation(libs.google.api.client.android)
    implementation(libs.google.api.services.sheets)
    implementation(libs.google.api.services.drive)
    implementation(libs.play.services.auth)

    // ── Unit tests ────────────────────────────────────────────────────────────
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)

    // ── Instrumented tests ────────────────────────────────────────────────────
    androidTestImplementation(libs.compose.ui.test.junit4)
}
