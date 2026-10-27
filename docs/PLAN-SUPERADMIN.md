# Plan: panel de superadministrador

**Fase 1 construida el 26 de octubre de 2026** (`/admin`, `supabase/migrations/20261026090000_superadmin.sql`, `modules/admin/data/admin.ts`). Decisiones tomadas: MFA obligatorio, solo superadmin (sin moderador por ahora), sin borrado definitivo automático (lo eliminado queda restaurable). Fuera de la fase 1: regla «sin platillos no aparece» (queda como alerta en el tablero), exportar datos de un usuario, enviar recuperación de contraseña.

Estado de partida (26 de octubre de 2026): `/admin` solo modera reseñas reportadas. Existe la tabla `app_admins` (lista de administradores, sin roles) y la función `is_app_admin()`. Todo lo demás se hace hoy a mano en Supabase.

Objetivo: que el superadministrador controle **todo** AntojosGo desde la web, sin entrar a Supabase, y que cada acción quede registrada y se pueda deshacer.

---

## 1. Principios de seguridad (no negociables)

Control total no significa sin controles: una cuenta de administrador robada podría destruir el proyecto. Por eso:

1. **Doble verificación obligatoria (MFA).** Supabase Auth trae códigos TOTP gratis (Google Authenticator, Authy). Toda función de administración exige sesión con segundo factor (`aal2`); sin él, el panel solo muestra «Activa la verificación en dos pasos».
2. **Todo pasa por el servidor.** La web llama a `/api/v1/admin/*`; cada ruta llama a una función de la base de datos que vuelve a comprobar el rol. Doble barrera, igual que el resto de la app.
3. **Sin clave secreta en Vercel.** Se mantiene la regla actual: nada de `sb_secret_`. Las acciones sobre cuentas (suspender, cerrar sesiones, borrar) se hacen con funciones `SECURITY DEFINER` en la base de datos, que no necesitan esa clave.
4. **Registro de auditoría inmutable.** Cada acción guarda quién, qué, cuándo, sobre qué, el motivo y el valor anterior. Nadie puede editarlo ni borrarlo, ni siquiera el superadmin.
5. **Borrado suave primero.** Restaurantes, sedes, platillos y reseñas se marcan como eliminados y se pueden restaurar durante 30 días. El borrado definitivo es una acción aparte, solo del superadmin.
6. **Motivo obligatorio** en toda acción que afecte a otra persona (suspender, ocultar, eliminar, transferir).
7. **Confirmación fuerte** para lo irreversible: escribir el nombre del restaurante o el correo de la cuenta.
8. **Protecciones:** no se puede quitar al último superadmin; un moderador no puede tocar a un admin; nadie puede quitarse a sí mismo el rol por accidente.
9. **Sin «entrar como otro usuario».** Ver la cuenta de alguien es de solo lectura. Suplantar sesiones exige la clave secreta y rompe la privacidad prometida en los términos.

---

## 2. Roles

| Rol | Puede |
|---|---|
| **Superadmin** | Todo: lo de abajo, más gestionar administradores, configuración global, borrado definitivo y exportar datos |
| **Moderador** (opcional) | Reseñas, fotos, despublicar o suspender restaurantes, suspender usuarios comunes. No ve correos completos, no borra definitivamente, no cambia configuración ni roles |

Cambio en la base: `app_admins.role` (`superadmin` | `moderador`) y `is_app_admin()` pasa a `admin_role()`.

---

## 3. Módulos del panel

### 3.1 Inicio (tablero)
- **Cifras:** usuarios totales, nuevos y activos (7 y 30 días); restaurantes publicados, en borrador y suspendidos; platillos; reseñas; búsquedas; calificación promedio de la app.
- **Gráficas:** registros por día, búsquedas por día y lo más buscado.
- **Alertas que piden acción:**
  - restaurantes publicados sin platillos (el caso de Kitos Bites);
  - sedes sin horario o sin ubicación;
  - platillos sin alérgenos declarados;
  - reseñas reportadas pendientes;
  - cuentas de restaurante inactivas más de 14 días con perfil incompleto.
- **Estado de servicios:** base de datos, Gemini (clave válida y consumo de hoy), inicio con Google, correo, versión publicada de la app.

### 3.2 Restaurantes
- Lista con buscador y filtros: estado, municipio, tipo, completitud («Para que te encuentren»), fecha y dueño.
- **Ficha completa:** perfil, sedes, horario, ubicación, menú, fotos, reseñas, dueño e historial de cambios.
- **Acciones:**
  - editar cualquier dato (perfil, sedes, horario, ubicación, menú, fotos), quedando registrado como «editado por administración»;
  - publicar o despublicar una sede;
  - **suspender** el restaurante con motivo: deja de verse y el dueño no puede volver a publicarlo hasta que se levante la suspensión;
  - **verificar**: insignia «Verificado por AntojosGo» después de confirmar que el negocio existe;
  - **transferir** a otra cuenta (por ejemplo, «Pablo pizza» a un correo real);
  - eliminar (suave) y restaurar, o borrado definitivo (solo superadmin);
  - crear un restaurante a nombre de un negocio y luego transferirlo al dueño (carga asistida).

### 3.3 Usuarios
- Lista con búsqueda por correo o nombre; filtros por tipo (comensal o restaurante), proveedor (correo o Google), confirmado, suspendido y fecha.
- **Ficha:** alta, último ingreso, proveedor, restaurantes, reseñas, favoritos, calificación de la app e historial de acciones de administración.
- **Acciones:**
  - suspender con motivo y duración (1 día, 7 días, indefinido), con `banned_until` en Supabase Auth;
  - reactivar;
  - cerrar todas sus sesiones;
  - reenviar confirmación o enviar enlace de recuperación de contraseña;
  - cambiar el rol de administrador (solo superadmin);
  - **exportar sus datos** (JSON), para cumplir lo prometido en los términos;
  - **eliminar la cuenta y sus datos** (solicitud de borrado de los términos, sección 15), con confirmación fuerte.

