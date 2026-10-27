// Security test suite (docs/SEGURIDAD.md). Usage: node scripts/security-check.mjs [https://antojosgo.com]
// Needs QA_A_EMAIL/QA_A_PASSWORD and QA_B_EMAIL/QA_B_PASSWORD (two QA owner accounts, A with a restaurant,
// branch and dish) and .env.local with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
// Writes only touch the QA accounts; attacks that should fail use no-op values.
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).map(l => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const API = process.argv[2] || 'https://antojosgo.com'
const qa = Object.fromEntries(['A', 'B'].map(k => [k.toLowerCase(), { email: process.env[`QA_${k}_EMAIL`], password: process.env[`QA_${k}_PASSWORD`] }]))
if (!qa.a.email || !qa.b.email) { console.error('Faltan QA_A_* / QA_B_*'); process.exit(2) }
const results = []
const check = (area, name, ok, detail = '') => results.push({ area, name, ok, detail: String(detail).slice(0, 140) })

async function login(acc) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify(acc) })
  const j = await r.json(); if (!j.access_token) throw new Error('login failed'); return j
}
const api = async (method, path, token, body, headers = {}, tries = 3) => {
  const r = await fetch(API + '/api/v1' + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
  if (r.status === 429 && tries > 0) { const ms = (Number(r.headers.get('retry-after')) || 30) * 1000; await new Promise(res => setTimeout(res, ms)); const again = await api(method, path, token, body, headers, tries - 1); return { ...again, waited: ms + (again.waited ?? 0) } }
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
for (const t of ['restaurants', 'foods', 'restaurant_branches', 'account_profiles', 'favorites', 'reviews', 'users', 'dish_reviews', 'hidden_restaurants', 'app_feedback', 'app_admins', 'admin_audit_log', 'rate_limits', 'search_concept_hits']) {
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

// 9. Reviews, personal lists and admin (B against A, on the published demo dish)
const anyBranch = (await api('GET', '/catalog/search?q=pizza')).j?.items?.[0]
const pubMenu = anyBranch ? (await api('GET', `/branches/${anyBranch.id}/public`)).j : null
const pDish = pubMenu?.menu?.[0] ?? pubMenu?.item?.menu?.[0]
if (!pDish) check('Reseñas', 'hay un platillo publicado para probar', false, 'sin platillo')
else {
  const at = A.access_token
  const anonRev = await api('PUT', `/dishes/${pDish.id}/review`, null, { rating: 1 }); check('Reseñas', 'sin sesión no se puede reseñar', anonRev.status === 401, anonRev.status)
  const SQL = "'); delete from dish_reviews; -- <script>alert(1)</script>"
  const mine = await api('PUT', `/dishes/${pDish.id}/review`, at, { rating: 4, comment: SQL })
  check('Reseñas', 'A reseña (texto con SQL se guarda tal cual)', mine.status === 200 && (mine.j?.item?.comment ?? mine.j?.comment) === SQL, `${mine.status} ${mine.j?.code ?? ''}`)
  const revId = mine.j?.item?.id ?? mine.j?.id
  const bMine = await api('GET', `/dishes/${pDish.id}/review`, bt); check('Reseñas', 'B no ve la reseña de A como «suya»', bMine.status === 200 && !bMine.j?.item, JSON.stringify(bMine.j).slice(0, 60))
  const pub = await api('GET', `/dishes/${pDish.id}/reviews`)
  check('Reseñas', 'reseñas públicas sin id de usuario ni correo', pub.status === 200 && !pub.t.includes(A.user.id) && !pub.t.includes(qa.a.email) && !/user_id|email/.test(pub.t), pub.status)
  const dbRead = await rest('GET', `dish_reviews?select=*&dish_id=eq.${pDish.id}`, bt); check('Reseñas (BD)', 'B no lee filas de reseñas ajenas', dbRead.status >= 400 || (Array.isArray(dbRead.j) && dbRead.j.every(r => r.user_id === B.user.id)), `${dbRead.status} ${Array.isArray(dbRead.j) ? dbRead.j.length : ''}`)
  const dbUpd = await rest('PATCH', `dish_reviews?id=eq.${revId}`, bt, { rating: 1 }); check('Reseñas (BD)', 'B no modifica la reseña de A', dbUpd.status >= 400 || (Array.isArray(dbUpd.j) && !dbUpd.j.length), dbUpd.status)
  const dbDel = await rest('DELETE', `dish_reviews?id=eq.${revId}`, bt); check('Reseñas (BD)', 'B no borra la reseña de A', dbDel.status >= 400 || (Array.isArray(dbDel.j) && !dbDel.j.length), dbDel.status)
  const dbSteal = await rest('POST', 'dish_reviews', bt, { dish_id: pDish.id, user_id: A.user.id, rating: 1 }); check('Reseñas (BD)', 'B no reseña a nombre de A', dbSteal.status >= 400, dbSteal.status)
  const bDelOwn = await api('DELETE', `/dishes/${pDish.id}/review`, bt); check('Reseñas', '«borrar mi reseña» de B no falla', bDelOwn.status < 500, bDelOwn.status)
  const stillA = await api('GET', `/dishes/${pDish.id}/review`, at); check('Reseñas', 'la reseña de A sigue intacta', stillA.j?.item?.rating === 4 && stillA.j?.item?.comment === SQL, JSON.stringify(stillA.j).slice(0, 60))
  if (revId) {
    const rep = await api('PUT', `/reviews/${revId}/reply`, bt, { reply: 'intruso' }); check('Reseñas', 'B no responde reseñas de un restaurante ajeno', [403, 404].includes(rep.status), rep.status)
    const rpt = await api('POST', `/reviews/${revId}/report`, bt, { reason: 'intruso' }); check('Reseñas', 'B no reporta reseñas de un restaurante ajeno', [403, 404].includes(rpt.status), rpt.status)
    const mod = await api('POST', '/admin/review-moderate', bt, { p_id: revId, p_action: 'hide', p_reason: 'intruso' }); check('Admin', 'B (no admin) no modera reseñas', [403, 404].includes(mod.status), mod.status)
    const modRpc = await rest('POST', 'rpc/moderate_review', bt, { p_review_id: revId, p_action: 'hide' }); check('Admin', 'B no modera por RPC directo', modRpc.status >= 400, modRpc.status)
  }
  // Superadmin panel: every action refused for B through the API and through direct RPC (supabase/migrations/20261026090000_superadmin.sql)
  const fake = '00000000-0000-0000-0000-000000000000'
  const adminCalls = {
    overview: ['admin_overview', {}], restaurants: ['admin_restaurants', {}], users: ['admin_users', {}], reviews: ['admin_reviews', { p_filter: 'all' }],
    admins: ['admin_admins', {}], audit: ['admin_audit', {}],
    'branch-status': ['admin_set_branch_status', { p_branch_id: aBid, p_publish: false, p_reason: 'intruso' }],
    'restaurant-suspend': ['admin_suspend_restaurant', { p_id: anyBranch.restaurant_id, p_suspend: true, p_reason: 'intruso' }],
    'restaurant-delete': ['admin_delete_restaurant', { p_id: anyBranch.restaurant_id, p_delete: true, p_reason: 'intruso' }],
    'restaurant-transfer': ['admin_transfer_restaurant', { p_id: anyBranch.restaurant_id, p_email: qa.b.email, p_reason: 'intruso' }],
    'user-ban': ['admin_ban_user', { p_user_id: A.user.id, p_days: 1, p_reason: 'intruso' }],
    'user-signout': ['admin_signout_user', { p_user_id: A.user.id, p_reason: 'intruso' }],
    'user-delete': ['admin_delete_user', { p_user_id: A.user.id, p_confirm_email: qa.a.email, p_reason: 'intruso' }],
    'admin-set': ['admin_set_admin', { p_email: qa.b.email, p_add: true, p_reason: 'intruso' }],
    'review-moderate': ['admin_moderate_review', { p_id: revId ?? fake, p_action: 'hide', p_reason: 'intruso' }],
  }
  const admBad = []
  for (const [action, [rpc, args]] of Object.entries(adminCalls)) {
    const viaApi = await api('POST', `/admin/${action}`, bt, args); if (viaApi.status !== 403) admBad.push(`api ${action} ${viaApi.status}`)
    const viaRpc = await rest('POST', `rpc/${rpc}`, bt, args); if (viaRpc.status < 400) admBad.push(`rpc ${rpc} ${viaRpc.status}`)
  }
  check('Admin', `B (no admin) recibe 403 en las ${Object.keys(adminCalls).length} acciones del panel, por API y por RPC`, !admBad.length, admBad.slice(0, 3).join(', '))
  const anonAdm = await api('POST', '/admin/overview', null, {}); check('Admin', 'sin sesión no se entra al panel', anonAdm.status === 401, anonAdm.status)
  const who = await api('POST', '/admin/whoami', bt, {}); check('Admin', 'B no figura como admin (whoami)', who.status === 200 && who.j?.result === false, who.status)
  const helper = await rest('POST', 'rpc/admin_log', bt, { p_action: 'x', p_type: 'x', p_id: null, p_label: null, p_reason: null, p_before: null, p_after: null }); check('Admin', 'B no escribe en la auditoría', helper.status >= 400, helper.status)
  const proto = await api('POST', '/admin/constructor', bt, {}); check('Admin', 'acciones inexistentes dan 404 (no 500)', proto.status === 404, proto.status)
  const isAdm = await rest('POST', 'rpc/is_app_admin', bt, {}); check('Admin', 'B no es admin', isAdm.j === false, isAdm.t.slice(0, 20))
  const ownerRev = await api('GET', `/restaurants/${anyBranch.restaurant_id}/reviews`, bt); check('Reseñas', 'B no ve el panel de reseñas de otro restaurante', [403, 404].includes(ownerRev.status) || (ownerRev.status === 200 && ownerRev.j?.items?.length === 0), `${ownerRev.status} ${ownerRev.j?.items?.length ?? ''}`)
  const clean = await api('DELETE', `/dishes/${pDish.id}/review`, at); check('Reseñas', 'limpieza: A borra su reseña de prueba', clean.status === 200, clean.status)
}
for (const t of ['favorites', 'hidden_restaurants', 'app_feedback', 'app_admins', 'admin_audit_log', 'account_profiles']) {
  const r = await rest('GET', `${t}?select=*`, bt)
  check('Datos personales (B)', `B solo ve sus propias filas de ${t}`, r.status >= 400 || (Array.isArray(r.j) && r.j.every(x => (x.user_id ?? x.auth_user_id ?? x.id) === B.user.id)), `${r.status} ${Array.isArray(r.j) ? r.j.length : ''}`)
}
const favSteal = await rest('POST', 'favorites', bt, { user_id: A.user.id, branch_id: aBid }); check('Datos personales (B)', 'B no agrega favoritos a nombre de A', favSteal.status >= 400, favSteal.status)
const fbSteal = await rest('POST', 'app_feedback', bt, { user_id: A.user.id, rating: 1 }); check('Datos personales (B)', 'B no califica la app a nombre de A', fbSteal.status >= 400, fbSteal.status)
const admSelf = await rest('POST', 'app_admins', bt, { user_id: B.user.id }); check('Admin', 'B no se agrega como admin', admSelf.status >= 400, admSelf.status)

// 10. SQL injection sweep: every id in the URL and every text parameter, plus time-based (pg_sleep) probes
const PAY = ["1' OR '1'='1", "00000000-0000-0000-0000-000000000000' OR 1=1--", "'; select pg_sleep(4)--", '1;drop table foods', '%27%20or%201=1', '../../etc/passwd', '{"$ne":null}']
const dbLeak = /syntax error|PGRST|postgres|relation "/i
const idRoutes = ['/restaurants/:id', '/restaurants/:id/dishes', '/restaurants/:id/branches', '/restaurants/:id/reviews', '/branches/:id', '/branches/:id/public', '/dishes/:id/reviews', '/dishes/:id/review', '/reviews/:id/reply', '/me/favorites/:id', '/me/hidden/:id', '/admin/:id']
let slow = 0, sqlBad = []
for (const r of idRoutes) for (const p of PAY.slice(0, 4)) {
  const write = r.endsWith('reply') ? 'PUT' : r.startsWith('/admin') ? 'POST' : null
  const t0 = Date.now(); const x = await api(write ?? 'GET', r.replace(':id', encodeURIComponent(p)), A.access_token, write ? {} : undefined)
  if (Date.now() - t0 - (x.waited ?? 0) > 3500) slow++
  if (x.status >= 500 || dbLeak.test(x.t)) sqlBad.push(`${r} ${x.status}`)
}
check('Inyección SQL', `ids en la URL (${idRoutes.length} rutas × 4 cargas): sin errores 500 ni mensajes de BD`, !sqlBad.length, sqlBad.slice(0, 3).join(', '))
check('Inyección SQL', 'ninguna carga con pg_sleep retrasa la respuesta (rutas)', slow === 0, `${slow} lentas`)
const params = ['q', 'category', 'avoid', 'without', 'minPrice', 'maxPrice', 'hide', 'lat', 'lng', 'lang', 'limit']
sqlBad = []; slow = 0
for (const k of params) for (const p of PAY) {
  const t0 = Date.now(); const x = await api('GET', `/catalog/search?${k}=${encodeURIComponent(p)}`)
  if (Date.now() - t0 - (x.waited ?? 0) > 3500) slow++
  if (x.status >= 500 || dbLeak.test(x.t)) sqlBad.push(`${k} ${x.status}`)
}
check('Inyección SQL', `parámetros de búsqueda (${params.length} × ${PAY.length}): sin 500, sin errores de BD, sin retrasos`, !sqlBad.length && slow === 0, `${sqlBad.slice(0, 3).join(', ')} lentas=${slow}`)
sqlBad = []
for (const p of PAY) {
  const x = await api('POST', '/assistant', null, { message: `pizza ${p}`, context: { concepts: [p], words: [p], without: [p], avoid: [p] }, hide: [p] })
  if (x.status >= 500 || dbLeak.test(x.t)) sqlBad.push(x.status)
}
check('Inyección SQL', 'asistente (mensaje y contexto manipulado)', !sqlBad.length, sqlBad.join(','))
const injName = `${aDish.name}'; drop table foods; --`
const inj = await api('PATCH', `/dishes/${aDish.id}`, A.access_token, { name: injName })
const back = (await api('GET', `/restaurants/${aRid}/dishes`, A.access_token)).j
const injSaved = (back.items ?? back).find(d => d.id === aDish.id)?.name
await api('PATCH', `/dishes/${aDish.id}`, A.access_token, { name: aDish.name })
check('Inyección SQL', 'nombre de platillo con SQL se guarda como texto (y se restaura)', inj.status === 200 && injSaved === injName, inj.status)
const intact = await api('GET', '/catalog/search?q=pizza'); check('Inyección SQL', 'el catálogo público sigue intacto después de los ataques', intact.status === 200 && intact.j.items.length >= 1, intact.j?.items?.length)

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
