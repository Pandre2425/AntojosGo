import { getSupabase } from './supabase/client'

export class ServiceError extends Error {
  constructor(message: string, public readonly code: 'timeout' | 'network' | 'http' | 'invalid-response', public readonly status?: number) {
    super(message)
    this.name = 'ServiceError'
  }
}

/** Each request has its own deadline. Mutations are never automatically retried. */
export async function requestJSON<T>(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort(options.signal?.reason)
  if (options.signal?.aborted) abort()
  else options.signal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  try {
    const requestHeaders = new Headers(options.headers)
    // Only send the session to our own restaurant API, never to arbitrary URLs.
    if (url.startsWith('/api/restaurants/')) {
      const session = await getSupabase()?.auth.getSession()
      if (session?.data.session) requestHeaders.set('Authorization', `Bearer ${session.data.session.access_token}`)
    }
    const response = await fetch(url, { ...options, headers: requestHeaders, signal: controller.signal })
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? 'No tienes acceso a esta operación. Comprueba tu sesión.'
        : response.status === 429 ? 'Hay muchas solicitudes. Intenta de nuevo en unos momentos.'
        : 'Este servicio no está disponible ahora. Puedes seguir usando las otras secciones.'
      throw new ServiceError(message, 'http', response.status)
    }
    if (response.status === 204) return undefined as T
    try { return await response.json() as T }
    catch (error) {
      if (controller.signal.aborted) throw error
      throw new ServiceError('El servicio devolvió una respuesta que no se pudo leer.', 'invalid-response')
    }
  } catch (error) {
    if (timedOut) throw new ServiceError('El servicio tardó demasiado. Intenta nuevamente.', 'timeout')
    if (options.signal?.aborted) throw error
    if (error instanceof ServiceError) throw error
    throw new ServiceError('No se pudo conectar. Revisa tu conexión e intenta nuevamente.', 'network')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}
