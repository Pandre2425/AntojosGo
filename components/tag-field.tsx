'use client'
import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

/** Tag picker: type-your-own field first, then the chosen tags (removable), then quick-pick options. */
export default function TagField({ id, legend, hint, placeholder, options = [], value, onChange, validate, disabled, tone = 'green', children }: {
  id: string; legend: string; hint?: ReactNode; placeholder: string; options?: readonly string[]
  value: string[]; onChange: (next: string[]) => void; validate: (text: string, current: readonly string[]) => string
  disabled?: boolean; tone?: 'green' | 'red'; children?: ReactNode
}) {
  const [text, setText] = useState('')
  const [problem, setProblem] = useState('')
  const has = (v: string) => value.some((x) => x.toLowerCase() === v.toLowerCase())
  const custom = value.filter((v) => !options.some((o) => o.toLowerCase() === v.toLowerCase()))
  const on = tone === 'red' ? 'border-[#BD481F] bg-[#BD481F] text-white' : 'border-[#173F35] bg-[#173F35] text-white'
  function add() {
    const p = validate(text, value)
    setProblem(p)
    if (!p) { onChange([...value, text.trim().replace(/\s+/g, ' ')]); setText('') }
  }
  function toggle(o: string) {
    if (has(o)) { onChange(value.filter((x) => x.toLowerCase() !== o.toLowerCase())); setProblem(''); return }
    const p = validate(o, value)
    setProblem(p === 'Ya está en la lista.' ? '' : p)
    if (!p) onChange([...value, o])
  }
  return <fieldset className="space-y-2.5 rounded-xl border p-3">
    <legend className="px-1 text-sm font-medium">{legend}</legend>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    {children}
    <div className="flex gap-2">
      <Input id={id} aria-label={legend} placeholder={placeholder} value={text} maxLength={40} disabled={disabled}
        onChange={(e) => { setText(e.target.value); setProblem('') }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
      <Button type="button" variant="outline" disabled={disabled || !text.trim()} onClick={add}>Agregar</Button>
    </div>
    {problem && <p role="alert" className="text-sm text-[#9a3a18]">{problem}</p>}
    {custom.length > 0 && <ul aria-label={`${legend} agregados`} className="flex flex-wrap gap-2">{custom.map((c) => <li key={c}>
      <span className={`inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm ${on}`}>{c}
        <button type="button" aria-label={`Quitar ${c}`} disabled={disabled} onClick={() => toggle(c)} className="rounded-full p-0.5 hover:bg-white/20"><X className="h-3.5 w-3.5" /></button></span>
    </li>)}</ul>}
    {options.length > 0 && <div className="flex flex-wrap gap-2">{options.map((o) => <button key={o} type="button" aria-pressed={has(o)} disabled={disabled} onClick={() => toggle(o)}
      className={`rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F35] ${has(o) ? on : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>{o}</button>)}</div>}
  </fieldset>
}
