import { useRef, useState } from 'react'
import { getServerUrl, normalizeServerUrl, saveServerUrl, serverConfigurable, testServer } from './server'
import { Action, Card, Field, Message } from './ui'

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
    if (!origin) { setMessage('Escribe una dirección como 10.239.243.18:3000'); return }
    lock.current = true; setBusy(true); setMessage('Probando conexión…')
    try {
      if (!(await testServer(origin))) { setMessage(`No hubo respuesta de ${origin}. Revisa que el backend esté en marcha, la misma Wi-Fi y el firewall.`); return }
      await saveServerUrl(origin); setValue(origin); setOpen(false); setMessage(`Conectado a ${origin}.`)
    } finally { lock.current = false; setBusy(false) }
  }
  return <Card>
    <Message>Servidor: {getServerUrl() || 'sin configurar'}</Message>
    {open ? <>
      <Field label="Dirección del servidor" value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!busy} placeholder="10.239.243.18:3000" />
      <Action title={busy ? 'Probando…' : 'Probar y guardar'} onPress={save} disabled={busy} />
      <Action title="Cancelar" secondary onPress={() => { setOpen(false); setValue(getServerUrl()); setMessage('') }} disabled={busy} />
    </> : <Action title="Cambiar servidor" secondary onPress={() => { setOpen(true); setMessage('') }} />}
    <Message>{message}</Message>
  </Card>
}
