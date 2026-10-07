'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { webApi } from '@/lib/web-api'
import { emptyContext, type AssistantContext } from '@/shared/contracts/assistant'
import type { AssistantItem } from '@/modules/catalog/data/assistant'
import { BranchDetail } from './customer-catalog'
import { Button } from './ui/button'
import { Input } from './ui/input'

type Turn = { id: number; from: 'user' | 'bot'; text: string; items?: AssistantItem[] }
type Coords = { latitude: number; longitude: number }
const SUGGESTIONS = ['Algo picante', 'Quiero desayunar cerca', 'Un postre frío', 'Comida típica barata']

const locate = () => new Promise<Coords | null>((resolve) => {
  if (!navigator.geolocation) return resolve(null)
  navigator.geolocation.getCurrentPosition((p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => resolve(null), { timeout: 15000, maximumAge: 120000 })
})

/** Diner assistant ("Para ti"): rules first, AI fallback on the server. The conversation lives only in this page. */
export default function CustomerAssistant({ initialMessage = '' }: { initialMessage?: string }) {
  const [turns, setTurns] = useState<Turn[]>([{ id: 0, from: 'bot', text: '¡Hola! Cuéntame qué se te antoja y te digo dónde encontrarlo.' }])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const context = useRef<AssistantContext>(emptyContext())
  const location = useRef<Coords | null>(null)
  const nextId = useRef(1)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [turns, busy])
  const started = useRef(false)
  useEffect(() => { if (initialMessage && !started.current) { started.current = true; void send(initialMessage) } }, [initialMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = (turn: Omit<Turn, 'id'>) => setTurns((t) => [...t, { ...turn, id: nextId.current++ }])
  async function send(message: string) {
    const clean = message.trim()
    if (!clean || busy) return
    setText(''); setBusy(true); add({ from: 'user', text: clean })
    try {
      let result = await webApi.assistant(clean, context.current, location.current ?? undefined)
      if (result.needsLocation) {
        location.current = await locate()
        result = location.current ? await webApi.assistant(clean, context.current, location.current)
          : { ...result, reply: 'No pude obtener tu ubicación. Revisa el permiso del navegador o pide lo mismo sin «cerca».' }
      }
      context.current = result.context
      add({ from: 'bot', text: result.reply, items: result.items })
    } catch (e) {
      add({ from: 'bot', text: e instanceof Error ? e.message : 'No pude responder. Intenta de nuevo.' })
    } finally { setBusy(false) }
  }
  function submit(event: FormEvent) { event.preventDefault(); void send(text) }

  if (selected) return <BranchDetail id={selected} onBack={() => setSelected(null)} />
  return <div className="space-y-4">
    <div className="space-y-3" aria-live="polite">
      {turns.map((turn) => <div key={turn.id} className={`flex flex-col gap-2 ${turn.from === 'user' ? 'items-end' : 'items-start'}`}>
        <p className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${turn.from === 'user' ? 'bg-[#173F35] text-white' : 'border bg-white'}`}>{turn.text}</p>
        {turn.items?.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} className="w-[88%] rounded-xl border bg-white p-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
          <span className="block font-semibold">{item.name}</span>
          <span className="block text-sm">{item.dish ? `${item.dish.name} · Q${item.dish.price.toFixed(2)}` : item.branch_name}</span>
          <span className="mt-1 block text-sm font-semibold text-primary">Ver sede ›</span>
        </button>)}
      </div>)}
      {turns.length === 1 && <div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <Button key={s} variant="outline" size="sm" disabled={busy} onClick={() => send(s)}>{s}</Button>)}</div>}
      {busy && <p role="status" className="text-sm italic text-muted-foreground">Buscando…</p>}
      <div ref={end} />
    </div>
    <form onSubmit={submit} className="sticky bottom-20 flex gap-2 bg-background py-2">
      <Input aria-label="Escribe qué se te antoja" placeholder="Ej. algo picante cerca" value={text} maxLength={300} disabled={busy} onChange={(e) => setText(e.target.value)} />
      <Button type="submit" disabled={busy || !text.trim()}><Send className="h-4 w-4" /><span className="sr-only">Enviar</span></Button>
    </form>
  </div>
}
