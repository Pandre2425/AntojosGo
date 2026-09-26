import { useCallback, useEffect, useState } from 'react'
import { Redirect, router } from 'expo-router'
import MapView, { Marker } from 'react-native-maps'
import { View } from 'react-native'
import { useSession } from '../src/session'
import { getSupabase } from '../src/supabase'
import { requestUserLocation, type UserCoords } from '../src/location'
import { listPublishedCatalog, type PublicCatalogItem } from '../../modules/catalog/data/public-catalog'
import { Action, Card, Field, Loading, Message, Page, Title, colors } from '../src/ui'

export default function Discover() {
  const { session, ready } = useSession()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PublicCatalogItem[]>([])
  const [coords, setCoords] = useState<UserCoords | null>(null)
  const [gpsNote, setGpsNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (text: string, location: UserCoords | null) => {
    const client = getSupabase()
    if (!client) {
      setError('Falta la configuración pública de Supabase. Revisa mobile/.env.local.')
      setItems([])
      return
    }
    setBusy(true)
    setError('')
    try {
      const rows = await listPublishedCatalog(client, {
        query: text,
        limit: 40,
        location: location
          ? { latitude: location.latitude, longitude: location.longitude, radiusKm: 50 }
          : undefined,
      })
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar el catálogo.')
      setItems([])
    } finally {
      setBusy(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    let active = true
    ;(async () => {
      const location = await requestUserLocation()
      if (!active) return
      if (location) {
        setCoords(location)
        setGpsNote('Ordenado por cercanía (GPS).')
      } else {
        setGpsNote('Sin GPS: muestra sedes publicadas. Puedes buscar por municipio o nombre.')
      }
      await load('', location)
    })()
    return () => { active = false }
  }, [session?.user.id, load])

  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />

  const mapRegion = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : items.find((i) => i.latitude != null && i.longitude != null)
      ? {
          latitude: items.find((i) => i.latitude != null)!.latitude!,
          longitude: items.find((i) => i.longitude != null)!.longitude!,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }
      : { latitude: 14.8347, longitude: -91.518, latitudeDelta: 0.12, longitudeDelta: 0.12 }

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
        const location = await requestUserLocation()
        if (location) {
          setCoords(location)
          setGpsNote('Ordenado por cercanía (GPS).')
          await load(query, location)
        } else {
          setGpsNote('Permiso de ubicación denegado. Busca por texto o municipio.')
          setBusy(false)
        }
      }} disabled={busy} />
      <View style={{ height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#B9C5BC' }}>
        <MapView style={{ flex: 1 }} region={mapRegion}>
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
      </View>
      {loading ? <Loading /> : null}
      {!loading && !items.length ? (
        <Message>No hay sedes publicadas que coincidan. Cuando un dueño publique, aparecerán aquí.</Message>
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
