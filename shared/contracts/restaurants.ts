import { z } from 'zod'
import { displayNameSchema } from './names'

/** Same list as the restaurants_category_allowed constraint (supabase/migrations/20261007100000_contact_and_category.sql). */
export const RESTAURANT_CATEGORIES = ['Comida típica', 'Cafetería', 'Comida rápida', 'Pizzería', 'Mariscos', 'Carnes y asados', 'Comida china',
  'Comida mexicana', 'Panadería y postres', 'Vegetariana', 'Internacional', 'Otra'] as const

export const businessProfileSchema = z.object({
  name: displayNameSchema,
  description: z.string().trim().max(2000, 'La descripción admite hasta 2000 caracteres.'),
  // Optional so a client that does not send it never clears it.
  category: z.enum(RESTAURANT_CATEGORIES, { errorMap: () => ({ message: 'Elige una categoría de la lista.' }) }).nullable().optional(),
})
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>

export interface OwnedRestaurant { id: string; name: string; auth_owner_id: string }
export interface BusinessProfile extends OwnedRestaurant { description: string | null; category: string | null }
