import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { AppError } from '../app-error'
import { createBoundedFetch } from '../bounded-fetch'
import { isSupabaseConfigured, supabasePublicKey, supabaseUrl } from '../supabase/config'
import { AsyncLocalStorage } from 'node:async_hooks'
import { pickLang, setLanguageSource, t, type Lang } from '../../shared/i18n'
import { DEFAULT_LIMIT, withinLimit, type RateLimit } from './rate-limit'

// Language of the current request (?lang=en from the API client); t() in modules and errors reads it.
const requestLang = new AsyncLocalStorage<Lang>()
setLanguageSource(() => requestLang.getStore() ?? 'es')

export type AuthContext = { db: SupabaseClient; userId: string; requestId: string }
type Params = Record<string, string>
type Handler<C> = (request: NextRequest, ctx: C & { params: Params }) => Promise<unknown>

const MAX_BODY_BYTES = 100_000
const JSON_UTF8 = 'application/json; charset=utf-8'
const fetchSupabase = createBoundedFetch(10_000)

/**
 * Wraps a route handler: request id, per-IP rate limit, auth (unless `auth: false`), uniform JSON errors.
 * The handler gets a Supabase client carrying the user's token, so RLS still applies
 * even if a route forgets an ownership check. The secret key is never used here.
 */
export function route<C extends object = AuthContext>(handler: Handler<C>, options: { auth?: boolean; rate?: RateLimit } = {}) {
  return async (request: NextRequest, context: { params: Promise<Params> }) => requestLang.run(pickLang(request.nextUrl.searchParams.get('lang')), async () => {
    const requestId = crypto.randomUUID()
    try {
      if (!isSupabaseConfigured) throw new AppError('Servicio no configurado.', 503, 'unavailable')
      // Per-IP limit before any work (auth, database, AI). Cached public responses never reach here.
      if (!(await withinLimit(publicClient(), request, options.rate ?? DEFAULT_LIMIT))) {
        throw new AppError('Demasiadas solicitudes. Espera un momento e intenta de nuevo.', 429, 'rate_limited')
      }
      const params = (await context.params) ?? {}
      const ctx = options.auth === false
        ? { db: publicClient(), requestId, params }
        : { ...(await authenticate(request)), requestId, params }
      const result = await handler(request, ctx as unknown as C & { params: Params })
      const response = result instanceof Response ? result : NextResponse.json(result ?? { ok: true })
      response.headers.set('x-request-id', requestId)
      // Android's HTTP stack decodes JSON without an explicit charset as Latin-1 ("EncontrÃ©").
      if (response.headers.get('content-type')?.startsWith('application/json')) response.headers.set('content-type', JSON_UTF8)
      if (options.auth !== false) response.headers.set('cache-control', 'no-store')
      return response
    } catch (error) {
      return errorResponse(error, requestId)
    }
  })
}

async function authenticate(request: NextRequest): Promise<{ db: SupabaseClient; userId: string }> {
  const token = request.headers.get('authorization')?.match(/^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/)?.[1]
  if (!token) throw new AppError('Inicia sesión para continuar.', 401, 'unauthenticated')
  const db = createClient(supabaseUrl, supabasePublicKey, {
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: fetchSupabase },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // Verifies signature and expiry (locally via JWKS for asymmetric keys, otherwise via Auth server).
  // getClaims throws (instead of returning an error) on malformed tokens.
  const { data, error } = await db.auth.getClaims(token).catch(() => ({ data: null, error: true }))
  const claims = data?.claims
  if (error || !claims?.sub || claims.role !== 'authenticated') throw new AppError('Tu sesión expiró. Inicia sesión de nuevo.', 401, 'unauthenticated')
  return { db, userId: claims.sub }
}

let anonClient: SupabaseClient | null = null
function publicClient() {
  return anonClient ??= createClient(supabaseUrl, supabasePublicKey, {
    global: { fetch: fetchSupabase }, auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Parses a JSON body with a size limit and a zod schema. */
export async function readJson<T>(request: NextRequest, schema: ZodType<T, any, any>): Promise<T> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new AppError('Envía los datos en formato JSON.', 415, 'invalid')
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) throw new AppError('La solicitud es demasiado grande.', 413, 'invalid')
  let body: unknown
  try { body = JSON.parse(text) } catch { throw new AppError('JSON inválido.', 400, 'invalid') }
  return schema.parse(body)
}

export function errorResponse(error: unknown, requestId: string) {
  let status = 500, code = 'internal', message = 'Ocurrió un error inesperado. Intenta de nuevo.'
  if (error instanceof AppError) ({ status, code, message } = error)
  else if (error instanceof ZodError) { status = 400; code = 'invalid'; message = error.issues[0]?.message ?? 'Revisa los datos enviados.' }
  if (status >= 500) console.error(`[api ${requestId}]`, error instanceof AppError ? error.message : error)
  const headers: Record<string, string> = { 'x-request-id': requestId, 'cache-control': 'no-store', 'content-type': JSON_UTF8 }
  if (status === 429) headers['retry-after'] = '60'
  return NextResponse.json({ error: { code, message: t(message) }, requestId }, { status, headers })
}
