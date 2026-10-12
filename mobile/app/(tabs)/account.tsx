import { useSession } from '../../src/session'
import { AccessForm } from '../../src/access-form'
import { MyRestaurants } from '../../src/my-restaurants'
import { Loading, Page } from '../../src/ui'

export default function Account() {
  const { session, ready } = useSession()
  if (!ready) return <Page tab><Loading /></Page>
  return session ? <MyRestaurants /> : <AccessForm />
}
