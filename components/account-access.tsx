'use client'

import { useRef, useState, type FormEvent } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { authErrorMessage, loginSchema, registrationSchema } from '@/lib/auth-validation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

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
  const submitting = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    setError(''); setNotice('')
    const parsed = mode === 'register' ? registrationSchema.safeParse({ name, email, password, confirmPassword }) : loginSchema.safeParse({ email, password })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    const db = getSupabase()
    if (!db) { setError('El servicio de cuentas no está configurado.'); return }
    submitting.current = true
    setBusy(true)
    try {
      if (mode === 'register') {
        const { data, error } = await db.auth.signUp({ email: parsed.data.email, password: parsed.data.password,
          options: { data: { display_name: name.trim() } } })
        if (error) throw error
        setPassword(''); setConfirmPassword('')
        if (!data.session) {
          setNotice('Revisa tu correo para confirmar la cuenta. Después vuelve aquí e inicia sesión. Si ya tenías una cuenta, usa tu contraseña habitual.')
          setMode('login')
        }
      } else {
        const { error } = await db.auth.signInWithPassword(parsed.data)
        if (error) throw error
        setPassword('')
      }
    } catch (err) { setError(authErrorMessage(err as { code?: string; status?: number; name?: string })) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <main className="min-h-dvh bg-background px-4 py-8 flex items-center justify-center">
    <section className="w-full max-w-md rounded-[24px] border bg-white p-6 space-y-5 shadow-sm">
      <Button variant="ghost" disabled={busy} onClick={onBack}>← Volver</Button>
      <div><p className="text-sm font-semibold text-primary">AntojosGo · {audience === 'restaurant' ? 'Restaurantes' : 'Clientes'}</p>
        <h1 className="mt-2 text-2xl font-bold">{mode === 'register' ? 'Crea tu cuenta' : 'Te damos la bienvenida'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{audience === 'restaurant' ? 'Crea tu cuenta personal para registrar y administrar tu restaurante.' : 'Tu cuenta personal para descubrir y guardar tus próximos antojos.'}</p></div>
      {!isSupabaseConfigured && <p role="status" className="text-sm">El servicio de cuentas está pendiente de configuración.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm">{notice}</p>}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && <div className="space-y-1"><Label htmlFor="account-name">Tu nombre</Label><Input id="account-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required disabled={busy} /></div>}
        <div className="space-y-1"><Label htmlFor="account-email">Correo electrónico</Label><Input id="account-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required disabled={busy} /></div>
        <div className="space-y-1"><Label htmlFor="account-password">Contraseña</Label><Input id="account-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required disabled={busy} />
          {mode === 'register' && <p className="text-xs text-muted-foreground">Al menos 10 caracteres. Puedes usar una frase fácil de recordar.</p>}
          <Button type="button" variant="ghost" size="sm" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Button></div>
        {mode === 'register' && <div className="space-y-1"><Label htmlFor="account-confirm">Confirmar contraseña</Label><Input id="account-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={128} required disabled={busy} /></div>}
        <Button className="w-full" disabled={busy || !isSupabaseConfigured} type="submit">{busy ? 'Un momento…' : mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</Button>
      </form>
      <Button className="w-full" variant="outline" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setNotice(''); setPassword(''); setConfirmPassword('') }}>{mode === 'login' ? 'No tengo cuenta · Registrarme' : 'Ya tengo cuenta · Iniciar sesión'}</Button>
      <p className="text-xs text-muted-foreground">El correo identifica tu cuenta. Tu nombre personal y el nombre comercial se guardan por separado.</p>
    </section>
  </main>
}
