import { z } from 'zod'
import { ALLERGENS, DISH_TAGS } from './menu'

const optionalCoordinate = (min: number, max: number) => z.preprocess(
  value => value == null || (typeof value === 'string' && !value.trim()) ? undefined : value,
  z.coerce.number().finite().min(min).max(max).optional(),
)
// Query strings carry lists as "a,b,c".
const csv = <T extends [string, ...string[]]>(values: T, max: number) => z.preprocess(
  value => typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value,
  z.array(z.enum(values, { errorMap: () => ({ message: 'Uno de los filtros no es válido.' }) })).max(max).default([]),
)
const price = z.preprocess(v => v == null || (typeof v === 'string' && !v.trim()) ? undefined : v, z.coerce.number().finite().min(0).max(100000).optional())
const flag = z.preprocess(value => value === true || value === '1' || value === 'true', z.boolean()).default(false)

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  lat: optionalCoordinate(-90, 90),
  lng: optionalCoordinate(-180, 180),
  radiusMeters: z.coerce.number().int().positive().max(200000).default(5000),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Filters (all must hold): restaurant category, dish tags, allergens to exclude, ingredients to avoid.
  category: z.preprocess(v => typeof v === 'string' && !v.trim() ? undefined : v, z.string().trim().max(60).optional()),
  tags: csv([...DISH_TAGS], DISH_TAGS.length),
  without: csv([...ALLERGENS], ALLERGENS.length),
  avoid: z.preprocess(
    value => typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value,
    z.array(z.string().max(40)).max(5).default([]),
  ),
  openNow: flag,
  sort: z.enum(['relevance', 'price']).default('relevance'),
  // Price range of the matching dish (quetzales) and the diner's «No me interesa» restaurants.
  minPrice: price,
  maxPrice: price,
  hide: z.preprocess(
    value => typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value,
    z.array(z.string().uuid('Uno de los filtros no es válido.')).max(100).default([]),
  ),
}).refine(value => (value.lat === undefined) === (value.lng === undefined), 'Se requieren ambas coordenadas.')
  .refine(value => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice, 'El precio mínimo no puede ser mayor que el máximo.')
export type CatalogQuery = z.input<typeof catalogQuerySchema>

/** Quick price ranges (quetzales) for the matching dish; web and app show the same chips. */
export const PRICE_RANGES = [
  { label: 'Hasta Q25', max: 25 },
  { label: 'Q25 a Q50', min: 25, max: 50 },
  { label: 'Q50 a Q100', min: 50, max: 100 },
  { label: 'Más de Q100', min: 100 },
] as const satisfies readonly { label: string; min?: number; max?: number }[]

/** «Sorpréndeme»: a random result that isn't the previous surprise (when there is another option). */
export function pickSurprise<T extends { id: string }>(items: readonly T[], previousId?: string | null, random = Math.random): T | null {
  const pool = items.length > 1 ? items.filter(i => i.id !== previousId) : items
  return pool.length ? pool[Math.floor(random() * pool.length)] : null
}
