# Plan de ejecución de AntojosGo

## Avance del 28 de septiembre de 2026

- Android: Expo 57 y sus dependencias compatibles instalados; Expo Go actualizado en el emulador. Corregido arranque IPv4 de Metro. Logs Android confirman ejecución de `main`; recorrido visual completo aún pendiente.
- Verificado: 24 pruebas unitarias, 6 smoke, compilación web, tipos y exportación Android; acceso real a Supabase y lectura de negocio/sedes.
- Catálogo: validados parámetros geográficos, límites y errores de servicio; espera de red/GPS limitada y respuestas obsoletas descartadas. Pantallas iniciales disponibles, publicación y permisos públicos pendientes.
- Próximo bloque: certificar recorrido restaurante en Android, completar perfil/horarios/menú y diseñar publicación con permisos limitados. No aplicar `scripts/public-catalog.sql` sin corregir y probar sus políticas. Después, búsqueda paginada e índices en base de datos antes de pruebas de carga.
- Registro de desarrollo: confirmación de correo desactivada por decisión del usuario; el bloqueo SMTP descrito más abajo es histórico para ese entorno. Recuperación y verificación de correo de producción siguen pendientes.


**Migración Android iniciada:** cliente Expo en `mobile/`, reutilizando contratos, adaptadores y datos existentes. Registro/acceso, negocio, sedes y selección de ubicación portados a componentes nativos. Ver [EXPO-ANDROID.md](EXPO-ANDROID.md) para comandos, verificaciones y límites. No confundir exportación Hermes con APK ni dar el MVP por terminado.

**Nueva especificación de producto:** [PRODUCT-SPEC.md](PRODUCT-SPEC.md) prevalece sobre antecedentes: MVP en Xela, solo restaurantes registrados, sin reservas/pedidos/delivery; objetivo Expo/Express con Supabase Auth y PostgreSQL (decisión posterior del usuario). Estado y transición: [BRANCHES.md](BRANCHES.md). La implementación actual mantiene Next.js/Capacitor hasta una migración explícita de la interfaz; se conserva Supabase Auth; no se declara cumplida la nueva arquitectura.

Fecha: 13 de septiembre de 2026. Sustituye la secuencia histórica de PROJECT-PLAN.md. Fuente: conversación y proyecto disponible; no se encontró otro documento de propuesta.

## Objetivo

App multiservicios, primero restaurantes y luego clientes. Una identidad puede administrar varios negocios. Cada módulo tiene carga, error y recuperación independientes. Selector de ubicación por sede implementado; pendiente verificación visual y proveedor para producción. Pedidos, pagos y repartidores requieren definir alcance antes de implementarse.

La capacidad nacional es un objetivo por medir. Hay que acordar usuarios activos, solicitudes por segundo, concurrencia, volumen de imágenes y presupuesto antes de prometer capacidad.

## 1. Registro y acceso — EN CURSO

1. Identificar proveedor de correo transaccional, dominio y responsable. No guardar credenciales en Git ni variables públicas.
2. Configurar SMTP en Supabase y verificar remitente/dominio según el proveedor. Mantener confirmación de correo.
3. Revisar cuotas y destinos de redirección de desarrollo/producción. Ajustar cuotas a capacidad contratada y controles de abuso.
4. Mostrar errores específicos de correo, credenciales, red y servidor. Implementado para los errores identificados.
5. Limitar espera por solicitud y evitar dobles envíos mientras se procesa el formulario. No reintentar registros automáticamente desde la interfaz.
6. Con buzón autorizado: registrar, recibir correo, confirmar, iniciar sesión, recargar, cerrar sesión y entrar desde otro dispositivo. Probar contraseña incorrecta y correo sin confirmar.
7. Implementar recuperación de contraseña y enlaces móviles tras verificar remitente y destinos.

Aceptación: recorrido completo real y datos ajenos inaccesibles; pasar pruebas unitarias no cierra esta etapa.

