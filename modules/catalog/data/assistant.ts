import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { dbError } from '../../../lib/app-error'
import { assistantRequestSchema, avoidRegex, contextLabel, emptyContext, interpret, normalize, searchGroups, type AssistantContext } from '../../../shared/contracts/assistant'
import { ALLERGEN_LABELS, allergenStatus, type Allergen } from '../../../shared/contracts/menu'
import { isOpenNow, type OpeningHours } from '../../../shared/contracts/hours'
import { getPublicMenu, getPublishedBranch } from './public-catalog'
import { t } from '../../../shared/i18n'

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
// The AI only classifies; anything that isn't about food gets this fixed answer, never a generated one.
const offTopic = () => t('Solo puedo ayudarte a encontrar comida y restaurantes. Cuéntame qué se te antoja: «algo picante», «un postre frío», «pizza cerca».')
const money = (v: number) => `Q${v.toFixed(2)}`

/** One assistant turn: rules first, AI only when the rules don't understand, the database always decides. */
export async function runAssistant(db: SupabaseClient, input: z.input<typeof assistantRequestSchema>, ai: Interpreter): Promise<AssistantResponse> {
  const { message, context: previous, location, hide } = assistantRequestSchema.parse(input)
  let { context, action } = interpret(message, previous)
  let source: AssistantResponse['source'] = 'rules'

  if (action === 'unknown') {
    const guess = await ai(message)
    if (guess?.understood && (guess.concepts.length || guess.words.length || guess.near || guess.without?.length || guess.avoid?.length)) {
      context = { ...emptyContext(), near: previous.near || guess.near, concepts: guess.concepts.slice(0, 6), words: guess.words.slice(0, 4), openNow: guess.openNow, cheap: guess.cheap,
        without: [...new Set([...previous.without, ...(guess.without ?? [])])], avoid: [...new Set([...previous.avoid, ...(guess.avoid ?? [])])].slice(0, 4) }
      action = 'search'; source = 'ai'
    } else if (guess && !guess.understood) {
      return { reply: offTopic(), items: [], context: previous, source: 'none' }
    } else {
      return { reply: t('No te entendí del todo. Prueba con un antojo («algo picante», «postre frío», «pizza») o pide «algo cerca de mí».'), items: [], context: previous, source: 'none' }
    }
  }
  if (action === 'hello') return { reply: t('¡Hola! Cuéntame qué se te antoja: un platillo, «algo picante», «desayunar cerca» o «un postre frío».'), items: [], context, source }
  if (action === 'thanks') return { reply: t('¡Buen provecho! Si se te antoja otra cosa, aquí estoy.'), items: [], context, source }
  if (action === 'menu') return menuReply(db, context, source)

  const hasTopic = context.concepts.length > 0 || context.words.length > 0 || context.near || context.openNow || context.cheap
  if (action === 'search' && !hasTopic && (context.without.length || context.avoid.length)) {
    return { reply: t('Anotado: buscaré opciones {what}. ¿Qué se te antoja?', { what: contextLabel(context).replace(new RegExp(`^${t('lugares')} `), '') }), items: [], context, source }
  }
  if (context.near && !location) {
    return { reply: t('Para buscar cerca de ti necesito tu ubicación.'), items: [], context, source, needsLocation: true }
  }
  const exclude = action === 'more' ? context.shown : []
  const search = async (ctx: AssistantContext) => {
    const { data, error } = await db.rpc('search_catalog_v3', {
      p_groups: searchGroups(ctx),
      p_lat: location?.latitude ?? null, p_lng: location?.longitude ?? null,
      p_radius_m: ctx.near ? 3000 : 50000, p_limit: 30, p_exclude: exclude,
      p_require_all: false, p_without: ctx.without, p_avoid: avoidRegex(ctx.avoid), p_exclude_restaurants: hide,
    })
    if (error) throw dbError(error, 'No pudimos buscar en este momento. Intenta de nuevo.')
    return (data ?? []) as Row[]
  }
  let rows = await search(context)
  // Unknown words that match nothing ("shawarma", typos, slang): the rules didn't really understand, ask the AI once.
  if (!rows.length && source === 'rules' && action === 'search' && !context.concepts.length && context.words.length) {
    const guess = await ai(message)
    if (guess && !guess.understood) return { reply: offTopic(), items: [], context: previous, source: 'none' }
    if (guess?.understood && guess.concepts.length) {
      context = { ...context, concepts: guess.concepts.slice(0, 6), words: guess.words.slice(0, 4), near: context.near || guess.near, openNow: context.openNow || guess.openNow, cheap: context.cheap || guess.cheap }
      if (context.near && !location) return { reply: t('Para buscar cerca de ti necesito tu ubicación.'), items: [], context, source: 'ai', needsLocation: true }
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
  const what = contextLabel(ctx) + (ctx.near ? t(' cerca de ti') : '') + (ctx.openNow ? t(' abierto ahora') : '') + (ctx.cheap ? t(', lo más económico') : '')
  if (!items.length) {
    if (more) return t('Ya te mostré todas las opciones que encontré. Prueba con otro antojo.')
    const hint = closed ? t('Hay {n} que coinciden pero están cerrados ahora.', { n: closed }) : ctx.near ? t('Prueba sin «cerca» para buscar en toda la zona.') : t('Prueba con otra palabra o un platillo concreto.')
    return `${t('No encontré {what}.', { what })} ${hint}`
  }
  const lines = items.map(i => {
    const why = i.dish ? t('tiene «{dish}» ({price})', { dish: i.dish.name, price: money(i.dish.price) }) : i.category ? t('es de {category}', { category: i.category.toLowerCase() }) : t('coincide con tu búsqueda')
    const extra = [i.distanceKm != null ? (i.distanceKm < 1 ? `${Math.round(i.distanceKm * 1000)} m` : `${i.distanceKm.toFixed(1)} km`) : null, i.open === true ? t('abierto ahora') : i.open === false ? t('cerrado ahora') : null].filter(Boolean).join(' · ')
    // Exclusions never present an undeclared dish as safe.
    const unknown = restricted && i.dish && !i.dish.allergensDeclared ? ` · ⚠️ ${t('alérgenos no indicados, confírmalo')}` : ''
    return `• ${i.name}: ${why}${extra ? ` · ${extra}` : ''}${unknown}`
  })
  const rest = total - items.length
  const head = more ? t('Otras opciones con {what}:', { what }) : total === 1 ? t('Encontré 1 lugar con {what}:', { what }) : t('Encontré {n} lugares con {what}:', { n: total, what })
  return [head, ...lines, ...(rest > 0 && !more ? [t('Escribe «otra opción» para ver más.')] : []), t('Pregúntame «¿qué tienen?» para ver el menú del primero.'),
    ...(restricted ? [t('La información de alérgenos la registra cada restaurante; si tu alergia es grave, confírmala con ellos.')] : [])].join('\n')
}

async function menuReply(db: SupabaseClient, ctx: AssistantContext, source: AssistantResponse['source']): Promise<AssistantResponse> {
  const [branch, dishes] = await Promise.all([getPublishedBranch(db, ctx.lastBranchId!), getPublicMenu(db, ctx.lastBranchId!)])
  if (!branch) return { reply: t('Esa sede ya no está publicada. Busquemos otra opción.'), items: [], context: { ...ctx, lastBranchId: null }, source }
  const list = dishes.slice(0, 8).map(d => {
    const { declared, contains, other } = allergenStatus(d.allergens, d.allergens_other)
    // Fixed-list allergens the diner excluded, plus restaurant-written ones matching what they avoid ("sin mostaza").
    const hit = [...contains.filter(a => ctx.without.includes(a)).map(a => t(ALLERGEN_LABELS[a]).toLowerCase()),
      ...other.filter(o => ctx.avoid.some(w => normalize(o).includes(normalize(w)))).map(o => o.toLowerCase())]
    const allergy = hit.length ? ` ⛔ ${t('contiene {list}', { list: hit.join(', ') })}` : ctx.without.length && !declared ? ` ⚠️ ${t('alérgenos no indicados')}` : ''
    return `• ${d.name} — ${money(d.price)}${d.is_available ? '' : ` (${t('agotado por ahora')})`}${allergy}`
  })
  return {
    reply: list.length ? `${t('Menú de {name} ({branch}):', { name: branch.name, branch: branch.branch_name })}\n${list.join('\n')}` : t('{name} aún no ha publicado su menú.', { name: branch.name }),
    items: [{ id: branch.id, name: branch.name, branch_name: branch.branch_name, address: branch.address, municipality: branch.municipality, category: null, distanceKm: null, dish: null, open: null }],
    context: ctx, source,
  }
}
