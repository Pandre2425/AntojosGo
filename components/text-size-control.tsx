'use client'

import { useEffect, useState } from 'react'
import { TEXT_SIZES, TEXT_SIZE_KEY, type TextSize } from '@/shared/contracts/accessibility'

/** «Tamaño del texto»: scales the whole page (Tailwind uses rem) and is remembered in this browser. */
export default function TextSizeControl() {
  const [size, setSize] = useState<TextSize>('normal')
  useEffect(() => { try { setSize((localStorage.getItem(TEXT_SIZE_KEY) as TextSize) || 'normal') } catch { /* private mode */ } }, [])
  function choose(id: TextSize) {
    setSize(id)
    document.documentElement.style.fontSize = `${TEXT_SIZES.find(s => s.id === id)!.percent}%`
    try { localStorage.setItem(TEXT_SIZE_KEY, id) } catch { /* private mode: applies until reload */ }
  }
  return <fieldset className="space-y-2 rounded-2xl border bg-white p-4">
    <legend className="px-1 text-sm font-semibold text-[#173F35]">Tamaño del texto</legend>
    <div className="flex flex-wrap gap-2">{TEXT_SIZES.map(s => <button key={s.id} type="button" aria-pressed={size === s.id} onClick={() => choose(s.id)}
      className={`rounded-full border px-4 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F35] ${size === s.id ? 'border-[#173F35] bg-[#173F35] text-white' : 'border-stone-300 bg-white'}`}
      style={{ fontSize: `${s.percent * 0.14}px` }}>{s.label}</button>)}</div>
    <p className="text-xs text-stone-600">Se guarda en este navegador. Si tu sistema pide reducir animaciones, AntojosGo también las reduce.</p>
  </fieldset>
}
