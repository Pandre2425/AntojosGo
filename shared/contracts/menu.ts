import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).transform(v => v || null).nullable().default(null)

/** Same list as the foods_tags_allowed constraint (supabase/migrations/20261008090000_assistant_search.sql). */
export const DISH_TAGS = ['picante', 'vegetariano', 'vegano', 'sin_gluten', 'desayuno', 'postre', 'frio', 'caliente', 'bebida'] as const
export type DishTag = typeof DISH_TAGS[number]
export const DISH_TAG_LABELS: Record<DishTag, string> = {
  picante: 'Picante', vegetariano: 'Vegetariano', vegano: 'Vegano', sin_gluten: 'Sin gluten', desayuno: 'Desayuno',
  postre: 'Postre', frio: 'Frío', caliente: 'Caliente', bebida: 'Bebida',
}

/** Same list as foods_allergens_allowed (supabase/migrations/20261009090000_ingredients_filters.sql).
 * 'ninguno' = the restaurant declared the dish free of these; an EMPTY list means "not declared". */
export const ALLERGENS = ['mani', 'nueces', 'lacteos', 'huevo', 'gluten', 'mariscos', 'pescado', 'soya', 'ajonjoli'] as const
export type Allergen = typeof ALLERGENS[number]
export const ALLERGEN_LABELS: Record<Allergen, string> = {
  mani: 'Maní', nueces: 'Nueces', lacteos: 'Lácteos', huevo: 'Huevo', gluten: 'Gluten (trigo)',
  mariscos: 'Mariscos', pescado: 'Pescado', soya: 'Soya', ajonjoli: 'Ajonjolí',
}
export const NO_ALLERGENS = 'ninguno' as const
export type AllergenDeclaration = Allergen | typeof NO_ALLERGENS

/** Dish details split by kind. Each group has quick-pick options and accepts the restaurant's own entries.
 * Options with `tag` also power the diner filters (foods.tags). Stored in foods.dish_types / cuisines / features. */
export const DISH_DETAIL_GROUPS = [
  { key: 'dish_types', title: 'Tipo de plato', placeholder: 'Escribe uno: Ej. Shucos, Ceviche', options: [
    { label: 'Desayuno', tag: 'desayuno' }, { label: 'Entrada' }, { label: 'Plato fuerte' }, { label: 'Sopa o caldo', tag: 'caliente' },
    { label: 'Ensalada' }, { label: 'Antojito' }, { label: 'Hamburguesa' }, { label: 'Pizza' }, { label: 'Tacos' }, { label: 'Sándwich' },
    { label: 'Pasta' }, { label: 'Mariscos' }, { label: 'Carnes' }, { label: 'Pollo' }, { label: 'Acompañamiento' },
    { label: 'Postre', tag: 'postre' }, { label: 'Bebida', tag: 'bebida' }, { label: 'Bebida caliente', tag: 'caliente' },
    { label: 'Menú infantil' }, { label: 'Combo' },
  ] },
  { key: 'cuisines', title: 'Cocina', placeholder: 'Escribe una: Ej. Colombiana, Francesa', options: [
    { label: 'Comida típica' }, { label: 'Mexicana' }, { label: 'Salvadoreña' }, { label: 'Colombiana' }, { label: 'Peruana' },
    { label: 'Argentina' }, { label: 'Estadounidense' }, { label: 'Italiana' }, { label: 'Francesa' }, { label: 'Española' },
    { label: 'China' }, { label: 'Japonesa / sushi' }, { label: 'Coreana' }, { label: 'Tailandesa' }, { label: 'India' },
    { label: 'Árabe' }, { label: 'Internacional' }, { label: 'Fusión' }, { label: 'Comida rápida' }, { label: 'Cafetería' },
    { label: 'Panadería y repostería' },
  ] },
  { key: 'features', title: 'Características', placeholder: 'Escribe una: Ej. Sin azúcar', options: [
    { label: 'Picante', tag: 'picante' }, { label: 'Vegetariano', tag: 'vegetariano' }, { label: 'Vegano', tag: 'vegano' },
    { label: 'Sin gluten', tag: 'sin_gluten' }, { label: 'Frío', tag: 'frio' }, { label: 'Caliente', tag: 'caliente' },
    { label: 'Saludable' }, { label: 'Para compartir' }, { label: 'Especialidad de la casa' },
  ] },
] as const satisfies readonly { key: string; title: string; placeholder: string; options: readonly { label: string; tag?: DishTag }[] }[]
export type DetailKey = typeof DISH_DETAIL_GROUPS[number]['key']
export const DETAIL_KEYS: DetailKey[] = DISH_DETAIL_GROUPS.map(g => g.key)
export const MAX_PER_GROUP = 12
const OPTION_TAG = new Map<string, DishTag>(DISH_DETAIL_GROUPS.flatMap(g => g.options as readonly { label: string; tag?: DishTag }[])
  .filter(o => o.tag).map(o => [o.label.toLowerCase(), o.tag!]))

/** Tags (diner filters) implied by the chosen details. */
export const tagsForCategories = (categories: readonly string[]): DishTag[] =>
  [...new Set(categories.map(c => OPTION_TAG.get(c.toLowerCase())).filter((t): t is DishTag => Boolean(t)))]

