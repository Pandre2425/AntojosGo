# AntojosGo: plan del proyecto

Actualizado el 13 de octubre de 2026.

AntojosGo ayuda a los comensales de Guatemala (piloto en Quetzaltenango) a encontrar dónde comer lo que se les antoja, y a los restaurantes a publicar sus sedes y su menú. Tiene una **web** (comensales y restaurantes) y una **app Android** (comensales y restaurantes) que comparten el mismo servidor, la misma base de datos y las mismas reglas.

- Web en producción: https://antojos-go.vercel.app
- Código: https://github.com/Pandre2425/AntojosGo (rama `main`; cada cambio subido se publica solo en Vercel)
- App: APK firmado que se distribuye fuera de Google Play (`scripts/build-apk.ps1`)

---

## 1. Lo que ya está hecho

### Comensal

| Función | Web | App | Notas |
|---|:-:|:-:|---|
| Entrar sin cuenta y buscar | ✅ | ✅ | La cuenta solo hace falta para favoritos |
| Inicio: «¿Qué estás buscando?», atajos con símbolo (🍕 Pizza, 🌮 Tacos…) ordenados por lo más buscado, mapa con todas las sedes | ✅ | ✅ | El orden usa los últimos 30 días; solo guarda la categoría buscada, nunca el texto ni quién buscó |
| Asistente conversacional | ✅ | ✅ | Primero reglas propias; IA (Gemini Flash-Lite) solo como último recurso y si hay clave configurada |
| Búsqueda por platillo, ingrediente, restaurante o municipio | ✅ | ✅ | Ignora acentos y mayúsculas |
| Filtros: abierto ahora, tipo de negocio, «quiero» (picante, vegetariano…), «sin» alérgenos | ✅ | ✅ | |
| Restricciones en el asistente («soy alérgico al maní», «sin cebolla») | ✅ | ✅ | Se recuerdan durante la conversación |
| Cerca de mí (GPS) con distancia en línea recta | ✅ | ✅ | La web requiere HTTPS |
| Ficha de la sede: foto, logo, horario, abierto/cerrado, llamar, WhatsApp | ✅ | ✅ | |
| **Cómo llegar** (Google Maps con la ruta; «abrir en otra app» para Waze) | ✅ | ✅ | |
| Menú con **«Ver detalles»**: foto grande, tipo de plato, cocina, características, ingredientes, alérgenos | ➖ | ✅ | La web muestra los mismos datos en la lista |
| Favoritos | ✅ | ✅ | Requiere cuenta |
| **Reseñas de platillos**: 1 a 5 estrellas enteras y comentario opcional; promedio con medias estrellas (★★★½ 3.5) en el platillo, el restaurante y los resultados | ✅ | ✅ | Anónimas; una por cuenta y platillo, editable; requiere cuenta confirmada. El restaurante muestra el promedio de todos sus platillos |
| Aviso de nueva versión de la app | — | ✅ | Solo acepta enlaces de los Releases del repositorio |
| Campana de notificaciones y descarga del APK («Próximamente en Google Play») | ✅ | ✅ | Avisos editables en `public/announcements.json` |
| **Calificar la app** (1 a 5 estrellas) y comentario opcional de mejora | ✅ | ✅ | En «Mi cuenta» (y en la página del restaurante en la web). Una por cuenta; al volver a enviar se reemplaza |

### Restaurante

| Función | Web | App | Notas |
|---|:-:|:-:|---|
| Registro e inicio de sesión | ✅ | ✅ | Supabase Auth. Confirmación de correo, «¿Olvidaste tu contraseña?» y «Reenviar confirmación» (correo por Gmail SMTP) |
| Varios negocios por cuenta y varias sedes por negocio | ✅ | ✅ | |
| Perfil: nombre, descripción, **tipo de negocio libre con sugerencias**, logo y foto del local | ✅ | ✅ | «pizzeria» se guarda como el «Pizzería» existente |
| Sedes: dirección, ubicación en mapa, teléfono/WhatsApp, horario por día, publicar/despublicar | ✅ | ✅ | No se publica una sede sin ubicación |
| Menú con buscador y filtros (estado, etiquetas, alérgenos) | ✅ | ✅ | Incluye ingredientes |
| Formulario de platillo: precio solo en número (quetzales), descripción amplia, foto | ✅ | ✅ | |
| Detalles separados: **tipo de plato, cocina, características, ingredientes**, cada uno con opciones rápidas y espacio para escribir los propios (primero se escribe, después se eligen) | ✅ | ✅ | Ej.: «Colombiana», «Bandeja paisa» |
| **Alérgenos**: interruptor «contiene alérgenos», lista común + alérgenos escritos por el restaurante (ej. mostaza) | ✅ | ✅ | Sin declarar nunca se muestra como «seguro» |
| Mostrar/ocultar, marcar agotado, eliminar platillos | ✅ | ✅ | Al eliminar se borra también su foto |
| **Reseñas**: ver todas, responder públicamente y reportar | ✅ | ✅ | No puede borrar ni ocultar reseñas; tampoco reseñar sus propios platillos |

