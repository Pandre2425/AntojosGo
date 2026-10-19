import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SessionProvider } from '../src/session'
import { loadServerUrl } from '../src/server'
import { checkForUpdate } from '../src/update-check'
import { Loading, Page, ScreenBoundary, colors } from '../src/ui'
import { LanguageProvider, loadLanguage } from '../src/language'
export default function Layout() {
  // The saved backend address must be known before any screen calls the API.
  const [ready, setReady] = useState(false)
  useEffect(() => { Promise.allSettled([loadServerUrl(), loadLanguage()]).finally(() => { setReady(true); void checkForUpdate() }) }, [])
  if (!ready) return <Page><Loading /></Page>
  return <ScreenBoundary><LanguageProvider><SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.cream }, headerTintColor: colors.green, title: 'AntojosGo' }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /></Stack></SessionProvider></LanguageProvider></ScreenBoundary>
}
