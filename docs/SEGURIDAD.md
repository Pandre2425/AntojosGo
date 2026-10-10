# Seguridad de AntojosGo (web y app)

Revisión y pruebas del 10 de octubre de 2026, contra producción (`https://antojos-go.vercel.app`) y el APK 0.3.1.
Las pruebas automáticas se repiten con:

```
node scripts/security-check.mjs            # requiere QA_A_EMAIL/PASSWORD, QA_B_EMAIL/PASSWORD y .env.local
```

Leyenda: ✅ cumple y se probó · 🔧 falló y se corrigió · ⚠️ pendiente (acción tuya o decisión) · ➖ riesgo aceptado, con motivo.

## 1. Controles que debe tener la web (servidor y navegador)

| # | Control | Estado | Cómo se comprobó |
|---|---|---|---|
| W1 | Solo HTTPS; HTTP redirige y HSTS de 2 años | ✅ | HTTP → 308; cabecera `Strict-Transport-Security` |
| W2 | Cabeceras: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, sin `X-Powered-By` | ✅ | Prueba de cabeceras |
| W3 | CORS: otros sitios no pueden usar la API desde el navegador | ✅ | `OPTIONS` desde `evil.example` sin `Access-Control-Allow-Origin` |
| W4 | Sin mapas de código fuente públicos | ✅ | 403 |
| W5 | Toda ruta privada exige sesión válida; se rechazan tokens falsos (`alg: none`), alterados o la clave pública | ✅ | 9 rutas × 3 tokens → 401 |
| W6 | Un dueño no puede ver ni tocar datos de otro (restaurante, sedes, platillos, fotos, horarios, publicación) | ✅ | 15 intentos de la cuenta B contra A → 400/404 o lista vacía; el platillo de A sigue intacto |
| W7 | Doble barrera: la API comprueba el dueño **y** la base (RLS) lo vuelve a exigir | ✅ | Ataques directos a la base con la sesión de B (abajo) |
| W8 | Validación de toda entrada con zod: tamaños, tipos, rangos, ids UUID | ✅ | Cuerpo > 100 KB → 413; JSON roto → 400; precio negativo/gigante → 400; coordenadas fuera de rango → 400 |
| W9 | Inyección SQL imposible (consultas parametrizadas, sin SQL dinámico) | ✅ | `'; drop table…` en búsqueda y categoría → 0 resultados, sin error |
| W10 | Expresiones regulares maliciosas (ReDoS) neutralizadas | ✅ | La API sanea a `[a-z0-9]`; llamadas directas a la base con regex patológicas responden en ~100 ms |
| W11 | XSS: React escapa todo el texto; no hay `dangerouslySetInnerHTML` en pantallas en uso | ✅ | Búsqueda en el código (solo en `ui/chart.tsx`, que no se usa) |
| W12 | Errores sin detalles internos (sin trazas, sin mensajes de Postgres) | ✅ | Respuestas 4xx/5xx revisadas |
| W13 | Subida de imágenes: URL firmada de un solo uso, carpeta del dueño, solo JPG/PNG/WebP ≤ 5 MB, verificación de los bytes reales, borrado si es falsa | ✅ | HTML disfrazado de JPG → rechazado y borrado; SVG/HTML directos → 400; `../` en la ruta → 400; B no sube a la carpeta de A |
| W14 | Las fotos pierden EXIF (incluida la ubicación GPS) al subirse | ✅ | Se re-codifican en el navegador y en la app |
| W15 | Ninguna clave secreta en el código, en Vercel ni en el navegador; solo la clave publicable | ✅ | `.env.local` y Vercel usan `sb_publishable_…`; ningún `sb_secret_` en el código |
| W16 | Contenido público solo de sedes **publicadas** | ✅ | Todas las funciones públicas filtran `published` |
| W17 | Las sugerencias de "tipo de negocio" solo muestran tipos de restaurantes publicados | 🔧 | Antes incluían cuentas no publicadas (cualquiera podía inyectar texto en el filtro de todos) |
| W18 | Límite de peticiones por IP en la API (abuso, costos) | ⚠️ | No existe. Supabase Auth limita inicios de sesión y registros; la IA está topada por la cuota gratuita de Gemini. Ver §5 |

## 2. Controles de la base de datos y el almacenamiento (Supabase)