### 3.4 Moderación
- **Reseñas:** todas, no solo las reportadas. Filtros por estrellas, restaurante, reportadas y ocultas. Ocultar, restaurar y eliminar.
- **Respuestas de restaurantes:** ocultar una respuesta ofensiva.
- **Fotos:** galería de las últimas subidas (logos, portadas y platillos); quitar con un clic y avisar al dueño.
- **Cola única de pendientes**, con contador en el menú del panel.

### 3.5 Comunicación
- **Avisos (campana):** hoy son un archivo JSON fijo en el código. Pasan a una tabla con editor: título, texto, destino (web, app o ambos), enlace permitido, fecha de inicio y de fin, y vista previa.
- **Versión de la app:** editar `app-version` (versión, código, notas y enlace) sin subir código. Así se activa el aviso de «hay versión nueva».
- **Correo a dueños de restaurante** (por ejemplo, «completa tu menú»), con plantilla y registro de envíos. Fase 3.

### 3.6 Opiniones y datos para la tesis
- Calificaciones de la app: promedio, distribución de 1 a 5 y comentarios.
- **Exportar a CSV:** opiniones, búsquedas por categoría y día, registros por día, restaurantes y su completitud. Sirve directo para la Tabla 12 y los anexos.

### 3.7 Búsquedas y asistente
- Lo más buscado (ya existe el conteo anónimo por categoría).
- Uso de Gemini por día y respuestas «solo comida» (intentos fuera de tema).
- **Búsquedas sin resultados:** dicen qué restaurantes o platillos faltan. Ojo: hoy solo se guarda la categoría, nunca el texto, y así lo dicen los términos. Guardar el texto exige cambiar los términos (sección 15) o guardarlo sin ningún dato del usuario y por poco tiempo. **Decisión tuya.**

### 3.8 Configuración global
- **Interruptores:** registro de cuentas abierto o cerrado; IA activada o desactivada (corta el consumo de Gemini al instante); modo mantenimiento con mensaje; regla de visibilidad (publicar solo con al menos 1 platillo).
- **Límites:** solicitudes por minuto del asistente y de la búsqueda.
- **Catálogos editables:** tipos de negocio, tipos de plato, cocinas, características y alérgenos. Hoy están en el código; moverlos a la base es la parte más grande, así que queda para la fase 3.

### 3.9 Administradores y auditoría
- Lista de administradores con rol, fecha y si tienen MFA activo; agregar, cambiar rol y quitar (solo superadmin).
- **Registro de auditoría:** buscador por administrador, acción, fecha o elemento; ver el antes y el después; exportar.

---

## 4. Cambios en la base de datos

| Cambio | Para qué |
|---|---|
| `app_admins.role`, `admin_role()`, `require_admin(min_role)` con verificación de `aal2` | Roles y MFA |
| Tabla `admin_audit_log` (solo inserción; sin `update` ni `delete` para nadie) | Auditoría |
| `restaurants`: `suspended_at`, `suspension_reason`, `verified_at`, `deleted_at` | Suspender, verificar y borrado suave |
| `deleted_at` en sedes, platillos y reseñas | Borrado suave |
| Tablas `announcements`, `app_settings` y `app_release` | Avisos, configuración y versión editables |
| Funciones `admin_*` (`SECURITY DEFINER`, cada una llama a `require_admin` y escribe en la auditoría) | Una por acción |
| Búsqueda y mapa: ocultar sedes suspendidas, eliminadas o sin platillos visibles | Visibilidad correcta |

Todo como migraciones nuevas en `supabase/migrations/`, sin `DROP` de datos.

---

## 5. Fases

| Fase | Contenido | Esfuerzo aproximado |
|---|---|---|
| **1. Esencial** | MFA obligatorio, roles, auditoría, tablero con alertas, restaurantes (ver, despublicar, suspender, transferir y borrado suave), usuarios (ver, suspender, cerrar sesiones y eliminar), todas las reseñas y la regla de «sin platillos no aparece» | 3 o 4 sesiones de trabajo |
| **2. Operación** | Editar datos de restaurantes desde el panel, verificación, avisos y versión editables, opiniones y exportaciones CSV, fotos recientes, uso de IA | 2 o 3 sesiones |
| **3. Completo** | Configuración global, catálogos editables, correo a dueños, búsquedas sin resultados (si decides guardarlas), rol moderador | 3 sesiones |

Solo en la web (`/admin`), pensado para computadora y usable en el celular. No en la app Android: el administrador trabaja desde el navegador y así no hace falta otra APK.

Cada fase se entrega con pruebas automáticas y con casos nuevos en la batería de seguridad. Por ejemplo: un usuario común no puede llamar ninguna función `admin_*`, un moderador no puede tocar a un superadmin, y sin MFA no se puede hacer nada.

---

## 6. Decisiones pendientes

1. ¿MFA obligatorio para administradores? (recomendado: **sí**)
2. ¿Rol moderador ahora o solo superadmin? (recomendado: solo superadmin en la fase 1 y moderador en la fase 3)
3. ¿Guardar el texto de las búsquedas sin resultados? (requiere cambiar los términos)
4. ¿Cuántos días se conserva lo borrado antes de eliminarlo definitivamente? (propuesta: 30)
5. ¿Quiénes serán superadmin además de `pabloruiz0123@gmail.com`?
