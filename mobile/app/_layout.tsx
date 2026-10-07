import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SessionProvider } from '../src/session'
import { loadServerUrl } from '../src/server'
import { checkForUpdate } from '../src/update-check'
import { Loading, Page, ScreenBoundary, colors } from '../src/ui'
export default function Layout() {
  // The saved backend address must be known before any screen calls the API.
  const [ready, setReady] = useState(false)
  useEffect(() => { loadServerUrl().finally(() => { setReady(true); void checkForUpdate() }) }, [])
  if (!ready) return <Page><Loading /></Page>
  return <ScreenBoundary><SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.cream }, headerTintColor: colors.green, title: 'AntojosGo' }} /></SessionProvider></ScreenBoundary>
}
