import { getSupabase } from '../../../lib/supabase/client'
import { displayNameSchema } from '../../../shared/contracts/names'
import type { AccountProfile } from '../../../shared/contracts/accounts'

function client() {
  const value = getSupabase()
  if (!value) throw new Error('El servicio de cuentas no está configurado.')
  return value
}

export async function ensureAccountProfile(userId: string, name: string): Promise<AccountProfile> {
  const db = client()
  const { data: existing, error: readError } = await db.from('account_profiles').select('user_id, display_name').eq('user_id', userId).maybeSingle()
  if (readError) throw new Error('No pudimos cargar tu perfil. Intenta nuevamente.')
  if (existing) return existing as AccountProfile
  const { error } = await db.from('account_profiles').upsert({ user_id: userId, display_name: displayNameSchema.parse(name) }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (error) throw new Error('No pudimos guardar tu perfil. Tu cuenta sigue disponible; intenta nuevamente.')
  const { data, error: reloadError } = await db.from('account_profiles').select('user_id, display_name').eq('user_id', userId).single()
  if (reloadError) throw new Error('No pudimos cargar tu perfil.')
  return data as AccountProfile
}

