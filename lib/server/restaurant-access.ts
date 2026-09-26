import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '../supabase/server'
import { z } from 'zod'
import { createBoundedFetch } from '../bounded-fetch'

export async function authorizeRestaurant(request: NextRequest, restaurantId: string): Promise<NextResponse | null> {
  if (!isSupabaseConfigured) return NextResponse.json({ message: 'Servicio no configurado' }, { status: 503 })
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return NextResponse.json({ message: 'Inicia sesión para continuar' }, { status: 401 })
  if (!z.string().uuid().safeParse(restaurantId).success) return NextResponse.json({ message: 'Identificador de restaurante inválido' }, { status: 400 })
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: createBoundedFetch() }, auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error } = await db.auth.getUser(token)
    if (error || !user) return NextResponse.json({ message: 'Sesión no válida' }, { status: 401 })
    const { data, error: ownerError } = await db.from('restaurants').select('id').eq('id', restaurantId).eq('auth_owner_id', user.id).maybeSingle()
    if (ownerError) return NextResponse.json({ message: 'No se pudo comprobar el acceso' }, { status: 503 })
    if (!data) return NextResponse.json({ message: 'No tienes acceso a este restaurante' }, { status: 403 })
    return null
  } catch { return NextResponse.json({ message: 'El servicio de acceso no está disponible' }, { status: 503 }) }
}
