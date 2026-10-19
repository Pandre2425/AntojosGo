import { z } from 'zod'
import { displayNameSchema } from './names'
import { msg } from '../i18n'

/** Default suggestions for the free-text business type (more come from types restaurants already use). */
export const RESTAURANT_CATEGORIES = [msg('Comida típica'), 'Cafetería', msg('Comida rápida'), 'Pizzería', 'Mariscos', msg('Carnes y asados'), msg('Comida china'),
  msg('Comida mexicana'), msg('Panadería y postres'), 'Vegetariana', 'Internacional', 'Otra'] as const

export const businessProfileSchema = z.object({
  name: displayNameSchema,
  description: z.string().trim().max(2000, msg('La descripción admite hasta 2000 caracteres.')),
  // Free-text business type ("Pizzería", "Pupusería"...). Optional so a client that does not send it never clears it.
  category: z.preprocess(
    v => typeof v === 'string' ? (v.trim().replace(/\s+/g, ' ') || null) : v,
    z.string().min(2, msg('El tipo de negocio debe tener al menos 2 letras.')).max(60, msg('El tipo de negocio admite hasta 60 caracteres.')).nullable(),
  ).optional(),
})
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>

export interface OwnedRestaurant { id: string; name: string; auth_owner_id: string }
export interface BusinessProfile extends OwnedRestaurant {
  description: string | null; category: string | null
  /** Storage paths from the DB; the API replaces them with public URLs. */
  logo_url: string | null; cover_url: string | null
}
export const BRAND_IMAGE_KINDS = ['logo', 'cover'] as const
export type BrandImageKind = typeof BRAND_IMAGE_KINDS[number]
