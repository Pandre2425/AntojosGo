import type { SupabaseClient } from '@supabase/supabase-js'
import { dbError } from '../../../lib/app-error'
import { displayNameSchema } from '../../../shared/contracts/names'
import type { AccountProfile } from '../../../shared/contracts/accounts'

/** Creates the profile on first use; existing profiles are returned unchanged. */
export async function ensureAccountProfile(db: SupabaseClient, userId: string, name: string): Promise<AccountProfile> {
  const { data: existing, error: readError } = await db.from('account_profiles').select('user_id, display_name').eq('user_id', userId).maybeSingle()
  if (readError) throw dbError(readError, 'No pudimos cargar tu perfil.')
  if (existing) return existing as AccountProfile
  const { error } = await db.from('account_profiles').upsert({ user_id: userId, display_name: displayNameSchema.parse(name) }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (error) throw dbError(error, 'No pudimos guardar tu perfil. Tu cuenta sigue disponible.')
  const { data, error: reloadError } = await db.from('account_profiles').select('user_id, display_name').eq('user_id', userId).single()
  if (reloadError) throw dbError(reloadError, 'No pudimos cargar tu perfil.')
  return data as AccountProfile
}
