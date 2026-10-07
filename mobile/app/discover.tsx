import { useCallback, useEffect, useRef, useState } from 'react'
import { Redirect, router } from 'expo-router'
import MapView, { Marker } from 'react-native-maps'
import { View } from 'react-native'
import { useSession } from '../src/session'
import { requestUserLocation, type UserCoords } from '../src/location'
import { api } from '../src/api'
import { getServerUrl } from '../src/server'
import { mapsEnabled } from '../src/maps'
import type { PublicCatalogItem } from '../../modules/catalog/data/public-catalog'
import { Action, Card, Field, Loading, Message, Page, ScreenBoundary, Title, colors } from '../src/ui'

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
  const { session, ready } = useSession()
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
      const result = await api.searchCatalog(location
        ? { q: text, lat: location.latitude, lng: location.longitude, radiusMeters: 50000, limit: 40 }
        : { q: text, limit: 40 })
      if (active.current && current === request.current) setItems(result.items)
    } catch (e) {
      if (active.current && current === request.current) { setError(e instanceof Error ? e.message : 'No pudimos cargar los restaurantes.'); setItems([]) }
    } finally {
      if (active.current && current === request.current) { setBusy(false); setLoading(false) }
    }
  }, [])

  useEffect(() => {
    if (!session) return
    active.current = true
    setGpsNote('Busca por platillo, restaurante o municipio. Puedes activar tu ubicación para buscar cerca.')
    void load('', null)
    return () => { active.current = false; request.current++ }
  }, [session?.user.id, load])

  useEffect(() => { map.current?.animateToRegion(regionFor(items, coords)) }, [items, coords])

  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />

  const mapRegion = regionFor(items, coords)

  return (
    <Page>
      <Title>Buscar antojos</Title>
      <Message>{gpsNote}</Message>
      <Message>{error}</Message>
      {error ? <Action title="Reintentar" onPress={() => load(query, coords)} disabled={busy} /> : null}
      <Field
        label="Qué se te antoja"
        value={query}
        onChangeText={setQuery}
        placeholder="Ej. pepián, zona 3, café…"
        editable={!busy}
        returnKeyType="search"
        onSubmitEditing={() => load(query, coords)}
      />
      <Action title={busy ? 'Buscando…' : 'Buscar'} onPress={() => load(query, coords)} disabled={busy} />
      <Action title="Usar mi ubicación" secondary onPress={async () => {
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
      }} disabled={busy} />
      {mapsEnabled ? <ScreenBoundary><View style={{ height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#B9C5BC' }}>
        <MapView ref={map} style={{ flex: 1 }} initialRegion={mapRegion} showsPointsOfInterests={false}>
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
          <Title>{item.name}</Title>
          <Message>{item.branch_name} · {item.address}, {item.municipality}</Message>
          {item.description ? <Message>{item.description}</Message> : <Message>Sin información de descripción.</Message>}
          {item.distanceKm != null ? <Message>{item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`}</Message> : null}
          <Action title="Ver sede" onPress={() => router.push({ pathname: '/sede/[id]', params: { id: item.id } })} disabled={busy} />
        </Card>
      ))}
      <Action title="Volver al inicio" secondary onPress={() => router.replace('/home')} disabled={busy} />
    </Page>
  )
}