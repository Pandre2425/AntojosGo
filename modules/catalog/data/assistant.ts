import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { dbError } from '../../../lib/app-error'
import { assistantRequestSchema, avoidRegex, contextLabel, emptyContext, interpret, searchGroups, type AssistantContext } from '../../../shared/contracts/assistant'
import { ALLERGEN_LABELS, allergenStatus, type Allergen } from '../../../shared/contracts/menu'
import { isOpenNow, type OpeningHours } from '../../../shared/contracts/hours'
import { getPublicMenu, getPublishedBranch } from './public-catalog'

export type AssistantItem = {
  id: string; name: string; branch_name: string; address: string; municipality: string; category: string | null
  distanceKm: number | null; dish: { name: string; price: number; allergensDeclared: boolean; contains: Allergen[] } | null; open: boolean | null
}
export type AssistantResponse = {
  reply: string; items: AssistantItem[]; context: AssistantContext; source: 'rules' | 'ai' | 'none'; needsLocation?: boolean
}
type Interpreter = (message: string) => Promise<{ understood: boolean; concepts: AssistantContext['concepts']; words: string[]; near: boolean; openNow: boolean; cheap: boolean; without?: Allergen[]; avoid?: string[] } | null>

type Row = {
  id: string; name: string; branch_name: string; category: string | null; address: string; municipality: string
  distance_m: number | null; opening_hours: OpeningHours | null; match_dish: string | null; match_price: number | string | null
  match_allergens: string[] | null
}

const PAGE = 3
const money = (v: number) => `Q${v.toFixed(2)}`

/** One assistant turn: rules first, AI only when the rules don't understand, the database always decides. */
export async function runAssistant(db: SupabaseClient, input: z.input<typeof assistantRequestSchema>, ai: Interpreter): Promise<AssistantResponse> {
  const { message, context: previous, location } = assistantRequestSchema.parse(input)
  let { context, action } = interpret(message, previous)
  let source: AssistantResponse['source'] = 'rules'

  if (action === 'unknown') {
    const guess = await ai(message)
    if (guess?.understood && (guess.concepts.length || guess.words.length || guess.near || guess.without?.length || guess.avoid?.length)) {
      context = { ...emptyContext(), near: previous.near || guess.near, concepts: guess.concepts.slice(0, 6), words: guess.words.slice(0, 4), openNow: guess.openNow, cheap: guess.cheap,
        without: [...new Set([...previous.without, ...(guess.without ?? [])])], avoid: [...new Set([...previous.avoid, ...(guess.avoid ?? [])])].slice(0, 4) }
      action = 'search'; source = 'ai'
    } else {
      return { reply: 'No te entendí del todo. Prueba con un antojo («algo picante», «postre frío», «pizza») o pide «algo cerca de mí».', items: [], context: previous, source: 'none' }
    }
  }
  if (action === 'hello') return { reply: '¡Hola! Cuéntame qué se te antoja: un platillo, «algo picante», «desayunar cerca» o «un postre frío».', items: [], context, source }
  if (action === 'thanks') return { reply: '¡Buen provecho! Si se te antoja otra cosa, aquí estoy.', items: [], context, source }
  if (action === 'menu') return menuReply(db, context, source)

  if (context.near && !location) {
    return { reply: 'Para buscar cerca de ti necesito tu ubicación.', items: [], context, source, needsLocation: true }
  }
  const exclude = action === 'more' ? context.shown : []
  const search = async (ctx: AssistantContext) => {
    const { data, error } = await db.rpc('search_catalog_v2', {
      p_groups: searchGroups(ctx),
      p_lat: location?.latitude ?? null, p_lng: location?.longitude ?? null,
      p_radius_m: ctx.near ? 3000 : 50000, p_limit: 30, p_exclude: exclude,
      p_require_all: false, p_without: ctx.without, p_avoid: avoidRegex(ctx.avoid),
    })
    if (error) throw dbError(error, 'No pudimos buscar en este momento. Intenta de nuevo.')
    return (data ?? []) as Row[]
  }
  let rows = await search(context)
  // Unknown words that match nothing ("shawarma", typos, slang): the rules didn't really understand, ask the AI once.
  if (!rows.length && source === 'rules' && action === 'search' && !context.concepts.length && context.words.length) {
    const guess = await ai(message)
    if (guess?.understood && guess.concepts.length) {
      context = { ...context, concepts: guess.concepts.slice(0, 6), words: guess.words.slice(0, 4), near: context.near || guess.near, openNow: context.openNow || guess.openNow, cheap: context.cheap || guess.cheap }
      if (context.near && !location) return { reply: 'Para buscar cerca de ti necesito tu ubicación.', items: [], context, source: 'ai', needsLocation: true }
      rows = await search(context); source = 'ai'
    }
  }
  const openOf = (r: Row) => isOpenNow(r.opening_hours ?? [])
  const closedCount = context.openNow ? rows.filter(r => openOf(r) === false).length : 0
  if (context.openNow) rows = rows.filter(r => openOf(r) !== false) // unknown hours stay, after open ones
    .sort((a, b) => Number(openOf(b) === true) - Number(openOf(a) === true))
  if (context.cheap) rows = [...rows].sort((a, b) => (a.match_price == null ? 1 : 0) - (b.match_price == null ? 1 : 0) || Number(a.match_price ?? 0) - Number(b.match_price ?? 0))

  const items: AssistantItem[] = rows.slice(0, PAGE).map(r => ({
    id: r.id, name: r.name, branch_name: r.branch_name, address: r.address, municipality: r.municipality, category: r.category,
    distanceKm: r.distance_m == null ? null : r.distance_m / 1000,
    dish: r.match_dish ? { name: r.match_dish, price: Number(r.match_price), allergensDeclared: allergenStatus(r.match_allergens).declared, contains: allergenStatus(r.match_allergens).contains } : null,
    open: openOf(r),
  }))
  const next: AssistantContext = { ...context, shown: [...exclude, ...items.map(i => i.id)].slice(-30), lastBranchId: items[0]?.id ?? context.lastBranchId }
  return { reply: searchReply(next, items, rows.length, action === 'more', closedCount), items, context: next, source }
}

