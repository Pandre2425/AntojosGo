'use client'
import { useState, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { FoodArt } from './food-art'

export default function MobileDiscover({ name, onSearch }: { name?: string; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')
  function submit(event: FormEvent) { event.preventDefault(); onSearch(query.trim()) }
  return <div className="space-y-6">
    <div><p className="text-[10px] font-semibold tracking-[.2em] text-primary">EL SABOR ESTÁ CERCA</p><h1 className="mt-3 text-3xl font-bold tracking-tight">{name ? `Hola, ${name}` : 'Hola, ¿qué se te antoja?'} ✳</h1><p className="mt-2 text-sm text-muted-foreground">Tu próximo lugar favorito está por descubrir.</p></div>
    <section className="overflow-hidden rounded-[28px] bg-[#173F35] text-white">
      <div className="p-6"><p className="text-[10px] tracking-[.2em]">MENOS VUELTAS. MÁS SABOR.</p><h2 className="mt-5 text-[32px] font-extrabold leading-tight tracking-tight">Hoy se come<br/><span className="text-[#EFAE6E]">lo que se te antoja.</span></h2><p className="mt-4 text-sm leading-6 text-white/85">Cuéntanos qué tienes en mente y encuentra ese lugar que va contigo.</p>
        <form onSubmit={submit} className="mt-6 space-y-4"><div className="rounded-2xl bg-white p-3 text-[#263D35]"><label htmlFor="craving" className="text-sm font-semibold">¿Qué se te antoja?</label><input id="craving" className="mt-2 w-full bg-transparent py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" placeholder="Algo calientito, una pizza…" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200}/></div><button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold" type="submit"><Sparkles className="h-5 w-5"/>Encontrar mi antojo</button></form>
      </div><div className="relative h-56 bg-[#244E3E]"><FoodArt/><div className="absolute bottom-5 right-5 max-w-[75%] rounded-2xl bg-white/95 p-4 text-[#263D35]"><p className="text-sm font-semibold">Un antojo, mil posibilidades</p><p className="mt-1 text-xs text-muted-foreground">Descubre el sabor local</p></div></div>
    </section>
    <p className="text-xs text-muted-foreground">Explora el catálogo de ejemplo mientras habilitamos la publicación de restaurantes.</p>
  </div>
}
