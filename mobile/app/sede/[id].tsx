import { useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { api } from '../../src/api'
import { ApiError } from '../../../lib/api-client'
import type { PublicCatalogItem, PublicDish } from '../../../modules/catalog/data/public-catalog'
import { Action, Card, Loading, Message, Page, Title } from '../../src/ui'

export default function SedeDetail() {
  const { session, ready } = useSession()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<{ branch: PublicCatalogItem; menu: PublicDish[] } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!session || !id) return
    let active = true
    setLoading(true); setError('')
    api.getPublicBranch(String(id))
      .then((result) => { if (active) setData(result) })
      .catch((e) => { if (active) { setData(null); setError(e instanceof ApiError && e.status === 404 ? 'Esta sede no está publicada o no existe.' : e instanceof Error ? e.message : 'No pudimos cargar la sede.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session?.user.id, id, retry])

  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />
  const item = data?.branch
  return (
    <Page>
      <Title>Detalle de sede</Title>
      {loading ? <Loading /> : null}
      <Message>{error}</Message>
      {error && !loading ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : null}
      {item ? (
        <Card>
          <Title>{item.name}</Title>
          <Message>Sede: {item.branch_name}</Message>
          <Message>{item.address}, {item.municipality}, {item.department}</Message>
          {item.description ? <Message>{item.description}</Message> : <Message>Sin información de descripción.</Message>}
          {item.latitude != null && item.longitude != null ? (
            <Message>Ubicación: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Message>
          ) : (
            <Message>Sin información de coordenadas.</Message>
          )}
        </Card>
      ) : null}
      {data ? (
        <Card>
          <Title>Menú</Title>
          {data.menu.length === 0 ? <Message>Este restaurante aún no ha publicado su menú.</Message> : data.menu.map((dish) => (
            <View key={dish.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              {dish.image_url ? <Image source={{ uri: dish.image_url }} accessibilityLabel={`Foto de ${dish.name}`} style={{ width: 72, height: 72, borderRadius: 12 }} /> : null}
              <View style={{ flex: 1 }}><Message>{dish.name} · Q{dish.price.toFixed(2)}{dish.category ? ` · ${dish.category}` : ''}{dish.is_available ? '' : ' · Agotado'}{dish.description ? `\n${dish.description}` : ''}</Message></View>
            </View>
          ))}
        </Card>
      ) : null}
      <Action title="Volver a buscar" secondary onPress={() => router.back()} />
    </Page>
  )
}
