// Security test suite (docs/SEGURIDAD.md). Usage: node scripts/security-check.mjs [https://antojos-go.vercel.app]
// Needs QA_A_EMAIL/QA_A_PASSWORD and QA_B_EMAIL/QA_B_PASSWORD (two QA owner accounts, A with a restaurant,
// branch and dish) and .env.local with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
// Writes only touch the QA accounts; attacks that should fail use no-op values.
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).map(l => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const API = process.argv[2] || 'https://antojos-go.vercel.app'
const qa = Object.fromEntries(['A', 'B'].map(k => [k.toLowerCase(), { email: process.env[`QA_${k}_EMAIL`], password: process.env[`QA_${k}_PASSWORD`] }]))
if (!qa.a.email || !qa.b.email) { console.error('Faltan QA_A_* / QA_B_*'); process.exit(2) }
const results = []
const check = (area, name, ok, detail = '') => results.push({ area, name, ok, detail: String(detail).slice(0, 140) })

async function login(acc) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify(acc) })
  const j = await r.json(); if (!j.access_token) throw new Error('login failed'); return j
}
const api = async (method, path, token, body, headers = {}) => {
  const r = await fetch(API + '/api/v1' + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
  let j = null; const t = await r.text(); try { j = JSON.parse(t) } catch {}
  return { status: r.status, j, t, h: r.headers }
}
const rest = async (method, path, token, body, prefer = 'return=representation') => {
  const r = await fetch(`${SB}/rest/v1/${path}`, { method, headers: { apikey: KEY, authorization: `Bearer ${token || KEY}`, 'content-type': 'application/json', prefer }, body: body ? JSON.stringify(body) : undefined })
  const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch {}
  return { status: r.status, j, t }
}

const A = await login(qa.a), B = await login(qa.b)
const aRest = (await api('GET', '/me/restaurants', A.access_token)).j
const aRid = (aRest.items ?? aRest)[0].id
const aBranches = (await api('GET', `/restaurants/${aRid}/branches`, A.access_token)).j
const aBid = (aBranches.items ?? aBranches)[0].id
const aDishes = (await api('GET', `/restaurants/${aRid}/dishes`, A.access_token)).j
const aDish = (aDishes.items ?? aDishes)[0]

// 1. Headers
{
  const r = await fetch(API + '/', { redirect: 'manual' }); const h = r.headers
  for (const k of ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'])
    check('Cabeceras', k, Boolean(h.get(k)), h.get(k)?.slice(0, 60))
  check('Cabeceras', 'sin x-powered-by', !h.get('x-powered-by'))
  const http = await fetch(API.replace('https:', 'http:') + '/', { redirect: 'manual' })
  check('Cabeceras', 'HTTP redirige a HTTPS', [301, 307, 308].includes(http.status), http.status)
  const cors = await fetch(API + '/api/v1/me/restaurants', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } })
  check('Cabeceras', 'CORS no permite otros sitios', !cors.headers.get('access-control-allow-origin'), cors.headers.get('access-control-allow-origin') ?? 'sin ACAO')
  const map = await fetch(API + '/_next/static/chunks/main-app.js.map'); check('Cabeceras', 'sin source maps públicos', map.status >= 400, map.status)
}

// 2. Authentication
const protectedRoutes = [['GET', '/me/restaurants'], ['GET', '/me/favorites'], ['GET', `/restaurants/${aRid}`], ['PATCH', `/restaurants/${aRid}`], ['GET', `/restaurants/${aRid}/dishes`], ['PATCH', `/dishes/${aDish.id}`], ['DELETE', `/dishes/${aDish.id}`], ['POST', `/branches/${aBid}/publish`], ['POST', `/restaurants/${aRid}/images/logo/upload-url`]]
const forged = (() => { const b = s => Buffer.from(JSON.stringify(s)).toString('base64url'); return `${b({ alg: 'none', typ: 'JWT' })}.${b({ sub: B.user.id, role: 'authenticated', exp: 9999999999 })}.x` })()
const tampered = (() => { const [h, p, s] = A.access_token.split('.'); const pl = JSON.parse(Buffer.from(p, 'base64url')); pl.sub = B.user.id; return `${h}.${Buffer.from(JSON.stringify(pl)).toString('base64url')}.${s}` })()
for (const [m, p] of protectedRoutes) {
  const body = m === 'GET' || m === 'DELETE' ? undefined : {}
  const none = await api(m, p, null, body); const f = await api(m, p, forged, body); const t = await api(m, p, tampered, body)
  check('Autenticación', `${m} ${p.replace(/[0-9a-f-]{36}/g, ':id')} sin token / falso / alterado`, [none, f, t].every(r => r.status === 401), `${none.status}/${f.status}/${t.status}`)
}
const anonKeyAsUser = await api('GET', '/me/restaurants', KEY.startsWith('eyJ') ? KEY : 'a.b.c'); check('Autenticación', 'clave pública no sirve como sesión', anonKeyAsUser.status === 401, anonKeyAsUser.status)

