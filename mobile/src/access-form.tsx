import { useRef, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './session'
import { Action, Card, Field, Loading, Message, Page, Title } from './ui'
import { ServerSettings } from './server-settings'
import { getServerUrl } from './server'
import { accountEmailSent, accountLink, authErrorMessage, loginSchema, registrationSchema, sendAccountEmail } from '../../lib/auth-validation'
/** Sign in / sign up. The account tab shows it when there is no session. */
export function AccessForm() {
  const { ready } = useSession()
  const [register, setRegister] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const lock = useRef(false)
  if (!ready) return <Page><Loading /></Page>
  async function submit() {
    if (lock.current || !supabase) return
    const parsed = (register ? registrationSchema : loginSchema).safeParse(form)
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return }
    lock.current = true; setBusy(true); setMessage(''); setUnconfirmed(false)
    try {
      const result = register ? await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { display_name: form.name.trim() }, emailRedirectTo: accountLink(getServerUrl(), 'confirmar') } }) : await supabase.auth.signInWithPassword(parsed.data)
      if (result.error) { setMessage(authErrorMessage(result.error)); setUnconfirmed(result.error.code === 'email_not_confirmed') }
      else if (!result.data.session) { setMessage(`Te enviamos un enlace a ${parsed.data.email}. Ábrelo para confirmar tu cuenta y después inicia sesión aquí.`); setRegister(false) }
    } catch { setMessage('No pudimos conectar. Revisa la conexión e intenta nuevamente.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function emailLink(kind: 'reset' | 'resend') {
    const email = loginSchema.shape.email.safeParse(form.email)
    if (!email.success) { setMessage('Escribe tu correo arriba y vuelve a tocar el botón.'); return }
    if (lock.current || !supabase) return
    lock.current = true; setBusy(true); setMessage('')
    try {
      const error = await sendAccountEmail(supabase.auth, kind, email.data, getServerUrl())
      if (error) setMessage(authErrorMessage(error)); else { setMessage(accountEmailSent(kind)); setUnconfirmed(false) }
    } catch { setMessage('No pudimos conectar. Revisa la conexión e intenta nuevamente.') }
    finally { lock.current = false; setBusy(false) }
  }
  const field = (key: keyof typeof form) => (value: string) => setForm(v => ({ ...v, [key]: value }))
  return <Page tab><Title>Mi cuenta</Title><Message>Para buscar no necesitas cuenta. Inicia sesión para guardar favoritos o administrar tu restaurante.</Message><Card>
    <Title>{register ? 'Crea tu cuenta' : 'Bienvenido'}</Title>
    {register && <Field label="Tu nombre" value={form.name} onChangeText={field('name')} maxLength={100} editable={!busy} />}
    <Field label="Correo electrónico" value={form.email} onChangeText={field('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy} />
    <Field label="Contraseña" value={form.password} onChangeText={field('password')} secureTextEntry autoCapitalize="none" maxLength={128} editable={!busy} />
    {register && <Field label="Confirmar contraseña" value={form.confirmPassword} onChangeText={field('confirmPassword')} secureTextEntry autoCapitalize="none" maxLength={128} editable={!busy} />}
    <Message>{supabase ? message : 'Falta la configuración pública de Supabase. Revisa mobile/.env.local.'}</Message>
    <Action title={busy ? 'Procesando…' : register ? 'Crear cuenta' : 'Iniciar sesión'} onPress={submit} disabled={busy || !supabase} />
    {!register && <Action title="¿Olvidaste tu contraseña?" secondary onPress={() => emailLink('reset')} disabled={busy} />}
    {unconfirmed && <Action title="Reenviar confirmación" secondary onPress={() => emailLink('resend')} disabled={busy} />}
    <Action title={register ? 'Ya tengo cuenta' : 'Crear una cuenta'} secondary onPress={() => { setRegister(!register); setMessage('') }} disabled={busy} />
  </Card><ServerSettings /></Page>
}
