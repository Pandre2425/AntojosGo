import { z } from 'zod'

export const displayNameSchema = z.string().trim().min(2, 'Escribe al menos 2 caracteres.').max(100, 'Usa hasta 100 caracteres.')