### Calidad y seguridad

- 54 pruebas automáticas (`npm test`) y una batería de seguridad contra producción (`node scripts/security-check.mjs`): 80 de 80 controles superados. Detalle en [SEGURIDAD.md](SEGURIDAD.md).
- Cada función nueva se verificó en el navegador (Playwright) y en el emulador Android antes de subirla.

---

## 2. Cómo está hecho

### Arquitectura

```
 Web (Next.js, navegador) ─┐
                           ├──> API /api/v1 (Next.js en Vercel) ──> Supabase (Postgres + PostGIS, Auth, Storage)
 App Android (Expo) ───────┘                                    └─> Gemini (solo si las reglas no entienden)
```

- **Una sola API para web y app** (`app/api/v1/*`). Las pantallas nunca escriben directo en tablas; todo pasa por la API, que valida los datos con las mismas reglas que usa el cliente.
- **Contratos compartidos** (`shared/contracts/*`): esquemas zod para menú, sedes, horarios, búsqueda, asistente e inicio. Web, app y servidor importan el mismo archivo, así una regla (por ejemplo, «un ingrediente a la vez») vale igual en todos lados.
- **Cliente de API compartido** (`lib/api-client.ts`): la web y la app llaman a los mismos métodos tipados.

### Carpetas

| Carpeta | Contenido |
|---|---|
| `app/` | Páginas de la web y rutas de la API (`app/api/v1`) |
| `components/` | Pantallas y piezas de la web (React + Tailwind + shadcn/ui) |
| `modules/` | Acceso a datos por dominio: `catalog` (búsqueda, asistente, inicio) y `restaurants` (negocios, sedes, menú, imágenes) |
| `shared/contracts/` | Reglas y tipos compartidos |
| `lib/` | Cliente de API, envoltorio de rutas (`lib/server/api.ts`), IA, utilidades |
| `mobile/` | App Expo: `app/` (pantallas con Expo Router), `src/` (componentes y servicios) |
| `supabase/migrations/` | Todos los cambios de base de datos, en orden; `supabase/manual/` los que hay que correr a mano |
| `tests/`, `scripts/` | Pruebas y scripts (APK, seguridad) |
| `docs/` | Documentación |

### Servidor y seguridad

- Cada ruta pasa por `route()` (`lib/server/api.ts`): identificador de petición, verificación del token (firma y vencimiento), límite de tamaño, errores uniformes en español sin detalles internos.
- **Doble barrera**: la API comprueba que el dueño sea quien pide, y la base de datos lo vuelve a exigir con RLS (reglas por fila) y permisos por columna. Publicar una sede o poner una imagen solo es posible mediante funciones que validan todo.
- La web y la app usan solo la **clave publicable** de Supabase; ninguna clave secreta vive en Vercel, en el navegador ni en el APK.
- Cabeceras de seguridad (CSP, HSTS, anti-iframe), solo HTTPS, CORS cerrado.

### Base de datos (Supabase)

- Tablas: `restaurants` (negocio, tipo, logo, portada), `restaurant_branches` (sede, ubicación, horario, contacto, estado), `foods` (platillo: precio, foto, `dish_types`, `cuisines`, `features`, ingredientes, alérgenos, `allergens_other`), `favorites`, `account_profiles`, `search_concept_hits` (conteo anónimo para «lo más buscado»).
- La búsqueda vive en una función SQL (`search_catalog_v2`): busca en nombre, tipo, descripción, dirección, ingredientes y detalles; aplica filtros, alérgenos excluidos y distancia (PostGIS); solo devuelve sedes y platillos publicados.
- 16 migraciones en `supabase/migrations/` (del catálogo público de octubre 2 a los detalles del platillo de octubre 13). Ninguna borra datos.

