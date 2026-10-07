import { createApiClient } from '../../lib/api-client'
import { getServerUrl } from './server'
import { supabase } from './supabase'

export const api = createApiClient({
  baseUrl: getServerUrl,
  getToken: async () => (await supabase?.auth.getSession())?.data.session?.access_token ?? null,
  refreshToken: async () => (await supabase?.auth.refreshSession())?.data.session?.access_token ?? null,
})
