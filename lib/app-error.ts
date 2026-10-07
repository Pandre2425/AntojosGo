/** User-safe error with an HTTP status. Message is shown to users; never put DB details in it. */
export class AppError extends Error {
  constructor(message: string, public status = 503, public code = 'unavailable') {
    super(message)
  }
}

/** Maps a Supabase/PostgREST error to an AppError. `notFound` also covers rows hidden by RLS. */
export function dbError(error: { code?: string } | null | undefined, fallback: string, notFound = 'No encontramos ese elemento.'): AppError {
  switch (error?.code) {
    case 'PGRST116': case 'P0002': return new AppError(notFound, 404, 'not_found')
    case '23505': return new AppError('Ya existe un elemento con ese nombre.', 409, 'conflict')
    case '23514': case '22P02': case '23502': return new AppError('Revisa los datos enviados.', 400, 'invalid')
    case '42501': return new AppError('No tienes permiso para esta acción.', 403, 'forbidden')
    default: return new AppError(fallback, 503, 'unavailable')
  }
}
