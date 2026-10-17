import { useSyncExternalStore } from 'react'
import { api } from './api'

// «No me interesa»: one in-memory copy of the diner's hidden restaurants shared by search, assistant and account.
let ids: string[] = []
const subscribers = new Set<() => void>()
const emit = () => subscribers.forEach(f => f())

export const hiddenIds = () => ids
export function useHiddenIds() {
  return useSyncExternalStore(cb => { subscribers.add(cb); return () => { subscribers.delete(cb) } }, () => ids)
}
/** Reload after sign-in/out; empty without a session. */
export async function refreshHidden(signedIn: boolean) {
  ids = signedIn ? (await api.listHidden()).map(r => r.restaurant_id) : []
  emit()
}
export async function hideRestaurant(restaurantId: string) {
  await api.hideRestaurant(restaurantId)
  if (!ids.includes(restaurantId)) { ids = [...ids, restaurantId]; emit() }
}
export async function unhideRestaurant(restaurantId: string) {
  await api.unhideRestaurant(restaurantId)
  ids = ids.filter(x => x !== restaurantId); emit()
}
