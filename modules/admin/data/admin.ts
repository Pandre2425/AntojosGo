import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'

// Superadmin panel: each action calls one admin_* function, which re-checks admin + second factor (aal2)
// and writes the audit log. Rules: supabase/migrations/20261026090000_superadmin.sql
const id = z.string().uuid()
const reason = z.string().trim().min(3).max(500)
const email = z.string().trim().email().max(320)
const q = z.string().max(100).optional()
const days = z.number().int().min(0).max(3650).nullable() // null lifts the ban, 0 = indefinite

const ACTIONS: Record<string, [rpc: string, schema: z.ZodTypeAny]> = {
  whoami: ['admin_whoami', z.object({})],
  overview: ['admin_overview', z.object({})],
  restaurants: ['admin_restaurants', z.object({ p_q: q })],
  'branch-status': ['admin_set_branch_status', z.object({ p_branch_id: id, p_publish: z.boolean(), p_reason: reason })],
  'restaurant-suspend': ['admin_suspend_restaurant', z.object({ p_id: id, p_suspend: z.boolean(), p_reason: reason })],
  'restaurant-delete': ['admin_delete_restaurant', z.object({ p_id: id, p_delete: z.boolean(), p_reason: reason })],
  'restaurant-transfer': ['admin_transfer_restaurant', z.object({ p_id: id, p_email: email, p_reason: reason })],
  users: ['admin_users', z.object({ p_q: q })],
  'user-ban': ['admin_ban_user', z.object({ p_user_id: id, p_days: days, p_reason: reason })],
  'user-signout': ['admin_signout_user', z.object({ p_user_id: id, p_reason: reason })],
  'user-delete': ['admin_delete_user', z.object({ p_user_id: id, p_confirm_email: email, p_reason: reason })],
  reviews: ['admin_reviews', z.object({ p_filter: z.enum(['reported', 'hidden', 'all']), p_q: q })],
  'review-moderate': ['admin_moderate_review', z.object({ p_id: id, p_action: z.enum(['keep', 'hide', 'unhide']), p_reason: reason })],
  admins: ['admin_admins', z.object({})],
  'admin-set': ['admin_set_admin', z.object({ p_email: email, p_add: z.boolean(), p_reason: reason })],
  audit: ['admin_audit', z.object({ p_q: q })],
}

// Hints raised by the SQL functions -> message and status for the panel.
const HINTS: Record<string, [string, number]> = {
  forbidden: ['Esta sección es solo para administradores de AntojosGo.', 403],
  mfa: ['Confirma tu código de verificación en dos pasos para continuar.', 403],
  reason: ['Escribe el motivo (mínimo 3 caracteres).', 400],
  location: ['La sede no tiene ubicación guardada; no se puede publicar.', 400],
  suspended: ['El restaurante está suspendido o eliminado. Levanta eso primero.', 409],
  no_account: ['No existe una cuenta con ese correo.', 404],
  duplicate: ['Esa cuenta ya tiene un restaurante con el mismo nombre.', 409],
  admin_target: ['No se puede aplicar a una cuenta de administrador. Quítale el rol primero.', 409],
  confirm: ['El correo de confirmación no coincide.', 400],
  has_restaurants: ['La cuenta tiene restaurantes. Transfiérelos o elimínalos antes.', 409],
  self: ['No puedes quitarte el rol a ti mismo.', 409],
  last_admin: ['Debe quedar al menos un administrador.', 409],
}

export async function runAdmin(db: SupabaseClient, action: string, body: unknown): Promise<unknown> {
  const entry = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined
  if (!entry) throw new AppError('No encontramos ese elemento.', 404, 'not_found')
  const [rpc, schema] = entry
  const parsed = schema.safeParse(body ?? {})
  if (!parsed.success) throw new AppError('Revisa los datos enviados.', 400, 'invalid')
  const { data, error } = await db.rpc(rpc, parsed.data)
  const hint = error?.hint ? HINTS[error.hint] : undefined
  if (hint) throw new AppError(hint[0], hint[1], error!.hint!)
  if (error) throw dbError(error, 'No pudimos completar la acción.')
  return data
}
