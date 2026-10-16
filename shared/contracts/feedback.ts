import { z } from 'zod'

/** App rating 1–5 with an optional suggestion (one per account, editable). */
export const feedbackInputSchema = z.object({
  rating: z.number().int().min(1, 'Elige de 1 a 5 estrellas.').max(5, 'Elige de 1 a 5 estrellas.'),
  comment: z.string().trim().max(1000, 'Usa hasta 1000 caracteres.').transform(v => v || null).nullable().default(null),
  platform: z.enum(['web', 'android']),
  app_version: z.string().max(20).nullable().default(null),
})
export type FeedbackInput = z.input<typeof feedbackInputSchema>
export type Feedback = z.output<typeof feedbackInputSchema> & { updated_at: string }

export const RATING_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'] as const
