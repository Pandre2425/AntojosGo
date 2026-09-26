// Local administrative utility. Never import this file into the app.
const { createClient } = require('@supabase/supabase-js')
const { randomBytes } = require('node:crypto')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || new URL(url).hostname !== 'dmskwpquomqcsumaqaej.supabase.co') throw new Error('Configura la URL del proyecto AntojosGo en .env.local.')
  if (!key) throw new Error('Falta SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) privada en .env.local. No uses una variable NEXT_PUBLIC para esta clave.')
  const email = `pruebas-${Date.now()}@example.invalid`
  const password = randomBytes(24).toString('base64url')
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  const admin = createClient(url, key, options)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Propietario de prueba' } })
  if (error) throw new Error(`No se creó la cuenta: ${error.code || error.status || 'error de Auth'}`)
  console.log('Cuenta de prueba creada, sin privilegios administrativos. Guarda estas credenciales fuera del repositorio:')
  console.log(`Correo: ${email}\nContraseña: ${password}`)
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!publicKey) throw new Error('Cuenta creada; falta clave pública para verificar el acceso.')
  const client = createClient(url, publicKey, options)
  const login = await client.auth.signInWithPassword({ email, password })
  if (login.error || login.data.user?.id !== data.user.id) throw new Error('Cuenta creada, pero no se pudo verificar el inicio de sesión.')
  const userId = login.data.user.id
  const profile = await client.from('account_profiles').insert({ user_id: userId, display_name: 'Propietario de prueba' }).select('user_id, display_name').single()
  if (profile.error || profile.data?.user_id !== userId) throw new Error('Acceso verificado, pero falló el perfil personal de prueba.')
  const business = await client.from('restaurants').insert({ auth_owner_id: userId, name: 'Restaurante de prueba' }).select('id, name, auth_owner_id').single()
  if (business.error || business.data?.auth_owner_id !== userId) throw new Error('Acceso verificado, pero falló el registro del restaurante.')
  const edited = await client.from('restaurants').update({ description: 'Negocio privado para pruebas de AntojosGo.' }).eq('id', business.data.id).select('id, description').single()
  if (edited.error || edited.data?.description !== 'Negocio privado para pruebas de AntojosGo.') throw new Error('Restaurante creado, pero falló la edición del perfil comercial.')
  const logout = await client.auth.signOut()
  if (logout.error) throw new Error('Acceso verificado; no se pudo confirmar el cierre de la sesión de prueba.')
  const again = await client.auth.signInWithPassword({ email, password })
  if (again.error) throw new Error('Falló el segundo inicio de sesión.')
  const restored = await client.from('restaurants').select('id, description').eq('id', business.data.id).single()
  if (restored.error || restored.data?.description !== edited.data.description) throw new Error('No se pudo verificar la persistencia del restaurante.')
  const finalLogout = await client.auth.signOut()
  if (finalLogout.error) throw new Error('No se pudo cerrar la sesión final de prueba.')
  console.log('PASS: acceso, perfil personal, creación y edición de restaurante, persistencia y cierre de sesión. Puedes entrar en /restaurant.')
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
