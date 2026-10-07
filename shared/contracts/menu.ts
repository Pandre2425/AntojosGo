import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).transform(v => v || null).nullable().default(null)

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
}
