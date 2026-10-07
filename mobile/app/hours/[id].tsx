import { useEffect, useRef, useState } from 'react'
import { Switch, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../src/session'
import { api } from '../../src/api'
import { DAY_NAMES, fromDayForm, toDayForm, type DayForm } from '../../../shared/contracts/hours'
import { Action, Card, Field, Loading, Message, Page, Title, colors } from '../../src/ui'

export default function Hours() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, ready } = useSession()
  const [name, setName] = useState('')
  const [form, setForm] = useState<DayForm | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  useEffect(() => {
    if (!session) return
    let active = true; setError(''); setForm(null)
    api.getBranch(id).then(b => { if (active) { setName(b.name); setForm(toDayForm(b.opening_hours ?? [])) } }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id, session?.user.id, retry])
  if (!ready) return <Page><Loading /></Page>
  if (!session) return <Redirect href="/" />
  const set = (i: number, values: Partial<DayForm[number]>) => setForm(rows => rows && rows.map((r, j) => j === i ? { ...r, ...values } : r))
  async function save() {
    if (lock.current || !form) return
    const parsed = fromDayForm(form)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    lock.current = true; setBusy(true); setError('')
    try { await api.saveHours(id, parsed.data); router.back() }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el horario.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <Page><Title>Horario</Title><Message>{name}</Message><Message>{error}</Message>
    {!form ? error ? <Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /> : <Loading /> : <>
      <Message>Escribe las horas como HH:MM (24 h). Si cierras después de medianoche, pon la hora de cierre menor que la de apertura.</Message>
      {form.map((d, i) => <Card key={d.day}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.green, fontSize: 18, fontWeight: '600' }}>{DAY_NAMES[d.day]}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.green }}>{d.closed ? 'Cerrado' : 'Abre'}</Text>
            <Switch accessibilityLabel={`${DAY_NAMES[d.day]} abre`} value={!d.closed} onValueChange={open => set(i, { closed: !open })} disabled={busy} />
          </View>
        </View>
        {d.closed ? null : <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="Abre" accessibilityLabel={`${DAY_NAMES[d.day]}, abre`} value={d.open} onChangeText={open => set(i, { open })} keyboardType="numbers-and-punctuation" maxLength={5} editable={!busy} /></View>
          <View style={{ flex: 1 }}><Field label="Cierra" accessibilityLabel={`${DAY_NAMES[d.day]}, cierra`} value={d.close} onChangeText={close => set(i, { close })} keyboardType="numbers-and-punctuation" maxLength={5} editable={!busy} /></View>
        </View>}
      </Card>)}
      <Action title={busy ? 'Guardando…' : 'Guardar horario'} onPress={save} disabled={busy} />
    </>}
  </Page>
}
