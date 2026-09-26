# Etapa 1: cuentas y propietarios

## Estado vigente: pruebas sin confirmación (26 de septiembre de 2026)

El usuario desactivó Confirm email en Supabase para desarrollo. Se verificó `mailer_autoconfirm=true` y se probó el registro público mediante `auth.signUp`, sin SQL administrativo ni clave privilegiada: creó usuario y sesión, perfil personal, restaurante privado y descripción. El cierre y nuevo acceso por contraseña conservaron el restaurante. Se usaron la validación y los módulos de datos de la app; no se automatizó el clic del formulario en navegador. Credenciales entregadas al usuario, no almacenadas en el repositorio.

Este modo permite registros sin correo de confirmación ni SMTP. No verifica la propiedad del correo. Reactivar confirmación y probar entrega antes de invitar usuarios externos o publicar. Las referencias siguientes a SMTP bloqueado describen el estado anterior y el pendiente de producción.

## Implementado

- Una identidad personal de Supabase Auth con correo y contraseña. El nombre personal no es un identificador único; el acceso se realiza con correo.
- Pantallas separadas para clientes y restaurantes. La misma persona puede usar el modo cliente y ser propietaria de restaurantes, sin duplicar credenciales.
- Registro, validación de nombre/correo, confirmación de contraseña, mostrar/ocultar contraseña, confirmación de correo, inicio de sesión, restauración de sesión y cierre de sesión.
- El formulario exige 10 caracteres para una contraseña nueva. La política de contraseñas del proveedor debe revisarse en Supabase antes del lanzamiento; la validación del formulario no sustituye esa configuración.
- Nombre personal en `account_profiles`, protegido por `user_id = auth.uid()`.
- Nombre comercial en la tabla existente `restaurants`, vinculado a `auth_owner_id`. Una persona puede registrar varios restaurantes. La combinación propietario/nombre evita duplicados cuando se reintenta una solicitud.
- Los restaurantes registrados permanecen privados. El catálogo de clientes continúa usando ejemplos hasta implementar publicación.
- Las rutas comerciales antiguas verifican el token con `getUser` y la propiedad del restaurante antes de ejecutar operaciones. Los antiguos endpoints de contraseña devuelven 410; ya no almacenan hashes en restaurantes.

## Base conectada

Proyecto: `AntojosGo` (`dmskwpquomqcsumaqaej`). Se reactivó el proyecto existente. Durante la restauración las primeras consultas devolvieron un esquema vacío; al terminar apareció la estructura anterior de Firebase (`users`, `restaurants`, `foods`, `reviews` y PostGIS).

Se conservó la estructura anterior. `restaurants.owner_id` conserva su relación con usuarios Firebase; las cuentas nuevas usan `auth_owner_id`, vinculado a `auth.users`. Ningún metadato editable del usuario concede permisos. No se migraron cuentas Firebase porque no había usuarios registrados.

Migración aplicada: `accounts_and_owned_restaurants`. Fuente revisable: `scripts/auth-accounts.sql`. No ejecutar los scripts históricos 01–10 como instalación nueva: describen modelos distintos al esquema real y requieren conciliación en etapas posteriores.

La clave configurada en `.env.local` es publicable, nunca `service_role`. El archivo está ignorado por Git. Supabase Auth almacena las contraseñas; la aplicación no guarda contraseñas en perfiles, restaurantes ni registros de consola.

## Comprobaciones realizadas

- 14 de septiembre: creada una identidad sintética de restaurante mediante SQL administrativo, revisando el esquema real de `auth.users` y `auth.identities`, con contraseña bcrypt y confirmación exclusiva de esta cuenta. No es el mecanismo de alta pública ni cambia la configuración de confirmación. Verificado contra Auth/Data API reales con clave pública: inicio de sesión, perfil personal, creación de restaurante, edición de descripción, cierre, segundo inicio y persistencia. Restaurante: `Restaurante de prueba AntojosGo`, privado. Credenciales entregadas al usuario fuera del repositorio. No se verificó visualmente este recorrido ni la entrega de correo.

