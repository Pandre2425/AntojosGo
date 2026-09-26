import { useEffect, useState } from 'react'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { getSupabase } from '../../src/supabase'
import { getPublishedBranch, type PublicCatalogItem } from '../../../modules/catalog/data/public-catalog'
import { Action, Card, Loading, Message, Page, Title } from '../../src/ui'

export default function SedeDetail() {
  const { session, ready } = useSession()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [item, setItem] = useState<PublicCatalogItem | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session || !id) return
    let active = true
    setLoading(true)
    setError('')
    const client = getSupabase()
    if (!client) {
      setError('Falta la configuración pública de Supabase.')
      setLoading(false)
      return
    }
    getPublishedBranch(client, String(id))
      .then((row) => { if (active) setItem(row) })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'No pudimos cargar la sede.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session?.user.id, id])

  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />

  return (
    <Page>
      <Title>Detalle de sede</Title>
      {loading ? <Loading /> : null}
      <Message>{error}</Message>
      {!loading && !item && !error ? <Message>Esta sede no está publicada o no existe.</Message> : null}
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
      <Action title="Volver a buscar" secondary onPress={() => router.back()} />
    </Page>
  )
}