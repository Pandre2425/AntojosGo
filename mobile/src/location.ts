import * as Location from 'expo-location'

export type UserCoords = { latitude: number; longitude: number }

/** Ask for foreground GPS. Returns null if the user denies or location is unavailable. */
export async function requestUserLocation(): Promise<UserCoords | null> {
  const current = await Location.getForegroundPermissionsAsync()
  let status = current.status
  if (status !== 'granted') {
    const asked = await Location.requestForegroundPermissionsAsync()
    status = asked.status
  }
  if (status !== 'granted') return null
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  })
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  }
}
