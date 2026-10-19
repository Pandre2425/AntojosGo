import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import MapView from 'react-native-maps'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { api } from '../../src/api'
import { branchLocationSchema, type BranchLocation, type RestaurantBranch } from '../../../shared/contracts/branches'
import { useSession } from '../../src/session'
import { requestUserLocation } from '../../src/location'
import { mapsEnabled } from '../../src/maps'
import { Action, Loading, Message, Page, ScreenBoundary, Title, colors } from '../../src/ui'
import { t } from '../../../shared/i18n'
export default function Location() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, ready } = useSession()
  const [branch, setBranch] = useState<RestaurantBranch | null>(null)
  const [point, setPoint] = useState<BranchLocation | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const [moving, setMoving] = useState(false)
  const [locating, setLocating] = useState(false)
  const lock = useRef(false)
  const map = useRef<MapView>(null)
  useEffect(() => {
    if (!session) return
    let active = true; setError(''); setBranch(null)
    api.getBranch(id).then(data => { if (active) { setBranch(data); setPoint(data.latitude !== null && data.longitude !== null ? { latitude: data.latitude, longitude: data.longitude } : null) } }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id, session?.user.id, retry])
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/account" />
  async function save() {
    if (lock.current || !branch) return
    const parsed = branchLocationSchema.safeParse(point)
    if (!parsed.success) { setError(t('Mueve el mapa y selecciona un punto.')); return }
    lock.current = true; setBusy(true); setError('')
    try { await api.saveLocation(branch.id, parsed.data); setError(t('Ubicación guardada para esta sede.')) }
    catch (e) { setError(e instanceof Error ? e.message : t('No pudimos guardar.')) }
    finally { lock.current = false; setBusy(false) }
  }
  // Works even when map tiles/gestures fail (e.g. no Maps key) and for users who can't drag precisely.
  async function pickCurrent() {
    setLocating(true); setError('')
    const coords = await requestUserLocation().finally(() => setLocating(false))
    if (!coords) { setError(t('No pudimos obtener tu ubicación. Revisa el permiso o mueve el mapa.')); return }
    setPoint(coords)
    map.current?.animateToRegion({ ...coords, latitudeDelta: 0.005, longitudeDelta: 0.005 })
  }
  return <Page><Title>{t('Ubicación de la sede')}</Title><Message>{branch?.name}</Message><Message>{error}</Message>{!branch ? error ? <Action title={t('Reintentar')} onPress={() => setRetry(v => v + 1)} /> : <Loading /> : <>
    {mapsEnabled ? <><Message>{t('Mueve el mapa hasta que la punta del pin quede en la entrada de tu restaurante. Acerca para ajustar el lugar.')}</Message>
    <ScreenBoundary><View style={{ height: 400, borderRadius: 20, overflow: 'hidden' }} pointerEvents={busy ? 'none' : 'auto'}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={{ latitude: branch.latitude ?? 15.5, longitude: branch.longitude ?? -90.25, latitudeDelta: branch.latitude === null ? 5 : 0.005, longitudeDelta: branch.longitude === null ? 5 : 0.005 }} showsPointsOfInterests={false} showsUserLocation={false} onRegionChange={() => setMoving(true)} onRegionChangeComplete={(region, details) => { setMoving(false); if (details.isGesture) { setPoint({ latitude: region.latitude, longitude: region.longitude }); setError('') } }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', width: 32, height: 44, transform: [{ translateX: -16 }, { translateY: -44 }] }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.orange, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' }} /></View>
        <View style={{ position: 'absolute', bottom: 0, left: 6, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.orange }} />
      </View>
    </View></ScreenBoundary></> : <Message>{t('Párate en la entrada de tu restaurante y usa tu ubicación actual. También puedes fijarla desde la web de restaurantes.')}</Message>}
    <Message>{point ? t('Punto seleccionado: {lat}, {lng}. Confirma antes de guardar.', { lat: point.latitude.toFixed(5), lng: point.longitude.toFixed(5) }) : mapsEnabled ? t('Mueve el mapa para elegir el punto.') : t('Aún no hay un punto seleccionado.')}</Message>
    <Action title={locating ? t('Buscando ubicación…') : t('Usar mi ubicación actual')} secondary onPress={pickCurrent} disabled={busy || locating} />
    <Action title={busy ? t('Guardando…') : t('Confirmar y guardar ubicación')} onPress={save} disabled={busy || locating || moving || !point} />
  </>}</Page>
}
