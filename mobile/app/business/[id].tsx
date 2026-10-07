import { useEffect, useRef, useState } from 'react'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { Action, Card, Field, Loading, Message, Page, ScreenBoundary, Title, colors } from '../../src/ui'
import Branches from '../../src/branches'
import { api } from '../../src/api'
import { Pressable, Text, View } from 'react-native'
import { businessProfileSchema, RESTAURANT_CATEGORIES } from '../../../shared/contracts/restaurants'
export default function Business() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, ready } = useSession()
  const [form, setForm] = useState({ name: '', description: '', category: '' })
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true; setLoaded(false); setError('')
    api.getRestaurant(id).then(data => { if (active) { setForm({ name: data.name, description: data.description || '', category: data.category || '' }); setLoaded(true) } }).catch(() => { if (active) setError('No pudimos cargar el negocio. Reintenta.') })
    return () => { active = false }
  }, [id, session?.user.id, retry])
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />
  async function save() {
    if (lock.current) return
    const parsed = businessProfileSchema.safeParse({ ...form, category: form.category || null })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    lock.current = true; setBusy(true); setError('')
    try { await api.updateRestaurant(id, parsed.data); setError('Perfil guardado.') }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <Page><Title>Mi negocio</Title><Message>{error}</Message>{!loaded ? error ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : <Loading /> : <>
    <Card><Field label="Nombre comercial" value={form.name} onChangeText={name => setForm(v => ({ ...v, name }))} maxLength={100} editable={!busy} /><Field label="Descripción" value={form.description} onChangeText={description => setForm(v => ({ ...v, description }))} maxLength={2000} multiline editable={!busy} /><Text style={{ color: colors.green, fontSize: 16 }}>Tipo de comida</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{RESTAURANT_CATEGORIES.map(c => { const on = form.category === c; return <Pressable key={c} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: busy }} disabled={busy} onPress={() => setForm(v => ({ ...v, category: on ? '' : c }))} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.green, backgroundColor: on ? colors.green : 'white', minHeight: 44, justifyContent: 'center' }}><Text style={{ color: on ? 'white' : colors.green }}>{c}</Text></Pressable> })}</View><Action title={busy ? 'Guardando…' : 'Guardar perfil'} onPress={save} disabled={busy} /></Card>
    <Action title="Administrar menú" secondary onPress={() => router.push({ pathname: '/menu/[id]', params: { id } })} disabled={busy} />
    <ScreenBoundary><Branches restaurantId={id} /></ScreenBoundary>
  </>}</Page>
}
