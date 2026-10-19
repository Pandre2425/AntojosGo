import { z } from 'zod'
import { t, msg } from '../i18n'

/** App rating 1–5 with an optional suggestion (one per account, editable). */
export const feedbackInputSchema = z.object({
  rating: z.number().int().min(1, t('Elige de 1 a 5 estrellas.')).max(5, t('Elige de 1 a 5 estrellas.')),
  comment: z.string().trim().max(1000, t('Usa hasta 1000 caracteres.')).transform(v => v || null).nullable().default(null),
  platform: z.enum(['web', 'android']),
  app_version: z.string().max(20).nullable().default(null),
})
export type FeedbackInput = z.input<typeof feedbackInputSchema>
export type Feedback = z.output<typeof feedbackInputSchema> & { updated_at: string }

export const RATING_LABELS = ['', msg('Muy mala'), 'Mala', 'Regular', 'Buena', 'Excelente'] as const
