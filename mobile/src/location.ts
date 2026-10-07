import * as Location from 'expo-location'

export type UserCoords = { latitude: number; longitude: number }

async function readLocation(): Promise<UserCoords | null> {
  const current = await Location.getForegroundPermissionsAsync()
  let status = current.status
  if (status !== 'granted') {
    const asked = await Location.requestForegroundPermissionsAsync()
    status = asked.status
  }
  if (status !== 'granted') return null
  // A recent, accurate cached fix answers instantly (indoors a fresh fix may never arrive).
  const position = await Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 200 })
    ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
  return { latitude: position.coords.latitude, longitude: position.coords.longitude }
}

/**
 * Ask for foreground GPS. Returns null if the user denies, location is unavailable,
 * or any step (permission query included) does not answer within 15 s.
 */
export async function requestUserLocation(): Promise<UserCoords | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    readLocation(),
    new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 15000) }),
  ]).catch(() => null).finally(() => clearTimeout(timer))
}
