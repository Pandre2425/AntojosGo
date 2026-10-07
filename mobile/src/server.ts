import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { createBoundedFetch } from '../../lib/bounded-fetch'

// Test builds talk to a backend on the developer's PC, whose LAN IP changes between networks.
// When `serverConfigurable` (dev/test builds, see app.config.js) the user can override the
// build-time EXPO_PUBLIC_API_URL from the login screen; production builds always use the built-in URL.
const KEY = 'apiBaseUrl'
const builtIn = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '')
let current = builtIn

export const serverConfigurable = Constants.expoConfig?.extra?.serverConfigurable === true
export const getServerUrl = () => current

export async function loadServerUrl() {
  if (!serverConfigurable) return
  try { current = (await SecureStore.getItemAsync(KEY)) || builtIn } catch { current = builtIn }
}

export { normalizeServerUrl } from '../../lib/server-url'

const probe = createBoundedFetch(5000)
/** True when the URL answers like an AntojosGo backend. */
export async function testServer(origin: string): Promise<boolean> {
  try {
    const response = await probe(`${origin}/api/v1/catalog/search?limit=1`, { headers: { Accept: 'application/json' } })
    const body = await response.json().catch(() => null)
    return response.ok && Array.isArray(body?.items)
  } catch { return false }
}

export async function saveServerUrl(origin: string) {
  current = origin
  await SecureStore.setItemAsync(KEY, origin)
}
