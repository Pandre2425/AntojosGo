// Extends app.json with build-time settings that must not live in the repo.
//   GOOGLE_MAPS_ANDROID_KEY (or _API_KEY)  Maps SDK key (restricted to this package + signing cert). Without it maps are hidden:
//                            react-native-maps crashes a standalone build that renders a map with no key.
//   ALLOW_HTTP_API=1         Allow cleartext HTTP to the backend. ONLY for local test builds against a LAN IP;
//                            production builds must use an HTTPS EXPO_PUBLIC_API_URL.
//   NINJA_PATH               Windows: path to ninja >= 1.12 for long paths (see plugins/with-ninja-path.js).
module.exports = ({ config }) => {
  const mapsKey = (process.env.GOOGLE_MAPS_ANDROID_KEY || process.env.GOOGLE_MAPS_ANDROID_API_KEY)?.trim()
  return {
    ...config,
    android: {
      ...config.android,
      ...(mapsKey ? { config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } } } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      ['expo-build-properties', { android: { usesCleartextTraffic: process.env.ALLOW_HTTP_API === '1' } }],
      './plugins/with-ninja-path',
      './plugins/with-release-signing',
    ],
    extra: {
      ...config.extra,
      mapsEnabled: Boolean(mapsKey),
      // Dev servers and local test builds let the tester change the backend address at runtime.
      serverConfigurable: process.env.ALLOW_HTTP_API === '1' || process.env.NODE_ENV !== 'production',
    },
  }
}
