'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { accountEmailSent, accountExists, accountLink, authErrorMessage, authOrigin, isGoogleEnabled, loginSchema, isRepeatedSignup, registrationSchema, sendAccountEmail } from '@/lib/auth-validation'
import { supabasePublicKey, supabaseUrl } from '@/lib/supabase/config'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { t } from '@/shared/i18n'

export default function AccountAccess({ audience, onBack }: { audience: 'customer' | 'restaurant'; onBack: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [google, setGoogle] = useState(false)
  useEffect(() => { if (isSupabaseConfigured) void isGoogleEnabled(supabaseUrl, supabasePublicKey).then(setGoogle) }, [])
  const submitting = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    setError(''); setNotice(''); setUnconfirmed(false)
    const parsed = mode === 'register' ? registrationSchema.safeParse({ name, email, password, confirmPassword }) : loginSchema.safeParse({ email, password })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    const db = getSupabase()
    if (!db) { setError(t('El servicio de cuentas no está configurado.')); return }
    submitting.current = true
    setBusy(true)
    try {
      if (mode === 'register') {
        const { data, error } = await db.auth.signUp({ email: parsed.data.email, password: parsed.data.password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: accountLink(authOrigin(window.location.origin), 'confirmar') } })
        if (error) throw error
        setPassword(''); setConfirmPassword('')
        if (isRepeatedSignup(data.user)) { setError(accountExists()); setMode('login') }
        else if (!data.session) {
          setNotice(t('Revisa tu correo para confirmar la cuenta. Después vuelve aquí e inicia sesión. Si ya tenías una cuenta, usa tu contraseña habitual.'))
          setMode('login')
        }
      } else {
        const { error } = await db.auth.signInWithPassword(parsed.data)
        if (error) throw error
        setPassword('')
      }
    } catch (err) {
      setError(authErrorMessage(err as { code?: string; status?: number; name?: string }))
      setUnconfirmed((err as { code?: string }).code === 'email_not_confirmed')
    }
    finally { submitting.current = false; setBusy(false) }
  }

  async function continueWithGoogle() {
    setError(''); setNotice('')
    const db = getSupabase()
    if (!db) return
    setBusy(true)
    // Leaves the page for Google and comes back here with the session (Redirect URLs: https://antojosgo.com/**).
    const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authOrigin(window.location.href.split('#')[0]) } })
    if (error) { setError(authErrorMessage(error)); setBusy(false) }
  }

  async function emailLink(kind: 'reset' | 'resend') {
    setError(''); setNotice('')
    const parsed = loginSchema.shape.email.safeParse(email)
    if (!parsed.success) { setError(t('Escribe tu correo arriba y vuelve a tocar el botón.')); return }
    const db = getSupabase()
    if (!db || submitting.current) return
    submitting.current = true; setBusy(true)
    try {
      const error = await sendAccountEmail(db.auth, kind, parsed.data, authOrigin(window.location.origin))
      if (error) setError(authErrorMessage(error)); else { setNotice(accountEmailSent(kind)); setUnconfirmed(false) }
    } catch (err) { setError(authErrorMessage(err as { name?: string })) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <main className="min-h-dvh bg-background px-4 py-8 flex items-center justify-center">
    <section className="w-full max-w-md rounded-[24px] border bg-white p-6 space-y-5 shadow-sm">
      <Button variant="ghost" disabled={busy} onClick={onBack}>← {t('Volver')}</Button>
      <div><img src="/logo.png" alt="" width={64} height={64} className="shrink-0 rounded-xl mb-3" /><p className="text-sm font-semibold text-primary">{t('AntojosGo ·')} {audience === 'restaurant' ? t('Restaurantes') : t('Clientes')}</p>
        <h1 className="mt-2 text-2xl font-bold">{mode === 'register' ? t('Crea tu cuenta') : t('Te damos la bienvenida')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{audience === 'restaurant' ? t('Crea tu cuenta personal para registrar y administrar tu restaurante.') : t('Tu cuenta personal para descubrir y guardar tus próximos antojos.')}</p></div>
      {!isSupabaseConfigured && <p role="status" className="text-sm">{t('El servicio de cuentas está pendiente de configuración.')}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm">{notice}</p>}
      {google && <><Button type="button" variant="outline" className="w-full gap-2" disabled={busy} onClick={continueWithGoogle}>
        <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continuar con Google</Button>
        <p className="text-center text-xs text-muted-foreground">{t('o con tu correo')}</p></>}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && <div className="space-y-1"><Label htmlFor="account-name">{t('Tu nombre')}</Label><Input id="account-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required disabled={busy} /></div>}
        <div className="space-y-1"><Label htmlFor="account-email">{t('Correo electrónico')}</Label><Input id="account-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required disabled={busy} /></div>
        <div className="space-y-1"><Label htmlFor="account-password">{t('Contraseña')}</Label><Input id="account-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required disabled={busy} />
          {mode === 'register' && <p className="text-xs text-muted-foreground">{t('Al menos 10 caracteres. Puedes usar una frase fácil de recordar.')}</p>}
          <Button type="button" variant="ghost" size="sm" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? t('Ocultar contraseña') : t('Mostrar contraseña')}</Button></div>
        {mode === 'register' && <div className="space-y-1"><Label htmlFor="account-confirm">{t('Confirmar contraseña')}</Label><Input id="account-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={128} required disabled={busy} /></div>}
        <Button className="w-full" disabled={busy || !isSupabaseConfigured} type="submit">{busy ? t('Un momento…') : mode === 'register' ? t('Crear cuenta') : t('Iniciar sesión')}</Button>
      </form>
      {mode === 'login' && <div className="flex flex-wrap justify-center gap-x-4">
        <Button variant="link" size="sm" disabled={busy} onClick={() => emailLink('reset')}>{t('¿Olvidaste tu contraseña?')}</Button>
        {unconfirmed && <Button variant="link" size="sm" disabled={busy} onClick={() => emailLink('resend')}>{t('Reenviar confirmación')}</Button>}
      </div>}
      <Button className="w-full" variant="outline" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setNotice(''); setPassword(''); setConfirmPassword('') }}>{mode === 'login' ? t('No tengo cuenta · Registrarme') : t('Ya tengo cuenta · Iniciar sesión')}</Button>
      <p className="text-center text-xs text-muted-foreground">{t('Al crear tu cuenta o continuar con Google aceptas los')} <a href="/terminos" target="_blank" className="font-semibold text-[#173F35] underline">{t('Términos y condiciones')}</a>.</p>
      <p className="text-xs text-muted-foreground">{t('El correo identifica tu cuenta. Tu nombre personal y el nombre comercial se guardan por separado.')}</p>
    </section>
  </main>
}
