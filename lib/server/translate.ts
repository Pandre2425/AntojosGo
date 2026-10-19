import 'server-only'
import { createHash } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { createBoundedFetch } from '../bounded-fetch'
import { en } from '../../shared/i18n/en'
import type { PublicCatalogItem, PublicDish } from '../../modules/catalog/data/public-catalog'
import type { PublicReview } from '../../shared/contracts/reviews'

// Content written by restaurants and diners (descriptions, dish names, ingredients, reviews) shown in English.
// Gemini translates it once per batch; Next's data cache keeps the result 30 days, so the same menu is never
// translated twice. Without GEMINI_API_KEY, or if Gemini fails, the original Spanish is returned (translated: false).
// Only public restaurant content is sent; never accounts, emails or locations.
const fetchGemini = createBoundedFetch(15_000)
const CHUNK = 60

const instruction = `You translate content from AntojosGo, a restaurant app in Guatemala, from Spanish to natural, correct English.
You receive a JSON array of texts written by restaurants and diners (dish names, descriptions, ingredients, tags, reviews, replies).
Return a JSON array with exactly one translation per input, in the same order.
- Keep restaurant names, people's names and brand names unchanged.
- Keep traditional Guatemalan and Latin American dish names unchanged (pepián, kak'ik, jocón, subanik, shuco, chuchitos, tamales, rellenitos, atol, pupusas, chiles rellenos, tostadas, garnachas, hilachas, revolcado, paches); in longer descriptions you may add a very short explanation in parentheses.
- Keep prices, quantities and units. Do not add, remove or soften information, and keep allergy warnings exact.
- Short texts (one or two words, like ingredients or tags) are translated as short labels, capitalized the same way.
- If a text is already in English, return it unchanged.`

const resultSchema = z.array(z.string())

async function geminiTranslate(texts: string[]): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('no key')
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite'
  const response = await fetchGemini(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruction }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(texts) }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: { type: 'array', items: { type: 'string' } }, temperature: 0 },
    }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  const out = resultSchema.parse(JSON.parse(body?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null'))
  if (out.length !== texts.length) throw new Error('length mismatch')
  return out.map((s, i) => s.trim().slice(0, texts[i].length * 3 + 40) || texts[i]) // never longer than reasonable
}

// Errors are thrown (not cached) so a failed batch is retried on the next request.
const cachedChunk = (texts: string[]) => {
  const hash = createHash('sha256').update(JSON.stringify(texts)).digest('hex')
  return unstable_cache(() => geminiTranslate(texts), ['translate-en', hash], { revalidate: 60 * 60 * 24 * 30 })()
}

/** Translates to English keeping positions; empty/missing values stay as they are. */
export async function translateToEnglish<T extends string | null | undefined>(texts: T[]): Promise<{ texts: T[]; translated: boolean }> {
  const unique = [...new Set(texts.filter((s): s is NonNullable<T> & string => typeof s === 'string' && /\p{L}{2}/u.test(s)))]
  if (!unique.length || !process.env.GEMINI_API_KEY?.trim()) return { texts, translated: false }
  try {
    const map = new Map<string, string>()
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK)
      const out = await cachedChunk(chunk)
      chunk.forEach((s, j) => map.set(s, out[j]))
    }
    return { texts: texts.map(s => (typeof s === 'string' && map.has(s) ? map.get(s) : s) as T), translated: true }
  } catch (error) {
    console.error('[translate] unavailable:', error instanceof Error ? error.message : 'error')
    return { texts, translated: false }
  }
}

// ---- Public content in English (used by the public routes when the request asks for ?lang=en) ----

/** Restaurant page: description and type of business, and each dish's name, description, ingredients and own tags.
 *  Predefined options («Plato fuerte», «Vegano») are already in the UI dictionary and are translated on screen. */
export async function translateBranchAndMenu<B extends { description?: string | null; category?: string | null }>(branch: B, menu: PublicDish[]) {
  const own = (list?: string[]) => (list ?? []).map(v => (v in en ? null : v))
  const texts: (string | null | undefined)[] = []
  const at = (v: string | null | undefined) => texts.push(v) - 1
  const b = { description: at(branch.description), category: at(branch.category) }
  const d = menu.map(x => ({ name: at(x.name), description: at(x.description), ingredients: (x.ingredients ?? []).map(at),
    other: (x.allergens_other ?? []).map(at), dish_types: own(x.dish_types).map(at), cuisines: own(x.cuisines).map(at), features: own(x.features).map(at) }))
  const { texts: out, translated } = await translateToEnglish(texts)
  if (!translated) return { branch, menu, translated }
  const pick = (list: string[] | undefined, slots: number[]) => (list ?? []).map((v, i) => (v in en ? v : (out[slots[i]] as string) ?? v))
  return {
    translated,
    branch: { ...branch, description: out[b.description] ?? branch.description, category: out[b.category] ?? branch.category },
    menu: menu.map((x, i) => ({ ...x, name: (out[d[i].name] as string) ?? x.name, description: out[d[i].description] ?? x.description,
      ingredients: d[i].ingredients.map(s => out[s] as string), allergens_other: d[i].other.map(s => out[s] as string),
      dish_types: pick(x.dish_types, d[i].dish_types), cuisines: pick(x.cuisines, d[i].cuisines), features: pick(x.features, d[i].features) })),
  }
}

/** Search results: description, type of business and the matching dish. */
export async function translateCatalogItems(items: PublicCatalogItem[]) {
  const { texts: out, translated } = await translateToEnglish(items.flatMap(i => [i.description, i.category, i.dish?.name]))
  if (!translated) return { items, translated }
  return { translated, items: items.map((i, k) => ({ ...i, description: out[k * 3] ?? i.description, category: out[k * 3 + 1] ?? i.category,
    dish: i.dish ? { ...i.dish, name: (out[k * 3 + 2] as string) ?? i.dish.name } : i.dish })) }
}

/** Reviews: the diner's comment and the restaurant's reply. */
export async function translateReviews(items: PublicReview[]) {
  const { texts: out, translated } = await translateToEnglish(items.flatMap(r => [r.comment, r.reply]))
  if (!translated) return { items, translated }
  return { translated, items: items.map((r, k) => ({ ...r, comment: out[k * 2] ?? r.comment, reply: out[k * 2 + 1] ?? r.reply })) }
}
