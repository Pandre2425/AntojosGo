import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { colors } from '../../src/ui'

// Diners land on search without an account; the account tab holds sign-in and restaurant management.
export default function TabsLayout() {
  return <NativeTabs tintColor={colors.orange} backgroundColor={colors.white} indicatorColor={colors.orangeSoft} labelVisibilityMode="labeled"
    iconColor={{ default: colors.green, selected: colors.orange }} labelStyle={{ default: { color: colors.green }, selected: { color: colors.orange } }}>
    <NativeTabs.Trigger name="index">
      <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="assistant">
      <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" md="forum" />
      <NativeTabs.Trigger.Label>Asistente</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="favorites">
      <NativeTabs.Trigger.Icon sf="heart" md="favorite" />
      <NativeTabs.Trigger.Label>Favoritos</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="account">
      <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      <NativeTabs.Trigger.Label>Mi cuenta</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
  </NativeTabs>
}
