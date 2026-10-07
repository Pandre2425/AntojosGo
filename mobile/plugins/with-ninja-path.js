// Windows only: the NDK's bundled ninja 1.10 fails on paths > 260 chars (codegen object files
// under node_modules). When NINJA_PATH points to ninja >= 1.12 (long-path aware; Windows
// LongPathsEnabled=1 required), the app's CMake build uses it. No effect when unset.
const { withAppBuildGradle } = require('expo/config-plugins')

module.exports = function withNinjaPath(config) {
  const ninja = process.env.NINJA_PATH?.trim()
  if (!ninja) return config
  return withAppBuildGradle(config, (mod) => {
    const marker = '// with-ninja-path'
    if (mod.modResults.contents.includes(marker)) return mod
    const arg = `externalNativeBuild { cmake { arguments "-DCMAKE_MAKE_PROGRAM=${ninja.replace(/\\/g, '/')}" } } ${marker}`
    mod.modResults.contents = mod.modResults.contents.replace(/defaultConfig\s*\{/, (m) => `${m}\n        ${arg}`)
    return mod
  })
}
