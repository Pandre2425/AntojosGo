'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { authErrorMessage, newPasswordSchema } from '@/lib/auth-validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Read before the Supabase client consumes the link's #access_token (it clears the hash after a network round trip).
const linkHash = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.hash.slice(1))

type State = 'loading' | 'confirmed' | 'reset' | 'done' | 'invalid'

/** Landing page for the email links: account confirmed, or choose a new password. */
export default function AccountLinkPage() {
  const [state, setState] = useState<State>('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const db = getSupabase()
    if (!db || linkHash.get('error_code') || !linkHash.get('access_token')) { setState('invalid'); return }
    db.auth.getSession().then(({ data }) => setState(!data.session ? 'invalid' : linkHash.get('type') === 'recovery' ? 'reset' : 'confirmed'))
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    setBusy(true)
    const { error } = await getSupabase()!.auth.updateUser({ password: parsed.data.password })
    setBusy(false)
    if (error) { setError(authErrorMessage(error)); return }
    setPassword(''); setConfirmPassword(''); setState('done')
  }

  const [title, text] = {
    loading: ['Un momento…', ''],
    confirmed: ['Correo confirmado', 'Tu cuenta está lista. Ya puedes iniciar sesión en la app o en la web.'],
    reset: ['Crea tu contraseña nueva', 'Usa al menos 10 caracteres. Puedes usar una frase fácil de recordar.'],
    done: ['Contraseña actualizada', 'Ya puedes iniciar sesión con tu contraseña nueva en la app o en la web.'],
    invalid: ['El enlace no es válido', 'Venció o ya se usó. Pide otro desde «¿Olvidaste tu contraseña?» o «Reenviar confirmación» al iniciar sesión.'],
  }[state]

  return <main className="min-h-dvh bg-background px-4 py-8 flex items-center justify-center">
    <section className="w-full max-w-md rounded-[24px] border bg-white p-6 space-y-5 shadow-sm" aria-live="polite">
      <div><p className="text-sm font-semibold text-primary">AntojosGo</p>
        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
        {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}</div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {state === 'reset' && <form onSubmit={save} className="space-y-4">
        <div className="space-y-1"><Label htmlFor="new-password">Contraseña nueva</Label><Input id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required disabled={busy} /></div>
        <div className="space-y-1"><Label htmlFor="new-password-confirm">Confirmar contraseña</Label><Input id="new-password-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={128} required disabled={busy} /></div>
        <Button type="button" variant="ghost" size="sm" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Button>
        <Button className="w-full" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</Button>
      </form>}
      {state !== 'loading' && state !== 'reset' && <a href="/" className="block rounded-lg bg-[#BD481F] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#9a3a18]">Ir a AntojosGo</a>}
    </section>
  </main>
}
