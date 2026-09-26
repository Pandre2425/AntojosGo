const { spawnSync } = require('node:child_process')
const target = process.env.ANTOJOS_ANDROID_TARGET || 'emulator'
if (!['emulator', 'usb'].includes(target)) throw new Error('Android target must be emulator or usb')
const host = target === 'usb' ? '127.0.0.1' : '10.0.2.2'
const result = spawnSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'], {
  stdio: 'inherit',
  env: { ...process.env, CAPACITOR_DEV_SERVER_URL: `http://${host}:3000/welcome` },
})
process.exit(result.status ?? 1)
