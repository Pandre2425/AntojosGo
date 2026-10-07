'use client'
import { createApiClient } from './api-client'
import { getSupabase } from './supabase/client'

/** Same-origin /api/v1 client for the web, using the browser's Supabase session. */
export const webApi = createApiClient({
  baseUrl: '',
  getToken: async () => (await getSupabase()?.auth.getSession())?.data.session?.access_token ?? null,
  refreshToken: async () => (await getSupabase()?.auth.refreshSession())?.data.session?.access_token ?? null,
})
