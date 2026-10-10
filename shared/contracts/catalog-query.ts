import { z } from 'zod'
import { ALLERGENS, DISH_TAGS } from './menu'
import { RESTAURANT_CATEGORIES } from './restaurants'

const optionalCoordinate = (min: number, max: number) => z.preprocess(
  value => value == null || (typeof value === 'string' && !value.trim()) ? undefined : value,
  z.coerce.number().finite().min(min).max(max).optional(),
)
// Query strings carry lists as "a,b,c".
const csv = <T extends [string, ...string[]]>(values: T, max: number) => z.preprocess(
  value => typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value,
  z.array(z.enum(values)).max(max).default([]),
)
const flag = z.preprocess(value => value === true || value === '1' || value === 'true', z.boolean()).default(false)

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  lat: optionalCoordinate(-90, 90),
  lng: optionalCoordinate(-180, 180),
  radiusMeters: z.coerce.number().int().positive().max(200000).default(5000),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Filters (all must hold): restaurant category, dish tags, allergens to exclude, ingredients to avoid.
  category: z.preprocess(v => v === '' ? undefined : v, z.enum(RESTAURANT_CATEGORIES).optional()),
  tags: csv([...DISH_TAGS], DISH_TAGS.length),
  without: csv([...ALLERGENS], ALLERGENS.length),
  avoid: z.preprocess(
    value => typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value,
    z.array(z.string().max(40)).max(5).default([]),
  ),
  openNow: flag,
  sort: z.enum(['relevance', 'price']).default('relevance'),
}).refine(value => (value.lat === undefined) === (value.lng === undefined), 'Se requieren ambas coordenadas.')
export type CatalogQuery = z.input<typeof catalogQuerySchema>
