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

/** Quick-pick categories, grouped. Options with `tag` also power the diner filters (foods.tags).
 * Owners can add their own; categories are free text (foods.categories). */
export const DISH_CATEGORY_GROUPS: { title: string; options: { label: string; tag?: DishTag }[] }[] = [
  { title: 'Tipo de plato', options: [
    { label: 'Desayuno', tag: 'desayuno' }, { label: 'Entrada' }, { label: 'Plato fuerte' }, { label: 'Sopa o caldo', tag: 'caliente' },
    { label: 'Ensalada' }, { label: 'Antojito' }, { label: 'Acompañamiento' }, { label: 'Postre', tag: 'postre' },
    { label: 'Bebida', tag: 'bebida' }, { label: 'Bebida caliente', tag: 'caliente' }, { label: 'Menú infantil' }, { label: 'Combo' },
  ] },
  { title: 'Cocina', options: [
    { label: 'Comida típica' }, { label: 'Comida rápida' }, { label: 'Hamburguesa' }, { label: 'Pizza' }, { label: 'Italiana' },
    { label: 'Mexicana' }, { label: 'Tacos' }, { label: 'China' }, { label: 'Japonesa / sushi' }, { label: 'Internacional' },
    { label: 'Mariscos' }, { label: 'Carnes y parrilla' }, { label: 'Pollo' }, { label: 'Cafetería' }, { label: 'Panadería y repostería' },
  ] },
  { title: 'Características', options: [
    { label: 'Picante', tag: 'picante' }, { label: 'Vegetariano', tag: 'vegetariano' }, { label: 'Vegano', tag: 'vegano' },
    { label: 'Sin gluten', tag: 'sin_gluten' }, { label: 'Frío', tag: 'frio' }, { label: 'Caliente', tag: 'caliente' },
    { label: 'Para compartir' }, { label: 'Especialidad de la casa' },
  ] },
]
const CATEGORY_TAG = new Map(DISH_CATEGORY_GROUPS.flatMap(g => g.options).filter(o => o.tag).map(o => [o.label.toLowerCase(), o.tag!]))
export const MAX_CATEGORIES = 12

/** Tags (diner filters) implied by the chosen categories. */
export const tagsForCategories = (categories: readonly string[]): DishTag[] =>
  [...new Set(categories.map(c => CATEGORY_TAG.get(c.toLowerCase())).filter((t): t is DishTag => Boolean(t)))]

/** Short text kept in foods.category for displays and older app versions: "Hamburguesa, Comida rápida". */
export function categorySummary(categories: readonly string[]): string | null {
  let out = ''
  for (const c of categories) { const next = out ? `${out}, ${c}` : c; if (next.length > 60) break; out = next }
  return out || null
}

/** Categories of a dish saved before multi-select existed: its old category text plus its tags. */
export function dishCategories(dish: Pick<Dish, 'categories' | 'category' | 'tags'>): string[] {
  if (dish.categories?.length) return dish.categories
  const fromTags = (dish.tags ?? []).map(t => DISH_TAG_LABELS[t])
  return [...new Set([...(dish.category ? [dish.category] : []), ...fromTags])]
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

/** Allergen state for display and filters: declared-free, contains X, or not declared (never "safe"). */
export function allergenStatus(allergens: readonly string[] | null | undefined): { declared: boolean; contains: Allergen[] } {
  const list = allergens ?? []
  return { declared: list.length > 0, contains: list.filter((a): a is Allergen => (ALLERGENS as readonly string[]).includes(a)) }
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
  categories: z.array(z.string().trim().min(2, 'Cada categoría necesita al menos 2 letras.').max(30, 'Cada categoría admite hasta 30 caracteres.')
    .refine(c => !/[,;]/.test(c), 'Escribe una categoría a la vez.'))
    .max(MAX_CATEGORIES, `Elige hasta ${MAX_CATEGORIES} categorías.`)
    .transform(list => list.filter((c, i) => list.findIndex(x => x.toLowerCase() === c.toLowerCase()) === i)).optional(),
  tags: z.array(z.enum(DISH_TAGS)).max(DISH_TAGS.length).transform(t => [...new Set(t)]).optional(),
  ingredients: z.array(z.string().trim().min(1).max(40, 'Cada ingrediente admite hasta 40 caracteres.')).max(30, 'Registra hasta 30 ingredientes.')
    .refine(list => list.join(',').length <= 600, 'La lista de ingredientes es demasiado larga.').optional(),
  // [] = not declared; ['ninguno'] = declared free of common allergens; 'ninguno' cannot be combined.
  allergens: z.array(z.enum([...ALLERGENS, NO_ALLERGENS])).max(ALLERGENS.length).transform(a => [...new Set(a)])
    .refine(a => !(a.includes(NO_ALLERGENS) && a.length > 1), 'Marca «No contiene alérgenos comunes» o los alérgenos que contiene, no ambos.').optional(),
})
/** Raw input (price may be "35,50"); adapters parse it with dishInputSchema. */
export type DishInput = z.input<typeof dishInputSchema>

/** Partial update: omitted fields stay unchanged; unknown keys are dropped. */
export const dishPatchSchema = dishInputSchema.partial().extend({
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
  /** Multi-select categories (free text); `category` keeps a short summary of them. */
  categories: string[]
  ingredients: string[]
  /** [] = not declared; ['ninguno'] = declared free of common allergens. */
  allergens: AllergenDeclaration[]
}
