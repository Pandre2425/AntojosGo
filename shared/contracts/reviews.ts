import { z } from 'zod'

// Dish reviews: whole stars 1–5 and an optional comment, one per account and dish; shown without author.
export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, 'Elige de 1 a 5 estrellas.').max(5, 'Elige de 1 a 5 estrellas.'),
  comment: z.string().trim().max(1000, 'Usa hasta 1000 caracteres.').transform(v => v || null).nullable().default(null),
})
export const replyInputSchema = z.object({ reply: z.string().trim().max(1000, 'Usa hasta 1000 caracteres.') })
export const reportInputSchema = z.object({ reason: z.string().trim().max(300, 'Usa hasta 300 caracteres.').default('') })
export type ReviewInput = z.input<typeof reviewInputSchema>

export type Rating = { rating_avg: number | null; rating_count: number }
export type PublicReview = { rating: number; comment: string | null; reply: string | null; replied_at: string | null; updated_at: string }
export type MyReview = { rating: number; comment: string | null; updated_at: string }
export type OwnerReview = PublicReview & { id: string; dish_id: string; dish_name: string; reported_at: string | null }

export const NO_RATING: Rating = { rating_avg: null, rating_count: 0 }

/** Five stars for an average, to the nearest half: 3.6 → full, full, full, half, empty. */
export function starParts(avg: number | null): ('full' | 'half' | 'empty')[] {
  const r = Math.round(Math.min(Math.max(avg ?? 0, 0), 5) * 2) / 2
  return [1, 2, 3, 4, 5].map(i => (r >= i ? 'full' : r >= i - 0.5 ? 'half' : 'empty'))
}

/** «4.3 (12 reseñas)», or «Sin reseñas». */
export function ratingLabel({ rating_avg, rating_count }: Rating): string {
  if (!rating_count || rating_avg === null) return 'Sin reseñas'
  return `${rating_avg.toFixed(1)} (${rating_count} ${rating_count === 1 ? 'reseña' : 'reseñas'})`
}
