'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { webApi } from '@/lib/web-api'
import type { OwnedRestaurant } from '@/shared/contracts/restaurants'
import { getSupabase } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import dynamic from 'next/dynamic'
import ModuleBoundary, { ModuleLoading } from './module-boundary'

const BusinessProfileEditor = dynamic(() => import('./business-profile-editor'), { loading: ModuleLoading })

const RestaurantBranches = dynamic(() => import('./restaurant-branches'), { loading: ModuleLoading })
const RestaurantMenu = dynamic(() => import('./restaurant-menu'), { loading: ModuleLoading })

export default function RestaurantAccountHome({ user }: { user: User }) {
  const [restaurants, setRestaurants] = useState<OwnedRestaurant[]>([])
  const [displayName, setDisplayName] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [notice, setNotice] = useState('')
  const [branchBusiness, setBranchBusiness] = useState<OwnedRestaurant | null>(null)
  const [selected, setSelected] = useState<OwnedRestaurant | null>(null)
  const [menuBusiness, setMenuBusiness] = useState<OwnedRestaurant | null>(null)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    // Personal profile and restaurant list fail independently.
    webApi.ensureProfile(user.user_metadata.display_name || 'Mi cuenta')
      .then((profile) => { if (active) setDisplayName(profile.display_name) })
      .catch(() => { if (active) setDisplayName('Mi cuenta') })
    webApi.listRestaurants().then((rows) => { if (active) setRestaurants(rows) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.id, retry])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const restaurant = await webApi.createRestaurant(name)
      setRestaurants((rows) => rows.some((row) => row.id === restaurant.id) ? rows : [...rows, restaurant])
      setName(''); setNotice('Restaurante registrado y vinculado a tu cuenta.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos registrar el restaurante.') }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true)
    try { const result = await getSupabase()?.auth.signOut(); if (result?.error) throw result.error }
    catch { setError('No pudimos cerrar la sesión. Intenta nuevamente.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-dvh bg-background p-4 sm:p-8">
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-primary font-semibold">AntojosGo · Restaurantes</p><h1 className="text-2xl font-bold">Hola, {displayName || 'bienvenido'}</h1><p className="text-sm text-muted-foreground">{user.email}</p></div><Button variant="outline" disabled={busy} onClick={logout}>Cerrar sesión</Button></header>
      <a href="/" className="inline-block text-sm underline">Ir al modo cliente</a>
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4"><p>{error}</p><Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>Reintentar carga</Button></div>}
      {notice && <p role="status" className="rounded-xl bg-green-50 p-4">{notice}</p>}
      {menuBusiness ? <ModuleBoundary key={menuBusiness.id} name="el menú" onExit={() => setMenuBusiness(null)}><RestaurantMenu restaurantId={menuBusiness.id} restaurantName={menuBusiness.name} onClose={() => setMenuBusiness(null)}/></ModuleBoundary> : branchBusiness ? <ModuleBoundary key={branchBusiness.id} name="las sedes" onExit={() => setBranchBusiness(null)}><RestaurantBranches restaurantId={branchBusiness.id} onClose={() => setBranchBusiness(null)}/></ModuleBoundary> : selected ? <ModuleBoundary key={selected.id} name="el perfil comercial" onExit={() => setSelected(null)}><BusinessProfileEditor userId={user.id} restaurant={selected} onClose={() => setSelected(null)} onSaved={(saved) => { setRestaurants((rows) => rows.map((row) => row.id === saved.id ? saved : row)); setSelected(saved) }}/></ModuleBoundary> : <>
      <section className="rounded-[24px] border bg-white p-5 space-y-4"><h2 className="text-xl font-semibold">Mis restaurantes</h2>
        {loading ? <p role="status">Cargando tus restaurantes…</p> : restaurants.length ? <ul className="space-y-3">{restaurants.map((restaurant) => <li key={restaurant.id} className="rounded-xl border p-4"><h3 className="font-semibold">{restaurant.name}</h3><Button variant="outline" className="mt-3" onClick={() => setSelected(restaurant)}>Editar perfil</Button><Button variant="outline" className="mt-3 ml-2" onClick={() => setBranchBusiness(restaurant)}>Sedes</Button><Button variant="outline" className="mt-3 ml-2" onClick={() => setMenuBusiness(restaurant)}>Menú</Button></li>)}</ul> : !error && <p className="text-sm text-muted-foreground">Tu cuenta está lista. Registra tu primer restaurante para continuar.</p>}
      </section>
      <section className="rounded-[24px] border bg-white p-5 space-y-4"><h2 className="text-xl font-semibold">Registrar restaurante</h2><form onSubmit={create} className="space-y-3"><Label htmlFor="business-name">Nombre del restaurante</Label><Input id="business-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required disabled={busy} placeholder="Ej. Antojitos de Guatemala"/><Button type="submit" disabled={busy || loading}>{busy ? 'Guardando…' : 'Guardar restaurante'}</Button></form><p className="text-sm text-muted-foreground">El restaurante permanece privado mientras completas su perfil. Publica cada sede desde «Sedes» cuando tenga su ubicación.</p></section>
      </>}
    </div>
  </main>
}
