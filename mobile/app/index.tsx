import { useRef, useState } from 'react'
import { Redirect } from 'expo-router'
import { supabase } from '../src/supabase'
import { useSession } from '../src/session'
import { Action, Card, Field, Loading, Message, Page, Title } from '../src/ui'
import { authErrorMessage, loginSchema, registrationSchema } from '../../lib/auth-validation'
export default function Access() {
  const { session, ready } = useSession()
  const [register, setRegister] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  if (!ready) return <Page><Loading /></Page>
  if (session) return <Redirect href="/home" />
  async function submit() {
    if (lock.current || !supabase) return
    const parsed = (register ? registrationSchema : loginSchema).safeParse(form)
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return }
    lock.current = true; setBusy(true); setMessage('')
    try {
      const result = register ? await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { display_name: form.name.trim() } } }) : await supabase.auth.signInWithPassword(parsed.data)
      if (result.error) setMessage(authErrorMessage(result.error))
      else if (!result.data.session) setMessage('Revisa tu correo para confirmar tu cuenta antes de entrar.')
    } catch { setMessage('No pudimos conectar. Revisa la conexión e intenta nuevamente.') }
    finally { lock.current = false; setBusy(false) }
  }
  const field = (key: keyof typeof form) => (value: string) => setForm(v => ({ ...v, [key]: value }))
  return <Page><Title>AntojosGo</Title><Message>Recomendaciones gastronómicas reales según tu ubicación y preferencias.</Message><Card>
    <Title>{register ? 'Crea tu cuenta' : 'Bienvenido'}</Title>
    {register && <Field label="Tu nombre" value={form.name} onChangeText={field('name')} maxLength={100} editable={!busy} />}
    <Field label="Correo electrónico" value={form.email} onChangeText={field('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy} />
    <Field label="Contraseña" value={form.password} onChangeText={field('password')} secureTextEntry autoCapitalize="none" maxLength={128} editable={!busy} />
    {register && <Field label="Confirmar contraseña" value={form.confirmPassword} onChangeText={field('confirmPassword')} secureTextEntry autoCapitalize="none" maxLength={128} editable={!busy} />}
    <Message>{supabase ? message : 'Falta la configuración pública de Supabase. Revisa mobile/.env.local.'}</Message>
    <Action title={busy ? 'Procesando…' : register ? 'Crear cuenta' : 'Iniciar sesión'} onPress={submit} disabled={busy || !supabase} />
    <Action title={register ? 'Ya tengo cuenta' : 'Crear una cuenta'} secondary onPress={() => { setRegister(!register); setMessage('') }} disabled={busy} />
  </Card></Page>
}
