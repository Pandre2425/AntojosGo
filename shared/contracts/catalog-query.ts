import { z } from 'zod'
const optionalCoordinate = (min: number, max: number) => z.preprocess(
  value => value == null || (typeof value === 'string' && !value.trim()) ? undefined : value,
  z.coerce.number().finite().min(min).max(max).optional(),
)
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  lat: optionalCoordinate(-90, 90),
  lng: optionalCoordinate(-180, 180),
  radiusMeters: z.coerce.number().int().positive().max(200000).default(5000),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).refine(value => (value.lat === undefined) === (value.lng === undefined), 'Se requieren ambas coordenadas.')
