import { useEffect, useRef, useState } from 'react'
import { Image } from 'react-native'
import { supabase } from './supabase'
import { useSession } from './session'
import { Action, Card, Field, Loading, Message, Page, Title } from './ui'
import { ServerSettings } from './server-settings'
import { getServerUrl } from './server'
import { googleAvailable, signInWithGoogle } from './google-auth'
import { AccessibilityCard, HelpLinks } from './account-extras'
import { LanguageSelector } from './language'
import { accountEmailSent, accountLink, authErrorMessage, authOrigin, loginSchema, registrationSchema, sendAccountEmail } from '../../lib/auth-validation'
import { t } from '../../shared/i18n'
/** Sign in / sign up. The account tab shows it when there is no session. */
export function AccessForm() {
  const { ready } = useSession()
  const [register, setRegister] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [google, setGoogle] = useState(false)
  useEffect(() => { void googleAvailable().then(setGoogle) }, [])
  const lock = useRef(false)
  if (!ready) return <Page><Loading /></Page>
  async function submit() {
    if (lock.current || !supabase) return
    const parsed = (register ? registrationSchema : loginSchema).safeParse(form)
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return }
    lock.current = true; setBusy(true); setMessage(''); setUnconfirmed(false)
    try {
      const result = register ? await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { display_name: form.name.trim() }, emailRedirectTo: accountLink(authOrigin(getServerUrl()), 'confirmar') } }) : await supabase.auth.signInWithPassword(parsed.data)
      if (result.error) { setMessage(authErrorMessage(result.error)); setUnconfirmed(result.error.code === 'email_not_confirmed') }
      else if (!result.data.session) { setMessage(t('Te enviamos un enlace a {email}. Ábrelo para confirmar tu cuenta y después inicia sesión aquí.', { email: parsed.data.email })); setRegister(false) }
    } catch { setMessage(t('No pudimos conectar. Revisa la conexión e intenta nuevamente.')) }
    finally { lock.current = false; setBusy(false) }
  }
  async function emailLink(kind: 'reset' | 'resend') {
    const email = loginSchema.shape.email.safeParse(form.email)
    if (!email.success) { setMessage(t('Escribe tu correo arriba y vuelve a tocar el botón.')); return }
    if (lock.current || !supabase) return
    lock.current = true; setBusy(true); setMessage('')
    try {
      const error = await sendAccountEmail(supabase.auth, kind, email.data, authOrigin(getServerUrl()))
      if (error) setMessage(authErrorMessage(error)); else { setMessage(accountEmailSent(kind)); setUnconfirmed(false) }
    } catch { setMessage(t('No pudimos conectar. Revisa la conexión e intenta nuevamente.')) }
    finally { lock.current = false; setBusy(false) }
  }
  async function google_() {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage('')
    try { const error = await signInWithGoogle(); if (error) setMessage(error) }
    finally { lock.current = false; setBusy(false) }
  }
  const field = (key: keyof typeof form) => (value: string) => setForm(v => ({ ...v, [key]: value }))
  return <Page tab><Image source={require('./assets/logo.png')} accessibilityIgnoresInvertColors style={{ width: 72, height: 72, borderRadius: 16 }} /><Title>{t('Mi cuenta')}</Title><Message>{t('Para buscar no necesitas cuenta. Inicia sesión para guardar favoritos o administrar tu restaurante.')}</Message><Card>
    <Title>{register ? t('Crea tu cuenta') : t('Bienvenido')}</Title>
    {google ? <><Action title={t('Continuar con Google')} secondary onPress={() => void google_()} disabled={busy} /><Message>{t('o con tu correo:')}</Message></> : null}
    {register && <Field label={t('Tu nombre')} value={form.name} onChangeText={field('name')} maxLength={100} editable={!busy} />}
    <Field label={t('Correo electrónico')} value={form.email} onChangeText={field('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy} />
    <Field label={t('Contraseña')} value={form.password} onChangeText={field('password')} secureTextEntry autoCapitalize="none" maxLength={128} editable={!busy} />
    {register && <Field label={t('Confirmar contraseña')} value={form.confirmPassword} onChangeText={field('confirmPassword')} secureTextEntry autoCapitalize="none" maxLength={128} editable={!busy} />}
    <Message>{supabase ? message : t('Falta la configuración pública de Supabase. Revisa mobile/.env.local.')}</Message>
    <Action title={busy ? t('Procesando…') : register ? t('Crear cuenta') : t('Iniciar sesión')} onPress={submit} disabled={busy || !supabase} />
    {!register && <Action title={t('¿Olvidaste tu contraseña?')} secondary onPress={() => emailLink('reset')} disabled={busy} />}
    {unconfirmed && <Action title={t('Reenviar confirmación')} secondary onPress={() => emailLink('resend')} disabled={busy} />}
    <Action title={register ? t('Ya tengo cuenta') : t('Crear una cuenta')} secondary onPress={() => { setRegister(!register); setMessage('') }} disabled={busy} />
    <Message>{t('Al crear tu cuenta o continuar con Google aceptas los')} {t('Términos y condiciones')}.</Message>
  </Card><Card><LanguageSelector /></Card><AccessibilityCard /><HelpLinks /><ServerSettings /></Page>
}