| # | Control | Estado | Cómo se comprobó |
|---|---|---|---|
| D1 | RLS activo en todas las tablas de la app | ✅ | `account_profiles`, `favorites`, `foods`, `restaurant_branches`, `restaurants`, `reviews`, `users` |
| D2 | Un visitante sin cuenta no lee ninguna tabla | ✅ | 7 tablas → 401 |
| D3 | Permisos por columna: no se puede cambiar el dueño, publicar sin validar ni poner una URL arbitraria como logo | ✅ | Intentos directos → 403 |
| D4 | Funciones privilegiadas (`SECURITY DEFINER`) con `search_path` fijo y comprobación de dueño | ✅ | Revisión de las 16 funciones; B no despublica ni quita el logo de A por RPC |
| D5 | Funciones antiguas sin uso, cerradas al público | 🔧 | `assistant_search`, `search_public_catalog`, `get_public_dishes`, `get_public_menu` → ahora 401 |
| D6 | GraphQL no expone tablas a visitantes | ✅ | |
| D7 | Almacenamiento: nadie lista archivos; solo el dueño escribe en su carpeta | ✅ | |
| D8 | `spatial_ref_sys` (PostGIS) no modificable por visitantes | ⚠️ **falla** | Un visitante puede escribir en esa tabla (podría romper las distancias). `REVOKE` no basta porque la tabla es de `supabase_admin`. Solución: script manual `supabase/manual/20261010_move_postgis_to_extensions.sql` |
| D9 | Claves antiguas (legacy JWT) desactivadas | ⚠️ **crítico** | Siguen activas. Ver §4 |
| D10 | Contraseñas: mínimo 10 caracteres también en el servidor; protección contra contraseñas filtradas | ⚠️ | La app exige 10, pero Supabase acepta 6 si se le llama directo. La protección contra filtradas requiere plan Pro |
| D11 | El inicio de sesión no revela si un correo está registrado | ✅ | Mismo error para correo existente e inexistente |
| D12 | Cerrar sesión invalida el token de renovación | ✅ | |
| D13 | Confirmación de correo al registrarse | ⚠️ decisión | Desactivada: alguien podría registrarse con un correo ajeno. Activarla requiere SMTP (`docs/EMAIL-SETUP.md`) |

## 3. Controles de la app Android

| # | Control | Estado | Cómo se comprobó |
|---|---|---|---|
| A1 | Solo tráfico HTTPS (`usesCleartextTraffic=false`); el script de compilación rechaza servidores HTTP | ✅ | Manifiesto compilado |
| A2 | No depurable en release; firmada con la llave propia | ✅ | Manifiesto; `apksigner` SHA-1 `21:35:7A…` |
| A3 | Sesión guardada cifrada (SecureStore / Android Keystore), excluida de copias de seguridad | ✅ | `mobile/src/supabase.ts`; reglas `secure_store_backup_rules` |
| A4 | Sin secretos dentro del APK | ✅ | Solo la clave publicable; el texto `sb_secret_` del bundle es una comprobación de la librería `supabase-js`, no una clave |
| A5 | Clave de Google Maps restringida a la app (paquete + SHA-1 de la firma) | ✅ | Configurada en Google Cloud |
| A6 | Mínimos permisos | 🔧 | Pedía 15 (cámara, micrófono, huella, ventanas superpuestas, arranque al encender…). Ahora pide solo ubicación, internet, red, lectura de fotos (Android ≤ 12), vibración y wake lock. Probado: ubicación y selector de fotos funcionan |
| A7 | Selector de fotos del sistema: la app solo ve las fotos que el usuario elige | ✅ | Emulador |
| A8 | El aviso de actualización solo abre enlaces de `github.com/Pandre2425/AntojosGo/releases/` | ✅ | `shared/contracts/app-version.ts` |
| A9 | La misma API y las mismas reglas que la web (la app no habla directo con tablas) | ✅ | |

## 4. Hallazgo crítico: secretos en el historial público de git

El repositorio es público. Commits de octubre de 2025 (proyecto anterior, antes de la reescritura) incluyeron un `.env` con
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `FIREBASE_PRIVATE_KEY`, `CLOUDINARY_API_SECRET`, y archivos `google-services.json` /
`firebaseConfig.ts` con claves de Google. Ya no están en la versión actual, pero **siguen en el historial**.

La clave `anon` antigua del proyecto actual es de septiembre de 2025, así que es muy probable que esa `service_role` sea de
**este** proyecto. Esa clave salta toda la seguridad de la base (RLS). Acciones, en orden:

1. **Supabase → Project Settings → API Keys → Legacy API Keys → Disable.** La web y la app usan solo las claves nuevas; no se rompe nada.
2. **Supabase → Project Settings → Database → Reset database password** (por `DATABASE_URL`).
3. **Google Cloud / Firebase (proyecto antiguo):** borrar la cuenta de servicio cuya clave privada se filtró y las API keys antiguas, o eliminar el proyecto si ya no se usa.
4. **Cloudinary:** regenerar el API secret o cerrar la cuenta si no se usa.
5. Opcional: reescribir el historial (`git filter-repo`) o hacer privado el repositorio. No sustituye a los pasos 1–4: lo publicado debe darse por comprometido.

## 5. Riesgos aceptados y pendientes

- ➖ **Dependencias con avisos** (web: `postcss`/`nanoid` dentro de Next.js; app: `shell-quote`, `node-forge`, `braces`, `source-map-js`, `uuid`, `decode-uri-component`). Todas salvo la última son herramientas de compilación o de desarrollo que no se ejecutan en el servidor ni en el teléfono. `decode-uri-component` solo permitiría congelar la propia app con un enlace malformado. Revisar al actualizar Expo/Next.
- ➖ **CSP con `'unsafe-inline'` en scripts**, porque Next.js inyecta scripts en línea. Mejorable con nonces si se requiere.
- ⚠️ **Límite de peticiones (W18):** necesita un servicio compartido (por ejemplo Upstash Redis gratuito o reglas del firewall de Vercel). Recomendado antes de activar Gemini con facturación.
- ⚠️ **PostGIS en `public` (D8):** ejecutar el script manual.
- ⚠️ Respaldos y ensayo de restauración (`docs/EXECUTION-PLAN.md` §4.6).
