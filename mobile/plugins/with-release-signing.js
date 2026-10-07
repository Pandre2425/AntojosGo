// Signs release builds with the project's own key instead of React Native's public debug key
// (same key in every RN project, so anyone could sign an APK that installs over ours).
// The keystore and passwords never live in the repo: Gradle reads them from the user's
// ~/.gradle/gradle.properties (ANTOJOSGO_RELEASE_STORE_FILE, _STORE_PASSWORD, _KEY_ALIAS, _KEY_PASSWORD).
// Without them the release APK comes out unsigned and scripts/build-apk.ps1 refuses to continue.
const { withAppBuildGradle } = require('expo/config-plugins')

const marker = '// with-release-signing'
const releaseConfig = `
        release { ${marker}
            if (findProperty('ANTOJOSGO_RELEASE_STORE_FILE')) {
                storeFile file(findProperty('ANTOJOSGO_RELEASE_STORE_FILE'))
                storePassword findProperty('ANTOJOSGO_RELEASE_STORE_PASSWORD')
                keyAlias findProperty('ANTOJOSGO_RELEASE_KEY_ALIAS')
                keyPassword findProperty('ANTOJOSGO_RELEASE_KEY_PASSWORD')
            }
        }`

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents
    if (gradle.includes(marker)) return mod
    // Add the release config next to the debug one.
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${releaseConfig}`)
    // Point the release build type (the only `signingConfig signingConfigs.debug` inside `release {`) at it.
    const next = gradle.replace(/(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/, (_m, head) =>
      `${head}signingConfig findProperty('ANTOJOSGO_RELEASE_STORE_FILE') ? signingConfigs.release : null`)
    if (next === gradle) throw new Error('with-release-signing: release signingConfig not found in app/build.gradle')
    mod.modResults.contents = next
    return mod
  })
}
