import { z } from 'zod'
import { t } from '../i18n'

export const displayNameSchema = z.string().trim().min(2, t('Escribe al menos 2 caracteres.')).max(100, t('Usa hasta 100 caracteres.'))

/** Name for the profile: the one typed at sign-up, or the one Google provides. */
export const metadataName = (meta: Record<string, unknown> | undefined): string | undefined =>
  [meta?.display_name, meta?.full_name, meta?.name].find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim().slice(0, 100)