function searchReply(ctx: AssistantContext, items: AssistantItem[], total: number, more: boolean, closed: number): string {
  const restricted = ctx.without.length > 0 || ctx.avoid.length > 0
  const what = contextLabel(ctx) + (ctx.near ? ' cerca de ti' : '') + (ctx.openNow ? ' abierto ahora' : '') + (ctx.cheap ? ', lo más económico' : '')
  if (!items.length) {
    if (more) return 'Ya te mostré todas las opciones que encontré. Prueba con otro antojo.'
    const hint = closed ? ` Hay ${closed} que coinciden pero están cerrados ahora.` : ctx.near ? ' Prueba sin «cerca» para buscar en toda la zona.' : ' Prueba con otra palabra o un platillo concreto.'
    return `No encontré ${what}.${hint}`
  }
  const lines = items.map(i => {
    const why = i.dish ? `tiene «${i.dish.name}» (${money(i.dish.price)})` : i.category ? `es de ${i.category.toLowerCase()}` : 'coincide con tu búsqueda'
    const extra = [i.distanceKm != null ? (i.distanceKm < 1 ? `${Math.round(i.distanceKm * 1000)} m` : `${i.distanceKm.toFixed(1)} km`) : null, i.open === true ? 'abierto ahora' : i.open === false ? 'cerrado ahora' : null].filter(Boolean).join(' · ')
    // Exclusions never present an undeclared dish as safe.
    const unknown = restricted && i.dish && !i.dish.allergensDeclared ? ' · ⚠️ alérgenos no indicados, confírmalo' : ''
    return `• ${i.name}: ${why}${extra ? ` · ${extra}` : ''}${unknown}`
  })
  const rest = total - items.length
  return `${more ? 'Otras opciones' : `Encontré ${total === 1 ? '1 lugar' : `${total} lugares`}`} con ${what}:\n${lines.join('\n')}${rest > 0 && !more ? '\nEscribe «otra opción» para ver más.' : ''}\nPregúntame «¿qué tienen?» para ver el menú del primero.${restricted ? '\nLa información de alérgenos la registra cada restaurante; si tu alergia es grave, confírmala con ellos.' : ''}`
}

async function menuReply(db: SupabaseClient, ctx: AssistantContext, source: AssistantResponse['source']): Promise<AssistantResponse> {
  const [branch, dishes] = await Promise.all([getPublishedBranch(db, ctx.lastBranchId!), getPublicMenu(db, ctx.lastBranchId!)])
  if (!branch) return { reply: 'Esa sede ya no está publicada. Busquemos otra opción.', items: [], context: { ...ctx, lastBranchId: null }, source }
  const list = dishes.slice(0, 8).map(d => {
    const { declared, contains } = allergenStatus(d.allergens)
    const hit = contains.filter(a => ctx.without.includes(a)).map(a => ALLERGEN_LABELS[a].toLowerCase())
    const allergy = hit.length ? ` ⛔ contiene ${hit.join(', ')}` : ctx.without.length && !declared ? ' ⚠️ alérgenos no indicados' : ''
    return `• ${d.name} — ${money(d.price)}${d.is_available ? '' : ' (agotado por ahora)'}${allergy}`
  })
  return {
    reply: list.length ? `Menú de ${branch.name} (${branch.branch_name}):\n${list.join('\n')}` : `${branch.name} aún no ha publicado su menú.`,
    items: [{ id: branch.id, name: branch.name, branch_name: branch.branch_name, address: branch.address, municipality: branch.municipality, category: null, distanceKm: null, dish: null, open: null }],
    context: ctx, source,
  }
}
