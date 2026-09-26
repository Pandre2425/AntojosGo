import { z } from 'zod'
import { displayNameSchema } from './names'

export const businessProfileSchema = z.object({
  name: displayNameSchema,
  description: z.string().trim().max(2000, 'La descripción admite hasta 2000 caracteres.'),
})
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>

export interface OwnedRestaurant { id: string; name: string; auth_owner_id: string }
export interface BusinessProfile extends OwnedRestaurant { description: string | null }