Bloqueo comprobado: `429 over_email_send_rate_limit`, sin usuario ni sesión. SMTP/entrega aún no certificados. El conector disponible no edita configuración Auth/SMTP; pendiente identificar proveedor y acceso a esa configuración.

## 2. Restaurantes — BASE PARCIAL

1. Consolidar esquema: `auth_owner_id` identifica al propietario nuevo; conservar vínculo Firebase hasta migración explícita.
2. Nombre y descripción ya conectados. Continuar con categoría, contacto y horarios, validados también en base de datos.
3. Conciliar `foods` con los adaptadores antiguos antes de conectar menú. Definir moneda, precio decimal y disponibilidad.
4. Implementar crear/editar/desactivar platillos, paginación y prevención de duplicados al reintentar.
5. Añadir imágenes con límites, permisos de almacenamiento y variantes optimizadas.
6. Añadir borrador/publicado y reglas de publicación sin exponer datos privados del propietario.

Aceptación: dos propietarios gestionan negocios aislados; cliente ve solo publicados; falla de menú permite usar perfil. Probar operaciones reales, duplicados, red interrumpida y restauración.

## 3. Clientes — PENDIENTE

1. Sustituir ejemplos por una proyección pública paginada de negocios publicados.
2. Implementar búsqueda textual y filtros con índices según consultas reales, sin mapas.
3. Guardar favoritos por usuario con unicidad y RLS; preferencias independientes del catálogo.
4. Definir autoría y moderación de reseñas antes de conectarlas. Eliminar cifras y acciones simuladas del recorrido real.

Aceptación: navegación pública sin cuenta y persistencia privada por usuario, con estados vacíos y recuperación por sección.

## 4. Seguridad y operación — PENDIENTE

1. Separar desarrollo, pruebas y producción, con secretos y datos propios.
2. Mantener servidor sin estado local necesario entre solicitudes; permisos mínimos y conexiones administradas.
3. Auditar rutas, RLS y objetos legados, incluida administración demo y PostGIS.
4. Añadir métricas por módulo y registros con identificador de petición, excluyendo contraseñas, tokens y datos personales.
5. Aplicar límites compartidos en servidor/proveedor; un botón deshabilitado solo es protección de interfaz.
6. Configurar alertas, respaldos y ensayo de restauración. Acordar tiempo de recuperación y pérdida tolerable de datos.

Pendientes antes de pruebas reales (detectados por los asesores de Supabase el 2 de octubre de 2026; en etapa local no se aplican):
- Activar protección contra contraseñas filtradas y verificación de correo de usuarios (Auth).
- Mover PostGIS de `public` a `extensions` (cierra `spatial_ref_sys` sin RLS y vistas `geometry_columns`/`geography_columns` expuestas).
- Sincronizar historial de migraciones local/remoto antes de usar `supabase db push` (remoto tiene 4 migraciones previas ausentes de `supabase/migrations/`; `public_catalog_v2` quedó registrada con otra versión).

Aceptación: pruebas de autorización, alertas verificadas y restauración ensayada antes de admitir datos de producción.

## 5. Rendimiento y tráfico — PENDIENTE

1. Acordar carga y presupuesto. Objetivos iniciales propuestos para medir: p95 de lecturas API menor de 500 ms, errores inesperados menores del 1 %, LCP menor de 2.5 s en dispositivo/red definidos. No son resultados obtenidos.
2. Medir planes de consultas; corregir índices, listas sin límite y consultas por cada elemento.
3. Cachear información pública con invalidación; nunca compartir caché privada entre cuentas.
4. Mantener imágenes optimizadas y carga bajo demanda. Introducir colas cuando existan tareas largas, con idempotencia y recuperación.
5. En entorno aislado, ensayar 10, 50, 100 y 250 usuarios virtuales con mezcla documentada de lecturas/escrituras y parada ante saturación. Estos escalones no representan capacidad nacional.
6. Medir p50/p95/p99, errores, CPU, conexiones, bloqueos y coste; corregir cuello de botella y repetir. Añadir ensayo prolongado y fallos externos.

