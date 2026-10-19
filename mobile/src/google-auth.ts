import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import { isGoogleEnabled } from '../../lib/auth-validation'
import { t } from '../../shared/i18n'

// Google sign-in: Supabase builds the Google URL, a browser tab shows it, and the session comes back to
// antojosgo://auth (must be in Supabase → Auth → URL Configuration → Redirect URLs). Implicit flow: tokens in the #fragment.
const REDIRECT = 'antojosgo://auth'

export const googleAvailable = () => isGoogleEnabled(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '')

/** Null when signed in or cancelled; otherwise a message for the user. */
export async function signInWithGoogle(): Promise<string | null> {
  if (!supabase) return t('El servicio de cuentas no está configurado.')
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT, skipBrowserRedirect: true } })
  if (error || !data.url) return t('No pudimos abrir Google. Intenta de nuevo.')
  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT)
  if (result.type !== 'success') return null // the user closed the tab
  const params = new URLSearchParams(result.url.split('#')[1] ?? result.url.split('?')[1] ?? '')
  if (params.get('error')) return t('Google no completó el inicio de sesión. Intenta de nuevo.')
  const access_token = params.get('access_token'), refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return t('No recibimos la sesión de Google. Intenta de nuevo.')
  const set = await supabase.auth.setSession({ access_token, refresh_token })
  return set.error ? t('No pudimos guardar tu sesión. Intenta de nuevo.') : null
}
