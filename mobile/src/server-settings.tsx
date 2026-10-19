import { useRef, useState } from 'react'
import { getServerUrl, normalizeServerUrl, saveServerUrl, serverConfigurable, testServer } from './server'
import { Action, Card, Field, Message } from './ui'
import { t } from '../../shared/i18n'

/** Test builds only: lets the tester point the app at the PC's current address. */
export function ServerSettings() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(getServerUrl())
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  if (!serverConfigurable) return null
  async function save() {
    if (lock.current) return
    const origin = normalizeServerUrl(value)
    if (!origin) { setMessage(t('Escribe una dirección como 10.239.243.18:3000')); return }
    lock.current = true; setBusy(true); setMessage(t('Probando conexión…'))
    try {
      if (!(await testServer(origin))) { setMessage(t('No hubo respuesta de {origin}. Revisa que el backend esté en marcha, la misma Wi-Fi y el firewall.', { origin })); return }
      await saveServerUrl(origin); setValue(origin); setOpen(false); setMessage(t('Conectado a {origin}.', { origin }))
    } finally { lock.current = false; setBusy(false) }
  }
  return <Card>
    <Message>{t('Servidor:')} {getServerUrl() || t('sin configurar')}</Message>
    {open ? <>
      <Field label={t('Dirección del servidor')} value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!busy} placeholder="10.239.243.18:3000" />
      <Action title={busy ? t('Probando…') : t('Probar y guardar')} onPress={save} disabled={busy} />
      <Action title={t('Cancelar')} secondary onPress={() => { setOpen(false); setValue(getServerUrl()); setMessage('') }} disabled={busy} />
    </> : <Action title={t('Cambiar servidor')} secondary onPress={() => { setOpen(true); setMessage('') }} />}
    <Message>{message}</Message>
  </Card>
}
