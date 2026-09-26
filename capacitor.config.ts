import type { CapacitorConfig } from '@capacitor/cli'

const devUrl = process.env.CAPACITOR_DEV_SERVER_URL
if (devUrl && !['localhost', '127.0.0.1', '10.0.2.2'].includes(new URL(devUrl).hostname)) {
  throw new Error('Use a local development server. Remote production hosting is not configured.')
}

const config: CapacitorConfig = {
  appId: 'com.antojosgo.app',
  appName: 'AntojosGo',
  webDir: 'mobile-shell',
  ...(devUrl ? { server: { url: devUrl, cleartext: true } } : {}),
  android: { backgroundColor: '#ffffff' },
}

export default config