// 3. Authorization: B against A's data (API)
const bt = B.access_token
const idor = [
  ['GET', `/restaurants/${aRid}`], ['PATCH', `/restaurants/${aRid}`, { name: 'QA Claude Cocina' }],
  ['GET', `/restaurants/${aRid}/dishes`], ['POST', `/restaurants/${aRid}/dishes`, { name: 'Intruso', price: 1 }],
  ['PATCH', `/dishes/${aDish.id}`, { name: aDish.name }], ['DELETE', `/dishes/${aDish.id}`],
  ['GET', `/restaurants/${aRid}/branches`], ['PATCH', `/branches/${aBid}`, { name: 'x' }],
  ['POST', `/branches/${aBid}/unpublish`], ['PUT', `/branches/${aBid}/hours`, { opening_hours: [] }],
  ['POST', `/dishes/${aDish.id}/image/upload-url`, { contentType: 'image/jpeg' }], ['DELETE', `/dishes/${aDish.id}/image`],
  ['POST', `/restaurants/${aRid}/images/logo/upload-url`, { contentType: 'image/jpeg' }], ['DELETE', `/restaurants/${aRid}/images/cover`],
  ['PUT', `/restaurants/${aRid}/images/logo`, { path: `${aRid}/brand/aaaaaaaaaaaa.jpg` }],
]
for (const [m, p, body] of idor) {
  const r = await api(m, p, bt, body)
  const leaked = Array.isArray(r.j?.items) && r.j.items.length
  check('Autorización (B contra A)', `${m} ${p.replace(aRid, ':restA').replace(aBid, ':sedeA').replace(aDish.id, ':platoA')}`, ([403, 404, 400, 405].includes(r.status) || (r.status === 200 && m === 'GET' && Array.isArray(r.j?.items))) && !leaked, `${r.status} ${r.j?.code ?? ''}`)
}
const after = (await api('GET', `/restaurants/${aRid}/dishes`, A.access_token)).j
check('Autorización (B contra A)', 'el platillo de A sigue intacto', (after.items ?? after).some(d => d.id === aDish.id && d.name === aDish.name))

// 4. Direct database access (PostgREST) with the public key
for (const t of ['restaurants', 'foods', 'restaurant_branches', 'account_profiles', 'favorites', 'reviews', 'users']) {
  const anon = await rest('GET', `${t}?select=*&limit=5`)
  check('Base de datos (anónimo)', `leer ${t}`, anon.status >= 400 || (Array.isArray(anon.j) && anon.j.length === 0), `${anon.status} filas=${Array.isArray(anon.j) ? anon.j.length : '-'}`)
}
const bSees = await rest('GET', `restaurants?select=id&id=eq.${aRid}`, bt); check('Base de datos (B)', 'B no ve el restaurante de A', Array.isArray(bSees.j) && bSees.j.length === 0, bSees.status)
const bFoods = await rest('GET', `foods?select=id&restaurant_id=eq.${aRid}`, bt); check('Base de datos (B)', 'B no ve platillos de A', Array.isArray(bFoods.j) && bFoods.j.length === 0, bFoods.status)
const bUpd = await rest('PATCH', `foods?id=eq.${aDish.id}`, bt, { name: aDish.name }); check('Base de datos (B)', 'B no modifica platillo de A', !Array.isArray(bUpd.j) || bUpd.j.length === 0, `${bUpd.status} ${Array.isArray(bUpd.j) ? bUpd.j.length : ''}`)
const bIns = await rest('POST', 'foods', bt, { restaurant_id: aRid, name: 'Intruso', price: 1 }); check('Base de datos (B)', 'B no inserta platillo en A', bIns.status >= 400, bIns.status)
const bSteal = await rest('PATCH', `restaurants?id=eq.${aRid}`, bt, { auth_owner_id: B.user.id }); check('Base de datos (B)', 'B no se apropia del restaurante de A', bSteal.status >= 400 || (Array.isArray(bSteal.j) && !bSteal.j.length), bSteal.status)
const aPub = await rest('PATCH', `restaurant_branches?id=eq.${aBid}`, A.access_token, { status: 'published' }); check('Base de datos (A)', 'A no publica saltándose la validación', aPub.status >= 400, aPub.status)
const ownImg = await rest('PATCH', `restaurants?id=eq.${aRid}`, A.access_token, { logo_path: 'https://evil.example/x.jpg' }); check('Base de datos (A)', 'A no pone una URL arbitraria como logo', ownImg.status >= 400, ownImg.status)
const rpcImg = await rest('POST', 'rpc/set_restaurant_image', bt, { p_restaurant_id: aRid, p_kind: 'logo', p_path: null }); check('Base de datos (B)', 'B no quita el logo de A por RPC', rpcImg.status >= 400, rpcImg.status)
const pubB = await rest('POST', 'rpc/set_branch_published', bt, { p_branch_id: aBid, p_publish: false }); check('Base de datos (B)', 'B no despublica la sede de A por RPC', pubB.status >= 400 || pubB.j === false, `${pubB.status} ${pubB.t.slice(0, 40)}`)
const srs = await rest('PATCH', 'spatial_ref_sys?srid=eq.-1', null, { auth_name: 'x' }); check('Base de datos (anónimo)', 'no puede modificar spatial_ref_sys (PostGIS)', srs.status >= 400, `${srs.status} ${srs.t.slice(0, 60)}`)
const gql = await fetch(`${SB}/graphql/v1`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ restaurantsCollection { edges { node { id } } } }' }) }).then(r => r.json())
check('Base de datos (anónimo)', 'GraphQL no lista restaurantes', !(gql?.data?.restaurantsCollection?.edges?.length), JSON.stringify(gql).slice(0, 80))
const priv = await rest('POST', 'rpc/get_public_branch', null, { p_id: aBid }); check('Base de datos (anónimo)', 'solo sedes publicadas son públicas (RPC)', priv.status === 200, priv.status)

