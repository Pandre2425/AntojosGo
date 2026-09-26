import { useEffect, useRef, useState } from 'react'
import { Redirect, router } from 'expo-router'
import { useSession } from '../src/session'
import { supabase } from '../src/supabase'
import { Action, Card, Field, Loading, Message, Page, Title } from '../src/ui'
import { createOwnedRestaurant, listOwnedRestaurants } from '../../modules/restaurants/data/owned-restaurants'
import { ensureAccountProfile } from '../../modules/accounts/data/account-profile'
import { displayNameSchema } from '../../shared/contracts/names'
import type { OwnedRestaurant } from '../../shared/contracts/restaurants'
export default function Restaurants() {
  const { session, ready } = useSession()
  const [rows, setRows] = useState<OwnedRestaurant[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true; setLoading(true); setError('')
    listOwnedRestaurants(session.user.id).then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    const displayName = session.user.user_metadata?.display_name
    if (displayNameSchema.safeParse(displayName).success) ensureAccountProfile(session.user.id, displayName).catch(() => { if (active) setError('Tu sesión está activa, pero no pudimos completar el perfil. Puedes reintentar.') })
    return () => { active = false }
  }, [session?.user.id, retry])
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />
  async function create() {
    if (lock.current) return
    const parsed = displayNameSchema.safeParse(name)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    lock.current = true; setBusy(true); setError('')
    try { await createOwnedRestaurant(session!.user.id, parsed.data); setName(''); setRetry(v => v + 1) }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <Page><Title>Mis restaurantes</Title><Message>{session.user.email}</Message>
    <Message>{error}</Message>{error && <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} disabled={busy} />}
    {loading ? <Loading /> : rows.length ? rows.map(row => <Card key={row.id}><Title>{row.name}</Title><Action title="Administrar negocio y sedes" onPress={() => router.push({ pathname: '/business/[id]', params: { id: row.id } })} disabled={busy} /></Card>) : <Message>Aún no tienes restaurantes registrados.</Message>}
    <Card><Field label="Nombre del nuevo restaurante" value={name} onChangeText={setName} maxLength={100} editable={!busy} /><Action title={busy ? 'Guardando…' : 'Registrar restaurante'} onPress={create} disabled={busy} /></Card>
    <Action title="Volver al inicio" secondary disabled={busy} onPress={() => router.replace('/home')} />
    <Action title="Cerrar sesión" secondary disabled={busy} onPress={async () => { if (lock.current) return; lock.current = true; setBusy(true); try { const result = await supabase!.auth.signOut(); if (result.error) setError('No pudimos cerrar sesión. Reintenta.') } catch { setError('No pudimos cerrar sesión.') } finally { lock.current = false; setBusy(false) } }} />
  </Page>
}