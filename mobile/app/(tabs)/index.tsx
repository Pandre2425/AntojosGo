import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { router } from 'expo-router'
import { api } from '../../src/api'
import { mapsEnabled } from '../../src/maps'
import { NotificationsBell } from '../../src/notifications'
import { VoiceButton } from '../../src/voice-button'
import { Action, Input, Page, ScreenBoundary, Title, Txt, colors, radius, spacing } from '../../src/ui'
import { HOME_OPTIONS, type HomeOption } from '../../../shared/contracts/home'
import type { PublicCatalogItem } from '../../../modules/catalog/data/public-catalog'
import { t } from '../../../shared/i18n'

const ask = (q: string) => router.navigate({ pathname: '/assistant', params: { q } })

/** Region that shows every branch (Quetzaltenango when there are none). */
function regionFor(points: { latitude: number; longitude: number }[]) {
  if (!points.length) return { latitude: 14.8347, longitude: -91.518, latitudeDelta: 0.12, longitudeDelta: 0.12 }
  const lats = points.map(p => p.latitude), lngs = points.map(p => p.longitude)
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.03), longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.03) }
}

/** Home: ask the assistant, pick a popular craving, or browse the map of registered branches. */
export default function Home() {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<HomeOption[]>(HOME_OPTIONS.slice(0, 8))
  const [branches, setBranches] = useState<PublicCatalogItem[] | null>(null)
  useEffect(() => {
    api.popularOptions().then(setOptions).catch(() => {}) // default order already shown
    api.searchCatalog({ q: '', limit: 50 }).then(r => setBranches(r.items)).catch(() => setBranches([]))
  }, [])
  const points = (branches ?? []).filter(b => b.latitude != null && b.longitude != null)
  const submit = () => { if (query.trim()) { ask(query.trim()); setQuery('') } }

  return <Page tab>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View style={{ flex: 1 }}><Title>{t('¿Qué estás buscando?')}</Title></View>
      <NotificationsBell />
    </View>
    <Txt variant="subhead">{t('Escríbelo como se lo dirías a un amigo. El asistente te dice dónde encontrarlo.')}</Txt>
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Input accessibilityLabel={t('¿Qué estás buscando?')} placeholder={t('Algo calientito, una pizza…')} value={query} onChangeText={setQuery}
        maxLength={200} returnKeyType="search" onSubmitEditing={submit} style={{ flex: 1 }} />
      <VoiceButton onText={text => ask(text)} />
      <Action title={t('Preguntar')} onPress={submit} disabled={!query.trim()} style={{ paddingHorizontal: spacing.lg }} />
    </View>

    <Txt variant="headline" accessibilityRole="header">{t('Lo más buscado')}</Txt>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map(o => <Pressable key={o.concept} accessibilityRole="button" accessibilityLabel={t(o.title)} onPress={() => ask(o.query)}
        style={({ pressed }) => ({ width: '23%', flexGrow: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md,
          borderWidth: 1, borderColor: pressed ? colors.green : colors.border, backgroundColor: pressed ? colors.cream : colors.white })}>
        <Text style={{ fontSize: 30 }} importantForAccessibility="no">{o.symbol}</Text>
        <Text style={{ color: colors.green, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xs }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{t(o.title)}</Text>
      </Pressable>)}
    </View>

    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Txt variant="headline" accessibilityRole="header">{t('Restaurantes en el mapa')}</Txt>
      {branches ? <Txt variant="subhead">{branches.length === 1 ? t('1 sede') : t('{n} sedes', { n: branches.length })}</Txt> : null}
    </View>
    {mapsEnabled && branches?.length ? <ScreenBoundary><View style={{ height: 300, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      {/* Panning disabled so a finger on the map scrolls the page; pinch zoom and pins still work. */}
      <MapView style={{ flex: 1 }} initialRegion={regionFor(points as { latitude: number; longitude: number }[])} showsPointsOfInterests={false}
        scrollEnabled={false} rotateEnabled={false} pitchEnabled={false}>
        {points.map(b => <Marker key={b.id} coordinate={{ latitude: b.latitude!, longitude: b.longitude! }} title={b.name} description={t('{branch} · toca para ver', { branch: b.branch_name })}
          pinColor={colors.orange} onCalloutPress={() => router.push({ pathname: '/sede/[id]', params: { id: b.id } })} />)}
      </MapView>
    </View></ScreenBoundary> : branches && !branches.length ? <Txt variant="subhead">{t('Aún no hay sedes publicadas.')}</Txt> : null}
    <Action title={t('Ver la lista con filtros')} secondary onPress={() => router.navigate('/buscar')} />
  </Page>
}
