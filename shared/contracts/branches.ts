import { z } from 'zod'
import { displayNameSchema } from './names'
import type { OpeningHours } from './hours'

export const branchInputSchema = z.object({
  name: displayNameSchema,
  department: z.string().trim().min(2).max(100),
  municipality: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5, 'Escribe una dirección de al menos 5 caracteres.').max(300),
  // Optional so a client that does not send them never clears them. '' clears the phone.
  phone: z.preprocess(
    v => typeof v === 'string' ? (v.replace(/[\s().-]/g, '') || null) : v,
    z.string().regex(/^\+?[0-9]{8,15}$/, 'Escribe un teléfono de 8 a 15 dígitos, por ejemplo 7765 4321.').nullable(),
  ).optional(),
  whatsapp: z.boolean().optional(),
})
export type BranchInput = z.infer<typeof branchInputSchema>
export interface RestaurantBranch extends BranchInput {
  id: string
  restaurant_id: string
  status: 'draft' | 'published' | 'inactive'
  latitude: number | null
  longitude: number | null
  opening_hours: OpeningHours
  phone: string | null
  whatsapp: boolean
}

// ponytail: an 8-digit number is assumed to be Guatemalan (+502); store E.164 if other countries are added.
const international = (phone: string) => { const digits = phone.replace(/\D/g, ''); return digits.length === 8 ? `502${digits}` : digits }
export const phoneUrl = (phone: string) => `tel:+${international(phone)}`
export const whatsappUrl = (phone: string) => `https://wa.me/${international(phone)}`
export const branchPageSize = 20

export const branchLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
})
export type BranchLocation = z.infer<typeof branchLocationSchema>