/** Short text kept in foods.category for displays and older app versions: "Hamburguesa, Comida rápida". */
export function categorySummary(categories: readonly string[]): string | null {
  let out = ''
  for (const c of categories) { const next = out ? `${out}, ${c}` : c; if (next.length > 60) break; out = next }
  return out || null
}

type DetailSource = { dish_types?: string[]; cuisines?: string[]; features?: string[]; categories?: string[]; category?: string | null; tags?: DishTag[] }
/** A dish's details by group; dishes saved before the split are sorted from their categories / old category / tags. */
export function dishDetails(dish: DetailSource): Record<DetailKey, string[]> {
  if ((dish.dish_types?.length ?? 0) + (dish.cuisines?.length ?? 0) + (dish.features?.length ?? 0) > 0)
    return { dish_types: dish.dish_types ?? [], cuisines: dish.cuisines ?? [], features: dish.features ?? [] }
  const legacy = dish.categories?.length ? dish.categories : [...(dish.category ? [dish.category] : []), ...(dish.tags ?? []).map(t => DISH_TAG_LABELS[t])]
  const groupOf = (c: string) => DISH_DETAIL_GROUPS.find(g => g.options.some(o => o.label.toLowerCase() === c.toLowerCase()))?.key ?? 'dish_types'
  const out: Record<DetailKey, string[]> = { dish_types: [], cuisines: [], features: [] }
  for (const c of new Set(legacy)) out[groupOf(c)].push(c)
  return out
}
/** Old helper name: all details in one list. */
export const dishCategories = (dish: DetailSource): string[] => Object.values(dishDetails(dish)).flat()

/** One label per entry (no lists): returns an error message, or '' when valid. */
export function labelProblem(text: string, current: readonly string[], what = 'una opción', max = MAX_PER_GROUP): string {
  const value = text.trim()
  if (value.length < 2) return 'Escribe al menos 2 letras.'
  if (/[,;\n]/.test(value)) return `Agrega ${what} a la vez (sin comas).`
  if (value.length > 30) return 'Admite hasta 30 caracteres.'
  if (current.some(i => i.toLowerCase() === value.toLowerCase())) return 'Ya está en la lista.'
  if (current.length >= max) return `Puedes agregar hasta ${max}.`
  return ''
}

/** One ingredient per entry: returns an error message, or '' when valid. */
export function ingredientProblem(text: string, current: readonly string[]): string {
  const value = text.trim()
  if (!value) return 'Escribe un ingrediente.'
  if (/[,;\n]| y /i.test(value)) return 'Agrega un ingrediente a la vez (sin comas ni «y»).'
  if (value.length > 40) return 'Cada ingrediente admite hasta 40 caracteres.'
  if (current.some(i => i.toLowerCase() === value.toLowerCase())) return 'Ese ingrediente ya está en la lista.'
  if (current.length >= 30) return 'Registra hasta 30 ingredientes.'
  return ''
}

/** "45" / "45,5" -> "45.50" for display while typing a price; '' when not a number. */
export function formatPriceInput(text: string): string {
  const n = Number(text.trim().replace(',', '.'))
  return text.trim() && Number.isFinite(n) && n > 0 ? n.toFixed(2) : text
}

/** "pollo, chile pasa,  Tomate" -> ['pollo', 'chile pasa', 'Tomate'] (deduplicated, trimmed). */
export function parseIngredients(text: string): string[] {
  const seen = new Set<string>()
  return text.split(/[,;\n]/).map(s => s.trim().replace(/\s+/g, ' ')).filter(s => {
    const key = s.toLowerCase()
    if (!s || seen.has(key)) return false
    seen.add(key); return true
  })
}

/** Allergen state for display and filters: declared-free, contains X, or not declared (never "safe").
 * `other` = allergens the restaurant wrote itself (foods.allergens_other); they also count as declared. */
export function allergenStatus(allergens: readonly string[] | null | undefined, other: readonly string[] = []): { declared: boolean; contains: Allergen[]; other: string[] } {
  const list = allergens ?? []
  return { declared: list.length > 0 || other.length > 0, contains: list.filter((a): a is Allergen => (ALLERGENS as readonly string[]).includes(a)), other: [...other] }
}
/** Display names of everything a dish contains: fixed list + restaurant-written. */
export const allergenNames = (allergens: readonly string[] | null | undefined, other: readonly string[] = []): string[] =>
  [...allergenStatus(allergens, other).contains.map(a => ALLERGEN_LABELS[a]), ...other]
/** Labels picked in the form -> fixed allergen keys + free-text others. */
export function splitAllergenLabels(labels: readonly string[]): { allergens: Allergen[]; allergens_other: string[] } {
  const byLabel = new Map(ALLERGENS.map(a => [ALLERGEN_LABELS[a].toLowerCase(), a]))
  return { allergens: labels.map(l => byLabel.get(l.toLowerCase())).filter((a): a is Allergen => Boolean(a)),
           allergens_other: labels.filter(l => !byLabel.has(l.toLowerCase())) }
}

