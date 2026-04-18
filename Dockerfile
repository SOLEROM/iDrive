# ═══════════════════════════════════════════════════════════════════════════════
# Reproducible build environment for Kids Rides & Classes Manager
#
# Provides: JDK 17, Android SDK (platforms;android-35, build-tools;35.0.0),
#           platform-tools (adb), Gradle 8.7, make, git
#
# Build:   docker build -t idrive-build:latest .
# Shell:   docker run --rm -it -v $PWD:/workspace -w /workspace idrive-build bash
# Test:    docker run --rm -v $PWD:/workspace -w /workspace idrive-build make ci-test
# ═══════════════════════════════════════════════════════════════════════════════
FROM eclipse-temurin:17-jdk-jammy

ARG CMDLINE_TOOLS_VERSION=11076708
ARG ANDROID_PLATFORM=android-35
ARG ANDROID_BUILD_TOOLS=35.0.0
ARG GRADLE_VERSION=8.7

ENV DEBIAN_FRONTEND=noninteractive \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    GRADLE_HOME=/opt/gradle \
    GRADLE_USER_HOME=/workspace/.gradle-docker

ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$GRADLE_HOME/bin

# ── Base OS tools ────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl unzip git make ca-certificates file \
    && rm -rf /var/lib/apt/lists/*

# ── Android SDK cmdline-tools ────────────────────────────────────────────────
RUN set -eux; \
    mkdir -p "$ANDROID_HOME/cmdline-tools"; \
    curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" \
        -o /tmp/tools.zip; \
    unzip -q /tmp/tools.zip -d "$ANDROID_HOME/cmdline-tools"; \
    mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"; \
    rm /tmp/tools.zip

# ── Accept licenses + install SDK packages ───────────────────────────────────
# Install both the explicit build-tools version and the one AGP 8.5.2
# auto-provisions (34.0.0), so non-root users inside the container never need
# to write to $ANDROID_HOME.
RUN set -eux; \
    yes | sdkmanager --licenses > /dev/null; \
    sdkmanager \
        "platform-tools" \
        "platforms;${ANDROID_PLATFORM}" \
        "platforms;android-34" \
        "build-tools;${ANDROID_BUILD_TOOLS}" \
        "build-tools;34.0.0" \
        > /dev/null; \
    chmod -R a+rX "$ANDROID_HOME"

# ── Gradle (bootstraps ./gradlew once, then wrapper takes over) ──────────────
RUN set -eux; \
    curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" \
        -o /tmp/gradle.zip; \
    unzip -q /tmp/gradle.zip -d /opt; \
    mv "/opt/gradle-${GRADLE_VERSION}" "$GRADLE_HOME"; \
    rm /tmp/gradle.zip

WORKDIR /workspace

# Sanity-print the toolchain on container start when no command is given.
CMD ["bash", "-lc", "java -version && gradle --version | head -n3 && sdkmanager --list_installed | head -n20"]
