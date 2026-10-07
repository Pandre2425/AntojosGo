'use client'
import { useRef, useState, type FormEvent } from 'react'
import { DAY_NAMES, fromDayForm, toDayForm } from '@/shared/contracts/hours'
import type { RestaurantBranch } from '@/shared/contracts/branches'
import { webApi } from '@/lib/web-api'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function BranchHoursEditor({ branch, onSaved, onClose }: { branch: RestaurantBranch; onSaved: (branch: RestaurantBranch) => void; onClose: () => void }) {
  const [form, setForm] = useState(() => toDayForm(branch.opening_hours ?? []))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const set = (i: number, values: Partial<(typeof form)[number]>) => setForm(rows => rows.map((r, j) => j === i ? { ...r, ...values } : r))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    const parsed = fromDayForm(form)
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    saving.current = true; setBusy(true); setError('')
    try { onSaved(await webApi.saveHours(branch.id, parsed.data)) }
    catch (err) { setError(err instanceof Error ? err.message : 'No pudimos guardar el horario.') }
    finally { saving.current = false; setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-3 border-t pt-4">
    <h4 className="font-semibold">Horario de {branch.name}</h4>
    <p className="text-sm text-muted-foreground">Si cierras después de medianoche, pon la hora de cierre menor que la de apertura (ej. 18:00 a 02:00).</p>
    <fieldset disabled={busy} className="space-y-2">
      {form.map((d, i) => <div key={d.day} className="grid grid-cols-[6.5rem_auto_1fr_1fr] items-center gap-2">
        <span className="text-sm font-medium">{DAY_NAMES[d.day]}</span>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!d.closed} onChange={(e) => set(i, { closed: !e.target.checked })} />Abre</label>
        <Input type="time" aria-label={`${DAY_NAMES[d.day]} apertura`} value={d.open} disabled={d.closed} onChange={(e) => set(i, { open: e.target.value })} />
        <Input type="time" aria-label={`${DAY_NAMES[d.day]} cierre`} value={d.close} disabled={d.closed} onChange={(e) => set(i, { close: e.target.value })} />
      </div>)}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit">{busy ? 'Guardando…' : 'Guardar horario'}</Button><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button></div>
    </fieldset>
  </form>
}