/** Mirrors the foods_* CHECK constraints in supabase/migrations/20261002100000_menu_foods.sql. */
export const dishInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del platillo.').max(120),
  // Accepts "35", "35.5" or "35,50" from a phone keyboard; stored with 2 decimals.
  // Rounded before the range check, so 0,001 or 99999,999 are rejected here instead of by the DB.
  price: z.preprocess(
    v => { const n = typeof v === 'string' ? Number(v.trim().replace(',', '.')) : v; return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) / 100 : n },
    z.number({ invalid_type_error: 'Escribe un precio válido.' }).finite().gt(0, 'El precio debe ser mayor que 0.').lt(100000, 'El precio debe ser menor que Q100,000.'),
  ),
  category: optionalText(60),
  description: optionalText(500),
  // Optional so a client that does not send them never clears them.
  dish_types: z.array(z.string().trim().min(2, 'Cada opción necesita al menos 2 letras.').max(30, 'Cada opción admite hasta 30 caracteres.')
    .refine(c => !/[,;]/.test(c), 'Escribe una opción a la vez.')).max(MAX_PER_GROUP, `Elige hasta ${MAX_PER_GROUP} por grupo.`)
    .transform(list => list.filter((c, i) => list.findIndex(x => x.toLowerCase() === c.toLowerCase()) === i)).optional(),
  cuisines: z.array(z.string().trim().min(2, 'Cada opción necesita al menos 2 letras.').max(30, 'Cada opción admite hasta 30 caracteres.')
    .refine(c => !/[,;]/.test(c), 'Escribe una opción a la vez.')).max(MAX_PER_GROUP, `Elige hasta ${MAX_PER_GROUP} por grupo.`)
    .transform(list => list.filter((c, i) => list.findIndex(x => x.toLowerCase() === c.toLowerCase()) === i)).optional(),
  features: z.array(z.string().trim().min(2, 'Cada opción necesita al menos 2 letras.').max(30, 'Cada opción admite hasta 30 caracteres.')
    .refine(c => !/[,;]/.test(c), 'Escribe una opción a la vez.')).max(MAX_PER_GROUP, `Elige hasta ${MAX_PER_GROUP} por grupo.`)
    .transform(list => list.filter((c, i) => list.findIndex(x => x.toLowerCase() === c.toLowerCase()) === i)).optional(),
  tags: z.array(z.enum(DISH_TAGS)).max(DISH_TAGS.length).transform(t => [...new Set(t)]).optional(),
  ingredients: z.array(z.string().trim().min(1).max(40, 'Cada ingrediente admite hasta 40 caracteres.')).max(30, 'Registra hasta 30 ingredientes.')
    .refine(list => list.join(',').length <= 600, 'La lista de ingredientes es demasiado larga.').optional(),
  // [] = not declared; ['ninguno'] = declared free of common allergens; 'ninguno' cannot be combined.
  allergens: z.array(z.enum([...ALLERGENS, NO_ALLERGENS])).max(ALLERGENS.length).transform(a => [...new Set(a)])
    .refine(a => !(a.includes(NO_ALLERGENS) && a.length > 1), 'Marca «No contiene alérgenos comunes» o los alérgenos que contiene, no ambos.').optional(),
  allergens_other: z.array(z.string().trim().min(2, 'Cada alérgeno necesita al menos 2 letras.').max(30, 'Cada alérgeno admite hasta 30 caracteres.')
    .refine(c => !/[,;]/.test(c), 'Escribe un alérgeno a la vez.')).max(10, 'Registra hasta 10 alérgenos propios.')
    .transform(list => list.filter((c, i) => list.findIndex(x => x.toLowerCase() === c.toLowerCase()) === i)).optional(),
}).refine(v => !(v.allergens?.includes(NO_ALLERGENS) && v.allergens_other?.length), { path: ['allergens'], message: 'Marca «No contiene alérgenos» o los alérgenos que contiene, no ambos.' })
/** Raw input (price may be "35,50"); adapters parse it with dishInputSchema. */
export type DishInput = z.input<typeof dishInputSchema>

/** Partial update: omitted fields stay unchanged; unknown keys are dropped. */
export const dishPatchSchema = dishInputSchema.innerType().partial().extend({
  status: z.enum(['draft', 'published']).optional(),
  is_available: z.boolean().optional(),
})
export type DishPatch = z.input<typeof dishPatchSchema>

export interface Dish {
  id: string
  restaurant_id: string
  name: string
  price: number
  category: string | null
  description: string | null
  status: 'draft' | 'published'
  is_available: boolean
  /** Storage path from the DB; the API replaces it with a public URL. */
  image_url: string | null
  tags: DishTag[]
  /** Union of dish_types + cuisines + features (search); `category` keeps a short summary. */
  categories: string[]
  dish_types: string[]
  cuisines: string[]
  features: string[]
  /** Allergens written by the restaurant (not in the fixed list). */
  allergens_other: string[]
  ingredients: string[]
  /** [] = not declared; ['ninguno'] = declared free of common allergens. */
  allergens: AllergenDeclaration[]
}
