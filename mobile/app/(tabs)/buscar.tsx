import { useCallback, useEffect, useRef, useState } from 'react'
import { router } from 'expo-router'
import MapView, { Marker } from 'react-native-maps'
import { Image, Linking, View } from 'react-native'
import { directionsUrl } from '../../../shared/contracts/branches'
import { useSession } from '../../src/session'
import { requestUserLocation, type UserCoords } from '../../src/location'
import { api } from '../../src/api'
import { getServerUrl } from '../../src/server'
import { mapsEnabled } from '../../src/maps'
import type { PublicCatalogItem } from '../../../modules/catalog/data/public-catalog'
import { Action, Card, Chip, Input, Loading, Message, Page, ScreenBoundary, Title, Txt, colors, spacing } from '../../src/ui'
import { Text } from 'react-native'
import { ALLERGEN_LABELS, ALLERGENS, DISH_TAGS, DISH_TAG_LABELS, type Allergen, type DishTag } from '../../../shared/contracts/menu'
import { RatingLine } from '../../src/reviews'
import { VoiceButton } from '../../src/voice-button'
import { hiddenIds, refreshHidden, useHiddenIds } from '../../src/hidden'
import { PRICE_RANGES, pickSurprise } from '../../../shared/contracts/catalog-query'

type Filters = { category: string; openNow: boolean; tags: DishTag[]; without: Allergen[]; price: number | null }
const noFilters: Filters = { category: '', openNow: false, tags: [], without: [], price: null }
const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v]

// Uncontrolled map: the camera moves only when results or the user location change, never on unrelated re-renders.
function regionFor(items: PublicCatalogItem[], coords: UserCoords | null) {
  const first = items.find((i) => i.latitude != null && i.longitude != null)
  return coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : first
      ? { latitude: first.latitude!, longitude: first.longitude!, latitudeDelta: 0.12, longitudeDelta: 0.12 }
      : { latitude: 14.8347, longitude: -91.518, latitudeDelta: 0.12, longitudeDelta: 0.12 }
}

