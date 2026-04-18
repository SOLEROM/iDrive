# ═══════════════════════════════════════════════════════════════════════════════
# Kids Rides & Classes Manager — Makefile
# Standardised build / test / sign / install workflow.
# Override any variable with `make VAR=value target` or an env var.
# ═══════════════════════════════════════════════════════════════════════════════

# ── Variables ────────────────────────────────────────────────────────────────
APP_ID               ?= i.drive.kids
APP_NAME             ?= KidsRides
BUILD_TYPE           ?= debug
MODULE               ?= app

ANDROID_HOME         ?= $(HOME)/Android/Sdk
ANDROID_SDK_ROOT     ?= $(ANDROID_HOME)
ADB                  ?= $(ANDROID_HOME)/platform-tools/adb
EMULATOR             ?= $(ANDROID_HOME)/emulator/emulator
BUILD_TOOLS_DIR      ?= $(shell ls -1d $(ANDROID_HOME)/build-tools/* 2>/dev/null | sort -V | tail -n1)
APKSIGNER            ?= $(BUILD_TOOLS_DIR)/apksigner
ZIPALIGN             ?= $(BUILD_TOOLS_DIR)/zipalign

GRADLEW              ?= ./gradlew
GRADLE_ARGS          ?= --no-daemon --console=plain

APK_DEBUG_PATH       ?= $(MODULE)/build/outputs/apk/debug/$(MODULE)-debug.apk
APK_RELEASE_UNSIGNED ?= $(MODULE)/build/outputs/apk/release/$(MODULE)-release-unsigned.apk
APK_RELEASE_ALIGNED  ?= $(MODULE)/build/outputs/apk/release/$(MODULE)-release-aligned.apk
APK_RELEASE_SIGNED   ?= $(MODULE)/build/outputs/apk/release/$(MODULE)-release-signed.apk

KEYSTORE_DIR         ?= keystore
KEYSTORE_PATH        ?= $(KEYSTORE_DIR)/release.jks
KEYSTORE_ALIAS       ?= idrive
KEYSTORE_VALIDITY    ?= 10000
KEYSTORE_STOREPASS   ?= $(shell printenv KEYSTORE_STOREPASS)
KEYSTORE_KEYPASS     ?= $(shell printenv KEYSTORE_KEYPASS)

# Single destination for all final build artifacts (APKs, AABs, packaged dist).
# Gradle still writes intermediate output to app/build/; we copy finals to OUT_DIR.
OUT_DIR              ?= out
DIST_DIR             ?= $(OUT_DIR)/dist
ARTIFACT_DIR         ?= $(OUT_DIR)

# ── Helpers ──────────────────────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
BLUE   := \033[0;34m
RESET  := \033[0m

.DEFAULT_GOAL := help
.PHONY: help doctor init clean deep-clean \
        build-debug build-release apk-debug apk-release bundle-release \
        test test-unit test-integration test-ui lint check ci-test \
        adb-devices install-debug install-release uninstall logcat \
        keystore-create sign-release verify-signature \
        emulator-list emulator-start emulator-stop \
        artifacts dist \
        docker-image docker-shell docker-wrapper docker-test \
        docker-build-debug docker-check docker-clean

# ═══════════════════════════════════════════════════════════════════════════════
# Core
# ═══════════════════════════════════════════════════════════════════════════════

help: ## Show this help message
	@printf "$(BLUE)Kids Rides & Classes Manager — Makefile$(RESET)\n\n"
	@printf "$(YELLOW)Core$(RESET)\n"
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z_-]+:.*## /{printf "  $(GREEN)%-22s$(RESET) %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n$(YELLOW)Common flows$(RESET)\n"
	@printf "  $(GREEN)Debug   :$(RESET) make doctor && make init && make build-debug && make install-debug\n"
	@printf "  $(GREEN)Release :$(RESET) make build-release && make sign-release && make verify-signature && make dist\n"
	@printf "  $(GREEN)Test    :$(RESET) make lint && make test-unit && make check\n"

doctor: ## Verify toolchain (java, adb, gradle, android sdk)
	@printf "$(BLUE)→ Toolchain check$(RESET)\n"
	@command -v java >/dev/null 2>&1 || { printf "$(RED)✗ java not found$(RESET)\n"; exit 1; }
	@java -version 2>&1 | head -n1 | awk '{print "  java:   "$$0}'
	@if [ -x "$(ADB)" ]; then \
	    printf "  adb:    $$($(ADB) version | head -n1)\n"; \
	else \
	    printf "$(RED)✗ adb not found at $(ADB)$(RESET)\n"; exit 1; \
	fi
	@if [ -d "$(ANDROID_HOME)" ]; then \
	    printf "  sdk:    $(ANDROID_HOME)\n"; \
	else \
	    printf "$(RED)✗ ANDROID_HOME not set or not a directory: $(ANDROID_HOME)$(RESET)\n"; exit 1; \
	fi
	@if [ -x "$(GRADLEW)" ]; then \
	    printf "  gradle: $$($(GRADLEW) --version 2>/dev/null | grep '^Gradle' | head -n1)\n"; \
	else \
	    printf "$(YELLOW)⚠ gradle wrapper missing — run: gradle wrapper --gradle-version 8.7$(RESET)\n"; \
	fi
	@if [ -n "$(BUILD_TOOLS_DIR)" ] && [ -x "$(APKSIGNER)" ]; then \
	    printf "  tools:  $(BUILD_TOOLS_DIR)\n"; \
	else \
	    printf "$(YELLOW)⚠ build-tools not found; sign-release will fail$(RESET)\n"; \
	fi
	@printf "$(GREEN)✓ toolchain ok$(RESET)\n"

init: ## Prepare local config and directories
	@printf "$(BLUE)→ init$(RESET)\n"
	@mkdir -p $(KEYSTORE_DIR) $(OUT_DIR) $(DIST_DIR)
	@if [ ! -f local.properties ]; then \
	    printf "sdk.dir=$(ANDROID_HOME)\n" > local.properties; \
	    printf "  created local.properties\n"; \
	fi
	@if [ ! -f signing.local.properties ] && [ -f config/signing.example.properties ]; then \
	    cp config/signing.example.properties signing.local.properties; \
	    printf "  created signing.local.properties (edit passwords before sign-release)\n"; \
	fi
	@printf "$(GREEN)✓ init done$(RESET)\n"

clean: ## Clean gradle build outputs
	@$(GRADLEW) $(GRADLE_ARGS) clean

deep-clean: clean ## Clean build + caches + out/
	@rm -rf $(OUT_DIR) .gradle $(MODULE)/build build
	@printf "$(GREEN)✓ deep clean done$(RESET)\n"

# ═══════════════════════════════════════════════════════════════════════════════
# Build
# ═══════════════════════════════════════════════════════════════════════════════

build-debug: ## Compile debug APK (copied to out/$(APP_NAME)-debug.apk)
	@$(GRADLEW) $(GRADLE_ARGS) :$(MODULE):assembleDebug
	@mkdir -p $(OUT_DIR)
	@cp $(APK_DEBUG_PATH) $(OUT_DIR)/$(APP_NAME)-debug.apk
	@printf "$(GREEN)✓ debug APK → $(OUT_DIR)/$(APP_NAME)-debug.apk$(RESET)\n"

build-release: ## Compile release APK (copied to out/$(APP_NAME)-release-unsigned.apk)
	@$(GRADLEW) $(GRADLE_ARGS) :$(MODULE):assembleRelease
	@mkdir -p $(OUT_DIR)
	@cp $(APK_RELEASE_UNSIGNED) $(OUT_DIR)/$(APP_NAME)-release-unsigned.apk
	@printf "$(GREEN)✓ release APK → $(OUT_DIR)/$(APP_NAME)-release-unsigned.apk$(RESET)\n"

apk-debug: build-debug ## Alias for build-debug

apk-release: build-release ## Alias for build-release

bundle-release: ## Build Android App Bundle (.aab) — copied to out/
	@$(GRADLEW) $(GRADLE_ARGS) :$(MODULE):bundleRelease
	@mkdir -p $(OUT_DIR)
	@cp $(MODULE)/build/outputs/bundle/release/$(MODULE)-release.aab $(OUT_DIR)/$(APP_NAME)-release.aab
	@printf "$(GREEN)✓ aab → $(OUT_DIR)/$(APP_NAME)-release.aab$(RESET)\n"

# ═══════════════════════════════════════════════════════════════════════════════
# Test
# ═══════════════════════════════════════════════════════════════════════════════

test: test-unit ## Alias for test-unit (fast, no device required)

test-unit: ## Run JVM unit tests
	@$(GRADLEW) $(GRADLE_ARGS) :$(MODULE):testDebugUnitTest

test-integration: ## Run instrumented tests (requires device/emulator)
	@$(GRADLEW) $(GRADLE_ARGS) :$(MODULE):connectedDebugAndroidTest

test-ui: ## Run Compose UI tests (requires device/emulator)
	@$(GRADLEW) $(GRADLE_ARGS) :$(MODULE):connectedDebugAndroidTest \
	    -Pandroid.testInstrumentationRunnerArguments.package=$(APP_ID).ui

lint: ## Run Android lint
	@$(GRADLEW) $(GRADLE_ARGS) :$(MODULE):lintDebug

check: lint test-unit ## lint + unit tests (CI-safe, no device)
	@printf "$(GREEN)✓ check passed$(RESET)\n"

ci-test: ## Bootstrap gradle wrapper then run unit tests (used inside Docker)
	@if [ ! -x "$(GRADLEW)" ]; then \
	    printf "$(BLUE)→ bootstrapping gradle wrapper$(RESET)\n"; \
	    gradle wrapper --gradle-version 8.7 --no-daemon; \
	fi
	@$(MAKE) test-unit

# ═══════════════════════════════════════════════════════════════════════════════
# Device
# ═══════════════════════════════════════════════════════════════════════════════

adb-devices: ## List connected devices/emulators
	@$(ADB) devices -l

install-debug: build-debug ## Install debug APK on connected device
	@$(ADB) install -r $(APK_DEBUG_PATH)
	@printf "$(GREEN)✓ installed $(APP_ID).debug$(RESET)\n"

install-release: ## Install signed release APK on connected device
	@if [ ! -f "$(APK_RELEASE_SIGNED)" ]; then \
	    printf "$(RED)✗ signed APK not found: $(APK_RELEASE_SIGNED) — run: make sign-release$(RESET)\n"; exit 1; \
	fi
	@$(ADB) install -r $(APK_RELEASE_SIGNED)

uninstall: ## Uninstall app from connected device
	@-$(ADB) uninstall $(APP_ID).debug
	@-$(ADB) uninstall $(APP_ID)

logcat: ## Stream logcat filtered to this app
	@$(ADB) logcat -v color $(APP_NAME):V AndroidRuntime:E System.err:W *:S

# ═══════════════════════════════════════════════════════════════════════════════
# Signing
# ═══════════════════════════════════════════════════════════════════════════════

keystore-create: ## Create release keystore (interactive)
	@mkdir -p $(KEYSTORE_DIR)
	@if [ -f "$(KEYSTORE_PATH)" ]; then \
	    printf "$(YELLOW)⚠ keystore already exists: $(KEYSTORE_PATH)$(RESET)\n"; exit 0; \
	fi
	@keytool -genkey -v \
	    -keystore $(KEYSTORE_PATH) \
	    -alias $(KEYSTORE_ALIAS) \
	    -keyalg RSA -keysize 2048 \
	    -validity $(KEYSTORE_VALIDITY)
	@printf "$(GREEN)✓ keystore created: $(KEYSTORE_PATH)$(RESET)\n"
	@printf "$(YELLOW)→ back this up in a password manager$(RESET)\n"

sign-release: ## Sign release APK with apksigner
	@if [ ! -f "$(APK_RELEASE_UNSIGNED)" ]; then \
	    printf "$(RED)✗ unsigned APK not found — run: make build-release$(RESET)\n"; exit 1; \
	fi
	@if [ ! -f "$(KEYSTORE_PATH)" ]; then \
	    printf "$(RED)✗ keystore not found: $(KEYSTORE_PATH) — run: make keystore-create$(RESET)\n"; exit 1; \
	fi
	@if [ -z "$(KEYSTORE_STOREPASS)" ] || [ -z "$(KEYSTORE_KEYPASS)" ]; then \
	    printf "$(RED)✗ set KEYSTORE_STOREPASS and KEYSTORE_KEYPASS env vars$(RESET)\n"; exit 1; \
	fi
	@$(ZIPALIGN) -v -p 4 $(APK_RELEASE_UNSIGNED) $(APK_RELEASE_ALIGNED) >/dev/null
	@$(APKSIGNER) sign \
	    --ks $(KEYSTORE_PATH) \
	    --ks-key-alias $(KEYSTORE_ALIAS) \
	    --ks-pass pass:$(KEYSTORE_STOREPASS) \
	    --key-pass pass:$(KEYSTORE_KEYPASS) \
	    --out $(APK_RELEASE_SIGNED) \
	    $(APK_RELEASE_ALIGNED)
	@mkdir -p $(OUT_DIR)
	@cp $(APK_RELEASE_SIGNED) $(OUT_DIR)/$(APP_NAME)-release.apk
	@printf "$(GREEN)✓ signed → $(OUT_DIR)/$(APP_NAME)-release.apk$(RESET)\n"

verify-signature: ## Verify signed release APK
	@if [ ! -f "$(APK_RELEASE_SIGNED)" ]; then \
	    printf "$(RED)✗ signed APK not found: $(APK_RELEASE_SIGNED)$(RESET)\n"; exit 1; \
	fi
	@$(APKSIGNER) verify --verbose $(APK_RELEASE_SIGNED) && \
	    printf "$(GREEN)✓ signature verified$(RESET)\n"

# ═══════════════════════════════════════════════════════════════════════════════
# Emulator (optional)
# ═══════════════════════════════════════════════════════════════════════════════

emulator-list: ## List available AVDs
	@$(EMULATOR) -list-avds

emulator-start: ## Start first available AVD; waits until fully booted
	@AVD=$$($(EMULATOR) -list-avds | head -n1); \
	if [ -z "$$AVD" ]; then \
	    printf "$(RED)✗ no AVD found. Create one: ./install.sh --emulator$(RESET)\n"; exit 1; \
	fi; \
	if [ -x /usr/bin/adb ] && [ "$$(/usr/bin/adb version | head -n1)" != "$$($(ADB) version | head -n1)" ]; then \
	    printf "$(YELLOW)⚠ /usr/bin/adb (apt) differs from SDK adb — remove it:$(RESET)\n"; \
	    printf "$(YELLOW)    sudo apt-get remove -y adb android-tools-adb$(RESET)\n"; \
	fi; \
	printf "$(BLUE)→ resetting adb server$(RESET)\n"; \
	$(ADB) kill-server >/dev/null 2>&1 || true; \
	$(ADB) start-server >/dev/null 2>&1; \
	printf "$(BLUE)→ starting $$AVD (logs: emulator.log)$(RESET)\n"; \
	nohup $(EMULATOR) -avd $$AVD -no-snapshot -no-boot-anim >emulator.log 2>&1 & \
	printf "$(BLUE)→ waiting for device$(RESET)"; \
	for i in $$(seq 1 60); do \
	    if $(ADB) devices | grep -q 'emulator.*device$$'; then break; fi; \
	    printf "."; sleep 2; \
	done; printf "\n"; \
	$(ADB) wait-for-device; \
	printf "$(BLUE)→ waiting for boot-complete$(RESET)"; \
	for i in $$(seq 1 90); do \
	    BOOT=$$($(ADB) shell getprop sys.boot_completed 2>/dev/null | tr -d '\r'); \
	    if [ "$$BOOT" = "1" ]; then break; fi; \
	    printf "."; sleep 2; \
	done; printf "\n"; \
	if [ "$$BOOT" != "1" ]; then \
	    printf "$(RED)✗ emulator did not finish booting in 180s — see emulator.log$(RESET)\n"; exit 1; \
	fi; \
	printf "$(GREEN)✓ emulator booted and ready$(RESET)\n"

emulator-stop: ## Stop running emulators
	@-$(ADB) emu kill
	@-$(ADB) kill-server

# ═══════════════════════════════════════════════════════════════════════════════
# Packaging
# ═══════════════════════════════════════════════════════════════════════════════

artifacts: ## Copy every available APK/AAB into out/
	@mkdir -p $(OUT_DIR)
	@-[ -f $(APK_DEBUG_PATH) ]       && cp $(APK_DEBUG_PATH)       $(OUT_DIR)/$(APP_NAME)-debug.apk
	@-[ -f $(APK_RELEASE_UNSIGNED) ] && cp $(APK_RELEASE_UNSIGNED) $(OUT_DIR)/$(APP_NAME)-release-unsigned.apk
	@-[ -f $(APK_RELEASE_SIGNED) ]   && cp $(APK_RELEASE_SIGNED)   $(OUT_DIR)/$(APP_NAME)-release.apk
	@printf "$(GREEN)✓ artifacts in $(OUT_DIR)/$(RESET)\n"
	@ls -la $(OUT_DIR)/ 2>/dev/null || true

dist: ## Package signed APK + docs for distribution (out/dist/)
	@mkdir -p $(DIST_DIR)/docs
	@if [ ! -f "$(APK_RELEASE_SIGNED)" ]; then \
	    printf "$(RED)✗ signed APK not found — run: make sign-release$(RESET)\n"; exit 1; \
	fi
	@cp $(APK_RELEASE_SIGNED) $(DIST_DIR)/$(APP_NAME)-release.apk
	@cp README.md ARCHITECTURE.md DATA_MODEL.md SYNC_DESIGN.md \
	    CONFIG_MODEL.md UX_GUIDELINES.md BUILD_AND_RELEASE.md TEST_PLAN.md \
	    $(DIST_DIR)/docs/ 2>/dev/null || true
	@printf "$(GREEN)✓ $(DIST_DIR)/ ready for distribution$(RESET)\n"
	@ls -la $(DIST_DIR)/

# ═══════════════════════════════════════════════════════════════════════════════
# Docker (reproducible build + test env)
# ═══════════════════════════════════════════════════════════════════════════════

DOCKER_IMAGE ?= idrive-build:latest
# --user keeps file ownership correct on bind-mounted workspace.
# HOME must point at a writable path inside the workspace so Android Gradle
# Plugin can create ~/.android/analytics.settings.
DOCKER_RUN   = docker run --rm -v $(PWD):/workspace -w /workspace \
               -u $(shell id -u):$(shell id -g) \
               -e HOME=/workspace/.docker-home \
               -e GRADLE_USER_HOME=/workspace/.gradle-docker \
               $(DOCKER_IMAGE)

docker-image: ## Build the reproducible build-env Docker image
	@docker build -t $(DOCKER_IMAGE) -f Dockerfile .

docker-shell: docker-image ## Interactive shell inside the build container
	@docker run --rm -it -v $(PWD):/workspace -w /workspace \
	    -u $(shell id -u):$(shell id -g) \
	    -e GRADLE_USER_HOME=/workspace/.gradle-docker \
	    $(DOCKER_IMAGE) bash

docker-wrapper: docker-image ## Generate ./gradlew inside the container
	@$(DOCKER_RUN) gradle wrapper --gradle-version 8.7 --no-daemon

docker-test: docker-image ## Run unit tests inside the container
	@$(DOCKER_RUN) make ci-test

docker-build-debug: docker-image ## Build debug APK inside the container
	@$(DOCKER_RUN) bash -lc '[ -x ./gradlew ] || gradle wrapper --gradle-version 8.7 --no-daemon; make build-debug'

docker-check: docker-image ## Run lint + unit tests inside the container
	@$(DOCKER_RUN) bash -lc '[ -x ./gradlew ] || gradle wrapper --gradle-version 8.7 --no-daemon; make check'

docker-clean: ## Remove the build image and docker gradle cache
	@-docker rmi $(DOCKER_IMAGE) 2>/dev/null
	@rm -rf .gradle-docker
	@printf "$(GREEN)✓ docker artifacts cleaned$(RESET)\n"