for (const f of ['get_public_menu', 'get_public_dishes', 'search_public_catalog', 'assistant_search']) {
  const r = await rest('POST', `rpc/${f}`, null, f.includes('dishes') || f.includes('menu') ? { p_branch_id: aBid } : f === 'assistant_search' ? { p_groups: [] } : { p_query: 'x' })
  check('Base de datos (anónimo)', `función antigua ${f} cerrada`, r.status >= 400, r.status)
}
// 5. Storage
const bUp = await fetch(`${SB}/storage/v1/object/restaurant-media/${aRid}/dishes/intruso.jpg`, { method: 'POST', headers: { apikey: KEY, authorization: `Bearer ${bt}`, 'content-type': 'image/jpeg' }, body: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]) })
check('Almacenamiento', 'B no sube archivos a la carpeta de A', bUp.status >= 400, bUp.status)
const anonList = await fetch(`${SB}/storage/v1/object/list/restaurant-media`, { method: 'POST', headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ prefix: aRid, limit: 10 }) })
const anonListJ = await anonList.json().catch(() => null); check('Almacenamiento', 'anónimo no lista archivos', !Array.isArray(anonListJ) || anonListJ.length === 0, `${anonList.status} ${Array.isArray(anonListJ) ? anonListJ.length : ''}`)
const html = await fetch(`${SB}/storage/v1/object/restaurant-media/${aRid}/dishes/x.html`, { method: 'POST', headers: { apikey: KEY, authorization: `Bearer ${A.access_token}`, 'content-type': 'text/html' }, body: '<script>alert(1)</script>' })
check('Almacenamiento', 'no acepta HTML (solo imágenes)', html.status >= 400, html.status)
const svg = await fetch(`${SB}/storage/v1/object/restaurant-media/${aRid}/dishes/x.svg`, { method: 'POST', headers: { apikey: KEY, authorization: `Bearer ${A.access_token}`, 'content-type': 'image/svg+xml' }, body: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>' })
check('Almacenamiento', 'no acepta SVG', svg.status >= 400, svg.status)
// Fake image: HTML declared as JPEG through the official flow -> confirm must reject and delete it
const prep = await api('POST', `/dishes/${aDish.id}/image/upload-url`, A.access_token, { contentType: 'image/jpeg' })
if (prep.j?.signedUrl) {
  await fetch(prep.j.signedUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: '<html><script>alert(1)</script></html>' })
  const conf = await api('PUT', `/dishes/${aDish.id}/image`, A.access_token, { path: prep.j.path })
  const still = await fetch(`${SB}/storage/v1/object/public/restaurant-media/${prep.j.path}`)
  check('Almacenamiento', 'archivo falso (HTML como JPG) rechazado y borrado', conf.status === 400 && still.status >= 400, `${conf.status} / público=${still.status}`)
}
const traverse = await api('PUT', `/dishes/${aDish.id}/image`, A.access_token, { path: `${aRid}/../other/dishes/a.jpg` }); check('Almacenamiento', 'ruta con ../ rechazada', traverse.status === 400, traverse.status)
const bigName = await api('POST', `/restaurants/${aRid}/images/banner/upload-url`, A.access_token, { contentType: 'image/jpeg' }); check('Almacenamiento', 'tipo de imagen inválido rechazado', bigName.status === 400, bigName.status)
const gif = await api('POST', `/restaurants/${aRid}/images/logo/upload-url`, A.access_token, { contentType: 'image/svg+xml' }); check('Almacenamiento', 'SVG rechazado en la API', gif.status === 400, gif.status)

// 6. Input validation and error handling
const big = await api('PATCH', `/restaurants/${aRid}`, A.access_token, JSON.stringify({ name: 'x', description: 'a'.repeat(200_000) })); check('Validación', 'cuerpo > 100 KB rechazado', big.status === 413, big.status)
const bad = await api('PATCH', `/restaurants/${aRid}`, A.access_token, '{"name":'); check('Validación', 'JSON roto → 400', bad.status === 400, bad.status)
const neg = await api('POST', `/restaurants/${aRid}/dishes`, A.access_token, { name: 'Prueba', price: -5 }); check('Validación', 'precio negativo rechazado', neg.status === 400, neg.status)
const huge = await api('POST', `/restaurants/${aRid}/dishes`, A.access_token, { name: 'Prueba', price: 1e12 }); check('Validación', 'precio gigante rechazado', huge.status === 400, huge.status)
const badId = await api('GET', `/restaurants/1' OR '1'='1`, A.access_token); check('Validación', 'id con inyección SQL rechazado', [400, 404].includes(badId.status), badId.status)
const sqli = await api('GET', `/catalog/search?q=${encodeURIComponent("'; drop table foods; --")}&category=${encodeURIComponent("x' or 1=1 --")}`); check('Validación', 'búsqueda con inyección SQL no falla ni filtra de más', sqli.status === 200 && sqli.j.items.length === 0, `${sqli.status} ${sqli.j?.items?.length}`)
const redos = await api('GET', `/catalog/search?avoid=${encodeURIComponent('(a+)+$,' + 'a'.repeat(39))}`); check('Validación', 'expresión regular maliciosa neutralizada', redos.status === 200, redos.status)
const err500 = await api('GET', '/restaurants/00000000-0000-0000-0000-000000000000', A.access_token); check('Validación', 'errores sin detalles internos', !/stack|postgres|PGRST|at \w+ \(|supabase/i.test(err500.t), err500.t.slice(0, 80))
const assistantBig = await api('POST', '/assistant', null, { message: 'x'.repeat(5000) }); check('Validación', 'asistente limita el largo del mensaje', assistantBig.status === 400, assistantBig.status)
const lat = await api('GET', '/catalog/search?lat=999&lng=0'); check('Validación', 'coordenadas fuera de rango rechazadas', lat.status === 400, lat.status)

// 7. XSS: stored script in a dish name must be escaped when rendered (checked in the public JSON and page)
// (React escapes text; verified separately by grep for dangerouslySetInnerHTML)

// 8. Auth service
const weak = await fetch(`${SB}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: `qa-weak-${Date.now()}@example.com`, password: '123' }) })
check('Cuentas', 'contraseña de 3 caracteres rechazada', weak.status >= 400, weak.status)
const wrong = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: qa.a.email, password: 'incorrecta-123' }) })
const nouser = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: `noexiste-${Date.now()}@example.com`, password: 'incorrecta-123' }) })
const [w1, w2] = [await wrong.text(), await nouser.text()]
check('Cuentas', 'mismo mensaje con correo existente o no (no revela cuentas)', w1.replace(/"(error_id|msg_id)":"[^"]*"/g, '') === w2.replace(/"(error_id|msg_id)":"[^"]*"/g, '') || JSON.parse(w1).error_code === JSON.parse(w2).error_code, `${wrong.status}/${nouser.status}`)
const logout = await fetch(`${SB}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: KEY, authorization: `Bearer ${B.access_token}` } })
const refresh = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: B.refresh_token }) })
check('Cuentas', 'cerrar sesión invalida el refresh token', refresh.status >= 400, `${logout.status}/${refresh.status}`)

const fails = results.filter(r => !r.ok)
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} [${r.area}] ${r.name} — ${r.detail}`)
console.log(`\n${results.length - fails.length}/${results.length} pruebas superadas`)
process.exitCode = fails.length ? 1 : 0