export default function Discover() {
  const { ready, session } = useSession()
  const hidden = useHiddenIds()
  const lastSurprise = useRef<string | null>(null)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PublicCatalogItem[]>([])
  const [coords, setCoords] = useState<UserCoords | null>(null)
  const [gpsNote, setGpsNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const request = useRef(0)
  const active = useRef(true)
  const map = useRef<MapView>(null)
  const [filters, setFilters] = useState<Filters>(noFilters)
  const [showFilters, setShowFilters] = useState(false)
  const filtersRef = useRef<Filters>(noFilters)
  const [types, setTypes] = useState<string[]>([])
  useEffect(() => { api.listBusinessTypes().then(setTypes).catch(() => {}) }, [])
  const activeCount = (filters.category ? 1 : 0) + (filters.openNow ? 1 : 0) + (filters.price !== null ? 1 : 0) + filters.tags.length + filters.without.length

  const load = useCallback(async (text: string, location: UserCoords | null) => {
    const current = ++request.current
    if (!getServerUrl()) {
      setError('La búsqueda no está disponible en este momento.')
      setItems([])
      setLoading(false)
      return
    }
    setBusy(true)
    setError('')
    try {
      const f = filtersRef.current
      const range = f.price === null ? null : PRICE_RANGES[f.price] as { min?: number; max?: number }
      const base = { q: text, limit: 40, category: f.category || undefined, tags: f.tags, without: f.without, openNow: f.openNow, minPrice: range?.min, maxPrice: range?.max, hide: hiddenIds() }
      const result = await api.searchCatalog(location ? { ...base, lat: location.latitude, lng: location.longitude, radiusMeters: 50000 } : base)
      if (active.current && current === request.current) setItems(result.items)
    } catch (e) {
      if (active.current && current === request.current) { setError(e instanceof Error ? e.message : 'No pudimos cargar los restaurantes.'); setItems([]) }
    } finally {
      if (active.current && current === request.current) { setBusy(false); setLoading(false) }
    }
  }, [])

  useEffect(() => {
    active.current = true
    setGpsNote('Busca por platillo, restaurante o municipio. Puedes activar tu ubicación para buscar cerca.')
    void load('', null)
    return () => { active.current = false; request.current++ }
  }, [load])

  useEffect(() => { map.current?.animateToRegion(regionFor(items, coords)) }, [items, coords])
  // «No me interesa» list: load it per account, and search again when it changes.
  useEffect(() => { refreshHidden(Boolean(session)).catch(() => {}) }, [session?.user.id])
  const hiddenKey = hidden.join(',')
  const firstHidden = useRef(true)
  useEffect(() => { if (firstHidden.current) { firstHidden.current = false; return } void load(query, coords) }, [hiddenKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <Page tab><Loading /></Page>

  const mapRegion = regionFor(items, coords)
  const apply = (next: Filters) => { filtersRef.current = next; setFilters(next); void load(query, coords) }
  function surprise() {
    const pick = pickSurprise(items, lastSurprise.current)
    if (!pick) { setGpsNote('No hay opciones con esta búsqueda y estos filtros. Quita algún filtro y vuelve a intentar.'); return }
    lastSurprise.current = pick.id
    router.push({ pathname: '/sede/[id]', params: { id: pick.id, sorpresa: pick.dish ? `${pick.dish.name} (Q${pick.dish.price.toFixed(2)})` : '1' } })
  }

  return (
    <Page tab>
      <Title>Buscar antojos</Title>
      <Message>{gpsNote}</Message>
      <Message>{error}</Message>
      {error ? <Action title="Reintentar" onPress={() => load(query, coords)} disabled={busy} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input accessibilityLabel="Qué se te antoja" value={query} onChangeText={setQuery} placeholder="Ej. pepián, café…"
          editable={!busy} returnKeyType="search" onSubmitEditing={() => load(query, coords)} style={{ flex: 1 }} />
        <VoiceButton onText={t => { setQuery(t); void load(t, coords) }} onError={setGpsNote} />
        <Action title={busy ? '…' : 'Buscar'} onPress={() => load(query, coords)} disabled={busy} style={{ paddingHorizontal: spacing.lg }} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}><Action title={coords ? 'Cerca de mí ✓' : 'Cerca de mí'} secondary onPress={async () => {
        setBusy(true)
        const location = await requestUserLocation().catch(() => null)
        if (!active.current) return
        if (location) {
          setCoords(location)
          setGpsNote('Restaurantes ordenados por cercanía.')
          await load(query, location)
        } else {
          setGpsNote('No pudimos obtener tu ubicación. Puedes buscar por nombre o municipio.')
          setBusy(false)
        }
      }} disabled={busy} /></View>
        <View style={{ flex: 1 }}><Action title={`Filtros${activeCount ? ` (${activeCount})` : ''}`} secondary={!activeCount} onPress={() => setShowFilters(v => !v)} disabled={busy} /></View>
      </View>
      <Action title="🎲 Sorpréndeme" onPress={surprise} disabled={busy || loading} />
      {showFilters ? <Card>
        <Chip label="Abierto ahora" on={filters.openNow} onPress={() => apply({ ...filters, openNow: !filters.openNow })} disabled={busy} />
        <Txt variant="label">Precio</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PRICE_RANGES.map((r, i) => <Chip key={r.label} label={r.label} on={filters.price === i} disabled={busy} onPress={() => apply({ ...filters, price: filters.price === i ? null : i })} />)}</View>
        <Txt variant="label">Quiero</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{DISH_TAGS.map(t => <Chip key={t} label={DISH_TAG_LABELS[t]} on={filters.tags.includes(t)} disabled={busy} onPress={() => apply({ ...filters, tags: toggle(filters.tags, t) })} />)}</View>
        <Txt variant="label">Sin</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ALLERGENS.map(a => <Chip key={a} tone="red" label={ALLERGEN_LABELS[a]} on={filters.without.includes(a)} disabled={busy} onPress={() => apply({ ...filters, without: toggle(filters.without, a) })} />)}</View>
        {filters.without.length ? <Message>Ocultamos los platillos marcados con esos alérgenos. Si tu alergia es grave, confírmala con el restaurante.</Message> : null}
        <Txt variant="label">Tipo de negocio</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{types.map(c => <Chip key={c} label={c} on={filters.category === c} disabled={busy} onPress={() => apply({ ...filters, category: filters.category === c ? '' : c })} />)}</View>
        {activeCount ? <Action title="Quitar filtros" secondary onPress={() => apply(noFilters)} disabled={busy} /> : null}
      </Card> : null}
      {mapsEnabled ? <ScreenBoundary><View style={{ height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <MapView ref={map} style={{ flex: 1 }} initialRegion={mapRegion} showsPointsOfInterests={false} scrollEnabled={false} rotateEnabled={false} pitchEnabled={false}>
          {coords ? <Marker coordinate={coords} title="Tú" pinColor={colors.orange} /> : null}
          {items.filter((i) => i.latitude != null && i.longitude != null).map((item) => (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.latitude!, longitude: item.longitude! }}
              title={item.name}
              description={item.branch_name}
              onCalloutPress={() => router.push({ pathname: '/sede/[id]', params: { id: item.id } })}
            />
          ))}
        </MapView>
      </View></ScreenBoundary> : null}
      {loading ? <Loading /> : null}
      {!loading && !error && !items.length ? (
        <Message>No hay restaurantes publicados que coincidan. Prueba otro nombre o municipio.</Message>
      ) : null}
      {items.map((item) => (
        <Card key={item.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {item.logo_url ? <Image source={{ uri: item.logo_url }} accessibilityIgnoresInvertColors style={{ width: 56, height: 56, borderRadius: 28 }} /> : null}
            <View style={{ flex: 1 }}><Title>{item.name}</Title>{item.category ? <Txt variant="subhead">{item.category}</Txt> : null}<RatingLine rating={item.rating} /></View>
          </View>
          <Message>{item.branch_name} · {item.address}, {item.municipality}</Message>
          {item.description ? <Message>{item.description}</Message> : <Message>Sin información de descripción.</Message>}
          {item.dish ? <Message>{`${item.dish.name}: Q${item.dish.price.toFixed(2)}`}{filters.without.length && !item.dish.allergensDeclared ? '\n⚠️ Alérgenos sin declarar: confírmalo con el restaurante' : ''}</Message> : null}
          {item.openNow === true ? <Text style={{ color: colors.green, fontWeight: '700' }}>Abierto ahora</Text> : item.openNow === false ? <Txt variant="subhead">Cerrado ahora</Txt> : null}
          {item.distanceKm != null ? <Message>{item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m en línea recta` : `${item.distanceKm.toFixed(1)} km en línea recta`}</Message> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Action title="Ver sede" secondary onPress={() => router.push({ pathname: '/sede/[id]', params: { id: item.id } })} disabled={busy} /></View>
            {item.latitude != null && item.longitude != null ? <View style={{ flex: 1 }}><Action title="Cómo llegar" onPress={() => void Linking.openURL(directionsUrl(item.latitude!, item.longitude!))} /></View> : null}
          </View>
        </Card>
      ))}
    </Page>
  )
}