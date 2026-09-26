import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SessionProvider } from '../src/session'
import { ScreenBoundary, colors } from '../src/ui'
export default function Layout() { return <ScreenBoundary><SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.cream }, headerTintColor: colors.green, title: 'AntojosGo' }} /></SessionProvider></ScreenBoundary> }
