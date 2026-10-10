import { useEffect, useRef, useState } from 'react'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { Action, Card, Field, Loading, Message, Page, ScreenBoundary, Title, colors } from '../../src/ui'
import Branches from '../../src/branches'
import { api } from '../../src/api'
import { Image, Text, View } from 'react-native'
import { businessProfileSchema, type BrandImageKind } from '../../../shared/contracts/restaurants'
import { normalize } from '../../../shared/contracts/assistant'
import { Chip } from '../../src/ui'
import { pickAndUploadRestaurantImage } from '../../src/dish-photo'
export default function Business() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, ready } = useSession()
  const [form, setForm] = useState({ name: '', description: '', category: '' })
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [types, setTypes] = useState<string[]>([])
  const [images, setImages] = useState<Record<BrandImageKind, string | null>>({ logo: null, cover: null })
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true; setLoaded(false); setError('')
    api.getRestaurant(id).then(data => { if (active) { setForm({ name: data.name, description: data.description || '', category: data.category || '' }); setImages({ logo: data.logo_url, cover: data.cover_url }); setLoaded(true) } }).catch(() => { if (active) setError('No pudimos cargar el negocio. Reintenta.') })
    api.listBusinessTypes().then(t => { if (active) setTypes(t) }).catch(() => {}) // suggestions are optional
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
  async function changeImage(kind: BrandImageKind, remove = false) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      if (remove) { await api.removeRestaurantImage(id, kind); setImages(v => ({ ...v, [kind]: null })); setError('Imagen quitada.') }
      else if (await pickAndUploadRestaurantImage(id, kind)) { const p = await api.getRestaurant(id); setImages({ logo: p.logo_url, cover: p.cover_url }); setError(kind === 'logo' ? 'Logo guardado.' : 'Foto guardada.') }
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar la imagen.') }
    finally { lock.current = false; setBusy(false) }
  }
  // Suggestions under the field: types that contain what was typed (all when empty), excluding an exact match.
  const typed = normalize(form.category)
  const suggestions = types.filter(t => normalize(t) !== typed && (!typed || normalize(t).includes(typed))).slice(0, 8)
  return <Page><Title>Mi negocio</Title><Message>{error}</Message>{!loaded ? error ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : <Loading /> : <>
    <Card>
      {(['logo', 'cover'] as const).map(kind => <View key={kind} style={{ gap: 8 }}>
        <Text style={{ color: colors.green, fontSize: 16, fontWeight: '700' }}>{kind === 'logo' ? 'Logo' : 'Foto del restaurante'}</Text>
        {images[kind] ? <Image source={{ uri: images[kind]! }} accessibilityLabel={kind === 'logo' ? 'Logo actual' : 'Foto actual'} style={kind === 'logo' ? { width: 96, height: 96, borderRadius: 48 } : { width: '100%', aspectRatio: 16 / 9, borderRadius: 14 }} />
          : <Text style={{ color: '#5F6B64' }}>{kind === 'logo' ? 'Sin logo todavía.' : 'Sin foto. Sube la fachada, el salón o tu mejor platillo.'}</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Action title={images[kind] ? 'Cambiar' : 'Subir'} secondary disabled={busy} onPress={() => void changeImage(kind)} /></View>
          {images[kind] ? <View style={{ flex: 1 }}><Action title="Quitar" secondary disabled={busy} onPress={() => void changeImage(kind, true)} /></View> : null}
        </View>
      </View>)}
    </Card>
    <Card><Field label="Nombre comercial" value={form.name} onChangeText={name => setForm(v => ({ ...v, name }))} maxLength={100} editable={!busy} />
      <Field label="Tipo de negocio" placeholder="Ej. Pizzería, Pupusería, Cafetería" value={form.category} onChangeText={category => setForm(v => ({ ...v, category }))} maxLength={60} editable={!busy} autoCorrect={false} />
      {suggestions.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{suggestions.map(t => <Chip key={t} label={t} on={false} disabled={busy} onPress={() => setForm(v => ({ ...v, category: t }))} />)}</View> : null}
      <Field label="Descripción" placeholder="Ej. Pizzas artesanales al horno de leña. Ambiente familiar y servicio a domicilio." value={form.description} onChangeText={description => setForm(v => ({ ...v, description }))} maxLength={2000} multiline editable={!busy} />
      <Text style={{ color: '#5F6B64' }}>{form.description.length}/2000</Text>
      <Action title={busy ? 'Guardando…' : 'Guardar perfil'} onPress={save} disabled={busy} /></Card>
    <Action title="Administrar menú" secondary onPress={() => router.push({ pathname: '/menu/[id]', params: { id } })} disabled={busy} />
    <ScreenBoundary><Branches restaurantId={id} /></ScreenBoundary>
  </>}</Page>
}
