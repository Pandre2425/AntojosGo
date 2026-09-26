import { Redirect, router } from 'expo-router'
import { useSession } from '../src/session'
import { Action, Card, Loading, Message, Page, Title } from '../src/ui'

export default function Home() {
  const { session, ready } = useSession()
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />
  return (
    <Page>
      <Title>AntojosGo</Title>
      <Message>Elige cómo quieres usar la app.</Message>
      <Card>
        <Title>Comensal</Title>
        <Message>Busca sedes publicadas cerca de ti. Sin datos inventados.</Message>
        <Action title="Buscar antojos" onPress={() => router.push('/discover')} />
      </Card>
      <Card>
        <Title>Representante</Title>
        <Message>Administra tu negocio y sedes.</Message>
        <Action title="Mis restaurantes" onPress={() => router.push('/restaurants')} />
      </Card>
    </Page>
  )
}