### Asistente

1. Reglas propias (`shared/contracts/assistant.ts`): reconoce comidas (pizza, típica, mariscos…), intenciones («cerca», «barato», «abierto»), exclusiones («sin maní», «no como cebolla») y recuerda el contexto de la conversación.
2. Si las reglas no entienden, consulta a Gemini Flash-Lite con un esquema cerrado (solo puede devolver filtros, nunca texto libre para la base).
3. La respuesta siempre sale de datos reales de la base; si no hay coincidencias lo dice.

### Imágenes

- Subida en dos pasos: la API entrega una URL firmada de un solo uso, el archivo va directo a Storage y el servidor revisa los bytes reales (JPG/PNG/WebP, máx. 5 MB) antes de aceptarlo. Un archivo falso se borra.
- Antes de subir, la web y la app reducen la foto a 1200 px y la vuelven a codificar, lo que elimina los datos de ubicación (EXIF).

### Mapas

- App: Google Maps (clave restringida a la firma de la app). Web: OpenStreetMap con Leaflet. En ambos, un dedo desplaza la página y dos dedos hacen zoom.
- «Cómo llegar» abre Google Maps con la ruta; en Android también se ofrece abrir otra app.

### App Android

- Expo SDK 57 / React Native 0.86, Expo Router con **5 pestañas**: Inicio · Buscar · Asistente · Favoritos · Mi cuenta.
- Sistema de diseño en `mobile/src/ui.tsx`: colores, tamaños de letra, espacios y componentes (botón, campo, chip, campo de etiquetas).
- Sesión guardada cifrada (SecureStore); solo tráfico HTTPS; pide 7 permisos (ubicación, internet, red, lectura de fotos en Android antiguo, vibración, wake lock).
- APK: `.\scripts\build-apk.ps1 -ApiUrl https://antojos-go.vercel.app` (añadir `-Emulator` para probar en el emulador). Firmado con la llave propia (`~/.antojosgo`), verifica la firma al terminar.
- Aviso de actualización: la app lee `public/app-version.json` del servidor al abrir.

### Web

- Next.js 15.5 (App Router), React 19, Tailwind y shadcn/ui; desplegada en Vercel (plan gratuito).
- Comensal en `/` (Descubrir · Para ti · Explorar · Favoritos · Mi perfil); restaurante en `/restaurant`.

---

## 3. Lo que falta

### Urgente (acciones tuyas, unos 15 minutos; detalle en [SEGURIDAD.md](SEGURIDAD.md))

1. Supabase → API Keys → **desactivar las claves antiguas (legacy)**: hay secretos viejos en el historial público de GitHub.
2. Supabase → **cambiar la contraseña de la base de datos**.
3. ✅ PostGIS movido a `extensions` y GraphQL apagado (17 de octubre). Batería de seguridad: 80/80.
4. ✅ Contraseña mínima de 10 caracteres en Auth (comprobado el 16 de octubre).
5. ✅ Claves de Firebase y Cloudinary borradas (17 de octubre).

### Para el piloto

6. **Publicar la app 0.6.0** (precio, «Sorpréndeme», «No me interesa», voz, reseñas, logo e ícono, animación de carga, inicio nuevo, pestañas, formulario de platillos, «Cómo llegar», «Ver detalles», campana, recuperación de contraseña, calificar la app): subirla a Drive y, para el aviso automático, a GitHub Releases.
7. ✅ Despublicadas «QA Claude Cocina» y «QA Antojos Cocina» (16 de octubre). Falta decidir «Restaurante prueba1».
8. Mover «Pablo pizza» a una cuenta con correo real (la actual usa un correo inventado).
9. Lista «Para que te encuentren» para el restaurante (qué le falta para aparecer en búsquedas).
10. ✅ «Copiar el lunes a todos los días» en el horario (web y app).
11. Pulir la web: inicio y Explorar con el mismo nivel visual que la app; «Ver detalles» del platillo en la web.

