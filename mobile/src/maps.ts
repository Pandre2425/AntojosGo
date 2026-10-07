import Constants from 'expo-constants'

/** True only when the build has a Google Maps key (see app.config.js). Never render MapView otherwise. */
export const mapsEnabled = Constants.expoConfig?.extra?.mapsEnabled === true
