import { Alert, Linking } from 'react-native'
import Constants from 'expo-constants'
import { createBoundedFetch } from '../../lib/bounded-fetch'
import { newerRelease } from '../../shared/contracts/app-version'
import { getServerUrl } from './server'

const fetchManifest = createBoundedFetch(8000)

/** Checks public/app-version.json on the backend once per launch; silent on any failure. */
export async function checkForUpdate() {
  const current = Constants.expoConfig?.android?.versionCode ?? 1
  const base = getServerUrl()
  if (!base) return
  try {
    const response = await fetchManifest(`${base}/app-version.json`, { headers: { Accept: 'application/json' } })
    const latest = response.ok ? newerRelease(await response.json(), current) : null
    if (!latest) return
    Alert.alert(`Nueva versión ${latest.version}`, `${latest.notes}\n\nDescárgala e instálala sobre la actual; tus datos se conservan.`.trim(), [
      { text: 'Más tarde', style: 'cancel' },
      { text: 'Descargar', onPress: () => void Linking.openURL(latest.url) },
    ])
  } catch { /* offline or no manifest: never block the app */ }
}