### Del documento del producto (PRODUCT-SPEC): hecho el 18 de octubre

- ✅ «Sorpréndeme» (web y app): elige al azar entre los resultados de la búsqueda y filtros actuales, sin repetir el anterior.
- ✅ «No me interesa» (web y app): el restaurante desaparece de las búsquedas y del asistente de esa cuenta; se puede mostrar de nuevo en «Mi cuenta». Tabla `hidden_restaurants`, máximo 200.
- ✅ Búsqueda por voz: en la web con el reconocimiento del navegador (Chrome, Edge, Android); en la app con `expo-speech-recognition` (reconocimiento de Google). Si el dispositivo no lo tiene, el micrófono no aparece.
- ✅ Filtro de precio (web y app): «Hasta Q25», «Q25 a Q50», «Q50 a Q100», «Más de Q100». Se filtra en la base (`search_catalog_v3`).
- ✅ Panel de reseñas reportadas en `https://antojos-go.vercel.app/admin`: «Mantener» u «Ocultar» (sale de la lista y del promedio) y «Mostrar de nuevo». Solo administradores (`app_admins`); hoy, la cuenta pabloruiz0123@gmail.com.
- ✅ Accesibilidad: en la web, «Tamaño del texto» (Normal, Grande, Muy grande) en «Mi perfil»; en la app sigue el tamaño de letra de Android, con un acceso directo a esos ajustes. Ambas respetan «reducir animaciones».
- ⏳ Iniciar sesión con Google: código listo en web y app; falta crear la credencial y activarla (`docs/GOOGLE-LOGIN.md`). El botón aparece solo cuando esté activado.

### Decisiones pendientes

12. Clave de Gemini (`GEMINI_API_KEY` en `.env.local` y en Vercel).
13. ✅ Confirmación de correo y recuperación de contraseña: activas y probadas de punta a punta el 16 de octubre (SMTP Gmail, `docs/EMAIL-SETUP.md`).
14. Límite de peticiones en la API (antes de usar IA de pago).
15. Documentos de la tesis en el repositorio público.
16. Varios administradores por restaurante; segundo proyecto de Supabase para pruebas.

### Menores

17. ✅ Logo de AntojosGo en la web (favicon, encabezado, inicio de sesión) y en la app (ícono, pantalla de arranque). Animación de carga: un shuco que se arma pieza por pieza.
18. Borrar el código heredado (`android/` de Capacitor, `AllCode.txt`, rutas y componentes antiguos sin uso).
19. Respaldos de la base y ensayo de restauración.

Pedidos, pagos y repartidores no forman parte del proyecto.

---

### Ver las calificaciones

En Supabase → SQL Editor:

```sql
-- Resumen
select round(avg(rating), 2) as promedio, count(*) as total,
       count(*) filter (where rating >= 4) as buenas, count(*) filter (where rating <= 2) as malas
  from app_feedback;
-- Comentarios, más recientes primero
select rating, comment, platform, app_version, updated_at from app_feedback
 where comment is not null order by updated_at desc;
```

## 4. Documentos relacionados

| Documento | Para qué |
|---|---|
| [PLAN-BACKEND-WEB.md](PLAN-BACKEND-WEB.md) | Avance detallado del servidor y la web; lista completa de pendientes (sección 8) |
| [SEGURIDAD.md](SEGURIDAD.md) | Controles de seguridad, resultados de las pruebas y acciones pendientes |
| [GUIA-WEB-Y-APK.md](GUIA-WEB-Y-APK.md) | Cómo desplegar la web y compilar el APK |
| [EXECUTION-PLAN.md](EXECUTION-PLAN.md) | Plan por etapas con criterios de aceptación |
| [AUTH.md](AUTH.md), [MAPS.md](MAPS.md), [MENU-FOODS.md](MENU-FOODS.md), [BRANCHES.md](BRANCHES.md) | Detalle por módulo |

## Antecedentes

La primera versión (septiembre 2025) era un prototipo con Capacitor que mostraba la web dentro de Android, acceso demo y datos en el navegador. Se reemplazó por la arquitectura actual: API propia, Supabase con reglas por fila, app nativa con Expo y despliegue en Vercel.