Aceptación: informe reproducible de carga acordada, margen de capacidad y costes conocidos. No ejecutar carga masiva contra producción ni usar correos reales durante esos ensayos.

## 6. Android y piloto — PENDIENTE

Avance: flujo reproducible de diagnóstico/compilación/instalación Android; JDK 21 seleccionado; APK debug instalado en emulador y conexión al servidor comprobada desde Android (HTTP 200). Control de release impide incluir servidor local. No cierra la etapa: falta recorrido visual, app independiente de la computadora y pruebas físicas. Ver ANDROID.md.

1. Separar cliente empaquetable y API HTTPS; Next.js de servidor no se ejecuta dentro del APK.
2. Configurar sesión móvil, enlaces de confirmación/recuperación, teclado y botón Atrás.
3. Probar emulador y dispositivo físico, red lenta, desconexión, cierre/reapertura y accesibilidad.
4. Preparar firma, recursos, privacidad y distribución de prueba; retirar dependencia del servidor local.
5. Ejecutar piloto controlado con restaurantes y clientes; ampliar según métricas e incidencias.

Aceptación: instalación reproducible y recorridos completos sin intervención del desarrollador.

## Seguimiento

26 de septiembre: registro público real sin confirmación habilitado por el usuario y verificado con signUp. Pasaron creación de sesión, perfil, restaurante, edición y persistencia tras cierre/nuevo acceso mediante los módulos de la app. SMTP queda como requisito de producción; ya no bloquea este modo de desarrollo. Próximo bloque: menú sobre el esquema real, manteniendo aislamiento por propietario.

Revisión de correo y seguridad: [decisión de proveedor, controles aplicados y pendientes](SECURITY-AND-EMAIL.md). SMTP aún no activado; migración de permisos legados y límite de descripción aplicada y verificada.

Prueba real de propietario completada el 14 de septiembre mediante identidad sintética provisionada administrativamente: acceso, perfil personal, restaurante, edición, cierre y persistencia tras nuevo acceso. El registro público/SMTP continúa pendiente y no se considera completado por esta prueba. Próximo bloque independiente: contrato y permisos del menú real sobre `foods`.

Separación modular iniciada el 14 de septiembre: contratos puros en `shared/contracts`, acceso a perfiles en `modules/accounts/data` y acceso a restaurantes en `modules/restaurants/data`. Pantallas actualizadas y reexportaciones de compatibilidad para consumidores anteriores. No se cambió el esquema ni se separaron despliegues. Véase [arquitectura y reglas de evolución](ARCHITECTURE.md).

Cada entrega registra cambios, pruebas, resultados, límites y siguiente paso. Un bloqueo externo permite avanzar en tareas independientes, pero no sustituir acceso real por simulación para declarar éxito.

Primera ejecución: mensajes de error corregidos, límites de espera de solicitudes a Supabase implementados; pendiente cerrar SMTP y probar alta real. Los negocios permanecen privados y el catálogo cliente sigue usando ejemplos.

Segunda ejecución: corrección de respuestas 5xx que el SDK clasificaba como reintentables y la interfaz confundía con fallos de red. Bloqueo inmediato de envíos simultáneos del formulario. Pruebas de integración con el SDK instalado y transporte simulado: cuota de correo, caída de servidor, espera agotada, registro sin confirmar, sesión y cierre. Estas pruebas no envían correos ni sustituyen la validación real de SMTP.

Comandos reproducibles: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`. Con el servidor en el puerto 3000, `npm.cmd run test:smoke` verifica páginas públicas y rechazo de acceso sin sesión a tres APIs privadas en paralelo. No es una prueba de carga nacional.
# Actualización: autenticación y mapas

Se mantiene Supabase Auth por decisión posterior a la especificación; Firebase Auth no es requisito para continuar. Leaflet instalado para seleccionar y guardar coordenadas privadas por sede en la app actual. Ver MAPS.md para alcance, pruebas y límites. Pendiente validación visual/Android y proveedor de mapas para lanzamiento nacional.
