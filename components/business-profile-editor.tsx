'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { webApi } from '@/lib/web-api'
import { businessProfileSchema, type OwnedRestaurant } from '@/shared/contracts/restaurants'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

export default function BusinessProfileEditor({ userId, restaurant, onSaved, onClose }: {
  userId: string; restaurant: OwnedRestaurant; onSaved: (restaurant: OwnedRestaurant) => void; onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    webApi.getRestaurant(restaurant.id).then((profile) => {
      if (active) { setName(profile.name); setDescription(profile.description || ''); setReady(true) }
    }).catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, restaurant.id, retry])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(''); setNotice('')
    const parsed = businessProfileSchema.safeParse({ name, description })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    setBusy(true)
    try {
      const saved = await webApi.updateRestaurant(restaurant.id, parsed.data)
      setName(saved.name); setDescription(saved.description || '')
      onSaved(saved); setNotice('Perfil guardado.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos guardar el perfil.') }
    finally { setBusy(false) }
  }

  return <section className="rounded-2xl border bg-white p-5 space-y-4">
    <Button variant="ghost" onClick={onClose} disabled={busy}>← Mis restaurantes</Button>
    <h2 className="text-xl font-semibold">Perfil de {restaurant.name}</h2>
    <p className="text-sm text-muted-foreground">Presenta tu negocio. El nombre y la descripción se muestran a los clientes en las sedes publicadas.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {loading ? <p role="status">Cargando perfil…</p> : !ready ? <Button onClick={() => setRetry((v) => v + 1)}>Reintentar carga</Button> :
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="profile-business-name">Nombre comercial</Label><Input id="profile-business-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required disabled={busy}/></div>
        <div className="space-y-2"><Label htmlFor="profile-description">Descripción del restaurante</Label><Textarea id="profile-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={5} disabled={busy} placeholder="Cuéntales qué hace especial a tu restaurante"/><p className="text-sm text-muted-foreground">{description.length}/2000 caracteres</p></div>
        <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar perfil'}</Button>
      </form>}
  </section>
}
