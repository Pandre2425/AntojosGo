import { z } from 'zod'
import { displayNameSchema } from './names'

export const branchInputSchema = z.object({
  name: displayNameSchema,
  department: z.string().trim().min(2).max(100),
  municipality: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5, 'Escribe una dirección de al menos 5 caracteres.').max(300),
})
export type BranchInput = z.infer<typeof branchInputSchema>
export interface RestaurantBranch extends BranchInput {
  id: string
  restaurant_id: string
  status: 'draft' | 'published' | 'inactive'
  latitude: number | null
  longitude: number | null
}
export const branchPageSize = 20

export const branchLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
})
export type BranchLocation = z.infer<typeof branchLocationSchema>