- Diagnóstico del fallo de registro: una llamada real `auth.signUp` con datos sintéticos devolvió HTTP 429, código `over_email_send_rate_limit`, sin usuario ni sesión. El mensaje de la app ahora identifica el límite de correos. Esta prueba no demuestra que SMTP esté configurado correctamente; al restablecer el cupo aún hay que comprobar la entrega. La prueba visual de este incidente quedó bloqueada por el modo lateral del navegador conectado, que no permite crear pestañas.

- Pruebas automáticas: validación de cuentas, errores de autenticación, catálogo demo y aislamiento de solicitudes.
- Prueba SQL de permisos (`tests/auth-rls.sql`) contra Supabase, con rollback: acceso propio, rechazo de propiedad ajena, aislamiento de perfiles y reintentos sin duplicar restaurantes. No deja usuarios de prueba.
- Servicio Auth: configuración responde HTTP 200; registro por correo habilitado; confirmación de correo activada; credenciales inválidas rechazadas con `invalid_credentials`.
- No se ha verificado todavía la recepción de un correo de confirmación ni un alta completa con un correo real. Hace falta comprobar remitente/SMTP, destinos permitidos y entregabilidad antes de invitar usuarios.

## Cómo probar

1. Ejecutar `npm.cmd run dev` y abrir `/restaurant`.
2. Elegir Registrarme, introducir nombre personal, correo y contraseña; confirmar la contraseña.
3. Confirmar el correo desde el enlace recibido. Volver a la aplicación e iniciar sesión.
4. Registrar el nombre del restaurante. Recargar y verificar que sigue disponible.
5. Cerrar sesión. Entrar con otra cuenta y comprobar que no aparecen los restaurantes anteriores.
6. En modo cliente (`/`), pulsar el icono de cuenta para registrarse o acceder; Perfil muestra la identidad conectada.

En Android, por ahora se puede confirmar el correo en el navegador y volver al emulador para iniciar sesión. Enlaces profundos y recuperación de contraseña son tareas posteriores.

## Límites de esta etapa

El nuevo portal permite registrar el propietario y editar el nombre y la descripción de cada negocio desde «Editar perfil». Guarda en las columnas existentes, con filtros de propietario y RLS, sin ampliar permisos. El editor se carga bajo demanda, limita las solicitudes a 15 segundos y conserva los cambios cuando no puede confirmar el guardado. El límite de descripción de 2000 caracteres se valida en la aplicación; todavía no es una restricción SQL. Menú, personal, métricas y publicación se conectarán por partes al esquema real. El demo anterior sigue conservado en código y pruebas, pero no sustituye el acceso real.

Para probar este bloque: entrar como propietario, abrir «Editar perfil», cambiar nombre y descripción, guardar y volver a abrir. Probar también sin conexión: debe mostrar un error y conservar lo escrito. La prueba SQL transaccional verifica edición propia y rechazo de edición ajena; la comprobación completa en navegador con una cuenta real sigue pendiente.

Referencias de implementación: [actualizaciones con retorno de filas](https://supabase.com/docs/reference/javascript/using-modifiers-select) y [cancelación de solicitudes](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal).

La auditoría ya no señala ausencia de RLS en las tablas de negocio protegidas. Permanecen avisos de la instalación anterior de PostGIS en `public` y de visibilidad de objetos en GraphQL. La visibilidad del esquema no sustituye los permisos por fila; la extensión geográfica se revisará por separado, sin mezclar mapas con esta entrega. Referencia: [avisos de seguridad de Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).

Pendientes antes de uso nacional: política de contraseñas del proveedor, SMTP y límites de correo, recuperación de acceso, observabilidad, límites por usuario, pruebas concurrentes y de carga, respaldo y recuperación. No hay una capacidad nacional medida todavía.
